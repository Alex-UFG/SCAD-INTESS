'use server';

import { revalidatePath } from 'next/cache';
import { getTranslations } from 'next-intl/server';
import { RowDataPacket } from 'mysql2';
import { z } from 'zod';
import { db, getTransaction, isDuplicateEntry } from '@/lib/db';
import { requireSession, requirePermiso } from '@/lib/session';
import { registrarAuditoria } from '@/lib/audit';
import { createMateriaSchema } from '@/lib/validations/materia';
import type { ActionState } from '@/types/actions';

export interface Materia {
  cod_materia: string;
  nombre: string;
  unidades_valorativas: number;
  id_especialidad: number;
  especialidad_nombre: string;
  grado: number;
  activa: boolean;
  /**Cargas asignadas (una materia con cargas no se elimina, solo se desactiva) */
  cargas: number;
}

async function exigirSesion() {
  const session = await requireSession();
  if (!session) throw new Error('UNAUTHORIZED');
  return session;
}

function mapMateria(r: RowDataPacket): Materia {
  return { ...(r as Materia), activa: Boolean(r.activa), cargas: Number(r.cargas ?? 0) };
}

export async function getMaterias(opts: { soloActivas?: boolean; idEspecialidad?: number; grado?: number } = {}): Promise<Materia[]> {
  await exigirSesion();
  const cond: string[] = [];
  const params: number[] = [];
  if (opts.soloActivas) cond.push('m.activa = TRUE');
  if (opts.idEspecialidad) { cond.push('m.id_especialidad = ?'); params.push(opts.idEspecialidad); }
  if (opts.grado) { cond.push('m.grado = ?'); params.push(opts.grado); }
  const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT m.*, e.nombre AS especialidad_nombre,
            (SELECT COUNT(*) FROM carga_academica c WHERE c.cod_materia = m.cod_materia) AS cargas
       FROM materia m INNER JOIN especialidad e ON e.id_especialidad = m.id_especialidad
       ${where}
      ORDER BY m.grado, e.nombre, m.cod_materia`,
    params
  );
  return rows.map(mapMateria);
}

export async function getMateriaPorCodigo(cod: string): Promise<Materia | null> {
  await exigirSesion();
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT m.*, e.nombre AS especialidad_nombre,
            (SELECT COUNT(*) FROM carga_academica c WHERE c.cod_materia = m.cod_materia) AS cargas
       FROM materia m INNER JOIN especialidad e ON e.id_especialidad = m.id_especialidad
      WHERE m.cod_materia = ?`,
    [cod]
  );
  return rows[0] ? mapMateria(rows[0]) : null;
}

function leer(formData: FormData) {
  return {
    cod_materia: formData.get('cod_materia'),
    nombre: formData.get('nombre'),
    unidades_valorativas: formData.get('unidades_valorativas'),
    id_especialidad: formData.get('id_especialidad'),
    grado: formData.get('grado'),
  };
}

export async function crearMateria(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const t = await getTranslations('materias');
  const session = await requirePermiso('config.catalogos');
  if (!session) return { success: false, message: t('errors.sinPermiso') };

  const parsed = createMateriaSchema((k) => t(`errors.${k}`)).safeParse(leer(formData));
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors, message: t('errors.revisarCampos') };
  }
  const d = parsed.data;
  const connection = await getTransaction();
  try {
    await connection.execute(
      'INSERT INTO materia (cod_materia, nombre, unidades_valorativas, id_especialidad, grado, activa) VALUES (?, ?, ?, ?, ?, TRUE)',
      [d.cod_materia, d.nombre, d.unidades_valorativas, d.id_especialidad, d.grado]
    );
    await registrarAuditoria(connection, {
      idUsuario: Number(session.user.id),
      tabla: 'materia',
      idRegistro: d.cod_materia,
      accion: 'INSERT',
      datos: { ...d, activa: true },
    });
    await connection.commit();
    revalidatePath('/dashboard/materias');
    return { success: true, message: t('creada') };
  } catch (error) {
    await connection.rollback();
    if (isDuplicateEntry(error)) return { success: false, message: t('errors.codigoDuplicado') };
    console.error('Error creando materia:', error);
    return { success: false, message: t('errors.errorServidor') };
  } finally {
    connection.release();
  }
}

/**Edita nombre, unidades, especialidad y grado; el codigo (PK) no cambia */
export async function editarMateria(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const t = await getTranslations('materias');
  const session = await requirePermiso('config.catalogos');
  if (!session) return { success: false, message: t('errors.sinPermiso') };

  const parsed = createMateriaSchema((k) => t(`errors.${k}`)).safeParse(leer(formData));
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors, message: t('errors.revisarCampos') };
  }
  const d = parsed.data;
  const connection = await getTransaction();
  try {
    const [rows] = await connection.query<RowDataPacket[]>('SELECT * FROM materia WHERE cod_materia = ? FOR UPDATE', [d.cod_materia]);
    if (!rows[0]) { await connection.rollback(); return { success: false, message: t('errors.noExiste') }; }

    // con cargas asignadas, cambiar especialidad o grado rompe la coherencia seccion-materia
    if (rows[0].id_especialidad !== d.id_especialidad || rows[0].grado !== d.grado) {
      const [cargas] = await connection.query<RowDataPacket[]>('SELECT 1 FROM carga_academica WHERE cod_materia = ? LIMIT 1', [d.cod_materia]);
      if (cargas[0]) { await connection.rollback(); return { success: false, message: t('errors.tieneCargas') }; }
    }

    await connection.execute(
      'UPDATE materia SET nombre = ?, unidades_valorativas = ?, id_especialidad = ?, grado = ? WHERE cod_materia = ?',
      [d.nombre, d.unidades_valorativas, d.id_especialidad, d.grado, d.cod_materia]
    );
    await registrarAuditoria(connection, {
      idUsuario: Number(session.user.id),
      tabla: 'materia',
      idRegistro: d.cod_materia,
      accion: 'UPDATE',
      datosAnteriores: rows[0],
      datos: d,
    });
    await connection.commit();
    revalidatePath('/dashboard/materias');
    return { success: true, message: t('actualizada') };
  } catch (error) {
    await connection.rollback();
    console.error('Error editando materia:', error);
    return { success: false, message: t('errors.errorServidor') };
  } finally {
    connection.release();
  }
}

/**Las inactivas se conservan por historial y no admiten cargas nuevas (P-05) */
export async function toggleMateriaActiva(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const t = await getTranslations('materias');
  const session = await requirePermiso('config.catalogos');
  if (!session) return { success: false, message: t('errors.sinPermiso') };

  const parsed = z.object({ cod_materia: z.string().trim().toUpperCase().min(1).max(8), activa: z.enum(['0', '1']) })
    .safeParse({ cod_materia: formData.get('cod_materia'), activa: formData.get('activa') });
  if (!parsed.success) return { success: false, message: t('errors.revisarCampos') };
  const activa = parsed.data.activa === '1';

  const connection = await getTransaction();
  try {
    const [rows] = await connection.query<RowDataPacket[]>('SELECT activa FROM materia WHERE cod_materia = ? FOR UPDATE', [parsed.data.cod_materia]);
    if (!rows[0]) { await connection.rollback(); return { success: false, message: t('errors.noExiste') }; }
    await connection.execute('UPDATE materia SET activa = ? WHERE cod_materia = ?', [activa, parsed.data.cod_materia]);
    await registrarAuditoria(connection, {
      idUsuario: Number(session.user.id),
      tabla: 'materia',
      idRegistro: parsed.data.cod_materia,
      accion: 'UPDATE',
      datosAnteriores: { activa: Boolean(rows[0].activa) },
      datos: { activa },
    });
    await connection.commit();
    revalidatePath('/dashboard/materias');
    return { success: true, message: t(activa ? 'activada' : 'desactivada') };
  } catch (error) {
    await connection.rollback();
    console.error('Error cambiando estado de materia:', error);
    return { success: false, message: t('errors.errorServidor') };
  } finally {
    connection.release();
  }
}
