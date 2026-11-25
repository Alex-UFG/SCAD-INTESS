export const NOTA_MAXIMA = 10;
export const NOTA_MINIMA_APROBACION = 6;
export const HORAS_GRACIA_CIERRE = 72;

export const CAMPOS_NOTA = ['act1', 'act2', 'examen'] as const;
export type CampoNota = (typeof CAMPOS_NOTA)[number];

const PONDERACION: Record<CampoNota, number> = { act1: 0.35, act2: 0.35, examen: 0.3 };

export type Notas = Record<CampoNota, number | null>;

export const redondear2 = (n: number) => Math.round(n * 100) / 100;

export function promedioNota(n: Notas): number | null {
  if (n.act1 === null || n.act2 === null || n.examen === null) return null;
  return redondear2(n.act1 * PONDERACION.act1 + n.act2 * PONDERACION.act2 + n.examen * PONDERACION.examen);
}

export const enRiesgo = (promedio: number | null) => promedio !== null && promedio < NOTA_MINIMA_APROBACION;
