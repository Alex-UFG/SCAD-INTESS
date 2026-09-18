'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { completarPerfilDocente, editarPerfilDocente, type Especialidad, type Docente } from '@/app/actions/docentes';
import type { ActionState } from '@/types/actions';
import { FormField, ActionMessageBanner, inputClass, submitButtonClass } from '@/components/ui/form-field';

interface Props {
  especialidades: Especialidad[];
  /**Con docente: edicion del perfil existente (DUI inmutable) */
  docente?: Docente;
}

export function FormCompletarPerfilDocente({ especialidades, docente }: Props) {
  const t = useTranslations('docentes');
  const [state, formAction, isPending] = useActionState(docente ? editarPerfilDocente : completarPerfilDocente, {} as ActionState);

  return (
    <div className="bg-white dark:bg-gray-900 shadow rounded-lg border border-gray-200 dark:border-gray-800 p-6">
      <ActionMessageBanner state={state} />

      {especialidades.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('sinEspecialidades')}</p>
      ) : (
        <form action={formAction} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField label={t('dui')} error={state.errors?.dui_docente?.[0]}>
              <input
                type="text"
                name="dui_docente"
                placeholder="01234567-8"
                maxLength={10}
                required
                defaultValue={docente?.dui_docente}
                readOnly={Boolean(docente)}
                className={`${inputClass} ${docente ? 'opacity-60 cursor-not-allowed' : ''}`}
              />
            </FormField>

            <FormField label={t('telefono')} error={state.errors?.telefono?.[0]}>
              <input type="text" name="telefono" placeholder="7000-0000" maxLength={9} required defaultValue={docente?.telefono ?? ''} className={inputClass} />
            </FormField>

            <FormField label={t('primerNombre')} error={state.errors?.primer_nombre?.[0]}>
              <input type="text" name="primer_nombre" required defaultValue={docente?.primer_nombre} className={inputClass} />
            </FormField>

            <FormField label={t('segundoNombre')} error={state.errors?.segundo_nombre?.[0]}>
              <input type="text" name="segundo_nombre" defaultValue={docente?.segundo_nombre ?? ''} className={inputClass} />
            </FormField>

            <FormField label={t('primerApellido')} error={state.errors?.primer_apellido?.[0]}>
              <input type="text" name="primer_apellido" required defaultValue={docente?.primer_apellido} className={inputClass} />
            </FormField>

            <FormField label={t('segundoApellido')} error={state.errors?.segundo_apellido?.[0]}>
              <input type="text" name="segundo_apellido" defaultValue={docente?.segundo_apellido ?? ''} className={inputClass} />
            </FormField>

            <FormField label={t('especialidad')} error={state.errors?.id_especialidad?.[0]}>
              <select name="id_especialidad" required defaultValue={docente?.id_especialidad ?? ''} className={inputClass}>
                <option value="" disabled>{t('seleccioneEspecialidad')}</option>
                {especialidades.map((esp) => (
                  <option key={esp.id_especialidad} value={esp.id_especialidad}>
                    {esp.nombre}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label={t('fechaIngreso')} error={state.errors?.fecha_ingreso?.[0]}>
              <input type="date" name="fecha_ingreso" required defaultValue={docente?.fecha_ingreso} className={inputClass} />
            </FormField>
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-800">
            <button type="submit" disabled={isPending} className={submitButtonClass}>
              {isPending ? t('guardando') : docente ? t('guardarCambios') : t('guardar')}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
