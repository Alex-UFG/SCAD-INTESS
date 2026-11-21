'use server';

import { db, getTransaction } from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { MatriculaDetalle } from '@/types/academico';
import { MatriculaFormData, matriculaSchema } from '@/lib/validations/matricula';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { requireSession, NO_AUTH } from '@/lib/require-session';
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
      'SELECT capacidad_max, id_ciclo FROM seccion WHERE id_seccion = ?',
      [id_seccion]
    );

    if (seccionInfo.length === 0) {
      await connection.rollback();
      return { success: false, error: 'La sección no existe.' };
    }

    if (Number(seccionInfo[0].id_ciclo) !== Number(id_ciclo)) {
      await connection.rollback();
      return { success: false, error: 'La sección seleccionada no pertenece al ciclo escolar indicado.' };
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
export async function getMatriculasDetalladas(): Promise<any[]> {
  try {
    const [rows] = await db.query<RowDataPacket[]>(`
      SELECT m.id_matricula, m.nie, m.id_seccion, m.id_ciclo, m.fecha_matricula, m.estado, m.observaciones,
             est.primer_nombre, est.segundo_nombre, est.primer_apellido, est.segundo_apellido,
             s.nombre as seccion_nombre, s.grado, 
             esp.nombre as especialidad_nombre, 
             c.anio as ciclo_anio
      FROM matricula m
      INNER JOIN estudiante est ON m.nie = est.nie
      INNER JOIN seccion s ON m.id_seccion = s.id_seccion
      INNER JOIN especialidad esp ON s.id_especialidad = esp.id_especialidad
      INNER JOIN ciclo_escolar c ON m.id_ciclo = c.id_ciclo
      ORDER BY c.anio DESC, est.primer_apellido ASC
    `);
    
    return rows;
  } catch (error) {
    console.error('Error fetching matriculas detalladas:', error);
    return [];
  }
}

export async function getCiclosEscolares(): Promise<any[]> {
  try {
    const [rows] = await db.query<RowDataPacket[]>('SELECT * FROM ciclo_escolar ORDER BY anio DESC');
    return rows;
  } catch (error) {
    console.error('Error fetching ciclos escolares:', error);
    return [];
  }
}

export async function getSeccionesDisponibles(id_ciclo?: number): Promise<any[]> {
  try {
    const query = `
      SELECT s.id_seccion, s.nombre, s.grado, s.capacidad_max, s.id_ciclo,
             e.nombre as especialidad_nombre,
             c.anio as ciclo_anio,
             COUNT(CASE WHEN m.estado = 'Vigente' THEN 1 END) as total_matriculados,
             (s.capacidad_max - COUNT(CASE WHEN m.estado = 'Vigente' THEN 1 END)) as cupos_disponibles
      FROM seccion s
      INNER JOIN especialidad e ON s.id_especialidad = e.id_especialidad
      INNER JOIN ciclo_escolar c ON s.id_ciclo = c.id_ciclo
      LEFT JOIN matricula m ON s.id_seccion = m.id_seccion
      ${id_ciclo ? 'WHERE s.id_ciclo = ?' : ''}
      GROUP BY s.id_seccion, s.nombre, s.grado, s.capacidad_max, s.id_ciclo, e.nombre, c.anio
      ORDER BY c.anio DESC, s.grado ASC, s.nombre ASC
    `;
    const [rows] = await db.query<RowDataPacket[]>(query, id_ciclo ? [id_ciclo] : []);
    return rows;
  } catch (error) {
    console.error('Error fetching secciones disponibles:', error);
    return [];
  }
}

export async function retirarMatricula(data: { id_matricula: number; motivo: string }) {
  if (!(await requireSession())) return NO_AUTH;
  const { id_matricula, motivo } = data;
  if (!id_matricula || !motivo?.trim()) {
    return { success: false, error: 'Debe especificar el motivo del retiro.' };
  }

  const connection = await getTransaction();
  try {
    const [mat] = await connection.query<RowDataPacket[]>(
      'SELECT nie, estado, observaciones FROM matricula WHERE id_matricula = ?',
      [id_matricula]
    );
    if (mat.length === 0) {
      await connection.rollback();
      return { success: false, error: 'La matrícula no existe.' };
    }

    if (mat[0].estado !== 'Vigente') {
      await connection.rollback();
      return { success: false, error: `La matrícula ya se encuentra en estado ${mat[0].estado}.` };
    }

    const nie = mat[0].nie;
    const obsActual = mat[0].observaciones || '';
    const fecha = new Date().toLocaleDateString('es-SV');
    const nuevaObs = `${obsActual}\n[RETIRO ${fecha}]: ${motivo.trim()}`.trim();

    await connection.execute(
      "UPDATE matricula SET estado = 'Retirado', observaciones = ? WHERE id_matricula = ?",
      [nuevaObs, id_matricula]
    );

    await connection.execute(
      "UPDATE estudiante SET estado = 'Retirado' WHERE nie = ?",
      [nie]
    );

    await connection.commit();
    revalidatePath('/dashboard/matriculas');
    revalidatePath('/dashboard/estudiantes');
    revalidatePath(`/dashboard/estudiantes/${nie}`);
    return { success: true };
  } catch (error) {
    await connection.rollback();
    console.error('Error retirando matrícula:', error);
    return { success: false, error: 'Ocurrió un error al procesar el retiro.' };
  } finally {
    connection.release();
  }
}

export async function trasladarMatricula(data: {
  id_matricula: number;
  tipo: 'seccion' | 'externo';
  nueva_seccion_id?: number;
  motivo: string;
}) {
  if (!(await requireSession())) return NO_AUTH;
  const { id_matricula, tipo, nueva_seccion_id, motivo } = data;
  if (!id_matricula || !motivo?.trim()) {
    return { success: false, error: 'El motivo del traslado es requerido.' };
  }

  const connection = await getTransaction();
  try {
    const [mat] = await connection.query<RowDataPacket[]>(
      `SELECT m.*, s.nombre as seccion_actual, s.grado as grado_actual 
       FROM matricula m
       INNER JOIN seccion s ON m.id_seccion = s.id_seccion
       WHERE m.id_matricula = ?`,
      [id_matricula]
    );

    if (mat.length === 0) {
      await connection.rollback();
      return { success: false, error: 'La matrícula no existe.' };
    }

    if (mat[0].estado !== 'Vigente') {
      await connection.rollback();
      return { success: false, error: 'Solo se pueden trasladar matrículas en estado Vigente.' };
    }

    const nie = mat[0].nie;
    const obsActual = mat[0].observaciones || '';
    const fecha = new Date().toLocaleDateString('es-SV');

    if (tipo === 'seccion') {
      if (!nueva_seccion_id || Number(nueva_seccion_id) === Number(mat[0].id_seccion)) {
        await connection.rollback();
        return { success: false, error: 'Seleccione una sección diferente para el traslado.' };
      }

      const [seccionDestino] = await connection.query<RowDataPacket[]>(
        'SELECT id_seccion, nombre, capacidad_max, id_ciclo FROM seccion WHERE id_seccion = ?',
        [nueva_seccion_id]
      );
      if (seccionDestino.length === 0) {
        await connection.rollback();
        return { success: false, error: 'La sección de destino no existe.' };
      }

      if (Number(seccionDestino[0].id_ciclo) !== Number(mat[0].id_ciclo)) {
        await connection.rollback();
        return { success: false, error: 'La sección de destino debe pertenecer al mismo ciclo escolar.' };
      }

      const [countMat] = await connection.query<RowDataPacket[]>(
        "SELECT COUNT(*) as total FROM matricula WHERE id_seccion = ? AND estado = 'Vigente'",
        [nueva_seccion_id]
      );

      if (countMat[0].total >= seccionDestino[0].capacidad_max) {
        await connection.rollback();
        return { 
          success: false, 
          error: `La sección destino "${seccionDestino[0].nombre}" no tiene cupos disponibles (capacidad máxima ${seccionDestino[0].capacidad_max}).` 
        };
      }

      const nuevaObs = `${obsActual}\n[TRASLADO SECCIÓN ${fecha}]: De sección ${mat[0].seccion_actual} a ${seccionDestino[0].nombre}. Motivo: ${motivo.trim()}`.trim();

      await connection.execute(
        'UPDATE matricula SET id_seccion = ?, observaciones = ? WHERE id_matricula = ?',
        [nueva_seccion_id, nuevaObs, id_matricula]
      );
    } else {
      const nuevaObs = `${obsActual}\n[TRASLADO EXTERNO ${fecha}]: ${motivo.trim()}`.trim();

      await connection.execute(
        "UPDATE matricula SET estado = 'Trasladado', observaciones = ? WHERE id_matricula = ?",
        [nuevaObs, id_matricula]
      );

      await connection.execute(
        "UPDATE estudiante SET estado = 'Inactivo' WHERE nie = ?",
        [nie]
      );
    }

    await connection.commit();
    revalidatePath('/dashboard/matriculas');
    revalidatePath('/dashboard/estudiantes');
    revalidatePath(`/dashboard/estudiantes/${nie}`);
    return { success: true };
  } catch (error) {
    await connection.rollback();
    console.error('Error procesando traslado:', error);
    return { success: false, error: 'Ocurrió un error al procesar el traslado.' };
  } finally {
    connection.release();
  }
}
