'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db'; // Conexión mysql2 / TiDB Cloud
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// Esquema de validación estricto con Zod
const DocenteProfileSchema = z.object({
  dui_docente: z
    .string()
    .regex(/^\d{8}-\d{1}$/, { message: 'El DUI debe poseer el formato reglamentario 00000000-0' }),
  primer_nombre: z.string().min(2, 'El primer nombre es obligatorio'),
  segundo_nombre: z.string().optional().nullable(),
  primer_apellido: z.string().min(2, 'El primer apellido es obligatorio'),
  segundo_apellido: z.string().optional().nullable(),
  id_especialidad: z.coerce.number().int().positive({ message: 'Seleccione una especialidad válida' }),
  telefono: z.string().regex(/^\d{4}-\d{4}$/, { message: 'El teléfono debe cumplir el formato 0000-0000' }),
  fecha_ingreso: z.string().refine(val => !isNaN(Date.parse(val)), { message: 'Fecha de ingreso inválida' })
});

export type DocenteActionState = {
  success?: boolean;
  errors?: Record<string, string[]>;
  message?: string;
};

export async function completarPerfilDocente(
  prevState: DocenteActionState, 
  formData: FormData
): Promise<DocenteActionState> {
  // 1. Verificación de sesión activa
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    return { success: false, message: 'Sesión no autorizada o caducada.' };
  }

  const userId = Number(session.user.id);

  // 2. Extracción y parseo de campos
  const rawData = {
    dui_docente: formData.get('dui_docente'),
    primer_nombre: formData.get('primer_nombre'),
    segundo_nombre: formData.get('segundo_nombre') || null,
    primer_apellido: formData.get('primer_apellido'),
    segundo_apellido: formData.get('segundo_apellido') || null,
    id_especialidad: formData.get('id_especialidad'),
    telefono: formData.get('telefono'),
    fecha_ingreso: formData.get('fecha_ingreso')
  };

  const validation = DocenteProfileSchema.safeParse(rawData);
  if (!validation.success) {
    return {
      success: false,
      errors: validation.error.flatten().fieldErrors,
      message: 'Revise los campos requeridos.'
    };
  }

  const data = validation.data;

  try {
    // 3. Ejecución de inserción en TiDB Cloud
    await db.query(
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
        data.fecha_ingreso
      ]
    );

    // 4. Registro en tabla log_auditoria
    await db.query(
      `INSERT INTO log_auditoria 
        (id_usuario, tabla_afectada, id_registro, tipo_accion, datos_nuevos, ip_origen)
       VALUES (?, 'docente', ?, 'INSERT', ?, '127.0.0.1')`,
      [userId, data.dui_docente, JSON.stringify(data)]
    );

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/docentes');
    return { success: true, message: 'Perfil docente completado exitosamente. Brecha operativa solventada.' };

  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      return { 
        success: false, 
        message: 'El DUI o el usuario ya tiene un perfil docente asignado en el sistema.' 
      };
    }
    return { 
      success: false, 
      message: 'Ocurrió un error en el servidor al registrar el perfil docente.' 
    };
  }
}
