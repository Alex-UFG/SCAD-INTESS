import { z } from 'zod';
import { Traductor, claveComoMensaje, DUI_REGEX } from './shared';

/**t recibe claves del namespace `tutores.errors` (ver estudiante.ts) */
export const createTutorSchema = (t: Traductor = claveComoMensaje) =>
  z.object({
    dui_tutor: z.string().regex(DUI_REGEX, t('duiInvalido')),
    primer_nombre: z.string().min(1, t('primerNombreRequerido')).max(50),
    segundo_nombre: z.string().max(50).nullable().optional(),
    primer_apellido: z.string().min(1, t('primerApellidoRequerido')).max(50),
    segundo_apellido: z.string().max(50).nullable().optional(),
    telefono_principal: z.string().min(8, t('telefonoRequerido')).max(15),
    telefono_alterno: z.string().max(15).nullable().optional(),
    email: z.string().email(t('emailInvalido')).max(100).nullable().optional().or(z.literal('')),
    ocupacion: z.string().max(100).nullable().optional(),
  });

export const tutorSchema = createTutorSchema();
export type TutorFormData = z.infer<typeof tutorSchema>;

export const createEstudianteTutorSchema = (t: Traductor = claveComoMensaje) =>
  z.object({
    nie: z.coerce.number().int().positive(),
    dui_tutor: z.string().regex(DUI_REGEX, t('seleccioneTutor')),
    parentesco: z.enum(['Padre', 'Madre', 'Abuelo', 'Abuela', 'Tio', 'Tia', 'Hermano', 'Hermana', 'Encargado'], {
      message: t('parentescoRequerido'),
    }),
    contacto_principal: z.boolean().default(false),
  });

export const estudianteTutorSchema = createEstudianteTutorSchema();
export type EstudianteTutorFormData = z.infer<typeof estudianteTutorSchema>;
