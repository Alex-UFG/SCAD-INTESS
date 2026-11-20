'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db'; 
import { auth } from '@/auth';

const SeccionSchema = z.object({
  nombre: z.string().trim().min(1, 'El identificador es obligatorio'),
  grado: z.coerce.number().int().min(1).max(3),
  id_especialidad: z.coerce.number().int().positive(),
  id_ciclo: z.coerce.number().int().positive(),
  dui_docente_guia: z.string().regex(/^\d{8}-\d{1}$/, 'Formato 00000000-0').optional().nullable().or(z.literal('')),
  capacidad_max: z.coerce.number().int().min(10).max(60).default(40)
});

const EditarSeccionSchema = z.object({
  id_seccion: z.coerce.number().int().positive(),
  dui_docente_guia: z.string().regex(/^\d{8}-\d{1}$/, 'Formato 00000000-0').optional().nullable().or(z.literal('')),
  capacidad_max: z.coerce.number().int().min(10).max(60),
  activa: z.coerce.number().int().default(1) // 1 activo, 0 inactivo
});

export type SeccionActionState = { success?: boolean; errors?: Record<string, string[]>; message?: string; };

export async function crearSeccion(prevState: SeccionActionState, formData: FormData): Promise<SeccionActionState> {
  const session = await auth();
  if (!session || (session.user.rol !== 1 && session.user.rol !== 4)) {
    return { success: false, message: 'Sesión no autorizada.' };
  }

  const rawData = {
    nombre: formData.get('nombre'),
    grado: formData.get('grado'),
    id_especialidad: formData.get('id_especialidad'),
    id_ciclo: formData.get('id_ciclo'),
    dui_docente_guia: formData.get('dui_docente_guia') || null,
    capacidad_max: formData.get('capacidad_max') || 40
  };

  const validation = SeccionSchema.safeParse(rawData);
  if (!validation.success) return { success: false, errors: validation.error.flatten().fieldErrors, message: 'Revise los campos.' };

  const data = validation.data;
  const docenteGuia = data.dui_docente_guia ? data.dui_docente_guia : null;

  try {
    const [result]: any = await db.query(
      `INSERT INTO seccion (nombre, grado, id_especialidad, id_ciclo, dui_docente_guia, capacidad_max, activa) VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
      [data.nombre, data.grado, data.id_especialidad, data.id_ciclo, docenteGuia, data.capacidad_max]
    );

    await db.query(
      `INSERT INTO log_auditoria (id_usuario, tabla_afectada, id_registro, tipo_accion, datos_nuevos, ip_origen) VALUES (?, 'seccion', ?, 'INSERT', ?, '127.0.0.1')`,
      [session.user.id, String(result.insertId), JSON.stringify(data)]
    );

    revalidatePath('/dashboard/secciones');
    return { success: true, message: 'Sección aperturada correctamente.' };
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') return { success: false, message: 'Esta sección ya está aperturada.' };
    return { success: false, message: 'Error en el servidor.' };
  }
}

export async function editarSeccion(prevState: SeccionActionState, formData: FormData): Promise<SeccionActionState> {
  const session = await auth();
  if (!session || (session.user.rol !== 1 && session.user.rol !== 4)) {
    return { success: false, message: 'Sesión no autorizada.' };
  }

  const rawData = {
    id_seccion: formData.get('id_seccion'),
    dui_docente_guia: formData.get('dui_docente_guia') || null,
    capacidad_max: formData.get('capacidad_max'),
    activa: formData.get('activa')
  };

  const validation = EditarSeccionSchema.safeParse(rawData);
  if (!validation.success) return { success: false, message: 'Datos inválidos al editar.' };

  const data = validation.data;
  const docenteGuia = data.dui_docente_guia ? data.dui_docente_guia : null;

  try {
    await db.query(
      `UPDATE seccion SET dui_docente_guia = ?, capacidad_max = ?, activa = ? WHERE id_seccion = ?`,
      [docenteGuia, data.capacidad_max, data.activa, data.id_seccion]
    );

    await db.query(
      `INSERT INTO log_auditoria (id_usuario, tabla_afectada, id_registro, tipo_accion, datos_nuevos, ip_origen) VALUES (?, 'seccion', ?, 'UPDATE', ?, '127.0.0.1')`,
      [session.user.id, String(data.id_seccion), JSON.stringify(data)]
    );

    revalidatePath('/dashboard/secciones');
    return { success: true, message: 'Sección actualizada correctamente.' };
  } catch (error) {
    return { success: false, message: 'Error al actualizar la sección.' };
  }
}