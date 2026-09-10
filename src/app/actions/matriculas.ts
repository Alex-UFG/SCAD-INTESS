'use server';

import { db, getTransaction } from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { MatriculaDetalle } from '@/types/academico';
import { MatriculaFormData, matriculaSchema } from '@/lib/validations/matricula';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
export async function getMatriculasPorEstudiante(nie: number): Promise<MatriculaDetalle[]> {
  try {
    const [rows] = await db.query<RowDataPacket[]>(`
      SELECT m.*, 
             s.nombre as seccion_nombre, s.grado, 
             e.nombre as especialidad_nombre, 
             c.anio as ciclo_anio,
             u.email as registrada_por_email
      FROM matricula m
      INNER JOIN seccion s ON m.id_seccion = s.id_seccion
      INNER JOIN especialidad e ON s.id_especialidad = e.id_especialidad
      INNER JOIN ciclo_escolar c ON m.id_ciclo = c.id_ciclo
      INNER JOIN usuario u ON m.registrada_por = u.id_usuario
      WHERE m.nie = ?
      ORDER BY c.anio DESC
    `, [nie]);
    
    return rows as MatriculaDetalle[];
  } catch (error) {
    console.error('Error fetching matriculas:', error);
    throw new Error('No se pudieron obtener las matrículas.');
  }
}

export async function matricularEstudiante(data: MatriculaFormData) {
  const parsed = matriculaSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors };
  }

  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: 'Usuario no autenticado.' };
  }
  
  const id_usuario = parseInt(session.user.id);

  const connection = await getTransaction();

  try {
    const { nie, id_seccion, id_ciclo, fecha_matricula, estado, observaciones } = parsed.data;

    // 1. Validar matrícula única por ciclo
    const [existingMatricula] = await connection.query<RowDataPacket[]>(
      'SELECT id_matricula FROM matricula WHERE nie = ? AND id_ciclo = ?',
      [nie, id_ciclo]
    );

    if (existingMatricula.length > 0) {
      await connection.rollback();
      return { success: false, error: 'El estudiante ya está matriculado en este ciclo escolar.' };
    }

    // 2. Validar capacidad de la sección
    const [seccionInfo] = await connection.query<RowDataPacket[]>(
      'SELECT capacidad_max FROM seccion WHERE id_seccion = ?',
      [id_seccion]
    );

    if (seccionInfo.length === 0) {
      await connection.rollback();
      return { success: false, error: 'La sección no existe.' };
    }

    const [countMatriculados] = await connection.query<RowDataPacket[]>(
      "SELECT COUNT(id_matricula) as total FROM matricula WHERE id_seccion = ? AND estado = 'Vigente'",
      [id_seccion]
    );

    if (countMatriculados[0].total >= seccionInfo[0].capacidad_max) {
      await connection.rollback();
      return { success: false, error: 'La sección ha alcanzado su capacidad máxima.' };
    }

    // 3. Crear matrícula
    await connection.execute<ResultSetHeader>(
      `INSERT INTO matricula 
        (nie, id_seccion, id_ciclo, fecha_matricula, estado, observaciones, registrada_por) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [nie, id_seccion, id_ciclo, fecha_matricula, estado, observaciones ?? null, id_usuario]
    );

    await connection.commit();
    revalidatePath(`/dashboard/estudiantes/${nie}`);
    return { success: true };
  } catch (error) {
    await connection.rollback();
    console.error('Error matriculando estudiante:', error);
    return { success: false, error: 'Ocurrió un error al matricular al estudiante.' };
  } finally {
    connection.release();
  }
}
