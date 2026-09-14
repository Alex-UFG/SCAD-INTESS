'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db'; // Conexión a la base de datos MySQL / TiDB Cloud
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// Esquema de validación estricto con Zod para la creación de secciones
const SeccionSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, 'El identificador de la sección es obligatorio (ej: A, B)'),
  grado: z.coerce
    .number()
    .int()
    .min(1, 'El grado mínimo es 1')
    .max(3, 'El grado máximo es 3 de bachillerato'),
  id_especialidad: z.coerce
    .number()
    .int()
    .positive({ message: 'Seleccione una especialidad válida' }),
  id_ciclo: z.coerce
    .number()
    .int()
    .positive({ message: 'Seleccione un ciclo escolar válido' }),
  dui_docente_guia: z
    .string()
    .regex(/^\d{8}-\d{1}$/, { message: 'El DUI del docente guía debe tener formato 00000000-0' })
    .optional()
    .nullable()
    .or(z.literal('')),
  capacidad_max: z.coerce
    .number()
    .int()
    .min(10, 'La capacidad mínima es de 10 alumnos')
    .max(60, 'La capacidad máxima permitida es de 60 alumnos')
    .default(40)
});

export type SeccionActionState = {
  success?: boolean;
  errors?: Record<string, string[]>;
  message?: string;
};

export async function crearSeccion(
  prevState: SeccionActionState,
  formData: FormData
): Promise<SeccionActionState> {
  // 1. Verificación de sesión y permisos
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    return { success: false, message: 'Sesión no autorizada o caducada.' };
  }

  const userId = Number(session.user.id);

  // 2. Extracción y parseo de datos del formulario
  const rawData = {
    nombre: formData.get('nombre'),
    grado: formData.get('grado'),
    id_especialidad: formData.get('id_especialidad'),
    id_ciclo: formData.get('id_ciclo'),
    dui_docente_guia: formData.get('dui_docente_guia') || null,
    capacidad_max: formData.get('capacidad_max') || 40
  };

  const validation = SeccionSchema.safeParse(rawData);
  if (!validation.success) {
    return {
      success: false,
      errors: validation.error.flatten().fieldErrors,
      message: 'Revise los campos requeridos.'
    };
  }

  const data = validation.data;
  const docenteGuia = data.dui_docente_guia ? data.dui_docente_guia : null;

  try {
    // 3. Inserción en la tabla física 'seccion'
    const [result]: any = await db.query(
      `INSERT INTO seccion 
        (nombre, grado, id_especialidad, id_ciclo, dui_docente_guia, capacidad_max)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        data.nombre,
        data.grado,
        data.id_especialidad,
        data.id_ciclo,
        docenteGuia,
        data.capacidad_max
      ]
    );

    const nuevoIdSeccion = result?.insertId || 'N/A';

    // 4. Registro en la tabla 'log_auditoria'
    await db.query(
      `INSERT INTO log_auditoria 
        (id_usuario, tabla_afectada, id_registro, tipo_accion, datos_nuevos, ip_origen)
       VALUES (?, 'seccion', ?, 'INSERT', ?, '127.0.0.1')`,
      [userId, String(nuevoIdSeccion), JSON.stringify(data)]
    );

    revalidatePath('/dashboard/secciones');
    return {
      success: true,
      message: 'Sección aperturada y lista para proceso de matrícula.'
    };
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      return {
        success: false,
        message: 'Esta sección ya se encuentra aperturada para ese ciclo, grado y especialidad.'
      };
    }
    return {
      success: false,
      message: 'Ocurrió un error en el servidor al intentar registrar la sección.'
    };
  }
}
