'use server';

import type { RowDataPacket } from 'mysql2';
import { db } from '@/lib/db';
import { requirePermiso } from '@/lib/permisos';
import { fechaIso } from '@/lib/format';

export interface EstudianteReporte {
  nie: number;
  nombre: string;
  grado: number;
  seccion: string;
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

export interface Boleta {
  estudiante: EstudianteReporte;
  anio: number;
  numeroPeriodo: number;
  materias: MateriaBoleta[];
}

export interface ConstanciaMatricula extends EstudianteReporte {
  anio: number;
  fecha_matricula: string;
}

const SELECT_MATRICULA = `
  SELECT e.nie, CONCAT_WS(' ', e.primer_nombre, e.segundo_nombre, e.primer_apellido, e.segundo_apellido) AS nombre,
         s.id_seccion, s.grado, s.nombre AS seccion, esp.nombre AS especialidad, c.anio, m.fecha_matricula
    FROM matricula m
    INNER JOIN estudiante e ON e.nie = m.nie
    INNER JOIN seccion s ON s.id_seccion = m.id_seccion
    INNER JOIN especialidad esp ON esp.id_especialidad = s.id_especialidad
    INNER JOIN ciclo_escolar c ON c.id_ciclo = m.id_ciclo
   WHERE m.id_ciclo = ? AND m.estado = 'Vigente'`;

const mapEstudiante = (r: RowDataPacket): EstudianteReporte => ({
  nie: r.nie,
  nombre: r.nombre,
  grado: r.grado,
  seccion: r.seccion,
  especialidad: r.especialidad,
});

const aNumero = (v: number | string | null) => (v === null ? null : Number(v));

/**Estudiantes con matricula Vigente en el ciclo: a ellos se les emiten boleta y constancia */
export async function getEstudiantesReporte(idCiclo: number): Promise<EstudianteReporte[]> {
  if (!(await requirePermiso('reportes.boleta'))) return [];
  const [rows] = await db.query<RowDataPacket[]>(
    `${SELECT_MATRICULA} ORDER BY s.grado, s.nombre, e.primer_apellido, e.segundo_apellido, e.primer_nombre`,
    [idCiclo]
  );
  return rows.map(mapEstudiante);
}

/**REP-01: notas del estudiante en cada materia de la carga de su seccion */
export async function getBoleta(nie: number, idCiclo: number, idPeriodo: number): Promise<Boleta | null> {
  if (!(await requirePermiso('reportes.boleta'))) return null;
  const [[[matricula]], [[periodo]]] = await Promise.all([
    db.query<RowDataPacket[]>(`${SELECT_MATRICULA} AND m.nie = ?`, [idCiclo, nie]),
    db.query<RowDataPacket[]>('SELECT numero FROM periodo_evaluativo WHERE id_periodo = ? AND id_ciclo = ?', [idPeriodo, idCiclo]),
  ]);
  if (!matricula || !periodo) return null;

  const [materias] = await db.query<RowDataPacket[]>(
    `SELECT DISTINCT m.cod_materia, m.nombre AS materia, n.nota_act1, n.nota_act2, n.nota_examen, n.promedio, n.riesgo_academico
       FROM carga_academica ca
       INNER JOIN materia m ON m.cod_materia = ca.cod_materia
       LEFT JOIN nota n ON n.cod_materia = ca.cod_materia AND n.nie = ? AND n.id_periodo = ?
      WHERE ca.id_seccion = ? AND ca.id_ciclo = ?
      ORDER BY m.nombre`,
    [nie, idPeriodo, matricula.id_seccion, idCiclo]
  );
  return {
    estudiante: mapEstudiante(matricula),
    anio: matricula.anio,
    numeroPeriodo: periodo.numero,
    materias: materias.map((r) => ({
      cod_materia: r.cod_materia,
      materia: r.materia,
      act1: aNumero(r.nota_act1),
      act2: aNumero(r.nota_act2),
      examen: aNumero(r.nota_examen),
      promedio: aNumero(r.promedio),
      riesgo_academico: Boolean(r.riesgo_academico),
    })),
  };
}

/**REP-03: acredita la matricula Vigente del estudiante en el ciclo */
export async function getConstanciaMatricula(nie: number, idCiclo: number): Promise<ConstanciaMatricula | null> {
  if (!(await requirePermiso('reportes.constancia'))) return null;
  const [[r]] = await db.query<RowDataPacket[]>(`${SELECT_MATRICULA} AND m.nie = ?`, [idCiclo, nie]);
  return r ? { ...mapEstudiante(r), anio: r.anio, fecha_matricula: fechaIso(r.fecha_matricula) } : null;
}
