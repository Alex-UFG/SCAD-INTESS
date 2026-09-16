import { z } from 'zod';

/**Traductor de claves de error (el `t` de next-intl acotado a `<modulo>.errors`) */
export type Traductor = (key: string) => string;

/**Fallback para la validacion de respaldo en el servidor: deja la clave como mensaje */
export const claveComoMensaje: Traductor = (key) => key;

/**Formatos comunes de El Salvador compartidos entre schemas */
export const DUI_REGEX = /^\d{8}-\d$/;
export const TELEFONO_REGEX = /^\d{4}-\d{4}$/;
/**Lo que produce <input type="date"> y lo unico que acepta una columna DATE de MySQL */
export const FECHA_ISO_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Fecha en formato YYYY-MM-DD (Date.parse solo no basta: acepta formatos como
 * '12/31/2010' que MySQL rechaza).
 */
export const fechaISO = (message: string) =>
  z
    .string()
    .regex(FECHA_ISO_REGEX, message)
    .refine((val) => !isNaN(Date.parse(val)), { message });
