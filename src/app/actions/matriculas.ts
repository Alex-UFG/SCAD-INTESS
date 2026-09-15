'use server';

import { db, getTransaction, isDuplicateEntry } from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { CicloEscolar, MatriculaDetalle, SeccionConEspecialidad } from '@/types/academico';
import { MatriculaFormData, matriculaSchema } from '@/lib/validations/matricula';
import { requireSession } from '@/lib/session';
import { revalidatePath } from 'next/cache';

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

export async function getCiclosAbiertos(): Promise<CicloEscolar[]> {
  try {
    const [rows] = await db.query<RowDataPacket[]>(
      "SELECT * FROM ciclo_escolar WHERE estado <> 'Cerrado' ORDER BY anio DESC"
    );
    return rows as CicloEscolar[];
  } catch (error) {
    console.error('Error fetching ciclos:', error);
    throw new Error('No se pudieron obtener los ciclos escolares.');
  }
}

export async function getSecciones(): Promise<SeccionConEspecialidad[]> {
  try {
    const [rows] = await db.query<RowDataPacket[]>(`
      SELECT s.*, e.nombre as especialidad_nombre
      FROM seccion s
      INNER JOIN especialidad e ON s.id_especialidad = e.id_especialidad
      ORDER BY s.grado, e.nombre, s.nombre
    `);
    return rows as SeccionConEspecialidad[];
  } catch (error) {
    console.error('Error fetching secciones:', error);
    throw new Error('No se pudieron obtener las secciones.');
  }
}

export async function matricularEstudiante(data: MatriculaFormData) {
  const parsed = matriculaSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: 'Revisa los campos del formulario.', errors: parsed.error.flatten().fieldErrors };
  }

  const session = await requireSession();
  if (!session) {
    return { success: false, error: 'Usuario no autenticado.' };
  }

  const id_usuario = parseInt(session.user.id);

  const connection = await getTransaction();

  try {
    const { nie, id_seccion, id_ciclo, fecha_matricula, estado, observaciones } = parsed.data;

    // 1. Validar capacidad de la sección.
    //    FOR UPDATE bloquea la fila de la sección: dos matrículas concurrentes
    //    se serializan y no pueden sobrepasar capacidad_max leyendo el mismo conteo.
    const [seccionInfo] = await connection.query<RowDataPacket[]>(
      'SELECT capacidad_max FROM seccion WHERE id_seccion = ? FOR UPDATE',
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

    // 2. Crear matrícula. La unicidad por ciclo la garantiza el índice
    //    uq_matricula_estudiante_ciclo (nie, id_ciclo); un pre-SELECT tendría carrera.
    await connection.execute<ResultSetHeader>(
      `INSERT INTO matricula
        (nie, id_seccion, id_ciclo, fecha_matricula, estado, observaciones, registrada_por)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [nie, id_seccion, id_ciclo, fecha_matricula, estado, observaciones || null, id_usuario]
    );

    await connection.commit();
    revalidatePath(`/dashboard/estudiantes/${nie}`);
    return { success: true };
  } catch (error) {
    await connection.rollback();
    if (isDuplicateEntry(error)) {
      return { success: false, error: 'El estudiante ya está matriculado en este ciclo escolar.' };
    }
    console.error('Error matriculando estudiante:', error);
    return { success: false, error: 'Ocurrió un error al matricular al estudiante.' };
  } finally {
    connection.release();
  }
}
