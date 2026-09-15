import { z } from 'zod';

/**Traductor de claves de error (el `t` de next-intl acotado a `<modulo>.errors`) */
export type Traductor = (key: string) => string;

/**Fallback para la validacion de respaldo en el servidor: deja la clave como mensaje */
export const claveComoMensaje: Traductor = (key) => key;

/**
 * Fecha en formato YYYY-MM-DD: lo que produce <input type="date"> y lo unico
 * que acepta una columna DATE de MySQL (Date.parse solo no basta, acepta
 * formatos como '12/31/2010' que MySQL rechaza).
 */
export const fechaISO = (message: string) =>
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, message)
    .refine((val) => !isNaN(Date.parse(val)), { message });
