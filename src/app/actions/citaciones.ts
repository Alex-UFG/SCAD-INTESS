'use server';

import { revalidatePath } from 'next/cache';
import { getTranslations } from 'next-intl/server';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { db, getTransaction } from '@/lib/db';
import { requirePermiso } from '@/lib/permisos';
import { accesoDisciplina } from '@/lib/acceso-disciplina';
import { registrarAuditoria } from '@/lib/audit';
import { notificarUsuario } from '@/lib/notificaciones';
import {
  TRANSICIONES_CITACION,
  ahoraLocal,
  puedeTransicionar,
  type EstadoCitacion,
  type TipoFalta,
} from '@/lib/disciplina';
import { cambioEstadoCitacionSchema, citacionSchema } from '@/lib/validations/disciplina';
import type { Parentesco } from '@/types/persona';
import type { ActionState } from '@/types/actions';

export interface CitacionRow {
  id_citacion: number;
  id_incidencia: number;
  nie: number;
  estudiante: string;
  tipo_falta: TipoFalta;
  dui_tutor: string;
  tutor: string;
  telefono: string;
  /**null si el tutor fue desvinculado despues de emitir */
  parentesco: Parentesco | null;
  /**YYYY-MM-DD HH:mm, hora de El Salvador */
  fecha_emision: string;
  /**YYYY-MM-DD HH:mm, hora de El Salvador */
  fecha_citacion: string;
  estado: EstadoCitacion;
  observaciones: string | null;
}

export interface CitacionDetalle extends CitacionRow {
  /**YYYY-MM-DD */
  fecha_incidencia: string;
  descripcion: string;
  /**Seccion vigente del estudiante en el ciclo de la incidencia, ej. "2° B" */
  seccion: string | null;
}

const NOMBRE_ESTUDIANTE = "CONCAT_WS(' ', e.primer_nombre, e.segundo_nombre, e.primer_apellido, e.segundo_apellido)";
const NOMBRE_TUTOR = "CONCAT_WS(' ', tu.primer_nombre, tu.segundo_nombre, tu.primer_apellido, tu.segundo_apellido)";

const CAMPOS_CITACION = `
  ci.id_citacion, ci.id_incidencia, i.nie, ${NOMBRE_ESTUDIANTE} AS estudiante, i.tipo_falta,
  ci.dui_tutor, ${NOMBRE_TUTOR} AS tutor, tu.telefono_principal AS telefono, et.parentesco,
  DATE_FORMAT(ci.fecha_emision, '%Y-%m-%d %H:%i') AS fecha_emision,
  DATE_FORMAT(ci.fecha_citacion, '%Y-%m-%d %H:%i') AS fecha_citacion,
  ci.estado, ci.observaciones`;

const FUENTE_CITACION = `
  FROM citacion ci
  INNER JOIN incidencia i ON i.id_incidencia = ci.id_incidencia
  INNER JOIN estudiante e ON e.nie = i.nie
  INNER JOIN tutor tu ON tu.dui_tutor = ci.dui_tutor
  LEFT JOIN estudiante_tutor et ON et.nie = i.nie AND et.dui_tutor = ci.dui_tutor`;

const texto = (formData: FormData, campo: string) => {
  const v = formData.get(campo);
  return typeof v === 'string' ? v : undefined;
};

/**
 * Con `disciplina.ver` o `disciplina.citar` se listan todas; quien solo
 * reporta ve las citaciones de las incidencias que registro.
 */
export async function getCitaciones(filtro: { estado?: EstadoCitacion; idIncidencia?: number } = {}): Promise<CitacionRow[]> {
  const acceso = await accesoDisciplina();
  if (!acceso) return [];

  const cond: string[] = [];
  const params: (string | number)[] = [];
  if (!acceso.ver && !acceso.citar) { cond.push('i.registrada_por = ?'); params.push(acceso.idUsuario); }
  if (filtro.estado) { cond.push('ci.estado = ?'); params.push(filtro.estado); }
  if (filtro.idIncidencia) { cond.push('ci.id_incidencia = ?'); params.push(filtro.idIncidencia); }

  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT ${CAMPOS_CITACION} ${FUENTE_CITACION}
      ${cond.length ? `WHERE ${cond.join(' AND ')}` : ''}
      ORDER BY ci.fecha_citacion DESC, ci.id_citacion DESC`,
    params
  );
  return rows as CitacionRow[];
}

/**Datos para imprimir la citacion */
export async function getCitacionPorId(idCitacion: number): Promise<CitacionDetalle | null> {
  const acceso = await accesoDisciplina();
  if (!acceso || !Number.isInteger(idCitacion) || idCitacion <= 0) return null;

  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT ${CAMPOS_CITACION}, i.registrada_por,
            DATE_FORMAT(i.fecha_incidencia, '%Y-%m-%d') AS fecha_incidencia, i.descripcion,
            (SELECT CONCAT(s.grado, '° ', s.nombre)
               FROM matricula m
               INNER JOIN seccion s ON s.id_seccion = m.id_seccion
               INNER JOIN periodo_evaluativo p ON p.id_ciclo = m.id_ciclo
              WHERE m.nie = i.nie AND p.id_periodo = i.id_periodo AND m.estado = 'Vigente' LIMIT 1) AS seccion
     ${FUENTE_CITACION}
      WHERE ci.id_citacion = ?`,
    [idCitacion]
  );
  const fila = rows[0];
  if (!fila) return null;
  if (!acceso.ver && !acceso.citar && fila.registrada_por !== acceso.idUsuario) return null;
  const { registrada_por: _registradaPor, ...citacion } = fila;
  void _registradaPor;
  return citacion as CitacionDetalle;
}

/**
 * Campos: id_incidencia, dui_tutor, fecha_citacion (YYYY-MM-DDTHH:mm, hora de
 * El Salvador), observaciones. El tutor debe estar vinculado al estudiante de
 * la incidencia. Avisa a quien registro la incidencia.
 */
export async function emitirCitacion(_prev: ActionState, formData: FormData): Promise<ActionState & { id?: number }> {
  const t = await getTranslations('citaciones');
  const session = await requirePermiso('disciplina.citar');
  if (!session) return { success: false, message: t('errors.sinPermiso') };

  const parsed = citacionSchema((k) => t(`errors.${k}`)).safeParse({
    id_incidencia: texto(formData, 'id_incidencia'),
    dui_tutor: texto(formData, 'dui_tutor'),
    fecha_citacion: texto(formData, 'fecha_citacion'),
    observaciones: texto(formData, 'observaciones'),
  });
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors, message: t('errors.revisarCampos') };
  }
  const d = parsed.data;
  const fechaCitacion = d.fecha_citacion.replace('T', ' ');
  const ahora = ahoraLocal();
  if (fechaCitacion <= ahora) {
    return { success: false, errors: { fecha_citacion: [t('errors.fechaPasada')] }, message: t('errors.fechaPasada') };
  }

  const idUsuario = Number(session.user.id);
  const connection = await getTransaction();
  try {
    const [incidencias] = await connection.query<RowDataPacket[]>(
      `SELECT i.nie, i.registrada_por, CONCAT_WS(' ', e.primer_nombre, e.primer_apellido) AS estudiante
         FROM incidencia i INNER JOIN estudiante e ON e.nie = i.nie
        WHERE i.id_incidencia = ?`,
      [d.id_incidencia]
    );
    const incidencia = incidencias[0];
    if (!incidencia) {
      await connection.rollback();
      return { success: false, message: t('errors.incidenciaNoExiste') };
    }
    const [vinculo] = await connection.query<RowDataPacket[]>(
      'SELECT 1 FROM estudiante_tutor WHERE nie = ? AND dui_tutor = ?',
      [incidencia.nie, d.dui_tutor]
    );
    if (!vinculo[0]) {
      await connection.rollback();
      return { success: false, errors: { dui_tutor: [t('errors.tutorNoVinculado')] }, message: t('errors.tutorNoVinculado') };
    }

    const [res] = await connection.execute<ResultSetHeader>(
      'INSERT INTO citacion (id_incidencia, dui_tutor, fecha_emision, fecha_citacion, observaciones) VALUES (?, ?, ?, ?, ?)',
      [d.id_incidencia, d.dui_tutor, `${ahora}:00`, `${fechaCitacion}:00`, d.observaciones || null]
    );
    const id = res.insertId;
    await registrarAuditoria(connection, {
      idUsuario,
      tabla: 'citacion',
      idRegistro: id,
      accion: 'INSERT',
      datos: { ...d, fecha_citacion: fechaCitacion },
    });
    if (incidencia.registrada_por && incidencia.registrada_por !== idUsuario) {
      const datos = { nombre: incidencia.estudiante, fecha: fechaCitacion };
      await notificarUsuario(connection, incidencia.registrada_por, {
        tipo: 'Citacion',
        titulo: t('notifTitulo', datos),
        mensaje: t('notifMensaje', datos),
        referenciaTipo: 'citacion',
        referenciaId: id,
      });
    }
    await connection.commit();
    revalidatePath('/dashboard/citaciones');
    revalidatePath(`/dashboard/incidencias/${d.id_incidencia}`);
    revalidatePath('/', 'layout'); // contador de notificaciones del encabezado
    return { success: true, message: t('emitida'), id };
  } catch (error) {
    await connection.rollback();
    console.error('Error emitiendo citacion:', error);
    return { success: false, message: t('errors.errorServidor') };
  } finally {
    connection.release();
  }
}

/**Campos: id_citacion, estado, observaciones (opcional; si viene, reemplaza la anterior) */
export async function cambiarEstadoCitacion(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const t = await getTranslations('citaciones');
  const session = await requirePermiso('disciplina.citar');
  if (!session) return { success: false, message: t('errors.sinPermiso') };

  const parsed = cambioEstadoCitacionSchema((k) => t(`errors.${k}`)).safeParse({
    id_citacion: texto(formData, 'id_citacion'),
    estado: texto(formData, 'estado'),
    observaciones: texto(formData, 'observaciones'),
  });
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? t('errors.revisarCampos') };
  const d = parsed.data;

  const connection = await getTransaction();
  try {
    const [rows] = await connection.query<RowDataPacket[]>(
      `SELECT id_incidencia, estado, observaciones, DATE_FORMAT(fecha_citacion, '%Y-%m-%d %H:%i') AS fecha_citacion
         FROM citacion WHERE id_citacion = ? FOR UPDATE`,
      [d.id_citacion]
    );
    const actual = rows[0];
    if (!actual) {
      await connection.rollback();
      return { success: false, message: t('errors.noExiste') };
    }
    if (!puedeTransicionar(TRANSICIONES_CITACION, actual.estado as EstadoCitacion, d.estado)) {
      await connection.rollback();
      return { success: false, message: t('errors.transicionInvalida') };
    }
    // no se puede faltar a una reunion que aun no ocurre
    if (d.estado === 'No_Asistio' && actual.fecha_citacion > ahoraLocal()) {
      await connection.rollback();
      return { success: false, message: t('errors.reunionPendiente') };
    }

    const observaciones = d.observaciones || actual.observaciones;
    await connection.execute('UPDATE citacion SET estado = ?, observaciones = ? WHERE id_citacion = ?', [d.estado, observaciones, d.id_citacion]);
    await registrarAuditoria(connection, {
      idUsuario: Number(session.user.id),
      tabla: 'citacion',
      idRegistro: d.id_citacion,
      accion: 'UPDATE',
      datosAnteriores: { estado: actual.estado, observaciones: actual.observaciones },
      datos: { estado: d.estado, observaciones },
    });
    await connection.commit();
    revalidatePath('/dashboard/citaciones');
    revalidatePath(`/dashboard/incidencias/${actual.id_incidencia}`);
    return { success: true, message: t('estadoActualizado') };
  } catch (error) {
    await connection.rollback();
    console.error('Error cambiando estado de citacion:', error);
    return { success: false, message: t('errors.errorServidor') };
  } finally {
    connection.release();
  }
}
