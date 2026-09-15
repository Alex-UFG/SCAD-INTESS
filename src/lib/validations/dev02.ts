import { z } from 'zod'

export const EstudianteSchema = z.object({
    nie : z.coerce.number().int().positive('¡El NIE debe ser un número entero positvo!'),
    primer_nombre: z.string().min(2, 'El primer nombre debe requerir almenos 2 caracteres').max(55),
    segundo_nombre: z.string().max(50).optional().nullable(),
    primer_apellido: z.string().min(2, 'el primer apellido requiere al menos 2 caracteres').max(50),
    segundo_apellido: z.string().max(50).optional().nullable(),
    fecha_nacimiento: z.string().regex(/^\d{2}-\d{2}-\d{4}$/, 'Formato de fecha invalido (dd-MM-YYYY)'),
    genero: z.enum(['M', 'F']),
    direccion : z.string().max(200).optional().nullable(),
    foto_url: z.string().max(255).optional().nullable(),
    estado: z.enum(['Activo', 'Inactivo','Retirado','Egresado']).default('Activo')
});

export const MatriculaSchema = z.object({
    nie: z.coerce.number().int().positive('Debe seleccionar un estudiante válido'),
    id_seccion: z.coerce.number().int().positive('Debe seleccionar un seccion válida'),
    id_ciclo: z.coerce.number().int().positive('Debe seleccionar un ciclo escolar válido'),
    observaciones: z.string().max(500).optional().nullable()
});