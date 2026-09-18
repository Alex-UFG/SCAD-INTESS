'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { getTranslations } from 'next-intl/server';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { db, getTransaction, isDuplicateEntry } from '@/lib/db';
import { requireSession, requirePermiso } from '@/lib/session';
import { registrarAuditoria } from '@/lib/audit';
import { createCargaSchema } from '@/lib/validations/carga';
import type { ActionState } from '@/types/actions';

/**Especialidad transversal: sus materias se dictan en secciones de cualquier especialidad */
const ESPECIALIDAD_GENERAL = 1;

export interface CargaRow {
  id_carga: number;
  dui_docente: string;
  docente: string;
  cod_materia: string;
  materia: string;
  id_seccion: number;
  seccion: string;
  grado: number;
  especialidad: string;
  id_ciclo: number;
  anio: number;
  /**Matriculas Vigentes en la seccion (alumnos a cargo) */
  estudiantes: number;
}

async function exigirSesion() {
  const session = await requireSession();
  if (!session) throw new Error('UNAUTHORIZED');
  return session;
}

const SELECT_CARGA = `
  SELECT ca.id_carga, ca.dui_docente, CONCAT_WS(' ', d.primer_nombre, d.primer_apellido) AS docente,
         ca.cod_materia, m.nombre AS materia, ca.id_seccion, s.nombre AS seccion, s.grado,
         e.nombre AS especialidad, ca.id_ciclo, c.anio,
         (SELECT COUNT(*) FROM matricula mt WHERE mt.id_seccion = ca.id_seccion AND mt.estado = 'Vigente') AS estudiantes
    FROM carga_academica ca
    INNER JOIN docente d ON d.dui_docente = ca.dui_docente
    INNER JOIN materia m ON m.cod_materia = ca.cod_materia
    INNER JOIN seccion s ON s.id_seccion = ca.id_seccion
    INNER JOIN especialidad e ON e.id_especialidad = s.id_especialidad
    INNER JOIN ciclo_escolar c ON c.id_ciclo = ca.id_ciclo`;

function mapCarga(r: RowDataPacket): CargaRow {
  return { ...(r as CargaRow), estudiantes: Number(r.estudiantes ?? 0) };
}

export async function getCargas(filtro: { idCiclo?: number; duiDocente?: string; idSeccion?: number } = {}): Promise<CargaRow[]> {
  await exigirSesion();
  const cond: string[] = [];
  const params: (number | string)[] = [];
  if (filtro.idCiclo) { cond.push('ca.id_ciclo = ?'); params.push(filtro.idCiclo); }
  if (filtro.duiDocente) { cond.push('ca.dui_docente = ?'); params.push(filtro.duiDocente); }
  if (filtro.idSeccion) { cond.push('ca.id_seccion = ?'); params.push(filtro.idSeccion); }
  const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';
  const [rows] = await db.query<RowDataPacket[]>(
    `${SELECT_CARGA} ${where} ORDER BY c.anio DESC, d.primer_apellido, s.grado, s.nombre, m.nombre`,
    params
  );
  return rows.map(mapCarga);
}

/**Cargas del docente ligado al usuario de la sesion (notas y asistencia) */
export async function getCargasDelDocente(idUsuario: number, idCiclo?: number): Promise<CargaRow[]> {
  await exigirSesion();
  const cond = idCiclo ? 'AND ca.id_ciclo = ?' : "AND c.estado = 'Activo'";
  const [rows] = await db.query<RowDataPacket[]>(
    `${SELECT_CARGA} WHERE d.id_usuario = ? ${cond} ORDER BY s.grado, s.nombre, m.nombre`,
    idCiclo ? [idUsuario, idCiclo] : [idUsuario]
  );
  return rows.map(mapCarga);
}

export async function getCargaPorId(idCarga: number): Promise<CargaRow | null> {
  await exigirSesion();
  const [rows] = await db.query<RowDataPacket[]>(`${SELECT_CARGA} WHERE ca.id_carga = ?`, [idCarga]);
  return rows[0] ? mapCarga(rows[0]) : null;
}

export async function asignarCarga(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const t = await getTranslations('cargas');
  const session = await requirePermiso('config.carga');
  if (!session) return { success: false, message: t('errors.sinPermiso') };

  const parsed = createCargaSchema((k) => t(`errors.${k}`)).safeParse({
    dui_docente: formData.get('dui_docente'),
    cod_materia: formData.get('cod_materia'),
    id_seccion: formData.get('id_seccion'),
    id_ciclo: formData.get('id_ciclo'),
  });
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors, message: t('errors.revisarCampos') };
  }
  const d = parsed.data;
  const connection = await getTransaction();
  try {
    const [[docente], [materia], [seccion]] = await Promise.all([
      connection.query<RowDataPacket[]>('SELECT estado FROM docente WHERE dui_docente = ?', [d.dui_docente]),
      connection.query<RowDataPacket[]>('SELECT activa, grado, id_especialidad FROM materia WHERE cod_materia = ?', [d.cod_materia]),
      connection.query<RowDataPacket[]>(
        `SELECT s.grado, s.id_especialidad, s.id_ciclo, c.estado AS ciclo_estado
           FROM seccion s INNER JOIN ciclo_escolar c ON c.id_ciclo = s.id_ciclo WHERE s.id_seccion = ?`,
        [d.id_seccion]
      ),
    ]);

    let error: { campo: string; clave: string } | null = null;
    if (!docente[0]) error = { campo: 'dui_docente', clave: 'docenteNoExiste' };
    else if (docente[0].estado !== 'Activo') error = { campo: 'dui_docente', clave: 'docenteNoActivo' };
    else if (!materia[0]) error = { campo: 'cod_materia', clave: 'materiaNoExiste' };
    else if (!materia[0].activa) error = { campo: 'cod_materia', clave: 'materiaInactiva' };
    else if (!seccion[0]) error = { campo: 'id_seccion', clave: 'seccionNoExiste' };
    else if (seccion[0].id_ciclo !== d.id_ciclo) error = { campo: 'id_seccion', clave: 'seccionDeOtroCiclo' };
    else if (seccion[0].ciclo_estado === 'Cerrado') error = { campo: 'id_ciclo', clave: 'cicloCerrado' };
    else if (materia[0].grado !== seccion[0].grado) error = { campo: 'cod_materia', clave: 'gradoNoCoincide' };
    else if (materia[0].id_especialidad !== seccion[0].id_especialidad && materia[0].id_especialidad !== ESPECIALIDAD_GENERAL) {
      error = { campo: 'cod_materia', clave: 'especialidadNoCoincide' };
    }
    if (error) {
      await connection.rollback();
      return { success: false, errors: { [error.campo]: [t(`errors.${error.clave}`)] }, message: t(`errors.${error.clave}`) };
    }

    const [res] = await connection.execute<ResultSetHeader>(
      'INSERT INTO carga_academica (dui_docente, cod_materia, id_seccion, id_ciclo) VALUES (?, ?, ?, ?)',
      [d.dui_docente, d.cod_materia, d.id_seccion, d.id_ciclo]
    );
    await registrarAuditoria(connection, {
      idUsuario: Number(session.user.id),
      tabla: 'carga_academica',
      idRegistro: res.insertId,
      accion: 'INSERT',
      datos: d,
    });
    await connection.commit();
    revalidatePath('/dashboard/cargas');
    revalidatePath(`/dashboard/docentes/${d.dui_docente}`);
    return { success: true, message: t('asignada') };
  } catch (error) {
    await connection.rollback();
    if (isDuplicateEntry(error)) return { success: false, message: t('errors.duplicada') };
    console.error('Error asignando carga:', error);
    return { success: false, message: t('errors.errorServidor') };
  } finally {
    connection.release();
  }
}

/**Se puede quitar mientras no existan notas ni asistencia registradas por ese docente en esa materia y ciclo */
export async function quitarCarga(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const t = await getTranslations('cargas');
  const session = await requirePermiso('config.carga');
  if (!session) return { success: false, message: t('errors.sinPermiso') };

  const id = z.coerce.number().int().positive().safeParse(formData.get('id_carga'));
  if (!id.success) return { success: false, message: t('errors.revisarCampos') };

  const connection = await getTransaction();
  try {
    const [rows] = await connection.query<RowDataPacket[]>('SELECT * FROM carga_academica WHERE id_carga = ? FOR UPDATE', [id.data]);
    const carga = rows[0];
    if (!carga) { await connection.rollback(); return { success: false, message: t('errors.noExiste') }; }

    const [uso] = await connection.query<RowDataPacket[]>(
      `SELECT 1 FROM nota n INNER JOIN periodo_evaluativo p ON p.id_periodo = n.id_periodo
        WHERE n.dui_docente = ? AND n.cod_materia = ? AND p.id_ciclo = ?
       UNION ALL
       SELECT 1 FROM asistencia a INNER JOIN matricula m ON m.nie = a.nie AND m.id_ciclo = ?
        WHERE a.dui_docente = ? AND a.cod_materia = ? AND m.id_seccion = ?
       LIMIT 1`,
      [carga.dui_docente, carga.cod_materia, carga.id_ciclo, carga.id_ciclo, carga.dui_docente, carga.cod_materia, carga.id_seccion]
    );
    if (uso[0]) { await connection.rollback(); return { success: false, message: t('errors.tieneRegistros') }; }

    await connection.execute('DELETE FROM carga_academica WHERE id_carga = ?', [id.data]);
    await registrarAuditoria(connection, {
      idUsuario: Number(session.user.id),
      tabla: 'carga_academica',
      idRegistro: id.data,
      accion: 'DELETE',
      datosAnteriores: carga,
    });
    await connection.commit();
    revalidatePath('/dashboard/cargas');
    revalidatePath(`/dashboard/docentes/${carga.dui_docente}`);
    return { success: true, message: t('eliminada') };
  } catch (error) {
    await connection.rollback();
    console.error('Error quitando carga:', error);
    return { success: false, message: t('errors.errorServidor') };
  } finally {
    connection.release();
  }
}
