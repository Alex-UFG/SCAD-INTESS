'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { auth } from '@/auth';

const CargaSchema = z.object({
  dui_docente: z.string().regex(/^\d{8}-\d{1}$/, 'DUI inválido'),
  cod_materia: z.string().min(1, 'Seleccione una materia'),
  id_seccion: z.coerce.number().int().positive('Seleccione una sección'),
  id_ciclo: z.coerce.number().int().positive('Seleccione el ciclo')
});

export type CargaActionState = { success?: boolean; errors?: Record<string, string[]>; message?: string; };

export async function asignarCarga(prevState: CargaActionState, formData: FormData): Promise<CargaActionState> {
  const session = await auth();
  if (!session || (session.user.rol !== 1 && session.user.rol !== 4)) {
    return { success: false, message: 'Permisos insuficientes para asignar carga académica.' };
  }

  const rawData = {
    dui_docente: formData.get('dui_docente'),
    cod_materia: formData.get('cod_materia'),
    id_seccion: formData.get('id_seccion'),
    id_ciclo: formData.get('id_ciclo')
  };

  const validation = CargaSchema.safeParse(rawData);
  if (!validation.success) {
    return { success: false, errors: validation.error.flatten().fieldErrors, message: 'Faltan campos por completar.' };
  }

  const data = validation.data;

  try {
    // 1. Asignar carga al docente
    const [result]: any = await db.query(
      `INSERT INTO carga_academica (dui_docente, cod_materia, id_seccion, id_ciclo) 
       VALUES (?, ?, ?, ?)`,
      [data.dui_docente, data.cod_materia, data.id_seccion, data.id_ciclo]
    );

    // 2. Auditoría
    await db.query(
      `INSERT INTO log_auditoria (id_usuario, tabla_afectada, id_registro, tipo_accion, datos_nuevos, ip_origen)
       VALUES (?, 'carga_academica', ?, 'INSERT', ?, '127.0.0.1')`,
      [session.user.id, String(result.insertId), JSON.stringify(data)]
    );

    revalidatePath('/dashboard/carga');
    return { success: true, message: 'Carga académica asignada exitosamente. Módulos de notas y asistencia desbloqueados.' };
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      return { success: false, message: 'El docente ya tiene asignada esta materia en esta sección para el ciclo seleccionado.' };
    }
    return { success: false, message: 'Error interno del servidor al asignar la carga.' };
  }
}