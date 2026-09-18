import { z } from 'zod';
import { Traductor, claveComoMensaje, DUI_REGEX } from './shared';

/**t recibe claves del namespace `cargas.errors` */
export const createCargaSchema = (t: Traductor = claveComoMensaje) =>
  z.object({
    dui_docente: z.string().regex(DUI_REGEX, t('docenteRequerido')),
    cod_materia: z.string().trim().toUpperCase().min(1, t('materiaRequerida')).max(8),
    id_seccion: z.coerce.number().int().positive(t('seccionRequerida')),
    id_ciclo: z.coerce.number().int().positive(t('cicloRequerido')),
  });

export type CargaFormData = z.infer<ReturnType<typeof createCargaSchema>>;
