'use server';

import { revalidatePath } from 'next/cache';
import { getTranslations } from 'next-intl/server';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import type { PoolConnection } from 'mysql2/promise';
import { z } from 'zod';
import { db, getTransaction, isDuplicateEntry } from '@/lib/db';
import { requireSession, requirePermiso } from '@/lib/session';
import { registrarAuditoria } from '@/lib/audit';
import { createCicloSchema, createPeriodoSchema, ESTADOS_CICLO, ESTADOS_PERIODO } from '@/lib/validations/ciclo';
import type { ActionState } from '@/types/actions';

export interface Ciclo {
  id_ciclo: number;
  anio: number;
  fecha_inicio: string;
  fecha_fin: string;
  estado: (typeof ESTADOS_CICLO)[number];
  /**Secciones abiertas en el ciclo (para saber si es editable) */
  secciones: number;
}

export interface Periodo {
  id_periodo: number;
  id_ciclo: number;
  numero: number;
  fecha_inicio: string;
  fecha_cierre: string;
  estado: (typeof ESTADOS_PERIODO)[number];
}

const PERIODOS_POR_CICLO = 3;

async function exigirSesion() {
  const session = await requireSession();
  if (!session) throw new Error('UNAUTHORIZED');
  return session;
}

/**DATE de MySQL llega como Date (timezone Z): se expone como YYYY-MM-DD */
function iso(d: Date | string): string {
  return typeof d === 'string' ? d.slice(0, 10) : d.toISOString().slice(0, 10);
}

function mapCiclo(r: RowDataPacket): Ciclo {
  return { ...(r as Ciclo), fecha_inicio: iso(r.fecha_inicio), fecha_fin: iso(r.fecha_fin), secciones: Number(r.secciones ?? 0) };
}

function mapPeriodo(r: RowDataPacket): Periodo {
  return { ...(r as Periodo), fecha_inicio: iso(r.fecha_inicio), fecha_cierre: iso(r.fecha_cierre) };
}

export async function getCiclos(): Promise<Ciclo[]> {
  await exigirSesion();
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT c.*, (SELECT COUNT(*) FROM seccion s WHERE s.id_ciclo = c.id_ciclo) AS secciones
       FROM ciclo_escolar c ORDER BY c.anio DESC`
  );
  return rows.map(mapCiclo);
}

export async function getCicloActivo(): Promise<Ciclo | null> {
  await exigirSesion();
  const [rows] = await db.query<RowDataPacket[]>(
    "SELECT c.*, 0 AS secciones FROM ciclo_escolar c WHERE c.estado = 'Activo' LIMIT 1"
  );
  return rows[0] ? mapCiclo(rows[0]) : null;
}

export async function getCicloPorId(idCiclo: number): Promise<{ ciclo: Ciclo; periodos: Periodo[] } | null> {
  await exigirSesion();
  const [[c], [p]] = await Promise.all([
    db.query<RowDataPacket[]>(
      `SELECT c.*, (SELECT COUNT(*) FROM seccion s WHERE s.id_ciclo = c.id_ciclo) AS secciones
         FROM ciclo_escolar c WHERE c.id_ciclo = ?`,
      [idCiclo]
    ),
    db.query<RowDataPacket[]>('SELECT * FROM periodo_evaluativo WHERE id_ciclo = ? ORDER BY numero', [idCiclo]),
  ]);
  if (!c[0]) return null;
  return { ciclo: mapCiclo(c[0]), periodos: p.map(mapPeriodo) };
}

export async function getPeriodos(idCiclo: number): Promise<Periodo[]> {
  await exigirSesion();
  const [rows] = await db.query<RowDataPacket[]>('SELECT * FROM periodo_evaluativo WHERE id_ciclo = ? ORDER BY numero', [idCiclo]);
  return rows.map(mapPeriodo);
}

/**Periodo Abierto del ciclo Activo (lo consumen notas y asistencia) */
export async function getPeriodoAbierto(): Promise<Periodo | null> {
  await exigirSesion();
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT p.* FROM periodo_evaluativo p
       INNER JOIN ciclo_escolar c ON c.id_ciclo = p.id_ciclo
      WHERE c.estado = 'Activo' AND p.estado = 'Abierto' LIMIT 1`
  );
  return rows[0] ? mapPeriodo(rows[0]) : null;
}

function leerCiclo(formData: FormData) {
  return {
    anio: formData.get('anio'),
    fecha_inicio: formData.get('fecha_inicio'),
    fecha_fin: formData.get('fecha_fin'),
  };
}

/**Divide [inicio, fin] en 3 trimestres consecutivos (editables despues) */
function trimestres(inicio: string, fin: string): { fecha_inicio: string; fecha_cierre: string }[] {
  const a = new Date(`${inicio}T00:00:00Z`).getTime();
  const b = new Date(`${fin}T00:00:00Z`).getTime();
  const dia = 86_400_000;
  const paso = Math.floor((b - a) / PERIODOS_POR_CICLO / dia) * dia;
  const out = [];
  for (let i = 0; i < PERIODOS_POR_CICLO; i++) {
    const ini = a + i * paso + (i > 0 ? dia : 0);
    const cierre = i === PERIODOS_POR_CICLO - 1 ? b : a + (i + 1) * paso;
    out.push({ fecha_inicio: new Date(ini).toISOString().slice(0, 10), fecha_cierre: new Date(cierre).toISOString().slice(0, 10) });
  }
  return out;
}

export async function crearCiclo(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const t = await getTranslations('ciclos');
  const session = await requirePermiso('config.ciclos');
  if (!session) return { success: false, message: t('errors.sinPermiso') };

  const parsed = createCicloSchema((k) => t(`errors.${k}`)).safeParse(leerCiclo(formData));
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors, message: t('errors.revisarCampos') };
  }
  const data = parsed.data;
  const connection = await getTransaction();
  try {
    const [res] = await connection.execute<ResultSetHeader>(
      "INSERT INTO ciclo_escolar (anio, fecha_inicio, fecha_fin, estado) VALUES (?, ?, ?, 'Planificado')",
      [data.anio, data.fecha_inicio, data.fecha_fin]
    );
    const periodos = trimestres(data.fecha_inicio, data.fecha_fin);
    for (let i = 0; i < periodos.length; i++) {
      await connection.execute(
        "INSERT INTO periodo_evaluativo (id_ciclo, numero, fecha_inicio, fecha_cierre, estado) VALUES (?, ?, ?, ?, 'Pendiente')",
        [res.insertId, i + 1, periodos[i].fecha_inicio, periodos[i].fecha_cierre]
      );
    }
    await registrarAuditoria(connection, {
      idUsuario: Number(session.user.id),
      tabla: 'ciclo_escolar',
      idRegistro: res.insertId,
      accion: 'INSERT',
      datos: { ...data, estado: 'Planificado', periodos },
    });
    await connection.commit();
    revalidatePath('/dashboard/ciclos');
    return { success: true, message: t('creado') };
  } catch (error) {
    await connection.rollback();
    if (isDuplicateEntry(error)) return { success: false, message: t('errors.anioDuplicado') };
    console.error('Error creando ciclo:', error);
    return { success: false, message: t('errors.errorServidor') };
  } finally {
    connection.release();
  }
}

export async function editarCiclo(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const t = await getTranslations('ciclos');
  const session = await requirePermiso('config.ciclos');
  if (!session) return { success: false, message: t('errors.sinPermiso') };

  const id = z.coerce.number().int().positive().safeParse(formData.get('id_ciclo'));
  const parsed = createCicloSchema((k) => t(`errors.${k}`)).safeParse(leerCiclo(formData));
  if (!id.success || !parsed.success) {
    return { success: false, errors: parsed.success ? undefined : parsed.error.flatten().fieldErrors, message: t('errors.revisarCampos') };
  }
  const data = parsed.data;
  const connection = await getTransaction();
  try {
    const [rows] = await connection.query<RowDataPacket[]>('SELECT * FROM ciclo_escolar WHERE id_ciclo = ? FOR UPDATE', [id.data]);
    if (!rows[0]) { await connection.rollback(); return { success: false, message: t('errors.noExiste') }; }
    if (rows[0].estado === 'Cerrado') { await connection.rollback(); return { success: false, message: t('errors.cicloCerrado') }; }

    // los periodos deben seguir cabiendo en el ciclo
    const [fuera] = await connection.query<RowDataPacket[]>(
      'SELECT numero FROM periodo_evaluativo WHERE id_ciclo = ? AND (fecha_inicio < ? OR fecha_cierre > ?) LIMIT 1',
      [id.data, data.fecha_inicio, data.fecha_fin]
    );
    if (fuera[0]) { await connection.rollback(); return { success: false, message: t('errors.periodosFuera', { numero: fuera[0].numero }) }; }

    await connection.execute(
      'UPDATE ciclo_escolar SET anio = ?, fecha_inicio = ?, fecha_fin = ? WHERE id_ciclo = ?',
      [data.anio, data.fecha_inicio, data.fecha_fin, id.data]
    );
    await registrarAuditoria(connection, {
      idUsuario: Number(session.user.id),
      tabla: 'ciclo_escolar',
      idRegistro: id.data,
      accion: 'UPDATE',
      datosAnteriores: mapCiclo(rows[0]),
      datos: data,
    });
    await connection.commit();
    revalidatePath('/dashboard/ciclos');
    revalidatePath(`/dashboard/ciclos/${id.data}`);
    return { success: true, message: t('actualizado') };
  } catch (error) {
    await connection.rollback();
    if (isDuplicateEntry(error)) return { success: false, message: t('errors.anioDuplicado') };
    console.error('Error editando ciclo:', error);
    return { success: false, message: t('errors.errorServidor') };
  } finally {
    connection.release();
  }
}

/**
 * Planificado -> Activo (solo puede haber un ciclo Activo) y
 * Activo -> Cerrado (sin periodos Abiertos). No hay vuelta atras.
 */
export async function cambiarEstadoCiclo(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const t = await getTranslations('ciclos');
  const session = await requirePermiso('config.ciclos');
  if (!session) return { success: false, message: t('errors.sinPermiso') };

  const parsed = z
    .object({ id_ciclo: z.coerce.number().int().positive(), estado: z.enum(['Activo', 'Cerrado']) })
    .safeParse({ id_ciclo: formData.get('id_ciclo'), estado: formData.get('estado') });
  if (!parsed.success) return { success: false, message: t('errors.revisarCampos') };
  const { id_ciclo, estado } = parsed.data;

  const connection = await getTransaction();
  try {
    // serializa activaciones concurrentes
    const [activos] = await connection.query<RowDataPacket[]>("SELECT id_ciclo FROM ciclo_escolar WHERE estado = 'Activo' FOR UPDATE");
    const [rows] = await connection.query<RowDataPacket[]>('SELECT * FROM ciclo_escolar WHERE id_ciclo = ? FOR UPDATE', [id_ciclo]);
    const ciclo = rows[0];
    if (!ciclo) { await connection.rollback(); return { success: false, message: t('errors.noExiste') }; }

    if (estado === 'Activo') {
      if (ciclo.estado !== 'Planificado') { await connection.rollback(); return { success: false, message: t('errors.transicionInvalida') }; }
      if (activos.some((a) => a.id_ciclo !== id_ciclo)) { await connection.rollback(); return { success: false, message: t('errors.yaHayActivo') }; }
    } else {
      if (ciclo.estado !== 'Activo') { await connection.rollback(); return { success: false, message: t('errors.transicionInvalida') }; }
      const [abiertos] = await connection.query<RowDataPacket[]>(
        "SELECT numero FROM periodo_evaluativo WHERE id_ciclo = ? AND estado = 'Abierto' LIMIT 1",
        [id_ciclo]
      );
      if (abiertos[0]) { await connection.rollback(); return { success: false, message: t('errors.periodoAbierto', { numero: abiertos[0].numero }) }; }
    }

    await connection.execute('UPDATE ciclo_escolar SET estado = ? WHERE id_ciclo = ?', [estado, id_ciclo]);
    await registrarAuditoria(connection, {
      idUsuario: Number(session.user.id),
      tabla: 'ciclo_escolar',
      idRegistro: id_ciclo,
      accion: 'UPDATE',
      datosAnteriores: { estado: ciclo.estado },
      datos: { estado },
    });
    await connection.commit();
    revalidatePath('/dashboard/ciclos');
    revalidatePath(`/dashboard/ciclos/${id_ciclo}`);
    revalidatePath('/dashboard');
    return { success: true, message: t(estado === 'Activo' ? 'activado' : 'cerrado') };
  } catch (error) {
    await connection.rollback();
    console.error('Error cambiando estado de ciclo:', error);
    return { success: false, message: t('errors.errorServidor') };
  } finally {
    connection.release();
  }
}

async function periodoBloqueado(connection: PoolConnection, idPeriodo: number) {
  const [rows] = await connection.query<RowDataPacket[]>(
    `SELECT p.*, c.estado AS ciclo_estado, c.fecha_inicio AS ciclo_inicio, c.fecha_fin AS ciclo_fin
       FROM periodo_evaluativo p INNER JOIN ciclo_escolar c ON c.id_ciclo = p.id_ciclo
      WHERE p.id_periodo = ? FOR UPDATE`,
    [idPeriodo]
  );
  return rows[0] ?? null;
}

/**Edita fechas de un periodo: dentro del ciclo y sin solaparse con sus hermanos */
export async function guardarPeriodo(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const t = await getTranslations('ciclos');
  const session = await requirePermiso('config.ciclos');
  if (!session) return { success: false, message: t('errors.sinPermiso') };

  const parsed = createPeriodoSchema((k) => t(`errors.${k}`)).safeParse({
    id_periodo: formData.get('id_periodo'),
    fecha_inicio: formData.get('fecha_inicio'),
    fecha_cierre: formData.get('fecha_cierre'),
  });
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors, message: t('errors.revisarCampos') };
  }
  const { id_periodo, fecha_inicio, fecha_cierre } = parsed.data;
  const connection = await getTransaction();
  try {
    const p = await periodoBloqueado(connection, id_periodo);
    if (!p) { await connection.rollback(); return { success: false, message: t('errors.noExiste') }; }
    if (p.ciclo_estado === 'Cerrado' || p.estado === 'Cerrado') { await connection.rollback(); return { success: false, message: t('errors.periodoCerrado') }; }
    if (fecha_inicio < iso(p.ciclo_inicio) || fecha_cierre > iso(p.ciclo_fin)) {
      await connection.rollback();
      return { success: false, message: t('errors.fueraDelCiclo') };
    }
    const [solapa] = await connection.query<RowDataPacket[]>(
      `SELECT numero FROM periodo_evaluativo
        WHERE id_ciclo = ? AND id_periodo <> ? AND NOT (fecha_cierre < ? OR fecha_inicio > ?) LIMIT 1`,
      [p.id_ciclo, id_periodo, fecha_inicio, fecha_cierre]
    );
    if (solapa[0]) { await connection.rollback(); return { success: false, message: t('errors.solapaPeriodo', { numero: solapa[0].numero }) }; }

    await connection.execute('UPDATE periodo_evaluativo SET fecha_inicio = ?, fecha_cierre = ? WHERE id_periodo = ?', [fecha_inicio, fecha_cierre, id_periodo]);
    await registrarAuditoria(connection, {
      idUsuario: Number(session.user.id),
      tabla: 'periodo_evaluativo',
      idRegistro: id_periodo,
      accion: 'UPDATE',
      datosAnteriores: { fecha_inicio: iso(p.fecha_inicio), fecha_cierre: iso(p.fecha_cierre) },
      datos: { fecha_inicio, fecha_cierre },
    });
    await connection.commit();
    revalidatePath(`/dashboard/ciclos/${p.id_ciclo}`);
    return { success: true, message: t('periodoActualizado') };
  } catch (error) {
    await connection.rollback();
    console.error('Error guardando periodo:', error);
    return { success: false, message: t('errors.errorServidor') };
  } finally {
    connection.release();
  }
}

/**
 * Pendiente -> Abierto (ciclo Activo y ningun otro periodo Abierto en el ciclo)
 * y Abierto -> Cerrado. La ventana de 72 h para notas se calcula desde
 * fecha_cierre en el modulo de notas, no aqui.
 */
export async function cambiarEstadoPeriodo(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const t = await getTranslations('ciclos');
  const session = await requirePermiso('config.ciclos');
  if (!session) return { success: false, message: t('errors.sinPermiso') };

  const parsed = z
    .object({ id_periodo: z.coerce.number().int().positive(), estado: z.enum(['Abierto', 'Cerrado']) })
    .safeParse({ id_periodo: formData.get('id_periodo'), estado: formData.get('estado') });
  if (!parsed.success) return { success: false, message: t('errors.revisarCampos') };
  const { id_periodo, estado } = parsed.data;

  const connection = await getTransaction();
  try {
    const p = await periodoBloqueado(connection, id_periodo);
    if (!p) { await connection.rollback(); return { success: false, message: t('errors.noExiste') }; }

    if (estado === 'Abierto') {
      if (p.estado !== 'Pendiente') { await connection.rollback(); return { success: false, message: t('errors.transicionInvalida') }; }
      if (p.ciclo_estado !== 'Activo') { await connection.rollback(); return { success: false, message: t('errors.cicloNoActivo') }; }
      const [abiertos] = await connection.query<RowDataPacket[]>(
        "SELECT numero FROM periodo_evaluativo WHERE id_ciclo = ? AND estado = 'Abierto' FOR UPDATE",
        [p.id_ciclo]
      );
      if (abiertos[0]) { await connection.rollback(); return { success: false, message: t('errors.yaHayAbierto', { numero: abiertos[0].numero }) }; }
    } else if (p.estado !== 'Abierto') {
      await connection.rollback();
      return { success: false, message: t('errors.transicionInvalida') };
    }

    await connection.execute('UPDATE periodo_evaluativo SET estado = ? WHERE id_periodo = ?', [estado, id_periodo]);
    await registrarAuditoria(connection, {
      idUsuario: Number(session.user.id),
      tabla: 'periodo_evaluativo',
      idRegistro: id_periodo,
      accion: 'UPDATE',
      datosAnteriores: { estado: p.estado },
      datos: { estado },
    });
    await connection.commit();
    revalidatePath(`/dashboard/ciclos/${p.id_ciclo}`);
    revalidatePath('/dashboard/notas');
    return { success: true, message: t(estado === 'Abierto' ? 'periodoAbierto' : 'periodoCerrado') };
  } catch (error) {
    await connection.rollback();
    console.error('Error cambiando estado de periodo:', error);
    return { success: false, message: t('errors.errorServidor') };
  } finally {
    connection.release();
  }
}
