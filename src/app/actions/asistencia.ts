'use server';

import { revalidatePath } from 'next/cache';
import { getTranslations } from 'next-intl/server';
import { RowDataPacket } from 'mysql2';
import { db, getTransaction } from '@/lib/db';
import { requirePermiso } from '@/lib/permisos';
import { registrarAuditoria } from '@/lib/audit';
import { guardarPaseListaSchema } from '@/lib/validations/asistencia';
import { UMBRAL_INASISTENCIA, hoyISO, porcentajeAsistencia, type EstadoAsistencia } from '@/lib/asistencia';
import { getCargaPorId, type CargaRow } from '@/app/actions/cargas';
import { getDocentePorUsuario } from '@/app/actions/docentes';
import type { ActionState } from '@/types/actions';

/**Dias hacia atras que un docente puede registrar o corregir asistencia */
const DIAS_EDICION_DOCENTE = 7;

export interface FilaPaseLista {
  nie: number;
  nombre: string;
  /**null si aun no hay registro en esa fecha */
  estado: EstadoAsistencia | null;
  observacion: string | null;
}

export interface PaseLista {
  carga: CargaRow;
  fecha: string;
  filas: FilaPaseLista[];
}

export interface ResumenAsistenciaRow {
  nie: number;
  nombre: string;
  seccion: string;
  total: number;
  presentes: number;
  ausentes: number;
  tardanzas: number;
  justificados: number;
  /**null sin registros */
  porcentaje: number | null;
}

export interface DetalleAsistenciaRow {
  fecha: string;
  materia: string;
  estado: EstadoAsistencia;
  observacion: string | null;
}

export interface IndicadoresAsistencia {
  ausenciasHoy: number;
  bajoUmbral: number;
}

function restarDias(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - dias);
  return d.toISOString().slice(0, 10);
}

/**Docente: solo sus cargas. Sin perfil docente (direccion/admin): cualquiera. Devuelve la carga y si el usuario es docente */
async function cargaAccesible(idCarga: number, idUsuario: number): Promise<{ carga: CargaRow; esDocente: boolean } | null> {
  const [carga, docente] = await Promise.all([getCargaPorId(idCarga), getDocentePorUsuario(idUsuario)]);
  if (!carga) return null;
  if (docente && carga.dui_docente !== docente.dui_docente) return null;
  return { carga, esDocente: !!docente };
}

const NOMBRE_ESTUDIANTE = "CONCAT_WS(' ', e.primer_nombre, e.segundo_nombre, e.primer_apellido, e.segundo_apellido)";

export async function getPaseLista(idCarga: number, fecha: string): Promise<PaseLista | null> {
  const session = await requirePermiso('asistencia.ver');
  if (!session) return null;
  const acceso = await cargaAccesible(idCarga, Number(session.user.id));
  if (!acceso) return null;
  const { carga } = acceso;

  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT e.nie, ${NOMBRE_ESTUDIANTE} AS nombre, a.estado, a.observacion
       FROM matricula m
       INNER JOIN estudiante e ON e.nie = m.nie
       LEFT JOIN asistencia a ON a.nie = m.nie AND a.cod_materia = ? AND a.fecha = ?
      WHERE m.id_seccion = ? AND m.id_ciclo = ? AND m.estado = 'Vigente'
      ORDER BY e.primer_apellido, e.segundo_apellido, e.primer_nombre`,
    [carga.cod_materia, fecha, carga.id_seccion, carga.id_ciclo]
  );
  return { carga, fecha, filas: rows.map((r) => ({ nie: r.nie, nombre: r.nombre, estado: r.estado, observacion: r.observacion })) };
}

/**Campos: id_carga, fecha, estado[<nie>], observacion[<nie>]. Estudiantes sin estado se omiten */
export async function guardarPaseLista(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const t = await getTranslations('paseLista');
  const session = await requirePermiso('asistencia.registrar');
  if (!session) return { success: false, message: t('errors.sinPermiso') };

  const registros: { nie: string; estado: string; observacion: string }[] = [];
  for (const [k, v] of formData.entries()) {
    const m = /^estado\[(\d+)\]$/.exec(k);
    if (m && v) registros.push({ nie: m[1], estado: String(v), observacion: String(formData.get(`observacion[${m[1]}]`) ?? '') });
  }
  const parsed = guardarPaseListaSchema((k) => t(`errors.${k}`)).safeParse({
    id_carga: formData.get('id_carga'),
    fecha: formData.get('fecha'),
    registros,
  });
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors, message: parsed.error.issues[0]?.message ?? t('errors.revisarCampos') };
  }
  const d = parsed.data;

  const acceso = await cargaAccesible(d.id_carga, Number(session.user.id));
  if (!acceso) return { success: false, message: t('errors.cargaNoDisponible') };
  const { carga, esDocente } = acceso;

  const hoy = hoyISO();
  const [[ciclo]] = await db.query<RowDataPacket[]>(
    'SELECT DATE_FORMAT(fecha_inicio, "%Y-%m-%d") AS inicio, DATE_FORMAT(fecha_fin, "%Y-%m-%d") AS fin FROM ciclo_escolar WHERE id_ciclo = ?',
    [carga.id_ciclo]
  );
  if (d.fecha > hoy || d.fecha < ciclo.inicio || d.fecha > ciclo.fin) return { success: false, message: t('errors.fechaFueraDeRango') };
  if (esDocente && d.fecha < restarDias(hoy, DIAS_EDICION_DOCENTE)) return { success: false, message: t('errors.fechaMuyAntigua') };

  const connection = await getTransaction();
  try {
    const [vigentes] = await connection.query<RowDataPacket[]>(
      "SELECT nie FROM matricula WHERE id_seccion = ? AND id_ciclo = ? AND estado = 'Vigente'",
      [carga.id_seccion, carga.id_ciclo]
    );
    const validos = new Set(vigentes.map((r) => Number(r.nie)));
    if (d.registros.some((r) => !validos.has(r.nie))) {
      await connection.rollback();
      return { success: false, message: t('errors.estudianteInvalido') };
    }

    const [previos] = await connection.query<RowDataPacket[]>(
      'SELECT nie, estado FROM asistencia WHERE cod_materia = ? AND fecha = ? AND nie IN (?) FOR UPDATE',
      [carga.cod_materia, d.fecha, [...validos]]
    );
    const niesEnviados = new Set(d.registros.map((r) => r.nie));
    const anterior = Object.fromEntries(previos.filter((r) => niesEnviados.has(Number(r.nie))).map((r) => [r.nie, r.estado]));

    for (const r of d.registros) {
      await connection.execute(
        `INSERT INTO asistencia (nie, cod_materia, fecha, estado, observacion, dui_docente) VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE estado = VALUES(estado), observacion = VALUES(observacion), dui_docente = VALUES(dui_docente)`,
        [r.nie, carga.cod_materia, d.fecha, r.estado, r.observacion || null, carga.dui_docente]
      );
    }
    await registrarAuditoria(connection, {
      idUsuario: Number(session.user.id),
      tabla: 'asistencia',
      idRegistro: `${d.id_carga}:${d.fecha}`,
      accion: previos.length ? 'UPDATE' : 'INSERT',
      datosAnteriores: previos.length ? anterior : undefined,
      datos: Object.fromEntries(d.registros.map((r) => [r.nie, r.estado])),
    });
    await connection.commit();
    revalidatePath('/dashboard/asistencia');
    revalidatePath('/dashboard');
    revalidatePath('/dashboard/pase-lista');
    return { success: true, message: t('guardada') };
  } catch (error) {
    await connection.rollback();
    console.error('Error guardando pase de lista:', error);
    return { success: false, message: t('errors.errorServidor') };
  } finally {
    connection.release();
  }
}

async function consultarResumen(idCiclo: number, idSeccion?: number, desde?: string, hasta?: string): Promise<ResumenAsistenciaRow[]> {
  const cond = ["m.id_ciclo = ?", "m.estado = 'Vigente'"];
  const params: (number | string)[] = [idCiclo];
  if (idSeccion) { cond.push('m.id_seccion = ?'); params.push(idSeccion); }
  const fechas: string[] = [];
  const pf: string[] = [];
  if (desde) { fechas.push('a.fecha >= ?'); pf.push(desde); }
  if (hasta) { fechas.push('a.fecha <= ?'); pf.push(hasta); }
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT e.nie, ${NOMBRE_ESTUDIANTE} AS nombre, s.nombre AS seccion,
            COUNT(a.id_asistencia) AS total,
            COALESCE(SUM(a.estado = 'Presente'), 0) AS presentes,
            COALESCE(SUM(a.estado = 'Ausente'), 0) AS ausentes,
            COALESCE(SUM(a.estado = 'Tardanza'), 0) AS tardanzas,
            COALESCE(SUM(a.estado = 'Justificado'), 0) AS justificados
       FROM matricula m
       INNER JOIN estudiante e ON e.nie = m.nie
       INNER JOIN seccion s ON s.id_seccion = m.id_seccion
       INNER JOIN ciclo_escolar ce ON ce.id_ciclo = m.id_ciclo
       LEFT JOIN asistencia a ON a.nie = m.nie
            AND a.cod_materia IN (SELECT ca.cod_materia FROM carga_academica ca WHERE ca.id_seccion = m.id_seccion AND ca.id_ciclo = m.id_ciclo)
            AND a.fecha BETWEEN ce.fecha_inicio AND ce.fecha_fin
            ${fechas.map((f) => `AND ${f}`).join(' ')}
      WHERE ${cond.join(' AND ')}
      GROUP BY e.nie, nombre, s.nombre, s.grado
      ORDER BY s.grado, s.nombre, e.primer_apellido, e.primer_nombre`,
    [...pf, ...params]
  );
  return rows.map((r) => {
    const c = { total: Number(r.total), presentes: Number(r.presentes), tardanzas: Number(r.tardanzas), justificados: Number(r.justificados) };
    return { nie: r.nie, nombre: r.nombre, seccion: r.seccion, ...c, ausentes: Number(r.ausentes), porcentaje: porcentajeAsistencia(c) };
  });
}

export async function getResumenAsistencia(filtro: { idCiclo: number; idSeccion?: number; desde?: string; hasta?: string }): Promise<ResumenAsistenciaRow[]> {
  if (!(await requirePermiso('asistencia.ver'))) return [];
  return consultarResumen(filtro.idCiclo, filtro.idSeccion, filtro.desde, filtro.hasta);
}

export async function getDetalleAsistencia(nie: number, idCiclo: number): Promise<DetalleAsistenciaRow[]> {
  if (!(await requirePermiso('asistencia.ver'))) return [];
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT DATE_FORMAT(a.fecha, '%Y-%m-%d') AS fecha, m.nombre AS materia, a.estado, a.observacion
       FROM asistencia a
       INNER JOIN materia m ON m.cod_materia = a.cod_materia
       INNER JOIN ciclo_escolar c ON c.id_ciclo = ? AND a.fecha BETWEEN c.fecha_inicio AND c.fecha_fin
      WHERE a.nie = ?
      ORDER BY a.fecha DESC, m.nombre`,
    [idCiclo, nie]
  );
  return rows as DetalleAsistenciaRow[];
}

export async function getIndicadoresAsistencia(): Promise<IndicadoresAsistencia> {
  if (!(await requirePermiso('asistencia.ver'))) return { ausenciasHoy: 0, bajoUmbral: 0 };
  const [[ausencias], [periodo]] = await Promise.all([
    db.query<RowDataPacket[]>("SELECT COUNT(*) AS n FROM asistencia WHERE estado = 'Ausente' AND fecha = ?", [hoyISO()]),
    db.query<RowDataPacket[]>(
      `SELECT p.id_ciclo, DATE_FORMAT(p.fecha_inicio, '%Y-%m-%d') AS desde, DATE_FORMAT(p.fecha_cierre, '%Y-%m-%d') AS hasta
         FROM periodo_evaluativo p INNER JOIN ciclo_escolar c ON c.id_ciclo = p.id_ciclo
        WHERE c.estado = 'Activo' AND p.estado = 'Abierto' LIMIT 1`
    ),
  ]);
  let bajoUmbral = 0;
  if (periodo[0]) {
    const resumen = await consultarResumen(periodo[0].id_ciclo, undefined, periodo[0].desde, periodo[0].hasta);
    bajoUmbral = resumen.filter((r) => r.porcentaje !== null && r.porcentaje < UMBRAL_INASISTENCIA).length;
  }
  return { ausenciasHoy: Number(ausencias[0].n), bajoUmbral };
}
