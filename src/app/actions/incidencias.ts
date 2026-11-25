'use server';

import { revalidatePath } from 'next/cache';
import { getTranslations } from 'next-intl/server';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { PoolConnection } from 'mysql2/promise';
import { db, getTransaction } from '@/lib/db';
import { requirePermiso } from '@/lib/permisos';
import { accesoDisciplina, puedeAdjuntarEvidencia } from '@/lib/acceso-disciplina';
import { registrarAuditoria } from '@/lib/audit';
import { notificarPorPermiso } from '@/lib/notificaciones';
import { hoyISO } from '@/lib/asistencia';
import {
  ESTADOS_CON_TEXTO,
  MAX_EVIDENCIAS,
  TRANSICIONES_INCIDENCIA,
  escalaPorReincidencia,
  puedeTransicionar,
  type EstadoIncidencia,
  type TipoFalta,
} from '@/lib/disciplina';
import { cambioEstadoIncidenciaSchema, incidenciaSchema } from '@/lib/validations/disciplina';
import type { ActionState } from '@/types/actions';

/**Longitud minima de una resolucion o de un motivo de apelacion */
const MIN_TEXTO = 10;

export interface IncidenciaRow {
  id_incidencia: number;
  nie: number;
  estudiante: string;
  id_periodo: number;
  /**Numero de trimestre */
  periodo: number;
  anio: number;
  /**YYYY-MM-DD */
  fecha: string;
  /**HH:mm */
  hora: string | null;
  tipo_falta: TipoFalta;
  escalada_auto: boolean;
  descripcion: string;
  resolucion: string | null;
  estado: EstadoIncidencia;
  registrada_por: number | null;
  reportante: string | null;
  resolutor: string | null;
  evidencias: number;
  citaciones: number;
}

export interface EvidenciaRow {
  id_evidencia: number;
  url: string;
  nombre: string;
  mime_type: string;
  subida_por: number;
  subida_por_email: string;
  /**YYYY-MM-DD */
  subida_en: string;
}

export interface IncidenciaDetalle extends IncidenciaRow {
  archivos: EvidenciaRow[];
}

export interface FiltroIncidencias {
  estado?: EstadoIncidencia;
  tipo?: TipoFalta;
  nie?: number;
}

const NOMBRE_ESTUDIANTE = "CONCAT_WS(' ', e.primer_nombre, e.segundo_nombre, e.primer_apellido, e.segundo_apellido)";

// Quien registra o resuelve se muestra por su perfil docente; si no lo tiene
// (Coordinacion, Direccion, Admin), por el correo de su usuario.
const SELECT_INCIDENCIA = `
  SELECT i.id_incidencia, i.nie, ${NOMBRE_ESTUDIANTE} AS estudiante, i.id_periodo, p.numero AS periodo, c.anio,
         DATE_FORMAT(i.fecha_incidencia, '%Y-%m-%d') AS fecha, TIME_FORMAT(i.hora_incidencia, '%H:%i') AS hora,
         i.tipo_falta, i.escalada_auto, i.descripcion, i.resolucion, i.estado, i.registrada_por,
         IF(dr.dui_docente IS NULL, ur.email, CONCAT_WS(' ', dr.primer_nombre, dr.primer_apellido)) AS reportante,
         IF(ds.dui_docente IS NULL, us.email, CONCAT_WS(' ', ds.primer_nombre, ds.primer_apellido)) AS resolutor,
         (SELECT COUNT(*) FROM evidencia_incidencia ev WHERE ev.id_incidencia = i.id_incidencia) AS evidencias,
         (SELECT COUNT(*) FROM citacion ci WHERE ci.id_incidencia = i.id_incidencia) AS citaciones
    FROM incidencia i
    INNER JOIN estudiante e ON e.nie = i.nie
    INNER JOIN periodo_evaluativo p ON p.id_periodo = i.id_periodo
    INNER JOIN ciclo_escolar c ON c.id_ciclo = p.id_ciclo
    LEFT JOIN docente dr ON dr.dui_docente = i.dui_reportante
    LEFT JOIN usuario ur ON ur.id_usuario = i.registrada_por
    LEFT JOIN docente ds ON ds.dui_docente = i.dui_resolutor
    LEFT JOIN usuario us ON us.id_usuario = i.resuelta_por`;

function mapIncidencia(r: RowDataPacket): IncidenciaRow {
  return {
    ...(r as IncidenciaRow),
    escalada_auto: Boolean(r.escalada_auto),
    evidencias: Number(r.evidencias),
    citaciones: Number(r.citaciones),
  };
}

const texto = (formData: FormData, campo: string) => {
  const v = formData.get(campo);
  return typeof v === 'string' ? v : undefined;
};

async function duiDocenteDe(connection: PoolConnection, idUsuario: number): Promise<string | null> {
  const [rows] = await connection.query<RowDataPacket[]>('SELECT dui_docente FROM docente WHERE id_usuario = ?', [idUsuario]);
  return rows[0]?.dui_docente ?? null;
}

/**Sin `disciplina.ver` solo se listan las incidencias registradas por el usuario */
export async function getIncidencias(filtro: FiltroIncidencias = {}): Promise<IncidenciaRow[]> {
  const acceso = await accesoDisciplina();
  if (!acceso) return [];

  const cond: string[] = [];
  const params: (string | number)[] = [];
  if (!acceso.ver) { cond.push('i.registrada_por = ?'); params.push(acceso.idUsuario); }
  if (filtro.estado) { cond.push('i.estado = ?'); params.push(filtro.estado); }
  if (filtro.tipo) { cond.push('i.tipo_falta = ?'); params.push(filtro.tipo); }
  if (filtro.nie) { cond.push('i.nie = ?'); params.push(filtro.nie); }

  const [rows] = await db.query<RowDataPacket[]>(
    `${SELECT_INCIDENCIA} ${cond.length ? `WHERE ${cond.join(' AND ')}` : ''}
      ORDER BY i.fecha_incidencia DESC, i.id_incidencia DESC`,
    params
  );
  return rows.map(mapIncidencia);
}

export async function getIncidenciaPorId(idIncidencia: number): Promise<IncidenciaDetalle | null> {
  const acceso = await accesoDisciplina();
  if (!acceso || !Number.isInteger(idIncidencia) || idIncidencia <= 0) return null;

  const [rows] = await db.query<RowDataPacket[]>(`${SELECT_INCIDENCIA} WHERE i.id_incidencia = ?`, [idIncidencia]);
  if (!rows[0]) return null;
  const incidencia = mapIncidencia(rows[0]);
  if (!acceso.ver && incidencia.registrada_por !== acceso.idUsuario) return null;

  const [archivos] = await db.query<RowDataPacket[]>(
    `SELECT ev.id_evidencia, ev.archivo_ruta AS url, ev.archivo_nombre AS nombre, ev.mime_type, ev.subida_por,
            u.email AS subida_por_email, DATE_FORMAT(ev.subida_en, '%Y-%m-%d') AS subida_en
       FROM evidencia_incidencia ev
       INNER JOIN usuario u ON u.id_usuario = ev.subida_por
      WHERE ev.id_incidencia = ? ORDER BY ev.id_evidencia`,
    [idIncidencia]
  );
  return { ...incidencia, archivos: archivos as EvidenciaRow[] };
}

/**
 * Campos: nie, fecha, hora (opcional), tipo_falta, descripcion. El periodo se
 * deduce de la fecha. La tercera falta leve del estudiante en el periodo se
 * guarda como Grave con escalada_auto y avisa a quienes resuelven.
 */
export async function registrarIncidencia(_prev: ActionState, formData: FormData): Promise<ActionState & { id?: number }> {
  const t = await getTranslations('incidencias');
  const session = await requirePermiso('disciplina.reportar');
  if (!session) return { success: false, message: t('errors.sinPermiso') };

  const parsed = incidenciaSchema((k) => t(`errors.${k}`)).safeParse({
    nie: texto(formData, 'nie'),
    fecha: texto(formData, 'fecha'),
    hora: texto(formData, 'hora'),
    tipo_falta: texto(formData, 'tipo_falta'),
    descripcion: texto(formData, 'descripcion'),
  });
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors, message: t('errors.revisarCampos') };
  }
  const d = parsed.data;
  if (d.fecha > hoyISO()) return { success: false, errors: { fecha: [t('errors.fechaFutura')] }, message: t('errors.fechaFutura') };

  const idUsuario = Number(session.user.id);
  const connection = await getTransaction();
  try {
    // El bloqueo del estudiante serializa registros simultaneos: sin el, dos
    // leves a la vez contarian las mismas previas y ninguna escalaria.
    const [est] = await connection.query<RowDataPacket[]>(
      `SELECT estado, ${NOMBRE_ESTUDIANTE} AS nombre FROM estudiante e WHERE nie = ? FOR UPDATE`,
      [d.nie]
    );
    if (!est[0] || est[0].estado !== 'Activo') {
      await connection.rollback();
      return { success: false, message: t('errors.estudianteNoDisponible') };
    }

    const [periodos] = await connection.query<RowDataPacket[]>(
      `SELECT p.id_periodo, p.numero
         FROM periodo_evaluativo p INNER JOIN ciclo_escolar c ON c.id_ciclo = p.id_ciclo
        WHERE c.estado = 'Activo' AND ? BETWEEN p.fecha_inicio AND p.fecha_cierre LIMIT 1`,
      [d.fecha]
    );
    if (!periodos[0]) {
      await connection.rollback();
      return { success: false, errors: { fecha: [t('errors.fechaFueraDePeriodo')] }, message: t('errors.fechaFueraDePeriodo') };
    }
    const { id_periodo: idPeriodo, numero } = periodos[0];

    let escalada = false;
    if (d.tipo_falta === 'Leve') {
      const [previas] = await connection.query<RowDataPacket[]>(
        `SELECT COUNT(*) AS n FROM incidencia
          WHERE nie = ? AND id_periodo = ? AND (tipo_falta = 'Leve' OR escalada_auto = TRUE)`,
        [d.nie, idPeriodo]
      );
      escalada = escalaPorReincidencia(Number(previas[0].n));
    }
    const tipo: TipoFalta = escalada ? 'Grave' : d.tipo_falta;

    const [res] = await connection.execute<ResultSetHeader>(
      `INSERT INTO incidencia
         (nie, id_periodo, fecha_incidencia, hora_incidencia, tipo_falta, escalada_auto, descripcion, dui_reportante, registrada_por)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [d.nie, idPeriodo, d.fecha, d.hora || null, tipo, escalada, d.descripcion, await duiDocenteDe(connection, idUsuario), idUsuario]
    );
    const id = res.insertId;

    await registrarAuditoria(connection, {
      idUsuario,
      tabla: 'incidencia',
      idRegistro: id,
      accion: 'INSERT',
      datos: { ...d, id_periodo: idPeriodo, tipo_falta: tipo, escalada_auto: escalada },
    });

    if (tipo !== 'Leve') {
      const datos = { nombre: est[0].nombre, numero, tipo: t(`tipos.${tipo}`) };
      await notificarPorPermiso(connection, 'disciplina.resolver', {
        tipo: escalada ? 'Reincidencia' : 'Sistema',
        titulo: t(escalada ? 'notifReincidenciaTitulo' : 'notifGraveTitulo', datos),
        mensaje: t(escalada ? 'notifReincidenciaMensaje' : 'notifGraveMensaje', datos),
        referenciaTipo: 'incidencia',
        referenciaId: id,
      });
    }

    await connection.commit();
    revalidatePath('/dashboard/incidencias');
    revalidatePath('/', 'layout'); // contador de notificaciones del encabezado
    return { success: true, message: t(escalada ? 'registradaEscalada' : 'registrada'), id };
  } catch (error) {
    await connection.rollback();
    console.error('Error registrando incidencia:', error);
    return { success: false, message: t('errors.errorServidor') };
  } finally {
    connection.release();
  }
}

/**
 * Campos: id_incidencia, estado, texto. `texto` es la resolucion (-> Resuelta)
 * o el motivo de la apelacion (-> Apelada); se acumula en `resolucion` para
 * que el historial de la apelacion quede junto a la resolucion original.
 */
export async function cambiarEstadoIncidencia(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const t = await getTranslations('incidencias');
  const session = await requirePermiso('disciplina.resolver');
  if (!session) return { success: false, message: t('errors.sinPermiso') };

  const parsed = cambioEstadoIncidenciaSchema((k) => t(`errors.${k}`)).safeParse({
    id_incidencia: texto(formData, 'id_incidencia'),
    estado: texto(formData, 'estado'),
    texto: texto(formData, 'texto'),
  });
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? t('errors.revisarCampos') };
  const d = parsed.data;

  const idUsuario = Number(session.user.id);
  const connection = await getTransaction();
  try {
    const [rows] = await connection.query<RowDataPacket[]>(
      'SELECT estado, resolucion FROM incidencia WHERE id_incidencia = ? FOR UPDATE',
      [d.id_incidencia]
    );
    if (!rows[0]) {
      await connection.rollback();
      return { success: false, message: t('errors.noExiste') };
    }
    const actual = rows[0].estado as EstadoIncidencia;
    if (!puedeTransicionar(TRANSICIONES_INCIDENCIA, actual, d.estado)) {
      await connection.rollback();
      return { success: false, message: t('errors.transicionInvalida') };
    }
    if (ESTADOS_CON_TEXTO.includes(d.estado) && d.texto.length < MIN_TEXTO) {
      await connection.rollback();
      return { success: false, message: t(d.estado === 'Apelada' ? 'errors.motivoRequerido' : 'errors.resolucionRequerida') };
    }

    let resolucion = rows[0].resolucion as string | null;
    if (d.estado === 'Apelada') {
      resolucion = `${resolucion ?? ''}\n\n${t('marcaApelacion', { fecha: hoyISO() })}\n${d.texto}`.trim();
    } else if (d.estado === 'Resuelta') {
      resolucion = actual === 'Apelada'
        ? `${resolucion ?? ''}\n\n${t('marcaResolucionApelacion', { fecha: hoyISO() })}\n${d.texto}`.trim()
        : d.texto;
    }

    if (d.estado === 'Apelada') {
      await connection.execute('UPDATE incidencia SET estado = ?, resolucion = ? WHERE id_incidencia = ?', [d.estado, resolucion, d.id_incidencia]);
    } else {
      await connection.execute(
        'UPDATE incidencia SET estado = ?, resolucion = ?, dui_resolutor = ?, resuelta_por = ? WHERE id_incidencia = ?',
        [d.estado, resolucion, await duiDocenteDe(connection, idUsuario), idUsuario, d.id_incidencia]
      );
    }
    await registrarAuditoria(connection, {
      idUsuario,
      tabla: 'incidencia',
      idRegistro: d.id_incidencia,
      accion: 'UPDATE',
      datosAnteriores: { estado: actual, resolucion: rows[0].resolucion },
      datos: { estado: d.estado, resolucion },
    });
    await connection.commit();
    revalidatePath('/dashboard/incidencias');
    revalidatePath(`/dashboard/incidencias/${d.id_incidencia}`);
    return { success: true, message: t('estadoActualizado') };
  } catch (error) {
    await connection.rollback();
    console.error('Error cambiando estado de incidencia:', error);
    return { success: false, message: t('errors.errorServidor') };
  } finally {
    connection.release();
  }
}

/**
 * Campos: id_incidencia, archivo (File). Sube a Vercel Blob (gap 2) y guarda
 * la URL. Adjunta quien resuelve, o quien registro la incidencia mientras no
 * este resuelta.
 */
export async function subirEvidencia(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const t = await getTranslations('incidencias');
  const acceso = await accesoDisciplina();
  if (!acceso) return { success: false, message: t('errors.sinPermiso') };

  const idIncidencia = Number(formData.get('id_incidencia'));
  if (!Number.isInteger(idIncidencia) || idIncidencia <= 0) return { success: false, message: t('errors.incidenciaInvalida') };

  const { validarEvidencia, subirArchivo, borrarArchivo, almacenamientoConfigurado } = await import('@/lib/blob');
  const campo = formData.get('archivo');
  const archivo = campo instanceof File ? campo : null;
  const errorArchivo = validarEvidencia(archivo);
  if (errorArchivo || !archivo) return { success: false, message: t(`errors.${errorArchivo ?? 'archivoVacio'}`) };
  if (!almacenamientoConfigurado()) return { success: false, message: t('errors.almacenamientoNoConfigurado') };

  const connection = await getTransaction();
  let url: string | null = null;
  let confirmado = false;
  try {
    const [rows] = await connection.query<RowDataPacket[]>(
      'SELECT estado, registrada_por FROM incidencia WHERE id_incidencia = ? FOR UPDATE',
      [idIncidencia]
    );
    if (!rows[0] || (!acceso.ver && rows[0].registrada_por !== acceso.idUsuario)) {
      await connection.rollback();
      return { success: false, message: t('errors.noExiste') };
    }
    if (!puedeAdjuntarEvidencia(acceso, rows[0] as { estado: EstadoIncidencia; registrada_por: number | null })) {
      await connection.rollback();
      return { success: false, message: t(rows[0].estado === 'Resuelta' ? 'errors.incidenciaResuelta' : 'errors.sinPermiso') };
    }
    const [cuenta] = await connection.query<RowDataPacket[]>(
      'SELECT COUNT(*) AS n FROM evidencia_incidencia WHERE id_incidencia = ?',
      [idIncidencia]
    );
    if (Number(cuenta[0].n) >= MAX_EVIDENCIAS) {
      await connection.rollback();
      return { success: false, message: t('errors.maxEvidencias', { max: MAX_EVIDENCIAS }) };
    }

    url = await subirArchivo(archivo, 'evidencias', String(idIncidencia));
    const nombre = archivo.name.slice(0, 150) || 'evidencia';
    const [res] = await connection.execute<ResultSetHeader>(
      'INSERT INTO evidencia_incidencia (id_incidencia, archivo_ruta, archivo_nombre, mime_type, subida_por) VALUES (?, ?, ?, ?, ?)',
      [idIncidencia, url, nombre, archivo.type, acceso.idUsuario]
    );
    await registrarAuditoria(connection, {
      idUsuario: acceso.idUsuario,
      tabla: 'evidencia_incidencia',
      idRegistro: res.insertId,
      accion: 'INSERT',
      datos: { id_incidencia: idIncidencia, archivo_ruta: url, archivo_nombre: nombre, mime_type: archivo.type },
    });
    await connection.commit();
    confirmado = true;
    revalidatePath(`/dashboard/incidencias/${idIncidencia}`);
    return { success: true, message: t('evidenciaSubida') };
  } catch (error) {
    await connection.rollback();
    // el archivo ya subido quedaria sin fila que lo referencie
    if (!confirmado) await borrarArchivo(url);
    console.error('Error subiendo evidencia:', error);
    return { success: false, message: t('errors.evidenciaError') };
  } finally {
    connection.release();
  }
}

/**Campos: id_evidencia. La quita quien resuelve o quien la subio, mientras la incidencia no este resuelta */
export async function eliminarEvidencia(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const t = await getTranslations('incidencias');
  const acceso = await accesoDisciplina();
  if (!acceso) return { success: false, message: t('errors.sinPermiso') };

  const idEvidencia = Number(formData.get('id_evidencia'));
  if (!Number.isInteger(idEvidencia) || idEvidencia <= 0) return { success: false, message: t('errors.evidenciaInvalida') };

  const connection = await getTransaction();
  try {
    const [rows] = await connection.query<RowDataPacket[]>(
      `SELECT ev.id_incidencia, ev.archivo_ruta, ev.archivo_nombre, ev.subida_por, i.estado
         FROM evidencia_incidencia ev INNER JOIN incidencia i ON i.id_incidencia = ev.id_incidencia
        WHERE ev.id_evidencia = ? FOR UPDATE`,
      [idEvidencia]
    );
    const ev = rows[0];
    if (!ev || (!acceso.resolver && ev.subida_por !== acceso.idUsuario)) {
      await connection.rollback();
      return { success: false, message: t('errors.evidenciaInvalida') };
    }
    if (ev.estado === 'Resuelta') {
      await connection.rollback();
      return { success: false, message: t('errors.incidenciaResuelta') };
    }
    await connection.execute('DELETE FROM evidencia_incidencia WHERE id_evidencia = ?', [idEvidencia]);
    await registrarAuditoria(connection, {
      idUsuario: acceso.idUsuario,
      tabla: 'evidencia_incidencia',
      idRegistro: idEvidencia,
      accion: 'DELETE',
      datosAnteriores: { id_incidencia: ev.id_incidencia, archivo_ruta: ev.archivo_ruta, archivo_nombre: ev.archivo_nombre },
    });
    await connection.commit();
    const { borrarArchivo } = await import('@/lib/blob');
    await borrarArchivo(ev.archivo_ruta);
    revalidatePath(`/dashboard/incidencias/${ev.id_incidencia}`);
    return { success: true, message: t('evidenciaEliminada') };
  } catch (error) {
    await connection.rollback();
    console.error('Error eliminando evidencia:', error);
    return { success: false, message: t('errors.evidenciaError') };
  } finally {
    connection.release();
  }
}
