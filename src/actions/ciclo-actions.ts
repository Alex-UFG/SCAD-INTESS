'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { auth } from '@/auth';

const CicloSchema = z.object({
  anio: z.coerce.number().int().min(2024, 'El año debe ser actual o futuro'),
  fecha_inicio: z.string().min(1, 'La fecha de inicio es requerida'),
  fecha_fin: z.string().min(1, 'La fecha de fin es requerida')
});

export type CicloActionState = { success?: boolean; errors?: Record<string, string[]>; message?: string; };

export async function crearCiclo(prevState: CicloActionState, formData: FormData): Promise<CicloActionState> {
  const session = await auth();
  if (!session || session.user.rol !== 1 && session.user.rol !== 2) {
    return { success: false, message: 'No tienes permisos para crear ciclos escolares.' };
  }

  const rawData = {
    anio: formData.get('anio'),
    fecha_inicio: formData.get('fecha_inicio'),
    fecha_fin: formData.get('fecha_fin')
  };

  const validation = CicloSchema.safeParse(rawData);
  if (!validation.success) {
    return { success: false, errors: validation.error.flatten().fieldErrors, message: 'Revise los campos.' };
  }

  const { anio, fecha_inicio, fecha_fin } = validation.data;

  try {
    // 1. Crear el Ciclo
    const [resultCiclo]: any = await db.query(
      `INSERT INTO ciclo_escolar (anio, fecha_inicio, fecha_fin, estado) VALUES (?, ?, ?, 'Planificado')`,
      [anio, fecha_inicio, fecha_fin]
    );
    const idCiclo = resultCiclo.insertId;

    // 2. Crear automáticamente los 3 períodos evaluativos (Trimestres) por defecto
    // Se crean con fechas temporales iguales al ciclo, el Admin luego las edita al abrir el período.
    const queryPeriodos = `INSERT INTO periodo_evaluativo (id_ciclo, numero, fecha_inicio, fecha_cierre, estado) VALUES ?`;
    const valoresPeriodos = [
      [idCiclo, 1, fecha_inicio, fecha_fin, 'Pendiente'],
      [idCiclo, 2, fecha_inicio, fecha_fin, 'Pendiente'],
      [idCiclo, 3, fecha_inicio, fecha_fin, 'Pendiente']
    ];
    await db.query(queryPeriodos, [valoresPeriodos]);

    // 3. Auditoría
    await db.query(
      `INSERT INTO log_auditoria (id_usuario, tabla_afectada, id_registro, tipo_accion, datos_nuevos, ip_origen)
       VALUES (?, 'ciclo_escolar', ?, 'INSERT', ?, '127.0.0.1')`,
      [session.user.id, String(idCiclo), JSON.stringify(validation.data)]
    );

    revalidatePath('/dashboard/ciclos');
    return { success: true, message: 'Ciclo escolar y 3 períodos creados correctamente.' };
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') return { success: false, message: 'El año del ciclo escolar ya existe.' };
    return { success: false, message: 'Error interno del servidor al crear el ciclo.' };
  }
}