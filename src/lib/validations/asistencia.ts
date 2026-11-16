import { z } from 'zod';
import { Traductor, claveComoMensaje, fechaISO } from './shared';
import { ESTADOS_ASISTENCIA } from '../asistencia';

/**t recibe claves del namespace `paseLista.errors` */
export const registroAsistenciaSchema = (t: Traductor = claveComoMensaje) =>
  z
    .object({
      nie: z.coerce.number().int().positive(),
      estado: z.enum(ESTADOS_ASISTENCIA, { message: t('estadoInvalido') }),
      observacion: z.string().trim().max(200, t('observacionLarga')).default(''),
    })
    .refine((r) => r.estado !== 'Justificado' || r.observacion.length > 0, {
      path: ['observacion'],
      message: t('observacionRequerida'),
    });

export const guardarPaseListaSchema = (t: Traductor = claveComoMensaje) =>
  z.object({
    id_carga: z.coerce.number().int().positive(t('cargaInvalida')),
    fecha: fechaISO(t('fechaInvalida')),
    registros: z.array(registroAsistenciaSchema(t)).min(1, t('sinRegistros')),
  });

export type GuardarPaseListaData = z.infer<ReturnType<typeof guardarPaseListaSchema>>;
