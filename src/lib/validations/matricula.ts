import { z } from 'zod';
import { fechaISO, Traductor, claveComoMensaje } from './shared';

/**t recibe claves del namespace `matriculas.errors` (ver estudiante.ts) */
export const createMatriculaSchema = (t: Traductor = claveComoMensaje) =>
  z.object({
    nie: z.coerce.number().int().positive(t('nieInvalido')),
    id_seccion: z.coerce.number().int().positive(t('seccionRequerida')),
    id_ciclo: z.coerce.number().int().positive(t('cicloRequerido')),
    fecha_matricula: fechaISO(t('fechaMatriculaInvalida')),
    // el estado no viene del formulario: toda matricula nueva es Vigente
    observaciones: z.string().max(500).nullable().optional(),
  });

export const matriculaSchema = createMatriculaSchema();
export type MatriculaFormData = z.infer<typeof matriculaSchema>;
