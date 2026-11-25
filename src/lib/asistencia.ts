/**Logica pura de asistencia (sin BD) */

/**Porcentaje minimo de asistencia; por debajo se considera inasistencia preocupante */
export const UMBRAL_INASISTENCIA = 80;

export const ESTADOS_ASISTENCIA = ['Presente', 'Ausente', 'Tardanza', 'Justificado'] as const;
export type EstadoAsistencia = (typeof ESTADOS_ASISTENCIA)[number];

const ZONA_HORARIA = 'America/El_Salvador';

/**(presentes + tardanzas + justificados) / total * 100 con 2 decimales; null sin registros */
export function porcentajeAsistencia(c: { presentes: number; tardanzas: number; justificados: number; total: number }): number | null {
  if (c.total <= 0) return null;
  return Math.round(((c.presentes + c.tardanzas + c.justificados) / c.total) * 10000) / 100;
}

/**Fecha actual YYYY-MM-DD en America/El_Salvador */
export function hoyISO(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONA_HORARIA, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}
