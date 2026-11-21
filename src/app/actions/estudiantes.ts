'use server';

import { db, getTransaction } from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { Estudiante, EstudianteConTutores, Tutor } from '@/types/persona';
import { EstudianteFormData, estudianteSchema } from '@/lib/validations/estudiante';
import { revalidatePath } from 'next/cache';
import { requireSession, NO_AUTH } from '@/lib/require-session';

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

import fs from 'fs/promises';
import path from 'path';

export async function createEstudiante(data: EstudianteFormData) {
  if (!(await requireSession())) return NO_AUTH;
  const parsed = estudianteSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors };
  }

  try {
    const { nie, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, fecha_nacimiento, genero, direccion, foto_url, estado } = parsed.data;
    
    // revisa  if NIE de verdad existe
    const [existing] = await db.query<RowDataPacket[]>('SELECT nie FROM estudiante WHERE nie = ?', [nie]);
    if (existing.length > 0) {
      return { success: false, error: 'Ya existe un estudiante con este NIE.' };
    }

    await db.execute<ResultSetHeader>(
      `INSERT INTO estudiante 
        (nie, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, fecha_nacimiento, genero, direccion, foto_url, estado) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [nie, primer_nombre, segundo_nombre ?? null, primer_apellido, segundo_apellido ?? null, fecha_nacimiento, genero, direccion ?? null, foto_url ?? null, estado]
    );

    revalidatePath('/dashboard/estudiantes');
    return { success: true, nie };
  } catch (error) {
    console.error('Error creating estudiante:', error);
    return { success: false, error: 'Ocurrió un error al crear el estudiante.' };
  }
}

export async function updateEstudiante(nie: number, data: EstudianteFormData) {
  if (!(await requireSession())) return NO_AUTH;
  const parsed = estudianteSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors };
  }

  try {
    const { primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, fecha_nacimiento, genero, direccion, foto_url, estado } = parsed.data;

    await db.execute<ResultSetHeader>(
      `UPDATE estudiante 
       SET primer_nombre = ?, segundo_nombre = ?, primer_apellido = ?, segundo_apellido = ?, 
           fecha_nacimiento = ?, genero = ?, direccion = ?, foto_url = ?, estado = ? 
       WHERE nie = ?`,
      [primer_nombre, segundo_nombre ?? null, primer_apellido, segundo_apellido ?? null, fecha_nacimiento, genero, direccion ?? null, foto_url ?? null, estado, nie]
    );

    revalidatePath('/dashboard/estudiantes');
    revalidatePath(`/dashboard/estudiantes/${nie}`);
    return { success: true };
  } catch (error) {
    console.error('Error updating estudiante:', error);
    return { success: false, error: 'Ocurrió un error al actualizar el estudiante.' };
  }
}

export async function uploadFotoEstudiante(nie: number, formData: FormData) {
  if (!(await requireSession())) return NO_AUTH;
  try {
    const file = formData.get('foto') as File | null;
    if (!file || file.size === 0) {
      return { success: false, error: 'No se seleccionó ningún archivo de imagen.' };
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      return { success: false, error: 'Formato no soportado. Debe ser JPG, PNG, WEBP o GIF.' };
    }

    if (file.size > 5 * 1024 * 1024) {
      return { success: false, error: 'La imagen excede el límite de 5MB.' };
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };
    const ext = EXT[file.type];
    const filename = `estudiante_${nie}_${Date.now()}.${ext}`;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'estudiantes');
    await fs.mkdir(uploadDir, { recursive: true });
    
    const filePath = path.join(uploadDir, filename);
    await fs.writeFile(filePath, buffer);

    const foto_url = `/uploads/estudiantes/${filename}`;

    const anterior = await getFotoActual(nie);
    await db.execute(
      'UPDATE estudiante SET foto_url = ? WHERE nie = ?',
      [foto_url, nie]
    );
    await borrarArchivoFoto(anterior);

    revalidatePath('/dashboard/estudiantes');
    revalidatePath(`/dashboard/estudiantes/${nie}`);

    return { success: true, foto_url };
  } catch (error) {
    console.error('Error uploading photo:', error);
    return { success: false, error: 'Ocurrió un error al subir la fotografía.' };
  }
}

export async function removeFotoEstudiante(nie: number) {
  if (!(await requireSession())) return NO_AUTH;
  try {
    const anterior = await getFotoActual(nie);
    await db.execute('UPDATE estudiante SET foto_url = NULL WHERE nie = ?', [nie]);
    await borrarArchivoFoto(anterior);
    revalidatePath('/dashboard/estudiantes');
    revalidatePath(`/dashboard/estudiantes/${nie}`);
    return { success: true };
  } catch (error) {
    console.error('Error removing photo:', error);
    return { success: false, error: 'Error al eliminar la foto.' };
  }
}

async function getFotoActual(nie: number): Promise<string | null> {
  const [rows] = await db.query<RowDataPacket[]>('SELECT foto_url FROM estudiante WHERE nie = ?', [nie]);
  return rows[0]?.foto_url ?? null;
}

/** Elimina del disco una foto subida localmente (solo rutas /uploads/estudiantes/). */
async function borrarArchivoFoto(url: string | null) {
  if (!url || !url.startsWith('/uploads/estudiantes/')) return;
  const nombre = path.basename(url);
  try {
    await fs.unlink(path.join(process.cwd(), 'public', 'uploads', 'estudiantes', nombre));
  } catch {
    /* el archivo ya no existe: ignorar */
  }
}
