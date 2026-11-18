/**Logica pura de disciplina (sin BD) */

export const TIPOS_FALTA = ['Leve', 'Grave', 'Muy Grave'] as const;
export type TipoFalta = (typeof TIPOS_FALTA)[number];

export const ESTADOS_INCIDENCIA = ['Abierta', 'En_Proceso', 'Resuelta', 'Apelada'] as const;
export type EstadoIncidencia = (typeof ESTADOS_INCIDENCIA)[number];

export const ESTADOS_CITACION = ['Emitida', 'Entregada', 'Atendida', 'No_Asistio'] as const;
export type EstadoCitacion = (typeof ESTADOS_CITACION)[number];

/**Cada N faltas leves de un estudiante en el mismo periodo, la N-esima se registra como Grave */
export const LEVES_PARA_ESCALAR = 3;

/**Evidencias que admite una incidencia */
export const MAX_EVIDENCIAS = 5;

/**
 * `levesPrevias` cuenta las faltas leves ya registradas en el periodo,
 * incluidas las que se escalaron. Escalan la 3.a, la 6.a, la 9.a...
 */
export function escalaPorReincidencia(levesPrevias: number): boolean {
  return (levesPrevias + 1) % LEVES_PARA_ESCALAR === 0;
}

/**
 * Flujo de resolucion. La apelacion es contra una resolucion, asi que solo se
 * llega a Apelada desde Resuelta, y una apelacion se cierra resolviendo de nuevo.
 */
export const TRANSICIONES_INCIDENCIA: Record<EstadoIncidencia, readonly EstadoIncidencia[]> = {
  Abierta: ['En_Proceso'],
  En_Proceso: ['Resuelta'],
  Resuelta: ['Apelada'],
  Apelada: ['Resuelta'],
};

/**Estados que exigen un texto: la resolucion o el motivo de la apelacion */
export const ESTADOS_CON_TEXTO: readonly EstadoIncidencia[] = ['Resuelta', 'Apelada'];

export const TRANSICIONES_CITACION: Record<EstadoCitacion, readonly EstadoCitacion[]> = {
  Emitida: ['Entregada', 'Atendida', 'No_Asistio'],
  Entregada: ['Atendida', 'No_Asistio'],
  Atendida: [],
  No_Asistio: [],
};

export function puedeTransicionar<E extends string>(mapa: Record<E, readonly E[]>, de: E, a: E): boolean {
  return mapa[de]?.includes(a) ?? false;
}

const ZONA_HORARIA = 'America/El_Salvador';

/**
 * Fecha y hora de pared en El Salvador como 'YYYY-MM-DD HH:mm'. Las columnas
 * DATETIME de citacion guardan hora local sin zona, y este formato se compara
 * como texto contra ellas.
 */
export function ahoraLocal(instante: Date = new Date()): string {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: ZONA_HORARIA,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(instante)
      .map((x) => [x.type, x.value])
  );
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`;
}
