import { z } from 'zod';
import { fechaISO, Traductor, claveComoMensaje } from './shared';

/**
 * t recibe claves del namespace `estudiantes.errors`; en el cliente se pasa el
 * traductor de next-intl y en el servidor la instancia por defecto valida solo
 * la estructura (el mensaje que ve el usuario lo traduce el cliente).
 */
export const createEstudianteSchema = (t: Traductor = claveComoMensaje) =>
  z.object({
    nie: z.coerce.number().int().positive(t('niePositivo')),
    primer_nombre: z.string().min(1, t('primerNombreRequerido')).max(50),
    segundo_nombre: z.string().max(50).nullable().optional(),
    primer_apellido: z.string().min(1, t('primerApellidoRequerido')).max(50),
    segundo_apellido: z.string().max(50).nullable().optional(),
    fecha_nacimiento: fechaISO(t('fechaNacimientoInvalida')),
    genero: z.enum(['M', 'F'], { message: t('generoRequerido') }),
    direccion: z.string().max(200).nullable().optional(),
    estado: z.enum(['Activo', 'Inactivo', 'Retirado', 'Egresado']).default('Activo'),
  });

export const estudianteSchema = createEstudianteSchema();
export type EstudianteFormData = z.infer<typeof estudianteSchema>;
