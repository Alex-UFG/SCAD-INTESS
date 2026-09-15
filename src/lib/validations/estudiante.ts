import { z } from 'zod';
import { fechaISO } from './shared';

export const estudianteSchema = z.object({
  nie: z.coerce.number().int().positive("El NIE debe ser un número positivo"),
  primer_nombre: z.string().min(1, "El primer nombre es requerido").max(50),
  segundo_nombre: z.string().max(50).nullable().optional(),
  primer_apellido: z.string().min(1, "El primer apellido es requerido").max(50),
  segundo_apellido: z.string().max(50).nullable().optional(),
  fecha_nacimiento: fechaISO("Fecha de nacimiento inválida"),
  genero: z.enum(['M', 'F'], { message: "Seleccione un género" }),
  direccion: z.string().max(200).nullable().optional(),
  estado: z.enum(['Activo', 'Inactivo', 'Retirado', 'Egresado']).default('Activo'),
});

export type EstudianteFormData = z.infer<typeof estudianteSchema>;
