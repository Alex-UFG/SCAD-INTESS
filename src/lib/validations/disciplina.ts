import { z } from 'zod';
import { Traductor, claveComoMensaje, fechaISO, DUI_REGEX } from './shared';
import { ESTADOS_CITACION, ESTADOS_INCIDENCIA, TIPOS_FALTA } from '../disciplina';

const HORA_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
/**Lo que produce <input type="datetime-local"> */
const FECHA_HORA_REGEX = /^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/;

/**t recibe claves del namespace `incidencias.errors` */
export const incidenciaSchema = (t: Traductor = claveComoMensaje) =>
  z.object({
    nie: z.coerce.number({ message: t('estudianteRequerido') }).int().positive(t('estudianteRequerido')),
    fecha: fechaISO(t('fechaInvalida')),
    hora: z.union([z.literal(''), z.string().regex(HORA_REGEX, t('horaInvalida'))]).default(''),
    tipo_falta: z.enum(TIPOS_FALTA, { message: t('tipoInvalido') }),
    descripcion: z.string({ message: t('descripcionCorta') }).trim().min(10, t('descripcionCorta')).max(2000, t('descripcionLarga')),
  });

export const cambioEstadoIncidenciaSchema = (t: Traductor = claveComoMensaje) =>
  z.object({
    id_incidencia: z.coerce.number().int().positive(t('incidenciaInvalida')),
    estado: z.enum(ESTADOS_INCIDENCIA, { message: t('estadoInvalido') }),
    texto: z.string().trim().max(2000, t('textoLargo')).default(''),
  });

/**t recibe claves del namespace `citaciones.errors` */
export const citacionSchema = (t: Traductor = claveComoMensaje) =>
  z.object({
    id_incidencia: z.coerce.number().int().positive(t('incidenciaInvalida')),
    dui_tutor: z.string({ message: t('tutorRequerido') }).regex(DUI_REGEX, t('tutorRequerido')),
    fecha_citacion: z
      .string({ message: t('fechaInvalida') })
      .regex(FECHA_HORA_REGEX, t('fechaInvalida'))
      .refine((v) => !isNaN(Date.parse(v)), { message: t('fechaInvalida') }),
    observaciones: z.string().trim().max(500, t('observacionesLargas')).default(''),
  });

export const cambioEstadoCitacionSchema = (t: Traductor = claveComoMensaje) =>
  z.object({
    id_citacion: z.coerce.number().int().positive(t('citacionInvalida')),
    estado: z.enum(ESTADOS_CITACION, { message: t('estadoInvalido') }),
    observaciones: z.string().trim().max(500, t('observacionesLargas')).default(''),
  });
