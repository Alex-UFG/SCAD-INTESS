'use client';

import { useActionState, useState } from 'react';
import { useTranslations } from 'next-intl';
import { crearSeccion, type CicloEscolar } from '@/app/actions/secciones';
import type { Especialidad } from '@/app/actions/docentes';
import type { ActionState } from '@/types/actions';
import { FormField, ActionMessageBanner, inputClass, submitButtonClass } from '@/components/ui/form-field';

interface FormNuevaSeccionProps {
  especialidades: Especialidad[];
  ciclos: CicloEscolar[];
}

export function FormNuevaSeccion({ especialidades, ciclos }: FormNuevaSeccionProps) {
  const t = useTranslations('secciones');
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(crearSeccion, {} as ActionState);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
      >
        {open ? t('cerrar') : t('nueva')}
      </button>

      {open && (
        <div className="w-full bg-white dark:bg-gray-900 shadow rounded-lg border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 border-b pb-2 mb-4 dark:border-gray-800">
            {t('formTitle')}
          </h2>

          <ActionMessageBanner state={state} />

          <form action={formAction} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField label={t('ciclo')} error={state.errors?.id_ciclo?.[0]}>
                <select name="id_ciclo" required defaultValue="" className={inputClass}>
                  <option value="" disabled>{t('seleccioneCiclo')}</option>
                  {ciclos.map((ciclo) => (
                    <option key={ciclo.id_ciclo} value={ciclo.id_ciclo}>{ciclo.anio}</option>
                  ))}
                </select>
              </FormField>

              <FormField label={t('especialidad')} error={state.errors?.id_especialidad?.[0]}>
                <select name="id_especialidad" required defaultValue="" className={inputClass}>
                  <option value="" disabled>{t('seleccioneEspecialidad')}</option>
                  {especialidades.map((esp) => (
                    <option key={esp.id_especialidad} value={esp.id_especialidad}>{esp.nombre}</option>
                  ))}
                </select>
              </FormField>

              <FormField label={t('grado')} error={state.errors?.grado?.[0]}>
                <select name="grado" required defaultValue="1" className={inputClass}>
                  <option value="1">1°</option>
                  <option value="2">2°</option>
                  <option value="3">3°</option>
                </select>
              </FormField>

              <FormField label={t('nombre')} error={state.errors?.nombre?.[0]}>
                <input type="text" name="nombre" placeholder="A" maxLength={10} required className={inputClass} />
              </FormField>

              <FormField label={t('docenteGuia')} error={state.errors?.dui_docente_guia?.[0]}>
                <input type="text" name="dui_docente_guia" placeholder="00000000-0" maxLength={10} className={inputClass} />
              </FormField>

              <FormField label={t('capacidad')} error={state.errors?.capacidad_max?.[0]}>
                <input type="number" name="capacidad_max" min={10} max={60} defaultValue={40} className={inputClass} />
              </FormField>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-800">
              <button type="submit" disabled={isPending} className={submitButtonClass}>
                {isPending ? t('guardando') : t('guardar')}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
