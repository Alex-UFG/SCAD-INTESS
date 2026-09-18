'use server';

import { db, getTransaction, isDuplicateEntry } from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { Estudiante, EstudianteConTutores, EstadoEstudiante, Tutor } from '@/types/persona';
import { EstudianteFormData, estudianteSchema } from '@/lib/validations/estudiante';
import { requireSession, requirePermiso } from '@/lib/session';
import { registrarAuditoria } from '@/lib/audit';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

/**Resultado de las mutaciones de este modulo (claves de `estudiantes.errors`) */
export type ResultadoEstudiante =
  | { success: true; nie?: number }
  | { success: false; error: string; errors?: Record<string, string[]> };

// Las lecturas son endpoints POST publicos si no se verifica la sesion:
// sin sesion se lanza y la pagina (ya protegida por el layout) no llega aqui.
async function exigirSesion() {
  const session = await requireSession();
  if (!session) throw new Error('UNAUTHORIZED');
  return session;
}

export async function getEstudiantes(filtro?: { estado?: EstadoEstudiante }): Promise<Estudiante[]> {
  await exigirSesion();
  try {
    const where = filtro?.estado ? 'WHERE estado = ?' : '';
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT * FROM estudiante ${where} ORDER BY primer_apellido, primer_nombre`,
      filtro?.estado ? [filtro.estado] : []
    );
    return rows as Estudiante[];
  } catch (error) {
    console.error('Error fetching estudiantes:', error);
    throw new Error('fetchError');
  }
}

export async function getEstudiantePorNie(nie: number): Promise<EstudianteConTutores | null> {
  await exigirSesion();
  try {
    const [[rows], [tutorRows]] = await Promise.all([
      db.query<RowDataPacket[]>('SELECT * FROM estudiante WHERE nie = ?', [nie]),
      db.query<RowDataPacket[]>(`
        SELECT t.*, et.parentesco, et.contacto_principal
        FROM tutor t
        INNER JOIN estudiante_tutor et ON t.dui_tutor = et.dui_tutor
        WHERE et.nie = ?
        ORDER BY et.contacto_principal DESC, t.primer_apellido
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
    throw new Error('fetchError');
  }
}

export async function createEstudiante(data: EstudianteFormData): Promise<ResultadoEstudiante> {
  const session = await requirePermiso('matricula.crear');
  if (!session) return { success: false, error: 'sinPermiso' };

  const parsed = estudianteSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: 'checkFields', errors: parsed.error.flatten().fieldErrors };
  }

  const connection = await getTransaction();
  try {
    const { nie, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, fecha_nacimiento, genero, direccion, estado } = parsed.data;

    await connection.execute<ResultSetHeader>(
      `INSERT INTO estudiante
        (nie, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, fecha_nacimiento, genero, direccion, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [nie, primer_nombre, segundo_nombre || null, primer_apellido, segundo_apellido || null, fecha_nacimiento, genero, direccion || null, estado]
    );

    await registrarAuditoria(connection, {
      idUsuario: Number(session.user.id),
      tabla: 'estudiante',
      idRegistro: nie,
      accion: 'INSERT',
      datos: parsed.data,
    });

    await connection.commit();
    revalidatePath('/dashboard/estudiantes');
    revalidatePath('/dashboard');
    return { success: true, nie };
  } catch (error) {
    await connection.rollback();
    // la PK sobre nie es la fuente de verdad: un pre-SELECT tendria carrera
    if (isDuplicateEntry(error)) {
      return { success: false, error: 'nieDuplicado' };
    }
    console.error('Error creating estudiante:', error);
    return { success: false, error: 'createError' };
  } finally {
    connection.release();
  }
}

/**
 * Actualiza los datos personales. El estado NO se toca aqui: cambia por
 * cambiarEstadoEstudiante (egreso/reactivacion) o por retirarMatricula.
 */
export async function updateEstudiante(nie: number, data: EstudianteFormData): Promise<ResultadoEstudiante> {
  const session = await requirePermiso('matricula.editar');
  if (!session) return { success: false, error: 'sinPermiso' };

  const parsed = estudianteSchema.safeParse(data);
  // el nie de la ruta y el del formulario deben coincidir: el argumento crudo
  // no se confia sin validar
  if (!parsed.success || !Number.isInteger(nie) || nie <= 0 || parsed.data.nie !== nie) {
    return { success: false, error: 'checkFields', errors: parsed.success ? undefined : parsed.error.flatten().fieldErrors };
  }

  const connection = await getTransaction();
  try {
    const [anteriores] = await connection.query<RowDataPacket[]>(
      'SELECT * FROM estudiante WHERE nie = ? FOR UPDATE',
      [nie]
    );
    if (anteriores.length === 0) {
      await connection.rollback();
      return { success: false, error: 'noExiste' };
    }

    const { primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, fecha_nacimiento, genero, direccion } = parsed.data;

    await connection.execute<ResultSetHeader>(
      `UPDATE estudiante
       SET primer_nombre = ?, segundo_nombre = ?, primer_apellido = ?, segundo_apellido = ?,
           fecha_nacimiento = ?, genero = ?, direccion = ?
       WHERE nie = ?`,
      [primer_nombre, segundo_nombre || null, primer_apellido, segundo_apellido || null, fecha_nacimiento, genero, direccion || null, nie]
    );

    const { estado: _estado, ...datosNuevos } = parsed.data;
    void _estado;
    await registrarAuditoria(connection, {
      idUsuario: Number(session.user.id),
      tabla: 'estudiante',
      idRegistro: nie,
      accion: 'UPDATE',
      datosAnteriores: anteriores[0],
      datos: datosNuevos,
    });

    await connection.commit();
    revalidatePath('/dashboard/estudiantes');
    revalidatePath(`/dashboard/estudiantes/${nie}`);
    return { success: true };
  } catch (error) {
    await connection.rollback();
    console.error('Error updating estudiante:', error);
    return { success: false, error: 'updateError' };
  } finally {
    connection.release();
  }
}

const cambioEstadoSchema = z.object({
  nie: z.coerce.number().int().positive(),
  // Retirado solo lo asigna retirarMatricula (queda ligado a la matricula)
  estado: z.enum(['Activo', 'Inactivo', 'Egresado']),
  observacion: z.string().trim().max(500).optional().default(''),
});

/**
 * Cambio de estado del expediente. Egresado exige una matricula Vigente en
 * una seccion de 3er grado de un ciclo Cerrado; si no se cumple, se acepta
 * como excepcion documentada con una observacion (queda en auditoria).
 */
export async function cambiarEstadoEstudiante(input: unknown): Promise<ResultadoEstudiante> {
  const session = await requirePermiso('matricula.editar');
  if (!session) return { success: false, error: 'sinPermiso' };

  const parsed = cambioEstadoSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: 'checkFields' };
  const { nie, estado, observacion } = parsed.data;

  const connection = await getTransaction();
  try {
    const [anteriores] = await connection.query<RowDataPacket[]>(
      'SELECT * FROM estudiante WHERE nie = ? FOR UPDATE',
      [nie]
    );
    if (anteriores.length === 0) {
      await connection.rollback();
      return { success: false, error: 'noExiste' };
    }

    if (estado === 'Egresado') {
      const [egresable] = await connection.query<RowDataPacket[]>(
        `SELECT 1
           FROM matricula m
           INNER JOIN seccion s ON s.id_seccion = m.id_seccion
           INNER JOIN ciclo_escolar c ON c.id_ciclo = m.id_ciclo
          WHERE m.nie = ? AND m.estado = 'Vigente' AND s.grado = 3 AND c.estado = 'Cerrado'
          LIMIT 1`,
        [nie]
      );
      if (egresable.length === 0 && observacion.length < 5) {
        await connection.rollback();
        return { success: false, error: 'egresoRequiereObservacion' };
      }
    }

    await connection.execute('UPDATE estudiante SET estado = ? WHERE nie = ?', [estado, nie]);

    await registrarAuditoria(connection, {
      idUsuario: Number(session.user.id),
      tabla: 'estudiante',
      idRegistro: nie,
      accion: 'UPDATE',
      datosAnteriores: { estado: anteriores[0].estado },
      datos: { estado, observacion },
    });

    await connection.commit();
    revalidatePath('/dashboard/estudiantes');
    revalidatePath(`/dashboard/estudiantes/${nie}`);
    return { success: true };
  } catch (error) {
    await connection.rollback();
    console.error('Error cambiando estado de estudiante:', error);
    return { success: false, error: 'updateError' };
  } finally {
    connection.release();
  }
}

/**
 * Sube la foto del expediente a Vercel Blob (gap 2) y guarda la URL.
 * formData: campo `foto` (File). Con `quitar=1` elimina la foto actual.
 */
export async function actualizarFotoEstudiante(nie: number, formData: FormData): Promise<ResultadoEstudiante> {
  const session = await requirePermiso('matricula.editar');
  if (!session) return { success: false, error: 'sinPermiso' };
  if (!Number.isInteger(nie) || nie <= 0) return { success: false, error: 'checkFields' };

  const { validarImagen, subirImagen, borrarImagen, almacenamientoConfigurado } = await import('@/lib/blob');
  const quitar = formData.get('quitar') === '1';
  const foto = formData.get('foto');
  const archivo = foto instanceof File ? foto : null;

  if (!quitar) {
    const errorImagen = validarImagen(archivo);
    if (errorImagen) return { success: false, error: errorImagen };
    if (!almacenamientoConfigurado()) return { success: false, error: 'almacenamientoNoConfigurado' };
  }

  const connection = await getTransaction();
  try {
    const [rows] = await connection.query<RowDataPacket[]>('SELECT foto_url FROM estudiante WHERE nie = ? FOR UPDATE', [nie]);
    if (rows.length === 0) {
      await connection.rollback();
      return { success: false, error: 'noExiste' };
    }
    const anterior = rows[0].foto_url as string | null;
    const nuevaUrl = quitar ? null : await subirImagen(archivo as File, 'estudiantes', String(nie));

    await connection.execute('UPDATE estudiante SET foto_url = ? WHERE nie = ?', [nuevaUrl, nie]);
    await registrarAuditoria(connection, {
      idUsuario: Number(session.user.id),
      tabla: 'estudiante',
      idRegistro: nie,
      accion: 'UPDATE',
      datosAnteriores: { foto_url: anterior },
      datos: { foto_url: nuevaUrl },
    });
    await connection.commit();
    await borrarImagen(anterior);
    revalidatePath(`/dashboard/estudiantes/${nie}`);
    return { success: true, nie };
  } catch (error) {
    await connection.rollback();
    console.error('Error actualizando foto:', error);
    return { success: false, error: 'fotoError' };
  } finally {
    connection.release();
  }
}
