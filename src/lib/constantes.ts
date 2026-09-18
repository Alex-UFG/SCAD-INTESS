/**
 * Constantes compartidas entre server actions y paginas. Los archivos
 * 'use server' solo pueden exportar funciones async, asi que viven aqui.
 */

/**Filas por pagina en la bitacora de auditoria */
export const TAMANO_PAGINA_AUDITORIA = 50;

/**Al menos 8 caracteres, una mayuscula y un digito */
export const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d).{8,}$/;

export const ESTADOS_DOCENTE = ['Activo', 'Inactivo', 'Licencia'] as const;
export type EstadoDocente = (typeof ESTADOS_DOCENTE)[number];
