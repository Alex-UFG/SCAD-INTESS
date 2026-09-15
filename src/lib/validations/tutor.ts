import { z } from 'zod';

export const tutorSchema = z.object({
  dui_tutor: z.string().regex(/^\d{8}-\d$/, "Formato de DUI inválido (ej: 00000000-0)"),
  primer_nombre: z.string().min(1, "El primer nombre es requerido").max(50),
  segundo_nombre: z.string().max(50).nullable().optional(),
  primer_apellido: z.string().min(1, "El primer apellido es requerido").max(50),
  segundo_apellido: z.string().max(50).nullable().optional(),
  telefono_principal: z.string().min(8, "El teléfono principal es requerido").max(15),
  telefono_alterno: z.string().max(15).nullable().optional(),
  email: z.string().email("Correo electrónico inválido").max(100).nullable().optional().or(z.literal('')),
  ocupacion: z.string().max(100).nullable().optional(),
});

export type TutorFormData = z.infer<typeof tutorSchema>;

export const estudianteTutorSchema = z.object({
  nie: z.coerce.number().int().positive(),
  dui_tutor: z.string().regex(/^\d{8}-\d$/),
  parentesco: z.enum(['Padre', 'Madre', 'Abuelo', 'Abuela', 'Tio', 'Tia', 'Hermano', 'Hermana', 'Encargado']),
  contacto_principal: z.boolean().default(false),
});

export type EstudianteTutorFormData = z.infer<typeof estudianteTutorSchema>;
