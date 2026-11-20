'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { auth } from '@/auth';

const MateriaSchema = z.object({
  cod_materia: z.string().trim().min(3, 'El código es requerido (ej: SW-003)').max(8, 'Máximo 8 caracteres'),
  nombre: z.string().trim().min(3, 'El nombre es obligatorio'),
  unidades_valorativas: z.coerce.number().int().min(1, 'Mínimo 1 UV').default(1),
  id_especialidad: z.coerce.number().int().positive('Seleccione una especialidad válida'),
  grado: z.coerce.number().int().min(1, 'Grado 1-3').max(3)
});

export type MateriaActionState = { success?: boolean; errors?: Record<string, string[]>; message?: string; };

export async function crearMateria(prevState: MateriaActionState, formData: FormData): Promise<MateriaActionState> {
  const session = await auth();
  // Permiso config.catalogos lo tienen Admin (1) y Secretaria (4)
  if (!session || (session.user.rol !== 1 && session.user.rol !== 4)) {
    return { success: false, message: 'No tienes permisos para gestionar catálogos académicos.' };
  }

  const rawData = {
    cod_materia: formData.get('cod_materia'),
    nombre: formData.get('nombre'),
    unidades_valorativas: formData.get('unidades_valorativas'),
    id_especialidad: formData.get('id_especialidad'),
    grado: formData.get('grado')
  };

  const validation = MateriaSchema.safeParse(rawData);
  if (!validation.success) {
    return { success: false, errors: validation.error.flatten().fieldErrors, message: 'Revise los campos.' };
  }

  const data = validation.data;

  try {
    // 1. Crear la Materia
    await db.query(
      `INSERT INTO materia (cod_materia, nombre, unidades_valorativas, id_especialidad, grado, activa) 
       VALUES (?, ?, ?, ?, ?, TRUE)`,
      [data.cod_materia, data.nombre, data.unidades_valorativas, data.id_especialidad, data.grado]
    );

    // 2. Auditoría
    await db.query(
      `INSERT INTO log_auditoria (id_usuario, tabla_afectada, id_registro, tipo_accion, datos_nuevos, ip_origen)
       VALUES (?, 'materia', ?, 'INSERT', ?, '127.0.0.1')`,
      [session.user.id, data.cod_materia, JSON.stringify(data)]
    );

    revalidatePath('/dashboard/materias');
    return { success: true, message: 'Materia registrada correctamente en el catálogo.' };
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') return { success: false, message: 'El código de materia ya existe en el sistema.' };
    return { success: false, message: 'Error interno del servidor al crear la materia.' };
  }
}