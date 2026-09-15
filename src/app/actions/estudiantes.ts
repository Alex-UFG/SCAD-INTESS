'use server';

import { db, getTransaction } from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { Estudiante, EstudianteConTutores, Tutor } from '@/types/persona';
import { EstudianteFormData, estudianteSchema } from '@/lib/validations/estudiante';
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
    const [rows] = await db.query<RowDataPacket[]>('SELECT * FROM estudiante WHERE nie = ?', [nie]);
    if (rows.length === 0) return null;
    
    const estudiante = rows[0] as Estudiante;

    const [tutorRows] = await db.query<RowDataPacket[]>(`
      SELECT t.*, et.parentesco, et.contacto_principal 
      FROM tutor t
      INNER JOIN estudiante_tutor et ON t.dui_tutor = et.dui_tutor
      WHERE et.nie = ?
    `, [nie]);

    const tutores = tutorRows.map(row => ({
      dui_tutor: row.dui_tutor,
      primer_nombre: row.primer_nombre,
      segundo_nombre: row.segundo_nombre,
      primer_apellido: row.primer_apellido,
      segundo_apellido: row.segundo_apellido,
      telefono_principal: row.telefono_principal,
      telefono_alterno: row.telefono_alterno,
      email: row.email,
      ocupacion: row.ocupacion,
      pivot: {
        parentesco: row.parentesco,
        contacto_principal: Boolean(row.contacto_principal)
      }
    }));

    return { ...estudiante, tutores };
  } catch (error) {
    console.error('Error fetching estudiante:', error);
    throw new Error('No se pudo obtener el expediente del estudiante.');
  }
}

export async function createEstudiante(data: EstudianteFormData) {
  const parsed = estudianteSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors };
  }

  try {
    const { nie, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, fecha_nacimiento, genero, direccion, estado } = parsed.data;
    
    // revisa  if NIE de verdad existe
    const [existing] = await db.query<RowDataPacket[]>('SELECT nie FROM estudiante WHERE nie = ?', [nie]);
    if (existing.length > 0) {
      return { success: false, error: 'Ya existe un estudiante con este NIE.' };
    }

    await db.execute<ResultSetHeader>(
      `INSERT INTO estudiante 
        (nie, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, fecha_nacimiento, genero, direccion, estado) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [nie, primer_nombre, segundo_nombre ?? null, primer_apellido, segundo_apellido ?? null, fecha_nacimiento, genero, direccion ?? null, estado]
    );

    revalidatePath('/dashboard/estudiantes');
    return { success: true, nie };
  } catch (error) {
    console.error('Error creating estudiante:', error);
    return { success: false, error: 'Ocurrió un error al crear el estudiante.' };
  }
}

export async function updateEstudiante(nie: number, data: EstudianteFormData) {
  const parsed = estudianteSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors };
  }

  try {
    const { primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, fecha_nacimiento, genero, direccion, estado } = parsed.data;

    await db.execute<ResultSetHeader>(
      `UPDATE estudiante 
       SET primer_nombre = ?, segundo_nombre = ?, primer_apellido = ?, segundo_apellido = ?, 
           fecha_nacimiento = ?, genero = ?, direccion = ?, estado = ? 
       WHERE nie = ?`,
      [primer_nombre, segundo_nombre ?? null, primer_apellido, segundo_apellido ?? null, fecha_nacimiento, genero, direccion ?? null, estado, nie]
    );

    revalidatePath('/dashboard/estudiantes');
    revalidatePath(`/dashboard/estudiantes/${nie}`);
    return { success: true };
  } catch (error) {
    console.error('Error updating estudiante:', error);
    return { success: false, error: 'Ocurrió un error al actualizar el estudiante.' };
  }
}
