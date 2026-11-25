/**
 * Constantes compartidas entre server actions y paginas. Los archivos
 * 'use server' solo pueden exportar funciones async, asi que viven aqui.
 */

export const ESTADOS_DOCENTE = ['Activo', 'Inactivo', 'Licencia'] as const;
export type EstadoDocente = (typeof ESTADOS_DOCENTE)[number];
