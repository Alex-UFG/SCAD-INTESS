"use server";

import type { RowDataPacket } from "mysql2";
import { db } from "@/lib/db";
import { requirePermiso } from "@/lib/permisos";

export interface CicloBoleta {
  id_ciclo: number;
  anio: number;
  estado: string;
}

export interface PeriodoBoleta {
  id_periodo: number;
  id_ciclo: number;
  numero: number;
  fecha_inicio: string;
  fecha_cierre: string;
  estado: string;
}

export interface EstudianteBoleta {
  nie: number;
  nombre: string;
  id_seccion: number;
  seccion: string;
  grado: number;
  especialidad: string;
}

export interface MateriaBoleta {
  cod_materia: string;
  materia: string;
  act1: number | null;
  act2: number | null;
  examen: number | null;
  promedio: number | null;
  riesgo_academico: boolean;
}

interface CicloRow extends RowDataPacket, CicloBoleta {}
interface PeriodoRow extends RowDataPacket, PeriodoBoleta {}
interface EstudianteRow extends RowDataPacket, EstudianteBoleta {}

interface MateriaRow extends RowDataPacket {
  cod_materia: string;
  materia: string;
  act1: number | string | null;
  act2: number | string | null;
  examen: number | string | null;
  promedio: number | string | null;
  riesgo_academico: number;
}

function validarId(id: number): boolean {
  return Number.isSafeInteger(id) && id > 0;
}

function normalizarNota(valor: number | string | null): number | null {
  return valor === null ? null : Number(valor);
}

async function validarPermisoBoleta() {
  const session = await requirePermiso("reportes.boleta");

  if (!session) {
    throw new Error("No tienes permiso para consultar boletas de calificaciones.");
  }

  return session;
}

/**
 * Obtiene los ciclos y períodos disponibles para generar REP-01.
 */
export async function getContextoBoletas() {
  await validarPermisoBoleta();

  try {
    const [ciclos] = await db.query<CicloRow[]>(`
      SELECT id_ciclo, anio, estado
      FROM ciclo_escolar
      ORDER BY anio DESC
    `);

    const [periodos] = await db.query<PeriodoRow[]>(`
      SELECT
        id_periodo,
        id_ciclo,
        numero,
        fecha_inicio,
        fecha_cierre,
        estado
      FROM periodo_evaluativo
      ORDER BY id_ciclo DESC, numero ASC
    `);

    return { ciclos, periodos };
  } catch (error) {
    console.error("Error consultando contexto de boletas:", error);
    throw new Error("No fue posible consultar los ciclos y períodos escolares.");
  }
}

/**
 * Busca estudiantes con matrícula vigente en el ciclo seleccionado.
 * Limita los resultados para evitar consultas demasiado amplias.
 */
export async function buscarEstudiantesBoleta(
  termino: string,
  idCiclo: number
): Promise<EstudianteBoleta[]> {
  await validarPermisoBoleta();

  if (!validarId(idCiclo)) {
    throw new Error("El ciclo escolar seleccionado no es válido.");
  }

  const busqueda = termino.trim();

  if (busqueda.length < 2) {
    return [];
  }

  try {
    const patron = `%${busqueda}%`;

    const [rows] = await db.query<EstudianteRow[]>(`
      SELECT
        est.nie,
        TRIM(CONCAT_WS(' ',
          est.primer_nombre,
          est.segundo_nombre,
          est.primer_apellido,
          est.segundo_apellido
        )) AS nombre,
        sec.id_seccion,
        sec.nombre AS seccion,
        sec.grado,
        esp.nombre AS especialidad
      FROM matricula mat
      INNER JOIN estudiante est ON est.nie = mat.nie
      INNER JOIN seccion sec ON sec.id_seccion = mat.id_seccion
      INNER JOIN especialidad esp
        ON esp.id_especialidad = sec.id_especialidad
      WHERE mat.id_ciclo = ?
        AND mat.estado = 'Vigente'
        AND (
          CAST(est.nie AS CHAR) LIKE ?
          OR CONCAT_WS(' ',
            est.primer_nombre,
            est.segundo_nombre,
            est.primer_apellido,
            est.segundo_apellido
          ) LIKE ?
        )
      ORDER BY est.primer_apellido, est.primer_nombre
      LIMIT 30
    `, [idCiclo, patron, patron]);

    return rows;
  } catch (error) {
    console.error("Error buscando estudiantes para boletas:", error);
    throw new Error("No fue posible buscar los estudiantes.");
  }
}

/**
 * Obtiene la información académica y las notas de un estudiante
 * para un período específico. REP-01.
 */
export async function getBoletaEstudiante(
  nie: number,
  idCiclo: number,
  idPeriodo: number
) {
  await validarPermisoBoleta();

  if (
    !validarId(nie) ||
    !validarId(idCiclo) ||
    !validarId(idPeriodo)
  ) {
    throw new Error("Los datos seleccionados para la boleta no son válidos.");
  }

  try {
    const [periodos] = await db.query<PeriodoRow[]>(`
      SELECT
        id_periodo,
        id_ciclo,
        numero,
        fecha_inicio,
        fecha_cierre,
        estado
      FROM periodo_evaluativo
      WHERE id_periodo = ? AND id_ciclo = ?
      LIMIT 1
    `, [idPeriodo, idCiclo]);

    const periodo = periodos[0];

    if (!periodo) {
      throw new Error("El período seleccionado no pertenece al ciclo escolar.");
    }

    const [estudiantes] = await db.query<EstudianteRow[]>(`
      SELECT
        est.nie,
        TRIM(CONCAT_WS(' ',
          est.primer_nombre,
          est.segundo_nombre,
          est.primer_apellido,
          est.segundo_apellido
        )) AS nombre,
        sec.id_seccion,
        sec.nombre AS seccion,
        sec.grado,
        esp.nombre AS especialidad
      FROM matricula mat
      INNER JOIN estudiante est ON est.nie = mat.nie
      INNER JOIN seccion sec ON sec.id_seccion = mat.id_seccion
      INNER JOIN especialidad esp
        ON esp.id_especialidad = sec.id_especialidad
      WHERE mat.nie = ?
        AND mat.id_ciclo = ?
        AND mat.estado = 'Vigente'
      LIMIT 1
    `, [nie, idCiclo]);

    const estudiante = estudiantes[0];

    if (!estudiante) {
      throw new Error(
        "El estudiante no tiene una matrícula vigente en el ciclo seleccionado."
      );
    }

    const [materias] = await db.query<MateriaRow[]>(`
      SELECT DISTINCT
        m.cod_materia,
        m.nombre AS materia,
        n.nota_act1 AS act1,
        n.nota_act2 AS act2,
        n.nota_examen AS examen,
        n.promedio,
        n.riesgo_academico
      FROM carga_academica ca
      INNER JOIN materia m
        ON m.cod_materia = ca.cod_materia
      LEFT JOIN nota n
        ON n.cod_materia = ca.cod_materia
        AND n.nie = ?
        AND n.id_periodo = ?
      WHERE ca.id_seccion = ?
        AND ca.id_ciclo = ?
      ORDER BY m.nombre
    `, [nie, idPeriodo, estudiante.id_seccion, idCiclo]);

    return {
      estudiante,
      ciclo: idCiclo,
      anio: Number((await db.query<RowDataPacket[]>(
        "SELECT anio FROM ciclo_escolar WHERE id_ciclo = ? LIMIT 1",
        [idCiclo]
      ))[0][0]?.anio),
      periodo,
      materias: materias.map((row) => ({
        cod_materia: row.cod_materia,
        materia: row.materia,
        act1: normalizarNota(row.act1),
        act2: normalizarNota(row.act2),
        examen: normalizarNota(row.examen),
        promedio: normalizarNota(row.promedio),
        riesgo_academico: Boolean(row.riesgo_academico),
      })),
    };
  } catch (error) {
    if (
      error instanceof Error &&
      (
        error.message.includes("no pertenece") ||
        error.message.includes("no tiene una matrícula")
      )
    ) {
      throw error;
    }

    console.error("Error generando consulta de boleta:", error);
    throw new Error("No fue posible consultar la boleta del estudiante.");
  }
}
