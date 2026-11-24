"use server";

import type { RowDataPacket } from "mysql2";
import { db } from "@/lib/db";
import { requirePermiso } from "@/lib/permisos";

export interface DatosConstanciaMatricula {
  nie: number;
  nombre: string;
  grado: number;
  seccion: string;
  especialidad: string;
  anio: number;
  fechaMatricula: string;
  estado: string;
}

interface ConstanciaRow extends RowDataPacket {
  nie: number;
  nombre: string;
  grado: number;
  seccion: string;
  especialidad: string;
  anio: number;
  fechaMatricula: string;
  estado: string;
}

export async function getConstanciaMatricula(
  nie: number,
  idCiclo: number
): Promise<DatosConstanciaMatricula> {
  const session = await requirePermiso("reportes.constancia");

  if (!session) {
    throw new Error("No tienes permiso para generar constancias de matrícula.");
  }

  if (
    !Number.isSafeInteger(nie) ||
    nie <= 0 ||
    !Number.isSafeInteger(idCiclo) ||
    idCiclo <= 0
  ) {
    throw new Error("Los datos del estudiante o ciclo no son válidos.");
  }

  try {
    const [rows] = await db.query<ConstanciaRow[]>(
      `
        SELECT
          est.nie,
          TRIM(CONCAT_WS(' ',
            est.primer_nombre,
            est.segundo_nombre,
            est.primer_apellido,
            est.segundo_apellido
          )) AS nombre,
          sec.grado,
          sec.nombre AS seccion,
          esp.nombre AS especialidad,
          cic.anio,
          DATE_FORMAT(mat.fecha_matricula, '%Y-%m-%d') AS fechaMatricula,
          mat.estado
        FROM matricula mat
        INNER JOIN estudiante est ON est.nie = mat.nie
        INNER JOIN seccion sec ON sec.id_seccion = mat.id_seccion
        INNER JOIN especialidad esp
          ON esp.id_especialidad = sec.id_especialidad
        INNER JOIN ciclo_escolar cic ON cic.id_ciclo = mat.id_ciclo
        WHERE mat.nie = ?
          AND mat.id_ciclo = ?
          AND mat.estado = 'Vigente'
        LIMIT 1
      `,
      [nie, idCiclo]
    );

    const constancia = rows[0];

    if (!constancia) {
      throw new Error(
        "El estudiante no tiene una matrícula vigente en el ciclo seleccionado."
      );
    }

    return constancia;
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("no tiene una matrícula vigente")
    ) {
      throw error;
    }

    console.error("Error consultando constancia de matrícula:", error);
    throw new Error("No fue posible consultar los datos de la constancia.");
  }
}
