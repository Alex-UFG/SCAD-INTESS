import { z } from 'zod';
import { Traductor, claveComoMensaje } from './shared';
import { NOTA_MAXIMA, redondear2 } from '../notas';

const MAX_REGISTROS = 120;

const nota = (t: Traductor) =>
  z.preprocess(
    (v) => (v === '' || v == null ? null : Number(v)),
    z.number({ message: t('notaInvalida') }).min(0, t('notaInvalida')).max(NOTA_MAXIMA, t('notaInvalida')).transform(redondear2).nullable()
  );

export const guardarNotasSchema = (t: Traductor = claveComoMensaje) =>
  z.object({
    id_carga: z.coerce.number().int().positive(t('cargaInvalida')),
    id_periodo: z.coerce.number().int().positive(t('periodoInvalido')),
    registros: z
      .array(z.object({ nie: z.coerce.number().int().positive(), act1: nota(t), act2: nota(t), examen: nota(t) }))
      .min(1, t('sinRegistros'))
      .max(MAX_REGISTROS, t('demasiadosRegistros')),
  });

export type GuardarNotasData = z.infer<ReturnType<typeof guardarNotasSchema>>;
