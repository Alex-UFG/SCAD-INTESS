'use client';

import { useActionState, useState } from 'react';
import { useTranslations } from 'next-intl';
import { crearSeccion, editarSeccion, type CicloEscolar, type SeccionDetalle } from '@/app/actions/secciones';
import type { Especialidad, DocenteRow } from '@/app/actions/docentes';
import type { ActionState } from '@/types/actions';
import { Modal } from '@/components/ui/modal';
import { FormField, ActionMessageBanner, inputClass, submitButtonClass } from '@/components/ui/form-field';

interface Props {
  especialidades: Especialidad[];
  ciclos: CicloEscolar[];
  docentes: DocenteRow[];
  /**Con seccion: modo edicion */
  seccion?: SeccionDetalle;
  trigger: string;
  triggerClassName?: string;
}

export function FormSeccion({ especialidades, ciclos, docentes, seccion, trigger, triggerClassName }: Props) {
  const t = useTranslations('secciones');
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(seccion ? editarSeccion : crearSeccion, {} as ActionState);
  const conMatriculas = (seccion?.vigentes ?? 0) > 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={triggerClassName ?? 'bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors'}
      >
        {trigger}
      </button>

      <Modal title={seccion ? t('editarTitle') : t('formTitle')} open={open} onClose={() => setOpen(false)}>
        <ActionMessageBanner state={state} />

        <form action={formAction} className="space-y-6">
          {seccion && (
            <>
              <input type="hidden" name="id_seccion" value={seccion.id_seccion} />
              <input type="hidden" name="id_ciclo" value={seccion.id_ciclo} />
            </>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {seccion ? (
              <FormField label={t('ciclo')}>
                <input type="text" value={seccion.ciclo_anio} readOnly className={`${inputClass} opacity-60 cursor-not-allowed`} />
              </FormField>
            ) : (
              <FormField label={t('ciclo')} error={state.errors?.id_ciclo?.[0]}>
                <select name="id_ciclo" required defaultValue="" className={inputClass}>
                  <option value="" disabled>{t('seleccioneCiclo')}</option>
                  {ciclos.map((ciclo) => (
                    <option key={ciclo.id_ciclo} value={ciclo.id_ciclo}>{ciclo.anio}</option>
                  ))}
                </select>
              </FormField>
            )}

            <FormField label={t('especialidad')} error={state.errors?.id_especialidad?.[0]}>
              <select name="id_especialidad" required defaultValue={seccion?.id_especialidad ?? ''} disabled={conMatriculas} className={`${inputClass} disabled:opacity-60`}>
                <option value="" disabled>{t('seleccioneEspecialidad')}</option>
                {especialidades.map((esp) => (
                  <option key={esp.id_especialidad} value={esp.id_especialidad}>{esp.nombre}</option>
                ))}
              </select>
              {conMatriculas && <input type="hidden" name="id_especialidad" value={seccion!.id_especialidad} />}
            </FormField>

            <FormField label={t('grado')} error={state.errors?.grado?.[0]}>
              <select name="grado" required defaultValue={seccion?.grado ?? 1} disabled={conMatriculas} className={`${inputClass} disabled:opacity-60`}>
                <option value="1">1°</option>
                <option value="2">2°</option>
                <option value="3">3°</option>
              </select>
              {conMatriculas && <input type="hidden" name="grado" value={seccion!.grado} />}
            </FormField>

            <FormField label={t('nombre')} error={state.errors?.nombre?.[0]}>
              <input type="text" name="nombre" placeholder="A" maxLength={10} required defaultValue={seccion?.nombre} readOnly={conMatriculas} className={`${inputClass} uppercase ${conMatriculas ? 'opacity-60 cursor-not-allowed' : ''}`} />
            </FormField>

            <FormField label={t('docenteGuia')} error={state.errors?.dui_docente_guia?.[0]}>
              <select name="dui_docente_guia" defaultValue={seccion?.dui_docente_guia ?? ''} className={inputClass}>
                <option value="">{t('sinDocenteGuia')}</option>
                {docentes.map((d) => (
                  <option key={d.dui_docente} value={d.dui_docente}>
                    {d.primer_nombre} {d.primer_apellido} — {d.dui_docente}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label={t('capacidad')} error={state.errors?.capacidad_max?.[0]}>
              <input type="number" name="capacidad_max" min={10} max={60} defaultValue={seccion?.capacidad_max ?? 40} className={inputClass} />
              {conMatriculas && <span className="text-xs text-gray-500">{t('vigentesAviso', { vigentes: seccion!.vigentes })}</span>}
            </FormField>
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-800">
            <button type="submit" disabled={isPending} className={submitButtonClass}>
              {isPending ? t('guardando') : seccion ? t('guardarCambios') : t('guardar')}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
