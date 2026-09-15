'use server';

import { db, isDuplicateEntry } from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { Estudiante, EstudianteConTutores, Tutor } from '@/types/persona';
import { EstudianteFormData, estudianteSchema } from '@/lib/validations/estudiante';
import { requireSession } from '@/lib/session';
import { revalidatePath } from 'next/cache';

export async function getEstudiantes(): Promise<Estudiante[]> {
  try {
    const [rows] = await db.query<RowDataPacket[]>('SELECT * FROM estudiante ORDER BY primer_apellido, primer_nombre');
    return rows as Estudiante[];
  } catch (error) {
    console.error('Error fetching estudiantes:', error);
    throw new Error('No se pudieron obtener los estudiantes.');
  }
}

export async function getEstudiantePorNie(nie: number): Promise<EstudianteConTutores | null> {
  try {
    const [[rows], [tutorRows]] = await Promise.all([
      db.query<RowDataPacket[]>('SELECT * FROM estudiante WHERE nie = ?', [nie]),
      db.query<RowDataPacket[]>(`
        SELECT t.*, et.parentesco, et.contacto_principal
        FROM tutor t
        INNER JOIN estudiante_tutor et ON t.dui_tutor = et.dui_tutor
        WHERE et.nie = ?
      `, [nie]),
    ]);

    if (rows.length === 0) return null;

    const estudiante = rows[0] as Estudiante;

    const tutores = tutorRows.map(({ parentesco, contacto_principal, ...tutor }) => ({
      ...(tutor as Tutor),
      pivot: {
        parentesco,
        contacto_principal: Boolean(contacto_principal)
      }
    }));

    return { ...estudiante, tutores };
  } catch (error) {
    console.error('Error fetching estudiante:', error);
    throw new Error('No se pudo obtener el expediente del estudiante.');
  }
}

export async function createEstudiante(data: EstudianteFormData) {
  const session = await requireSession();
  if (!session) {
    return { success: false, error: 'Usuario no autenticado.' };
  }

  const parsed = estudianteSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: 'Revisa los campos del formulario.', errors: parsed.error.flatten().fieldErrors };
  }

  try {
    const { nie, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, fecha_nacimiento, genero, direccion, estado } = parsed.data;

    await db.execute<ResultSetHeader>(
      `INSERT INTO estudiante
        (nie, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, fecha_nacimiento, genero, direccion, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [nie, primer_nombre, segundo_nombre || null, primer_apellido, segundo_apellido || null, fecha_nacimiento, genero, direccion || null, estado]
    );

    revalidatePath('/dashboard/estudiantes');
    return { success: true, nie };
  } catch (error) {
    // la PK sobre nie es la fuente de verdad: un pre-SELECT tendria carrera
    if (isDuplicateEntry(error)) {
      return { success: false, error: 'Ya existe un estudiante con este NIE.' };
    }
    console.error('Error creating estudiante:', error);
    return { success: false, error: 'Ocurrió un error al crear el estudiante.' };
  }
}

export async function updateEstudiante(nie: number, data: EstudianteFormData) {
  const session = await requireSession();
  if (!session) {
    return { success: false, error: 'Usuario no autenticado.' };
  }

  const parsed = estudianteSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: 'Revisa los campos del formulario.', errors: parsed.error.flatten().fieldErrors };
  }

  try {
    const { primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, fecha_nacimiento, genero, direccion, estado } = parsed.data;

    await db.execute<ResultSetHeader>(
      `UPDATE estudiante
       SET primer_nombre = ?, segundo_nombre = ?, primer_apellido = ?, segundo_apellido = ?,
           fecha_nacimiento = ?, genero = ?, direccion = ?, estado = ?
       WHERE nie = ?`,
      [primer_nombre, segundo_nombre || null, primer_apellido, segundo_apellido || null, fecha_nacimiento, genero, direccion || null, estado, nie]
    );

    revalidatePath('/dashboard/estudiantes');
    revalidatePath(`/dashboard/estudiantes/${nie}`);
    return { success: true };
  } catch (error) {
    console.error('Error updating estudiante:', error);
    return { success: false, error: 'Ocurrió un error al actualizar el estudiante.' };
  }
}
