'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { completarPerfilDocente, type Especialidad } from '@/app/actions/docentes';
import type { ActionState } from '@/types/actions';
import { Field, ActionMessageBanner, inputClass } from '@/components/ui/form-field';

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
            <Field label={t('dui')} error={state.errors?.dui_docente?.[0]}>
              <input type="text" name="dui_docente" placeholder="01234567-8" maxLength={10} required className={inputClass} />
            </Field>

            <Field label={t('telefono')} error={state.errors?.telefono?.[0]}>
              <input type="text" name="telefono" placeholder="7000-0000" maxLength={9} required className={inputClass} />
            </Field>

            <Field label={t('primerNombre')} error={state.errors?.primer_nombre?.[0]}>
              <input type="text" name="primer_nombre" required className={inputClass} />
            </Field>

            <Field label={t('segundoNombre')} error={state.errors?.segundo_nombre?.[0]}>
              <input type="text" name="segundo_nombre" className={inputClass} />
            </Field>

            <Field label={t('primerApellido')} error={state.errors?.primer_apellido?.[0]}>
              <input type="text" name="primer_apellido" required className={inputClass} />
            </Field>

            <Field label={t('segundoApellido')} error={state.errors?.segundo_apellido?.[0]}>
              <input type="text" name="segundo_apellido" className={inputClass} />
            </Field>

            <Field label={t('especialidad')} error={state.errors?.id_especialidad?.[0]}>
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
            </Field>

            <Field label={t('fechaIngreso')} error={state.errors?.fecha_ingreso?.[0]}>
              <input type="date" name="fecha_ingreso" required className={inputClass} />
            </Field>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={isPending}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              {isPending ? t('guardando') : t('guardar')}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
