'use server';

import { db, getTransaction, isDuplicateEntry } from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { Tutor, Parentesco } from '@/types/persona';
import { TutorFormData, EstudianteTutorFormData, tutorSchema, estudianteTutorSchema } from '@/lib/validations/tutor';
import { requireSession, requirePermiso } from '@/lib/session';
import { registrarAuditoria } from '@/lib/audit';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

/**Resultado de las mutaciones de este modulo (claves de `tutores.errors`) */
export type ResultadoTutor =
  | { success: true; dui_tutor?: string; sinTutor?: boolean }
  | { success: false; error: string; errors?: Record<string, string[]> };

export interface EstudianteDelTutor {
  nie: number;
  primer_nombre: string;
  segundo_nombre: string | null;
  primer_apellido: string;
  segundo_apellido: string | null;
  estado: string;
  parentesco: Parentesco;
  contacto_principal: boolean;
}

async function exigirSesion() {
  const session = await requireSession();
  if (!session) throw new Error('UNAUTHORIZED');
  return session;
}

export async function getTutores(): Promise<Tutor[]> {
  await exigirSesion();
  try {
    const [rows] = await db.query<RowDataPacket[]>('SELECT * FROM tutor ORDER BY primer_apellido, primer_nombre');
    return rows as Tutor[];
  } catch (error) {
    console.error('Error fetching tutores:', error);
    throw new Error('fetchError');
  }
}

export async function getTutorPorDui(dui_tutor: string): Promise<Tutor | null> {
  await exigirSesion();
  try {
    const [rows] = await db.query<RowDataPacket[]>('SELECT * FROM tutor WHERE dui_tutor = ?', [dui_tutor]);
    if (rows.length === 0) return null;
    return rows[0] as Tutor;
  } catch (error) {
    console.error('Error fetching tutor:', error);
    throw new Error('fetchError');
  }
}

/**Estudiantes vinculados a un tutor (para la ficha) */
export async function getEstudiantesDelTutor(dui_tutor: string): Promise<EstudianteDelTutor[]> {
  await exigirSesion();
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT e.nie, e.primer_nombre, e.segundo_nombre, e.primer_apellido, e.segundo_apellido, e.estado,
            et.parentesco, et.contacto_principal
       FROM estudiante_tutor et
       INNER JOIN estudiante e ON e.nie = et.nie
      WHERE et.dui_tutor = ?
      ORDER BY e.primer_apellido, e.primer_nombre`,
    [dui_tutor]
  );
  return rows.map((r) => ({ ...r, contacto_principal: Boolean(r.contacto_principal) })) as EstudianteDelTutor[];
}

export async function createTutor(data: TutorFormData): Promise<ResultadoTutor> {
  const session = await requirePermiso('matricula.crear');
  if (!session) return { success: false, error: 'sinPermiso' };

  const parsed = tutorSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: 'checkFields', errors: parsed.error.flatten().fieldErrors };
  }

  const connection = await getTransaction();
  try {
    const { dui_tutor, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, telefono_principal, telefono_alterno, email, ocupacion } = parsed.data;

    await connection.execute<ResultSetHeader>(
      `INSERT INTO tutor
        (dui_tutor, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, telefono_principal, telefono_alterno, email, ocupacion)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [dui_tutor, primer_nombre, segundo_nombre || null, primer_apellido, segundo_apellido || null, telefono_principal, telefono_alterno || null, email || null, ocupacion || null]
    );

    await registrarAuditoria(connection, {
      idUsuario: Number(session.user.id),
      tabla: 'tutor',
      idRegistro: dui_tutor,
      accion: 'INSERT',
      datos: parsed.data,
    });

    await connection.commit();
    revalidatePath('/dashboard/tutores');
    return { success: true, dui_tutor };
  } catch (error) {
    await connection.rollback();
    if (isDuplicateEntry(error)) {
      return { success: false, error: 'duiDuplicado' };
    }
    console.error('Error creating tutor:', error);
    return { success: false, error: 'createError' };
  } finally {
    connection.release();
  }
}

/**Edita los datos de contacto; el DUI (PK) es inmutable */
export async function updateTutor(dui_tutor: string, data: TutorFormData): Promise<ResultadoTutor> {
  const session = await requirePermiso('matricula.editar');
  if (!session) return { success: false, error: 'sinPermiso' };

  const parsed = tutorSchema.safeParse(data);
  if (!parsed.success || parsed.data.dui_tutor !== dui_tutor) {
    return { success: false, error: 'checkFields', errors: parsed.success ? undefined : parsed.error.flatten().fieldErrors };
  }

  const connection = await getTransaction();
  try {
    const [anteriores] = await connection.query<RowDataPacket[]>(
      'SELECT * FROM tutor WHERE dui_tutor = ? FOR UPDATE',
      [dui_tutor]
    );
    if (anteriores.length === 0) {
      await connection.rollback();
      return { success: false, error: 'noExiste' };
    }

    const { primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, telefono_principal, telefono_alterno, email, ocupacion } = parsed.data;
    await connection.execute(
      `UPDATE tutor
          SET primer_nombre = ?, segundo_nombre = ?, primer_apellido = ?, segundo_apellido = ?,
              telefono_principal = ?, telefono_alterno = ?, email = ?, ocupacion = ?
        WHERE dui_tutor = ?`,
      [primer_nombre, segundo_nombre || null, primer_apellido, segundo_apellido || null, telefono_principal, telefono_alterno || null, email || null, ocupacion || null, dui_tutor]
    );

    await registrarAuditoria(connection, {
      idUsuario: Number(session.user.id),
      tabla: 'tutor',
      idRegistro: dui_tutor,
      accion: 'UPDATE',
      datosAnteriores: anteriores[0],
      datos: parsed.data,
    });

    await connection.commit();
    revalidatePath('/dashboard/tutores');
    revalidatePath(`/dashboard/tutores/${dui_tutor}`);
    return { success: true, dui_tutor };
  } catch (error) {
    await connection.rollback();
    console.error('Error updating tutor:', error);
    return { success: false, error: 'updateError' };
  } finally {
    connection.release();
  }
}

export async function vincularEstudianteTutor(data: EstudianteTutorFormData): Promise<ResultadoTutor> {
  const session = await requirePermiso('matricula.editar');
  if (!session) return { success: false, error: 'sinPermiso' };

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

    await registrarAuditoria(connection, {
      idUsuario: Number(session.user.id),
      tabla: 'estudiante_tutor',
      idRegistro: `${nie}:${dui_tutor}`,
      accion: 'INSERT',
      datos: parsed.data,
    });

    await connection.commit();
    revalidatePath(`/dashboard/estudiantes/${nie}`);
    revalidatePath(`/dashboard/tutores/${dui_tutor}`);
    return { success: true };
  } catch (error) {
    await connection.rollback();
    console.error('Error linking tutor:', error);
    return { success: false, error: 'vincularError' };
  } finally {
    connection.release();
  }
}

const desvincularSchema = z.object({
  nie: z.coerce.number().int().positive(),
  dui_tutor: z.string().regex(/^\d{8}-\d$/),
});

/**
 * Quita el vinculo. Si el tutor era el contacto principal y quedan otros, el
 * primero por apellido pasa a ser principal; si no queda ninguno devuelve
 * sinTutor=true para que la UI lo advierta.
 */
export async function desvincularEstudianteTutor(input: unknown): Promise<ResultadoTutor> {
  const session = await requirePermiso('matricula.editar');
  if (!session) return { success: false, error: 'sinPermiso' };

  const parsed = desvincularSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: 'checkFields' };
  const { nie, dui_tutor } = parsed.data;

  const connection = await getTransaction();
  try {
    await connection.query('SELECT nie FROM estudiante WHERE nie = ? FOR UPDATE', [nie]);

    const [vinculo] = await connection.query<RowDataPacket[]>(
      'SELECT parentesco, contacto_principal FROM estudiante_tutor WHERE nie = ? AND dui_tutor = ?',
      [nie, dui_tutor]
    );
    if (vinculo.length === 0) {
      await connection.rollback();
      return { success: false, error: 'vinculoNoExiste' };
    }

    await connection.execute('DELETE FROM estudiante_tutor WHERE nie = ? AND dui_tutor = ?', [nie, dui_tutor]);

    const [restantes] = await connection.query<RowDataPacket[]>(
      `SELECT et.dui_tutor, et.contacto_principal
         FROM estudiante_tutor et INNER JOIN tutor t ON t.dui_tutor = et.dui_tutor
        WHERE et.nie = ? ORDER BY et.contacto_principal DESC, t.primer_apellido, t.primer_nombre`,
      [nie]
    );
    if (restantes.length > 0 && !restantes.some((r) => r.contacto_principal)) {
      await connection.execute(
        'UPDATE estudiante_tutor SET contacto_principal = 1 WHERE nie = ? AND dui_tutor = ?',
        [nie, restantes[0].dui_tutor]
      );
    }

    await registrarAuditoria(connection, {
      idUsuario: Number(session.user.id),
      tabla: 'estudiante_tutor',
      idRegistro: `${nie}:${dui_tutor}`,
      accion: 'DELETE',
      datosAnteriores: { nie, dui_tutor, ...vinculo[0] },
    });

    await connection.commit();
    revalidatePath(`/dashboard/estudiantes/${nie}`);
    revalidatePath(`/dashboard/tutores/${dui_tutor}`);
    return { success: true, sinTutor: restantes.length === 0 };
  } catch (error) {
    await connection.rollback();
    console.error('Error unlinking tutor:', error);
    return { success: false, error: 'desvincularError' };
  } finally {
    connection.release();
  }
}
