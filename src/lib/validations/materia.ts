import { z } from 'zod';
import { Traductor, claveComoMensaje } from './shared';

/**Codigo institucional: 2-4 letras, guion, 3 digitos (SW-003, MAT-001) */
export const COD_MATERIA_REGEX = /^[A-Z]{2,4}-\d{3}$/;

/**t recibe claves del namespace `materias.errors` */
export const createMateriaSchema = (t: Traductor = claveComoMensaje) =>
  z.object({
    cod_materia: z.string().trim().toUpperCase().regex(COD_MATERIA_REGEX, t('codigoFormato')),
    nombre: z.string().trim().min(3, t('nombreRequerido')).max(100),
    unidades_valorativas: z.coerce.number().int().min(1, t('unidadesInvalidas')).max(10, t('unidadesInvalidas')),
    id_especialidad: z.coerce.number().int().positive(t('especialidadInvalida')),
    grado: z.coerce.number().int().min(1, t('gradoInvalido')).max(3, t('gradoInvalido')),
  });

export type MateriaFormData = z.infer<ReturnType<typeof createMateriaSchema>>;
