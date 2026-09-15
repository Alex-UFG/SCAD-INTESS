'use server';

import { db, getTransaction, isDuplicateEntry } from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { Tutor } from '@/types/persona';
import { TutorFormData, EstudianteTutorFormData, tutorSchema, estudianteTutorSchema } from '@/lib/validations/tutor';
import { requireSession } from '@/lib/session';
import { revalidatePath } from 'next/cache';

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
  const session = await requireSession();
  if (!session) {
    return { success: false, error: 'notAuthenticated' };
  }

  const parsed = tutorSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: 'checkFields', errors: parsed.error.flatten().fieldErrors };
  }

  try {
    const { dui_tutor, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, telefono_principal, telefono_alterno, email, ocupacion } = parsed.data;

    await db.execute<ResultSetHeader>(
      `INSERT INTO tutor
        (dui_tutor, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, telefono_principal, telefono_alterno, email, ocupacion)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [dui_tutor, primer_nombre, segundo_nombre || null, primer_apellido, segundo_apellido || null, telefono_principal, telefono_alterno || null, email || null, ocupacion || null]
    );

    revalidatePath('/dashboard/tutores');
    return { success: true, dui_tutor };
  } catch (error) {
    if (isDuplicateEntry(error)) {
      return { success: false, error: 'duiDuplicado' };
    }
    console.error('Error creating tutor:', error);
    return { success: false, error: 'createError' };
  }
}

export async function vincularEstudianteTutor(data: EstudianteTutorFormData) {
  const session = await requireSession();
  if (!session) {
    return { success: false, error: 'notAuthenticated' };
  }

  const parsed = estudianteTutorSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: 'checkFields', errors: parsed.error.flatten().fieldErrors };
  }

  const connection = await getTransaction();

  try {
    const { nie, dui_tutor, parentesco, contacto_principal } = parsed.data;

    // bloquea la fila del estudiante: serializa vinculaciones concurrentes
    // del mismo estudiante para que no queden dos contactos principales
    const [estudianteRows] = await connection.query<RowDataPacket[]>(
      'SELECT nie FROM estudiante WHERE nie = ? FOR UPDATE',
      [nie]
    );
    if (estudianteRows.length === 0) {
      await connection.rollback();
      return { success: false, error: 'estudianteNoExiste' };
    }

    if (contacto_principal) {
      await connection.execute(
        'UPDATE estudiante_tutor SET contacto_principal = 0 WHERE nie = ? AND contacto_principal = 1 AND dui_tutor <> ?',
        [nie, dui_tutor]
      );
    }

    await connection.execute<ResultSetHeader>(
      `INSERT INTO estudiante_tutor (nie, dui_tutor, parentesco, contacto_principal)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE parentesco = ?, contacto_principal = ?`,
      [nie, dui_tutor, parentesco, contacto_principal ? 1 : 0, parentesco, contacto_principal ? 1 : 0]
    );

    // el estudiante debe conservar al menos un contacto principal
    if (!contacto_principal) {
      const [principales] = await connection.query<RowDataPacket[]>(
        'SELECT 1 FROM estudiante_tutor WHERE nie = ? AND contacto_principal = 1 LIMIT 1',
        [nie]
      );
      if (principales.length === 0) {
        await connection.execute(
          'UPDATE estudiante_tutor SET contacto_principal = 1 WHERE nie = ? AND dui_tutor = ?',
          [nie, dui_tutor]
        );
      }
    }

    await connection.commit();
    revalidatePath(`/dashboard/estudiantes/${nie}`);
    return { success: true };
  } catch (error) {
    await connection.rollback();
    console.error('Error linking tutor:', error);
    return { success: false, error: 'vincularError' };
  } finally {
    connection.release();
  }
}
