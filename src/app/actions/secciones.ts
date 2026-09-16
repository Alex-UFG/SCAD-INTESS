'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { getTranslations } from 'next-intl/server';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { db, getTransaction, isDuplicateEntry } from '@/lib/db';
import { requireSession } from '@/lib/session';
import { registrarAuditoria } from '@/lib/audit';
import { DUI_REGEX } from '@/lib/validation';
import type { ActionState } from '@/types/actions';

// Roles: 1 Admin, 2 Director, 3 Coordinador, 4 Secretaria (002_seed.sql);
// coincide con la visibilidad del item "secciones" en el sidebar.
const ROLES_GESTION = [1, 2, 3, 4];

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
  dui_docente_guia: string | null;
  especialidad_nombre: string;
  ciclo_anio: number;
}

export async function getSecciones(): Promise<SeccionDetalle[]> {
  const [rows] = await db.query<RowDataPacket[]>(`
    SELECT s.id_seccion, s.nombre, s.grado, s.capacidad_max, s.dui_docente_guia,
           e.nombre AS especialidad_nombre, c.anio AS ciclo_anio
    FROM seccion s
    INNER JOIN especialidad e ON s.id_especialidad = e.id_especialidad
    INNER JOIN ciclo_escolar c ON s.id_ciclo = c.id_ciclo
    ORDER BY c.anio DESC, s.grado, s.nombre
  `);
  return rows as SeccionDetalle[];
}

export async function getCiclosAbiertos(): Promise<CicloEscolar[]> {
  const [rows] = await db.query<RowDataPacket[]>(
    "SELECT id_ciclo, anio, estado FROM ciclo_escolar WHERE estado <> 'Cerrado' ORDER BY anio DESC"
  );
  return rows as CicloEscolar[];
}

const buildSeccionSchema = (t: (key: string) => string) =>
  z.object({
    nombre: z.string().trim().min(1, t('nombreRequerido')).max(10),
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

export async function crearSeccion(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const t = await getTranslations('secciones');

  const session = await requireSession();
  if (!session) {
    return { success: false, message: t('errors.noAutorizado') };
  }
  if (!ROLES_GESTION.includes(session.user.rol)) {
    return { success: false, message: t('errors.sinPermiso') };
  }

  const userId = Number(session.user.id);

  const rawData = {
    nombre: formData.get('nombre'),
    grado: formData.get('grado'),
    id_especialidad: formData.get('id_especialidad'),
    id_ciclo: formData.get('id_ciclo'),
    // '' o campo ausente significan "sin docente guia" (columna NULL)
    dui_docente_guia: formData.get('dui_docente_guia') || null,
    // vacio deja actuar al default(40) del schema; '0' sigue fallando min(10)
    capacidad_max: formData.get('capacidad_max') || undefined,
  };

  const validation = buildSeccionSchema((key) => t(`errors.${key}`)).safeParse(rawData);
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
    const [result] = await connection.execute<ResultSetHeader>(
      `INSERT INTO seccion
        (nombre, grado, id_especialidad, id_ciclo, dui_docente_guia, capacidad_max)
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
      idUsuario: userId,
      tabla: 'seccion',
      idRegistro: String(result.insertId),
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
