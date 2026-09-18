import { z } from 'zod';
import { fechaISO, Traductor, claveComoMensaje } from './shared';

/**t recibe claves del namespace `ciclos.errors` */
export const createCicloSchema = (t: Traductor = claveComoMensaje) =>
  z
    .object({
      anio: z.coerce.number().int().min(2020, t('anioInvalido')).max(2100, t('anioInvalido')),
      fecha_inicio: fechaISO(t('fechaInvalida')),
      fecha_fin: fechaISO(t('fechaInvalida')),
    })
    .refine((d) => d.fecha_fin > d.fecha_inicio, { path: ['fecha_fin'], message: t('finAntesInicio') })
    .refine((d) => d.fecha_inicio.startsWith(String(d.anio)), { path: ['fecha_inicio'], message: t('inicioFueraDelAnio') });

export type CicloFormData = z.infer<ReturnType<typeof createCicloSchema>>;

export const createPeriodoSchema = (t: Traductor = claveComoMensaje) =>
  z
    .object({
      id_periodo: z.coerce.number().int().positive(),
      fecha_inicio: fechaISO(t('fechaInvalida')),
      fecha_cierre: fechaISO(t('fechaInvalida')),
    })
    .refine((d) => d.fecha_cierre > d.fecha_inicio, { path: ['fecha_cierre'], message: t('cierreAntesInicio') });

export const ESTADOS_CICLO = ['Planificado', 'Activo', 'Cerrado'] as const;
export const ESTADOS_PERIODO = ['Pendiente', 'Abierto', 'Cerrado'] as const;
