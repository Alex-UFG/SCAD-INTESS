'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { completarPerfilDocente, type Especialidad } from '@/app/actions/docentes';
import type { ActionState } from '@/types/actions';
import { FormField, ActionMessageBanner, inputClass, submitButtonClass } from '@/components/ui/form-field';

export function FormCompletarPerfilDocente({ especialidades }: { especialidades: Especialidad[] }) {
  const t = useTranslations('docentes');
  const [state, formAction, isPending] = useActionState(completarPerfilDocente, {} as ActionState);

  return (
    <div className="max-w-3xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 shadow-sm">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5 mb-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          {t('formTitle')}
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          {t('formSubtitle')}
        </p>
      </div>

      <ActionMessageBanner state={state} />

      {especialidades.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">{t('sinEspecialidades')}</p>
      ) : (
        <form action={formAction} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField label={t('dui')} error={state.errors?.dui_docente?.[0]}>
              <input type="text" name="dui_docente" placeholder="01234567-8" maxLength={10} required className={inputClass} />
            </FormField>

            <FormField label={t('telefono')} error={state.errors?.telefono?.[0]}>
              <input type="text" name="telefono" placeholder="7000-0000" maxLength={9} required className={inputClass} />
            </FormField>

            <FormField label={t('primerNombre')} error={state.errors?.primer_nombre?.[0]}>
              <input type="text" name="primer_nombre" required className={inputClass} />
            </FormField>

            <FormField label={t('segundoNombre')} error={state.errors?.segundo_nombre?.[0]}>
              <input type="text" name="segundo_nombre" className={inputClass} />
            </FormField>

            <FormField label={t('primerApellido')} error={state.errors?.primer_apellido?.[0]}>
              <input type="text" name="primer_apellido" required className={inputClass} />
            </FormField>

            <FormField label={t('segundoApellido')} error={state.errors?.segundo_apellido?.[0]}>
              <input type="text" name="segundo_apellido" className={inputClass} />
            </FormField>

            <FormField label={t('especialidad')} error={state.errors?.id_especialidad?.[0]}>
              <select
                name="id_especialidad"
                required
                defaultValue=""
                className={`${inputClass} bg-white dark:bg-slate-900`}
              >
                <option value="" disabled>{t('seleccioneEspecialidad')}</option>
                {especialidades.map((esp) => (
                  <option key={esp.id_especialidad} value={esp.id_especialidad}>
                    {esp.nombre}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label={t('fechaIngreso')} error={state.errors?.fecha_ingreso?.[0]}>
              <input type="date" name="fecha_ingreso" required className={inputClass} />
            </FormField>
          </div>

          <div className="pt-4 flex justify-end">
            <button type="submit" disabled={isPending} className={submitButtonClass}>
              {isPending ? t('guardando') : t('guardar')}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
