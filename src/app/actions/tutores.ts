'use server';

import { db, getTransaction } from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { Tutor } from '@/types/persona';
import { TutorFormData, EstudianteTutorFormData, tutorSchema, estudianteTutorSchema } from '@/lib/validations/tutor';
import { revalidatePath } from 'next/cache';
import { requireSession, NO_AUTH } from '@/lib/require-session';

export async function getTutores(): Promise<Tutor[]> {
  try {
    const [rows] = await db.query<RowDataPacket[]>('SELECT * FROM tutor ORDER BY primer_apellido, primer_nombre');
    return rows as Tutor[];
  } catch (error) {
    console.error('Error fetching tutores:', error);
    throw new Error('No se pudieron obtener los tutores.');
  }
}

export async function getTutorPorDui(dui_tutor: string): Promise<Tutor | null> {
  try {
    const [rows] = await db.query<RowDataPacket[]>('SELECT * FROM tutor WHERE dui_tutor = ?', [dui_tutor]);
    if (rows.length === 0) return null;
    return rows[0] as Tutor;
  } catch (error) {
    console.error('Error fetching tutor:', error);
    throw new Error('No se pudo obtener la información del tutor.');
  }
}

export async function createTutor(data: TutorFormData) {
  if (!(await requireSession())) return NO_AUTH;
  const parsed = tutorSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors };
  }

  try {
    const { dui_tutor, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, telefono_principal, telefono_alterno, email, ocupacion } = parsed.data;

    // revisa if DUI existe
    const [existing] = await db.query<RowDataPacket[]>('SELECT dui_tutor FROM tutor WHERE dui_tutor = ?', [dui_tutor]);
    if (existing.length > 0) {
      return { success: false, error: 'Ya existe un tutor con este DUI.' };
    }

    await db.execute<ResultSetHeader>(
      `INSERT INTO tutor 
        (dui_tutor, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, telefono_principal, telefono_alterno, email, ocupacion) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [dui_tutor, primer_nombre, segundo_nombre ?? null, primer_apellido, segundo_apellido ?? null, telefono_principal, telefono_alterno ?? null, email ?? null, ocupacion ?? null]
    );

    revalidatePath('/dashboard/tutores');
    return { success: true, dui_tutor };
  } catch (error) {
    console.error('Error creating tutor:', error);
    return { success: false, error: 'Ocurrió un error al crear el tutor.' };
  }
}

export async function vincularEstudianteTutor(data: EstudianteTutorFormData) {
  if (!(await requireSession())) return NO_AUTH;
  const parsed = estudianteTutorSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors };
  }

  const connection = await getTransaction();

  try {
    const { nie, dui_tutor, parentesco, contacto_principal } = parsed.data;

    if (contacto_principal) {
      await connection.execute(
        'UPDATE estudiante_tutor SET contacto_principal = 0 WHERE nie = ?',
        [nie]
      );
    }

    await connection.execute<ResultSetHeader>(
      `INSERT INTO estudiante_tutor (nie, dui_tutor, parentesco, contacto_principal) 
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE parentesco = ?, contacto_principal = ?`,
      [nie, dui_tutor, parentesco, contacto_principal ? 1 : 0, parentesco, contacto_principal ? 1 : 0]
    );

    await connection.commit();
    revalidatePath(`/dashboard/estudiantes/${nie}`);
    return { success: true };
  } catch (error) {
    await connection.rollback();
    console.error('Error linking tutor:', error);
    return { success: false, error: 'Ocurrió un error al vincular el tutor.' };
  } finally {
    connection.release();
  }
}
export async function desvincularEstudianteTutor(nie: number, dui_tutor: string) {
  if (!(await requireSession())) return NO_AUTH;
  try {
    await db.query<ResultSetHeader>(
      `DELETE FROM estudiante_tutor WHERE nie = ? AND dui_tutor = ?`,
      [nie, dui_tutor]
    );

    revalidatePath(`/dashboard/estudiantes/${nie}`);
    revalidatePath(`/dashboard/tutores/${dui_tutor}`);
    revalidatePath('/dashboard/tutores');
    return { success: true };
  } catch (error) {
    console.error('Error unlinking tutor:', error);
    return { success: false, error: 'Ocurrió un error al desvincular el tutor.' };
  }
}

export async function updateTutor(dui_tutor: string, data: TutorFormData) {
  if (!(await requireSession())) return NO_AUTH;
  const parsed = tutorSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors };
  }

  try {
    const { primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, telefono_principal, telefono_alterno, email, ocupacion } = parsed.data;

    await db.execute<ResultSetHeader>(
      `UPDATE tutor 
       SET primer_nombre = ?, segundo_nombre = ?, primer_apellido = ?, segundo_apellido = ?, 
           telefono_principal = ?, telefono_alterno = ?, email = ?, ocupacion = ? 
       WHERE dui_tutor = ?`,
      [primer_nombre, segundo_nombre ?? null, primer_apellido, segundo_apellido ?? null, telefono_principal, telefono_alterno ?? null, email ?? null, ocupacion ?? null, dui_tutor]
    );

    revalidatePath('/dashboard/tutores');
    revalidatePath(`/dashboard/tutores/${dui_tutor}`);
    return { success: true };
  } catch (error) {
    console.error('Error updating tutor:', error);
    return { success: false, error: 'Ocurrió un error al actualizar el tutor.' };
  }
}

export async function deleteTutor(dui_tutor: string) {
  if (!(await requireSession())) return NO_AUTH;
  try {
    const [linked] = await db.query<RowDataPacket[]>(
      'SELECT COUNT(*) as total FROM estudiante_tutor WHERE dui_tutor = ?',
      [dui_tutor]
    );

    if (linked[0].total > 0) {
      return { 
        success: false, 
        error: `No se puede eliminar el tutor porque tiene ${linked[0].total} estudiante(s) vinculado(s). Debe desvincularlos primero.` 
      };
    }

    await db.execute<ResultSetHeader>('DELETE FROM tutor WHERE dui_tutor = ?', [dui_tutor]);

    revalidatePath('/dashboard/tutores');
    return { success: true };
  } catch (error) {
    console.error('Error deleting tutor:', error);
    return { success: false, error: 'Ocurrió un error al eliminar el tutor.' };
  }
}
export async function getEstudiantesPorTutor(dui_tutor: string): Promise<any[]> {
  try {
    const [rows] = await db.query<RowDataPacket[]>(`
      SELECT e.nie, e.primer_nombre, e.segundo_nombre, e.primer_apellido, e.segundo_apellido, e.estado,
             et.parentesco, et.contacto_principal
      FROM estudiante_tutor et
      INNER JOIN estudiante e ON et.nie = e.nie
      WHERE et.dui_tutor = ?
    `, [dui_tutor]);
    return rows;
  } catch (error) {
    console.error('Error fetching estudiantes por tutor:', error);
    return [];
  }
}
