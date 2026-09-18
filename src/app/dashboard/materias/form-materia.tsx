'use client';

import { useActionState, useState } from 'react';
import { useTranslations } from 'next-intl';
import { crearMateria, editarMateria, type Materia } from '@/app/actions/materias';
import type { Especialidad } from '@/app/actions/docentes';
import type { ActionState } from '@/types/actions';
import { Modal } from '@/components/ui/modal';
import { FormField, ActionMessageBanner, inputClass, submitButtonClass } from '@/components/ui/form-field';

interface Props {
  especialidades: Especialidad[];
  /**Con materia: modo edicion (el codigo no cambia) */
  materia?: Materia;
  /**Texto del boton que abre el modal */
  trigger: string;
  triggerClassName?: string;
}

export function FormMateria({ especialidades, materia, trigger, triggerClassName }: Props) {
  const t = useTranslations('materias');
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(materia ? editarMateria : crearMateria, {} as ActionState);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={triggerClassName ?? 'bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors'}
      >
        {trigger}
      </button>

      <Modal title={materia ? t('editarTitle') : t('formTitle')} open={open} onClose={() => setOpen(false)}>
        <ActionMessageBanner state={state} />
        <form action={formAction} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <FormField label={t('codigo')} required error={state.errors?.cod_materia?.[0]}>
              <input
                type="text"
                name="cod_materia"
                placeholder="MAT-001"
                maxLength={8}
                required
                defaultValue={materia?.cod_materia}
                readOnly={Boolean(materia)}
                className={`${inputClass} uppercase ${materia ? 'opacity-60 cursor-not-allowed' : ''}`}
              />
            </FormField>
            <FormField label={t('unidades')} required error={state.errors?.unidades_valorativas?.[0]}>
              <input type="number" name="unidades_valorativas" min={1} max={10} required defaultValue={materia?.unidades_valorativas ?? 1} className={inputClass} />
            </FormField>
          </div>
          <FormField label={t('nombre')} required error={state.errors?.nombre?.[0]}>
            <input type="text" name="nombre" maxLength={100} required defaultValue={materia?.nombre} className={inputClass} />
          </FormField>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <FormField label={t('especialidad')} required error={state.errors?.id_especialidad?.[0]}>
              <select name="id_especialidad" required defaultValue={materia?.id_especialidad ?? ''} className={inputClass}>
                <option value="" disabled>{t('seleccioneEspecialidad')}</option>
                {especialidades.map((e) => (
                  <option key={e.id_especialidad} value={e.id_especialidad}>{e.nombre}</option>
                ))}
              </select>
            </FormField>
            <FormField label={t('grado')} required error={state.errors?.grado?.[0]}>
              <select name="grado" required defaultValue={materia?.grado ?? 1} className={inputClass}>
                <option value="1">1°</option>
                <option value="2">2°</option>
                <option value="3">3°</option>
              </select>
            </FormField>
          </div>
          {materia && materia.cargas > 0 && <p className="text-xs text-gray-500 dark:text-gray-400">{t('conCargasAviso', { cargas: materia.cargas })}</p>}
          <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-800">
            <button type="submit" disabled={pending} className={submitButtonClass}>
              {pending ? t('guardando') : materia ? t('guardarCambios') : t('crear')}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
