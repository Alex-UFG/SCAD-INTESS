
"use server";

import type { RowDataPacket } from "mysql2";
import { db } from "@/lib/db";
import { requirePermiso } from "@/lib/permisos";

export interface CicloNota {
  id_ciclo: number;
  anio: number;
  estado: string;
}

export interface PeriodoNota {
  id_periodo: number;
  id_ciclo: number;
  numero: number;
  fecha_inicio: string;
  fecha_cierre: string;
  estado: "Pendiente" | "Abierto" | "Cerrado";
  segundos_desde_cierre?: number | string | null;
}

export interface CargaNota {
  id_carga: number;
  dui_docente: string;
  cod_materia: string;
  materia: string;
  id_seccion: number;
  seccion: string;
  grado: number;
  id_especialidad: number;
  especialidad: string;
  id_ciclo: number;
  anio: number;
}

export interface EstudianteNota {
  nie: number;
  nombre: string;
  id_nota: number | null;
  act1: number | null;
  act2: number | null;
  examen: number | null;
  promedio: number | null;
  riesgo_academico: boolean;
  bloqueada: boolean;
}

interface CicloRow extends RowDataPacket, CicloNota {}
interface PeriodoRow extends RowDataPacket, PeriodoNota {}
interface CargaRow extends RowDataPacket, CargaNota {}

interface DocenteRow extends RowDataPacket {
  dui_docente: string;
}

interface EstudianteRow extends RowDataPacket {
  nie: number;
  nombre: string;
  id_nota: number | null;
  act1: number | string | null;
  act2: number | string | null;
  examen: number | string | null;
  promedio: number | string | null;
  riesgo_academico: number;
  bloqueada: number;
}

function normalizarNota(valor: number | string | null): number | null {
  return valor === null ? null : Number(valor);
}

function validarId(id: number): boolean {
  return Number.isSafeInteger(id) && id > 0;
}

function validarPerfilDocente(
  rol: number,
  docente: DocenteRow | undefined
): void {
  if (rol === 5 && !docente) {
    throw new Error(
      "Tu usuario no tiene un perfil docente activo asociado. Solicita a Dirección que complete tu registro."
    );
  }
}

/**
 * Obtiene ciclos, períodos y cargas académicas disponibles.
 * Los docentes solamente consultan sus propias cargas.
 */
export async function getContextoNotas() {
  const session = await requirePermiso("notas.ver");

  if (!session) {
    throw new Error("No tienes permiso para consultar las notas.");
  }

  try {
    const [ciclos] = await db.query<CicloRow[]>(`
      SELECT id_ciclo, anio, estado
      FROM ciclo_escolar
      ORDER BY anio DESC
    `);

    const [periodos] = await db.query<PeriodoRow[]>(`
      SELECT
        p.id_periodo,
        p.id_ciclo,
        p.numero,
        p.fecha_inicio,
        p.fecha_cierre,
        p.estado,
        CASE
          WHEN p.estado = 'Cerrado' AND cierre.fecha_cierre IS NOT NULL
          THEN TIMESTAMPDIFF(SECOND, cierre.fecha_cierre, NOW())
          ELSE NULL
        END AS segundos_desde_cierre
      FROM periodo_evaluativo p
      LEFT JOIN (
        SELECT id_registro, MAX(fecha_hora) AS fecha_cierre
        FROM log_auditoria
        WHERE tabla_afectada = 'periodo_evaluativo'
          AND tipo_accion = 'UPDATE'
          AND JSON_UNQUOTE(JSON_EXTRACT(datos_nuevos, '$.estado')) = 'Cerrado'
        GROUP BY id_registro
      ) cierre
        ON cierre.id_registro = CAST(p.id_periodo AS CHAR)
      ORDER BY p.id_ciclo DESC, p.numero ASC
    `);

    const [docentes] = await db.query<DocenteRow[]>(
      `SELECT dui_docente
       FROM docente
       WHERE id_usuario = ? AND estado = 'Activo'
       LIMIT 1`,
      [Number(session.user.id)]
    );

    const docente = docentes[0];
    const rol = Number(session.user.rol);

    validarPerfilDocente(rol, docente);

    let cargas: CargaRow[];

    if (docente) {
      const [rows] = await db.query<CargaRow[]>(
        `
          SELECT
            ca.id_carga,
            ca.dui_docente,
            ca.cod_materia,
            m.nombre AS materia,
            ca.id_seccion,
            s.nombre AS seccion,
            s.grado,
            s.id_especialidad,
            e.nombre AS especialidad,
            ca.id_ciclo,
            c.anio
          FROM carga_academica ca
          INNER JOIN materia m ON m.cod_materia = ca.cod_materia
          INNER JOIN seccion s ON s.id_seccion = ca.id_seccion
          INNER JOIN especialidad e
            ON e.id_especialidad = s.id_especialidad
          INNER JOIN ciclo_escolar c ON c.id_ciclo = ca.id_ciclo
          WHERE ca.dui_docente = ?
            AND c.estado = 'Activo'
          ORDER BY s.grado, s.nombre, m.nombre
        `,
        [docente.dui_docente]
      );

      cargas = rows;
    } else {
      const [rows] = await db.query<CargaRow[]>(`
        SELECT
          ca.id_carga,
          ca.dui_docente,
          ca.cod_materia,
          m.nombre AS materia,
          ca.id_seccion,
          s.nombre AS seccion,
          s.grado,
          s.id_especialidad,
          e.nombre AS especialidad,
          ca.id_ciclo,
          c.anio
        FROM carga_academica ca
        INNER JOIN materia m ON m.cod_materia = ca.cod_materia
        INNER JOIN seccion s ON s.id_seccion = ca.id_seccion
        INNER JOIN especialidad e
          ON e.id_especialidad = s.id_especialidad
        INNER JOIN ciclo_escolar c ON c.id_ciclo = ca.id_ciclo
        WHERE c.estado = 'Activo'
        ORDER BY s.grado, s.nombre, m.nombre
      `);

      cargas = rows;
    }

    return {
      ciclos,
      periodos,
      cargas,
      docenteDui: docente?.dui_docente ?? null,
      esDocente: docente !== undefined,
      puedeRegistrarNotas: Boolean(await requirePermiso("notas.registrar")),
      puedeEditarBloqueada: Boolean(await requirePermiso("notas.editar_bloqueada")),
    };
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("perfil docente activo")
    ) {
      throw error;
    }

    console.error("Error consultando contexto de notas:", error);
    throw new Error("No fue posible consultar la información académica.");
  }
}

/**
 * Obtiene estudiantes matriculados y sus notas para una carga y período.
 * Respeta la asignación del docente y el ciclo académico.
 */
export async function getEstudiantesPorCarga(
  idCarga: number,
  idPeriodo: number
): Promise<EstudianteNota[]> {
  const session = await requirePermiso("notas.ver");

  if (!session) {
    throw new Error("No tienes permiso para consultar las notas.");
  }

  if (!validarId(idCarga) || !validarId(idPeriodo)) {
    throw new Error(
      "La carga académica o el período seleccionado no son válidos."
    );
  }

  try {
    const [docentes] = await db.query<DocenteRow[]>(
      `SELECT dui_docente
       FROM docente
       WHERE id_usuario = ? AND estado = 'Activo'
       LIMIT 1`,
      [Number(session.user.id)]
    );

    const docente = docentes[0];
    const rol = Number(session.user.rol);

    validarPerfilDocente(rol, docente);

    const [cargas] = await db.query<CargaRow[]>(
      `
        SELECT
          ca.id_carga,
          ca.dui_docente,
          ca.cod_materia,
          m.nombre AS materia,
          ca.id_seccion,
          s.nombre AS seccion,
          s.grado,
          s.id_especialidad,
          e.nombre AS especialidad,
          ca.id_ciclo,
          c.anio
        FROM carga_academica ca
        INNER JOIN materia m ON m.cod_materia = ca.cod_materia
        INNER JOIN seccion s ON s.id_seccion = ca.id_seccion
        INNER JOIN especialidad e
          ON e.id_especialidad = s.id_especialidad
        INNER JOIN ciclo_escolar c ON c.id_ciclo = ca.id_ciclo
        WHERE ca.id_carga = ?
          AND c.estado = 'Activo'
          ${docente ? "AND ca.dui_docente = ?" : ""}
        LIMIT 1
      `,
      docente ? [idCarga, docente.dui_docente] : [idCarga]
    );

    const carga = cargas[0];

    if (!carga) {
      throw new Error(
        "La carga académica no existe o no tienes acceso a ella."
      );
    }

    const [periodos] = await db.query<PeriodoRow[]>(
      `
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
      `,
      [idPeriodo, carga.id_ciclo]
    );

    if (!periodos[0]) {
      throw new Error(
        "El período no pertenece al ciclo de la carga académica."
      );
    }

    const [rows] = await db.query<EstudianteRow[]>(
      `
        SELECT
          est.nie,
          TRIM(CONCAT_WS(' ',
            est.primer_nombre,
            est.segundo_nombre,
            est.primer_apellido,
            est.segundo_apellido
          )) AS nombre,
          n.id_nota,
          n.nota_act1 AS act1,
          n.nota_act2 AS act2,
          n.nota_examen AS examen,
          n.promedio,
          n.riesgo_academico,
          n.bloqueada
        FROM matricula mat
        INNER JOIN estudiante est ON est.nie = mat.nie
        LEFT JOIN nota n
          ON n.nie = mat.nie
          AND n.cod_materia = ?
          AND n.id_periodo = ?
        WHERE mat.id_seccion = ?
          AND mat.id_ciclo = ?
          AND mat.estado = 'Vigente'
        ORDER BY est.primer_apellido, est.primer_nombre
      `,
      [
        carga.cod_materia,
        idPeriodo,
        carga.id_seccion,
        carga.id_ciclo,
      ]
    );

    return rows.map((row) => ({
      nie: row.nie,
      nombre: row.nombre,
      id_nota: row.id_nota,
      act1: normalizarNota(row.act1),
      act2: normalizarNota(row.act2),
      examen: normalizarNota(row.examen),
      promedio: normalizarNota(row.promedio),
      riesgo_academico: Boolean(row.riesgo_academico),
      bloqueada: Boolean(row.bloqueada),
    }));
  } catch (error) {
    if (
      error instanceof Error &&
      (
        error.message.includes("no existe") ||
        error.message.includes("no pertenec") ||
        error.message.includes("acceso") ||
        error.message.includes("perfil docente activo")
      )
    ) {
      throw error;
    }

    console.error("Error consultando estudiantes para notas:", error);
    throw new Error(
      "No fue posible consultar los estudiantes de la carga académica."
    );
  }
}
