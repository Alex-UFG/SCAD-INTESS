'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { getTranslations } from 'next-intl/server';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { db, getTransaction, isDuplicateEntry } from '@/lib/db';
import { requireSession, requirePermiso } from '@/lib/session';
import { registrarAuditoria } from '@/lib/audit';
import { DUI_REGEX } from '@/lib/validations/shared';
import type { ActionState } from '@/types/actions';

export interface CicloEscolar {
  id_ciclo: number;
  anio: number;
  estado: string;
}

export interface SeccionDetalle {
  id_seccion: number;
  nombre: string;
  grado: number;
  capacidad_max: number;
  id_especialidad: number;
  id_ciclo: number;
  dui_docente_guia: string | null;
  docente_guia: string | null;
  especialidad_nombre: string;
  ciclo_anio: number;
  ciclo_estado: string;
  /**Matriculas Vigentes */
  vigentes: number;
}

async function exigirSesion() {
  const session = await requireSession();
  if (!session) throw new Error('UNAUTHORIZED');
  return session;
}

const SELECT_SECCION = `
  SELECT s.id_seccion, s.nombre, s.grado, s.capacidad_max, s.id_especialidad, s.id_ciclo, s.dui_docente_guia,
         CONCAT_WS(' ', d.primer_nombre, d.primer_apellido) AS docente_guia,
         e.nombre AS especialidad_nombre, c.anio AS ciclo_anio, c.estado AS ciclo_estado,
         (SELECT COUNT(*) FROM matricula m WHERE m.id_seccion = s.id_seccion AND m.estado = 'Vigente') AS vigentes
    FROM seccion s
    INNER JOIN especialidad e ON s.id_especialidad = e.id_especialidad
    INNER JOIN ciclo_escolar c ON s.id_ciclo = c.id_ciclo
    LEFT JOIN docente d ON d.dui_docente = s.dui_docente_guia`;

function mapSeccion(r: RowDataPacket): SeccionDetalle {
  return { ...(r as SeccionDetalle), vigentes: Number(r.vigentes ?? 0) };
}

export async function getSecciones(idCiclo?: number): Promise<SeccionDetalle[]> {
  await exigirSesion();
  const [rows] = await db.query<RowDataPacket[]>(
    `${SELECT_SECCION} ${idCiclo ? 'WHERE s.id_ciclo = ?' : ''} ORDER BY c.anio DESC, s.grado, s.nombre`,
    idCiclo ? [idCiclo] : []
  );
  return rows.map(mapSeccion);
}

export async function getSeccionPorId(idSeccion: number): Promise<SeccionDetalle | null> {
  await exigirSesion();
  const [rows] = await db.query<RowDataPacket[]>(`${SELECT_SECCION} WHERE s.id_seccion = ?`, [idSeccion]);
  return rows[0] ? mapSeccion(rows[0]) : null;
}

export async function getCiclosAbiertos(): Promise<CicloEscolar[]> {
  await exigirSesion();
  const [rows] = await db.query<RowDataPacket[]>(
    "SELECT id_ciclo, anio, estado FROM ciclo_escolar WHERE estado <> 'Cerrado' ORDER BY anio DESC"
  );
  return rows as CicloEscolar[];
}

const buildSeccionSchema = (t: (key: string) => string) =>
  z.object({
    nombre: z.string().trim().toUpperCase().min(1, t('nombreRequerido')).max(10),
    grado: z.coerce.number().int().min(1, t('gradoInvalido')).max(3, t('gradoInvalido')),
    id_especialidad: z.coerce.number().int().positive(t('especialidadInvalida')),
    id_ciclo: z.coerce.number().int().positive(t('cicloInvalido')),
    dui_docente_guia: z.string().regex(DUI_REGEX, t('duiFormato')).nullable(),
    capacidad_max: z.coerce
      .number()
      .int()
      .min(10, t('capacidadMin'))
      .max(60, t('capacidadMax'))
      .default(40),
  });

function leer(formData: FormData) {
  return {
    nombre: formData.get('nombre'),
    grado: formData.get('grado'),
    id_especialidad: formData.get('id_especialidad'),
    id_ciclo: formData.get('id_ciclo'),
    dui_docente_guia: formData.get('dui_docente_guia') || null,
    capacidad_max: formData.get('capacidad_max') || 40,
  };
}

/**El docente guia, si se indica, debe existir y estar Activo */
async function docenteGuiaValido(connection: Awaited<ReturnType<typeof getTransaction>>, dui: string | null): Promise<boolean> {
  if (!dui) return true;
  const [rows] = await connection.query<RowDataPacket[]>("SELECT 1 FROM docente WHERE dui_docente = ? AND estado = 'Activo'", [dui]);
  return rows.length > 0;
}

export async function crearSeccion(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const t = await getTranslations('secciones');

  const session = await requirePermiso('config.catalogos');
  if (!session) {
    return { success: false, message: t('errors.sinPermiso') };
  }

  const validation = buildSeccionSchema((key) => t(`errors.${key}`)).safeParse(leer(formData));
  if (!validation.success) {
    return {
      success: false,
      errors: validation.error.flatten().fieldErrors,
      message: t('errors.revisarCampos'),
    };
  }

  const data = validation.data;
  const connection = await getTransaction();

  try {
    const [ciclo] = await connection.query<RowDataPacket[]>('SELECT estado FROM ciclo_escolar WHERE id_ciclo = ?', [data.id_ciclo]);
    if (!ciclo[0]) { await connection.rollback(); return { success: false, message: t('errors.cicloInvalido') }; }
    if (ciclo[0].estado === 'Cerrado') { await connection.rollback(); return { success: false, message: t('errors.cicloCerrado') }; }
    if (!(await docenteGuiaValido(connection, data.dui_docente_guia))) {
      await connection.rollback();
      return { success: false, errors: { dui_docente_guia: [t('errors.docenteNoExiste')] }, message: t('errors.revisarCampos') };
    }

    const [result] = await connection.execute<ResultSetHeader>(
      `INSERT INTO seccion (nombre, grado, id_especialidad, id_ciclo, dui_docente_guia, capacidad_max)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        data.nombre,
        data.grado,
        data.id_especialidad,
        data.id_ciclo,
        data.dui_docente_guia,
        data.capacidad_max,
      ]
    );

    await registrarAuditoria(connection, {
      idUsuario: Number(session.user.id),
      tabla: 'seccion',
      idRegistro: result.insertId,
      accion: 'INSERT',
      datos: data,
    });

    await connection.commit();

    revalidatePath('/dashboard/secciones');
    return { success: true, message: t('exito') };
  } catch (error) {
    await connection.rollback();
    if (isDuplicateEntry(error)) {
      return { success: false, message: t('errors.duplicada') };
    }
    console.error('Error creating seccion:', error);
    return { success: false, message: t('errors.errorServidor') };
  } finally {
    connection.release();
  }
}

/**
 * Edita una seccion. Con matriculas registradas solo cambian el docente guia y
 * la capacidad (nunca por debajo de las matriculas Vigentes); sin matriculas
 * cambia todo menos el ciclo.
 */
export async function editarSeccion(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const t = await getTranslations('secciones');
  const session = await requirePermiso('config.catalogos');
  if (!session) return { success: false, message: t('errors.sinPermiso') };

  const id = z.coerce.number().int().positive().safeParse(formData.get('id_seccion'));
  const validation = buildSeccionSchema((key) => t(`errors.${key}`)).safeParse(leer(formData));
  if (!id.success || !validation.success) {
    return { success: false, errors: validation.success ? undefined : validation.error.flatten().fieldErrors, message: t('errors.revisarCampos') };
  }
  const data = validation.data;
  const connection = await getTransaction();
  try {
    const [rows] = await connection.query<RowDataPacket[]>(`${SELECT_SECCION} WHERE s.id_seccion = ? FOR UPDATE`, [id.data]);
    if (!rows[0]) { await connection.rollback(); return { success: false, message: t('errors.noExiste') }; }
    const actual = mapSeccion(rows[0]);
    if (actual.ciclo_estado === 'Cerrado') { await connection.rollback(); return { success: false, message: t('errors.cicloCerrado') }; }
    if (data.id_ciclo !== actual.id_ciclo) { await connection.rollback(); return { success: false, message: t('errors.cicloNoEditable') }; }

    const [matriculas] = await connection.query<RowDataPacket[]>('SELECT 1 FROM matricula WHERE id_seccion = ? LIMIT 1', [id.data]);
    const tieneMatriculas = matriculas.length > 0;
    const cambiaEstructura = data.nombre !== actual.nombre || data.grado !== actual.grado || data.id_especialidad !== actual.id_especialidad;
    if (tieneMatriculas && cambiaEstructura) { await connection.rollback(); return { success: false, message: t('errors.tieneMatriculas') }; }
    if (data.capacidad_max < actual.vigentes) {
      await connection.rollback();
      return { success: false, errors: { capacidad_max: [t('errors.capacidadMenorQueVigentes', { vigentes: actual.vigentes })] }, message: t('errors.revisarCampos') };
    }
    if (!(await docenteGuiaValido(connection, data.dui_docente_guia))) {
      await connection.rollback();
      return { success: false, errors: { dui_docente_guia: [t('errors.docenteNoExiste')] }, message: t('errors.revisarCampos') };
    }

    await connection.execute(
      'UPDATE seccion SET nombre = ?, grado = ?, id_especialidad = ?, dui_docente_guia = ?, capacidad_max = ? WHERE id_seccion = ?',
      [data.nombre, data.grado, data.id_especialidad, data.dui_docente_guia, data.capacidad_max, id.data]
    );
    await registrarAuditoria(connection, {
      idUsuario: Number(session.user.id),
      tabla: 'seccion',
      idRegistro: id.data,
      accion: 'UPDATE',
      datosAnteriores: {
        nombre: actual.nombre, grado: actual.grado, id_especialidad: actual.id_especialidad,
        dui_docente_guia: actual.dui_docente_guia, capacidad_max: actual.capacidad_max,
      },
      datos: data,
    });
    await connection.commit();
    revalidatePath('/dashboard/secciones');
    return { success: true, message: t('actualizada') };
  } catch (error) {
    await connection.rollback();
    if (isDuplicateEntry(error)) return { success: false, message: t('errors.duplicada') };
    console.error('Error editando seccion:', error);
    return { success: false, message: t('errors.errorServidor') };
  } finally {
    connection.release();
  }
}
