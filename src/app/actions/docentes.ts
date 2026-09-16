'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { getTranslations } from 'next-intl/server';
import { RowDataPacket } from 'mysql2';
import { db, getTransaction, isDuplicateEntry } from '@/lib/db';
import { requireSession } from '@/lib/session';
import { registrarAuditoria } from '@/lib/audit';
import { DUI_REGEX, TELEFONO_REGEX, FECHA_ISO_REGEX } from '@/lib/validation';
import type { ActionState } from '@/types/actions';

// Rol 5 = Docente (002_seed.sql). El perfil se liga al id_usuario de la sesion,
// asi que solo un docente puede completar el suyo.
const ROL_DOCENTE = 5;

export interface Especialidad {
  id_especialidad: number;
  nombre: string;
}

export async function getEspecialidadesActivas(): Promise<Especialidad[]> {
  const [rows] = await db.query<RowDataPacket[]>(
    'SELECT id_especialidad, nombre FROM especialidad WHERE activa = TRUE ORDER BY nombre ASC'
  );
  return rows as Especialidad[];
}

// Los mensajes salen del catalogo next-intl (locale de la cookie), asi los
// errores de campo llegan ya traducidos al formulario.
const buildDocenteSchema = (t: (key: string) => string) =>
  z.object({
    dui_docente: z.string().regex(DUI_REGEX, t('duiFormato')),
    primer_nombre: z.string().trim().min(2, t('primerNombreRequerido')).max(50),
    segundo_nombre: z.string().max(50).nullable(),
    primer_apellido: z.string().trim().min(2, t('primerApellidoRequerido')).max(50),
    segundo_apellido: z.string().max(50).nullable(),
    id_especialidad: z.coerce.number().int().positive(t('especialidadInvalida')),
    telefono: z.string().regex(TELEFONO_REGEX, t('telefonoFormato')),
    fecha_ingreso: z
      .string()
      .regex(FECHA_ISO_REGEX, t('fechaInvalida'))
      .refine((val) => !isNaN(Date.parse(val)), t('fechaInvalida')),
  });

export async function completarPerfilDocente(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const t = await getTranslations('docentes');

  const session = await requireSession();
  if (!session) {
    return { success: false, message: t('errors.noAutorizado') };
  }
  if (session.user.rol !== ROL_DOCENTE) {
    return { success: false, message: t('errors.soloDocentes') };
  }

  const userId = Number(session.user.id);

  const rawData = {
    dui_docente: formData.get('dui_docente'),
    primer_nombre: formData.get('primer_nombre'),
    segundo_nombre: formData.get('segundo_nombre') || null,
    primer_apellido: formData.get('primer_apellido'),
    segundo_apellido: formData.get('segundo_apellido') || null,
    id_especialidad: formData.get('id_especialidad'),
    telefono: formData.get('telefono'),
    fecha_ingreso: formData.get('fecha_ingreso'),
  };

  const validation = buildDocenteSchema((key) => t(`errors.${key}`)).safeParse(rawData);
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
    await connection.execute(
      `INSERT INTO docente
        (dui_docente, id_usuario, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, id_especialidad, telefono, estado, fecha_ingreso)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Activo', ?)`,
      [
        data.dui_docente,
        userId,
        data.primer_nombre,
        data.segundo_nombre,
        data.primer_apellido,
        data.segundo_apellido,
        data.id_especialidad,
        data.telefono,
        data.fecha_ingreso,
      ]
    );

    await registrarAuditoria(connection, {
      idUsuario: userId,
      tabla: 'docente',
      idRegistro: data.dui_docente,
      accion: 'INSERT',
      datos: data,
    });

    await connection.commit();

    // El dashboard cuenta docentes en sus indicadores
    revalidatePath('/dashboard');
    return { success: true, message: t('exito') };
  } catch (error) {
    await connection.rollback();
    if (isDuplicateEntry(error)) {
      return { success: false, message: t('errors.duplicado') };
    }
    console.error('Error creating docente:', error);
    return { success: false, message: t('errors.errorServidor') };
  } finally {
    connection.release();
  }
}
