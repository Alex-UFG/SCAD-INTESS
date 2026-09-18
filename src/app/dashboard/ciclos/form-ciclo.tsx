'use client';

import { useActionState, useState } from 'react';
import { useTranslations } from 'next-intl';
import { crearCiclo, editarCiclo, type Ciclo } from '@/app/actions/ciclos';
import type { ActionState } from '@/types/actions';
import { FormField, ActionMessageBanner, inputClass, submitButtonClass } from '@/components/ui/form-field';

/**Crea un ciclo (sin `ciclo`) o edita sus datos basicos (con `ciclo`) */
export function FormCiclo({ ciclo }: { ciclo?: Ciclo }) {
  const t = useTranslations('ciclos');
  const [open, setOpen] = useState(Boolean(ciclo));
  const [state, formAction, pending] = useActionState(ciclo ? editarCiclo : crearCiclo, {} as ActionState);
  const anioSugerido = new Date().getFullYear() + 1;

  return (
    <>
      {!ciclo && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
        >
          {open ? t('cerrarForm') : t('nuevo')}
        </button>
      )}

      {open && (
        <div className={ciclo ? '' : 'w-full bg-white dark:bg-gray-900 shadow rounded-lg border border-gray-200 dark:border-gray-800 p-6'}>
          {!ciclo && (
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 border-b pb-2 mb-4 dark:border-gray-800">{t('formTitle')}</h2>
          )}
          <ActionMessageBanner state={state} />
          <form action={formAction} className="space-y-6">
            {ciclo && <input type="hidden" name="id_ciclo" value={ciclo.id_ciclo} />}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormField label={t('anio')} required error={state.errors?.anio?.[0]}>
                <input type="number" name="anio" min={2020} max={2100} required defaultValue={ciclo?.anio ?? anioSugerido} className={inputClass} />
              </FormField>
              <FormField label={t('fechaInicio')} required error={state.errors?.fecha_inicio?.[0]}>
                <input type="date" name="fecha_inicio" required defaultValue={ciclo?.fecha_inicio ?? `${anioSugerido}-01-19`} className={inputClass} />
              </FormField>
              <FormField label={t('fechaFin')} required error={state.errors?.fecha_fin?.[0]}>
                <input type="date" name="fecha_fin" required defaultValue={ciclo?.fecha_fin ?? `${anioSugerido}-11-06`} className={inputClass} />
              </FormField>
            </div>
            {!ciclo && <p className="text-xs text-gray-500 dark:text-gray-400">{t('trimestresAuto')}</p>}
            <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-800">
              <button type="submit" disabled={pending} className={submitButtonClass}>
                {pending ? t('guardando') : ciclo ? t('guardarCambios') : t('crear')}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
