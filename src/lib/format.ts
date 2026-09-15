interface ConNombre {
  primer_nombre: string;
  segundo_nombre?: string | null;
  primer_apellido: string;
  segundo_apellido?: string | null;
}

/**Nombre completo omitiendo los segmentos nulos o vacios */
export function nombreCompleto(persona: ConNombre): string {
  return [
    persona.primer_nombre,
    persona.segundo_nombre,
    persona.primer_apellido,
    persona.segundo_apellido,
  ]
    .filter(Boolean)
    .join(' ');
}

/**
 * Formatea una fecha de columna DATE. El pool usa timezone 'Z', asi que mysql2
 * entrega la fecha como medianoche UTC; se formatea en UTC para no mostrar el
 * dia anterior en servidores al oeste de UTC.
 */
export function formatFecha(fecha: Date | string): string {
  return new Date(fecha).toLocaleDateString('es-SV', { timeZone: 'UTC' });
}
