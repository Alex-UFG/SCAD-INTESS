'use server';

import { db, getTransaction, isDuplicateEntry } from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import type { PoolConnection } from 'mysql2/promise';
import { CicloEscolar, EstadoMatricula, MatriculaDetalle, SeccionConEspecialidad } from '@/types/academico';
import { MatriculaFormData, matriculaSchema } from '@/lib/validations/matricula';
import { requireSession, requirePermiso } from '@/lib/session';
import { registrarAuditoria } from '@/lib/audit';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

/**Resultado de las mutaciones de este modulo (claves de `matriculas.errors`) */
export type ResultadoMatricula =
  | { success: true }
  | { success: false; error: string; errors?: Record<string, string[]> };

export interface MatriculaListado {
  id_matricula: number;
  nie: number;
  primer_nombre: string;
  segundo_nombre: string | null;
  primer_apellido: string;
  segundo_apellido: string | null;
  id_seccion: number;
  seccion_nombre: string;
  grado: number;
  especialidad_nombre: string;
  id_ciclo: number;
  ciclo_anio: number;
  fecha_matricula: Date;
  estado: EstadoMatricula;
}

async function exigirSesion() {
  const session = await requireSession();
  if (!session) throw new Error('UNAUTHORIZED');
  return session;
}

export async function getMatriculasPorEstudiante(nie: number): Promise<MatriculaDetalle[]> {
  await exigirSesion();
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
    throw new Error('fetchError');
  }
}

export async function getCiclosAbiertos(): Promise<CicloEscolar[]> {
  await exigirSesion();
  const [rows] = await db.query<RowDataPacket[]>(
    "SELECT * FROM ciclo_escolar WHERE estado <> 'Cerrado' ORDER BY anio DESC"
  );
  return rows as CicloEscolar[];
}

export async function getSecciones(): Promise<SeccionConEspecialidad[]> {
  await exigirSesion();
  const [rows] = await db.query<RowDataPacket[]>(`
    SELECT s.*, e.nombre as especialidad_nombre
    FROM seccion s
    INNER JOIN especialidad e ON s.id_especialidad = e.id_especialidad
    ORDER BY s.grado, s.nombre
  `);
  return rows as SeccionConEspecialidad[];
}

/**Listado general con filtros; sin filtros devuelve el ciclo Activo */
export async function getMatriculas(filtro: {
  idCiclo?: number;
  idSeccion?: number;
  estado?: EstadoMatricula;
} = {}): Promise<MatriculaListado[]> {
  await exigirSesion();
  const condiciones: string[] = [];
  const params: (number | string)[] = [];

  if (filtro.idCiclo) {
    condiciones.push('m.id_ciclo = ?');
    params.push(filtro.idCiclo);
  } else {
    condiciones.push("c.estado = 'Activo'");
  }
  if (filtro.idSeccion) {
    condiciones.push('m.id_seccion = ?');
    params.push(filtro.idSeccion);
  }
  if (filtro.estado) {
    condiciones.push('m.estado = ?');
    params.push(filtro.estado);
  }

  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT m.id_matricula, m.nie, e.primer_nombre, e.segundo_nombre, e.primer_apellido, e.segundo_apellido,
            m.id_seccion, s.nombre AS seccion_nombre, s.grado, esp.nombre AS especialidad_nombre,
            m.id_ciclo, c.anio AS ciclo_anio, m.fecha_matricula, m.estado
       FROM matricula m
       INNER JOIN estudiante e ON e.nie = m.nie
       INNER JOIN seccion s ON s.id_seccion = m.id_seccion
       INNER JOIN especialidad esp ON esp.id_especialidad = s.id_especialidad
       INNER JOIN ciclo_escolar c ON c.id_ciclo = m.id_ciclo
      WHERE ${condiciones.join(' AND ')}
      ORDER BY s.grado, s.nombre, e.primer_apellido, e.primer_nombre`,
    params
  );
  return rows as MatriculaListado[];
}

interface SeccionBloqueada {
  id_seccion: number;
  id_ciclo: number;
  capacidad_max: number;
  ciclo_estado: string;
  vigentes: number;
}

/**
 * Bloquea la fila de la seccion (FOR UPDATE) y devuelve su ciclo, capacidad y
 * conteo de matriculas Vigentes: dos matriculas concurrentes se serializan y
 * no pueden sobrepasar capacidad_max leyendo el mismo conteo.
 */
async function bloquearSeccion(connection: PoolConnection, idSeccion: number): Promise<SeccionBloqueada | null> {
  const [rows] = await connection.query<RowDataPacket[]>(
    `SELECT s.id_seccion, s.id_ciclo, s.capacidad_max, c.estado AS ciclo_estado
       FROM seccion s INNER JOIN ciclo_escolar c ON c.id_ciclo = s.id_ciclo
      WHERE s.id_seccion = ? FOR UPDATE`,
    [idSeccion]
  );
  if (rows.length === 0) return null;
  const [conteo] = await connection.query<RowDataPacket[]>(
    "SELECT COUNT(*) AS vigentes FROM matricula WHERE id_seccion = ? AND estado = 'Vigente'",
    [idSeccion]
  );
  return { ...(rows[0] as Omit<SeccionBloqueada, 'vigentes'>), vigentes: Number(conteo[0].vigentes) };
}

export async function matricularEstudiante(data: MatriculaFormData): Promise<ResultadoMatricula> {
  const session = await requirePermiso('matricula.crear');
  if (!session) return { success: false, error: 'sinPermiso' };

  const parsed = matriculaSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: 'checkFields', errors: parsed.error.flatten().fieldErrors };
  }

  const id_usuario = Number(session.user.id);
  const connection = await getTransaction();

  try {
    const { nie, id_seccion, id_ciclo, fecha_matricula, observaciones } = parsed.data;

    const seccion = await bloquearSeccion(connection, id_seccion);
    if (!seccion) {
      await connection.rollback();
      return { success: false, error: 'seccionNoExiste' };
    }
    // El cliente filtra secciones por ciclo, pero el servidor no confia en eso
    if (seccion.id_ciclo !== id_ciclo) {
      await connection.rollback();
      return { success: false, error: 'seccionNoPerteneceAlCiclo' };
    }
    if (seccion.ciclo_estado === 'Cerrado') {
      await connection.rollback();
      return { success: false, error: 'cicloCerrado' };
    }
    if (seccion.vigentes >= seccion.capacidad_max) {
      await connection.rollback();
      return { success: false, error: 'capacidadMaxima' };
    }

    const [estudiante] = await connection.query<RowDataPacket[]>(
      'SELECT estado FROM estudiante WHERE nie = ? FOR UPDATE',
      [nie]
    );
    if (estudiante.length === 0) {
      await connection.rollback();
      return { success: false, error: 'estudianteNoExiste' };
    }
    if (estudiante[0].estado === 'Egresado') {
      await connection.rollback();
      return { success: false, error: 'estudianteEgresado' };
    }

    // Siempre Vigente: la unicidad por ciclo la garantiza el indice
    // uq_matricula_estudiante_ciclo (nie, id_ciclo); un pre-SELECT tendria carrera.
    const [result] = await connection.execute<ResultSetHeader>(
      `INSERT INTO matricula
        (nie, id_seccion, id_ciclo, fecha_matricula, estado, observaciones, registrada_por)
       VALUES (?, ?, ?, ?, 'Vigente', ?, ?)`,
      [nie, id_seccion, id_ciclo, fecha_matricula, observaciones || null, id_usuario]
    );

    // Un estudiante Inactivo/Retirado que vuelve a matricularse queda Activo
    if (estudiante[0].estado !== 'Activo') {
      await connection.execute("UPDATE estudiante SET estado = 'Activo' WHERE nie = ?", [nie]);
      await registrarAuditoria(connection, {
        idUsuario: id_usuario,
        tabla: 'estudiante',
        idRegistro: nie,
        accion: 'UPDATE',
        datosAnteriores: { estado: estudiante[0].estado },
        datos: { estado: 'Activo', motivo: 'matricula' },
      });
    }

    await registrarAuditoria(connection, {
      idUsuario: id_usuario,
      tabla: 'matricula',
      idRegistro: result.insertId,
      accion: 'INSERT',
      datos: { nie, id_seccion, id_ciclo, fecha_matricula, estado: 'Vigente', observaciones },
    });

    await connection.commit();
    revalidatePath(`/dashboard/estudiantes/${nie}`);
    revalidatePath('/dashboard/matriculas');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    await connection.rollback();
    if (isDuplicateEntry(error)) {
      return { success: false, error: 'yaMatriculado' };
    }
    console.error('Error matriculando estudiante:', error);
    return { success: false, error: 'matricularError' };
  } finally {
    connection.release();
  }
}

const retiroSchema = z.object({
  id_matricula: z.coerce.number().int().positive(),
  // Retirado: abandona; Trasladado: se va a otra institucion
  motivo: z.enum(['Retirado', 'Trasladado']),
  observaciones: z.string().trim().min(5).max(500),
});

/**
 * Cierra la matricula (Retirado/Trasladado). Si el estudiante no conserva
 * otra matricula Vigente, su expediente pasa a Retirado.
 */
export async function retirarMatricula(input: unknown): Promise<ResultadoMatricula> {
  const session = await requirePermiso('matricula.retirar');
  if (!session) return { success: false, error: 'sinPermiso' };

  const parsed = retiroSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: 'checkFields', errors: parsed.error.flatten().fieldErrors };
  }
  const { id_matricula, motivo, observaciones } = parsed.data;
  const id_usuario = Number(session.user.id);
  const connection = await getTransaction();

  try {
    const [rows] = await connection.query<RowDataPacket[]>(
      'SELECT * FROM matricula WHERE id_matricula = ? FOR UPDATE',
      [id_matricula]
    );
    if (rows.length === 0) {
      await connection.rollback();
      return { success: false, error: 'matriculaNoExiste' };
    }
    const anterior = rows[0];
    if (anterior.estado !== 'Vigente') {
      await connection.rollback();
      return { success: false, error: 'matriculaNoVigente' };
    }

    await connection.execute(
      `UPDATE matricula
          SET estado = ?, observaciones = CONCAT_WS('\n', observaciones, ?)
        WHERE id_matricula = ?`,
      [motivo, observaciones, id_matricula]
    );
    await registrarAuditoria(connection, {
      idUsuario: id_usuario,
      tabla: 'matricula',
      idRegistro: id_matricula,
      accion: 'UPDATE',
      datosAnteriores: anterior,
      datos: { estado: motivo, observaciones },
    });

    const [otras] = await connection.query<RowDataPacket[]>(
      "SELECT 1 FROM matricula WHERE nie = ? AND estado = 'Vigente' LIMIT 1",
      [anterior.nie]
    );
    if (otras.length === 0) {
      const [est] = await connection.query<RowDataPacket[]>(
        'SELECT estado FROM estudiante WHERE nie = ? FOR UPDATE',
        [anterior.nie]
      );
      await connection.execute("UPDATE estudiante SET estado = 'Retirado' WHERE nie = ?", [anterior.nie]);
      await registrarAuditoria(connection, {
        idUsuario: id_usuario,
        tabla: 'estudiante',
        idRegistro: anterior.nie,
        accion: 'UPDATE',
        datosAnteriores: { estado: est[0]?.estado },
        datos: { estado: 'Retirado', motivo: `matricula ${id_matricula} ${motivo}` },
      });
    }

    await connection.commit();
    revalidatePath(`/dashboard/estudiantes/${anterior.nie}`);
    revalidatePath('/dashboard/matriculas');
    return { success: true };
  } catch (error) {
    await connection.rollback();
    console.error('Error retirando matricula:', error);
    return { success: false, error: 'retirarError' };
  } finally {
    connection.release();
  }
}

const trasladoSchema = z.object({
  id_matricula: z.coerce.number().int().positive(),
  id_seccion_destino: z.coerce.number().int().positive(),
  observaciones: z.string().trim().max(500).optional().default(''),
});

/**
 * Cambio de seccion dentro del mismo ciclo. El indice uq (nie, id_ciclo)
 * impide dos filas por ciclo, asi que se actualiza la seccion en la misma
 * matricula; el historial del movimiento queda en log_auditoria.
 */
export async function trasladarMatricula(input: unknown): Promise<ResultadoMatricula> {
  const session = await requirePermiso('matricula.editar');
  if (!session) return { success: false, error: 'sinPermiso' };

  const parsed = trasladoSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: 'checkFields', errors: parsed.error.flatten().fieldErrors };
  }
  const { id_matricula, id_seccion_destino, observaciones } = parsed.data;
  const connection = await getTransaction();

  try {
    const [rows] = await connection.query<RowDataPacket[]>(
      'SELECT * FROM matricula WHERE id_matricula = ? FOR UPDATE',
      [id_matricula]
    );
    if (rows.length === 0) {
      await connection.rollback();
      return { success: false, error: 'matriculaNoExiste' };
    }
    const anterior = rows[0];
    if (anterior.estado !== 'Vigente') {
      await connection.rollback();
      return { success: false, error: 'matriculaNoVigente' };
    }
    if (anterior.id_seccion === id_seccion_destino) {
      await connection.rollback();
      return { success: false, error: 'mismaSeccion' };
    }

    const destino = await bloquearSeccion(connection, id_seccion_destino);
    if (!destino) {
      await connection.rollback();
      return { success: false, error: 'seccionNoExiste' };
    }
    if (destino.id_ciclo !== anterior.id_ciclo) {
      await connection.rollback();
      return { success: false, error: 'seccionNoPerteneceAlCiclo' };
    }
    if (destino.ciclo_estado === 'Cerrado') {
      await connection.rollback();
      return { success: false, error: 'cicloCerrado' };
    }
    if (destino.vigentes >= destino.capacidad_max) {
      await connection.rollback();
      return { success: false, error: 'capacidadMaxima' };
    }

    await connection.execute(
      `UPDATE matricula
          SET id_seccion = ?, observaciones = CONCAT_WS('\n', observaciones, NULLIF(?, ''))
        WHERE id_matricula = ?`,
      [id_seccion_destino, observaciones, id_matricula]
    );
    await registrarAuditoria(connection, {
      idUsuario: Number(session.user.id),
      tabla: 'matricula',
      idRegistro: id_matricula,
      accion: 'UPDATE',
      datosAnteriores: { id_seccion: anterior.id_seccion },
      datos: { id_seccion: id_seccion_destino, observaciones, motivo: 'traslado' },
    });

    await connection.commit();
    revalidatePath(`/dashboard/estudiantes/${anterior.nie}`);
    revalidatePath('/dashboard/matriculas');
    return { success: true };
  } catch (error) {
    await connection.rollback();
    console.error('Error trasladando matricula:', error);
    return { success: false, error: 'trasladarError' };
  } finally {
    connection.release();
  }
}
