import { z } from 'zod';
import { fechaISO } from './shared';

export const matriculaSchema = z.object({
  nie: z.coerce.number().int().positive("NIE inválido"),
  id_seccion: z.coerce.number().int().positive("Debe seleccionar una sección"),
  id_ciclo: z.coerce.number().int().positive("Debe seleccionar un ciclo"),
  fecha_matricula: fechaISO("Fecha de matrícula inválida"),
  estado: z.enum(['Vigente', 'Retirado', 'Trasladado']).default('Vigente'),
  observaciones: z.string().max(500).nullable().optional(),
});

export type MatriculaFormData = z.infer<typeof matriculaSchema>;
