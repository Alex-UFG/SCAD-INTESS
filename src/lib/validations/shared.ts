import { z } from 'zod';

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
