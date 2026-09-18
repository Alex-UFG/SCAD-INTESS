'use client';

import { useActionState, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { asignarCarga } from '@/app/actions/cargas';
import type { DocenteRow } from '@/app/actions/docentes';
import type { Materia } from '@/app/actions/materias';
import type { SeccionDetalle } from '@/app/actions/secciones';
import type { ActionState } from '@/types/actions';
import { Modal } from '@/components/ui/modal';
import { FormField, ActionMessageBanner, inputClass, submitButtonClass } from '@/components/ui/form-field';

const ESPECIALIDAD_GENERAL = 1;

interface Props {
  idCiclo: number;
  anio: number;
  docentes: DocenteRow[];
  materias: Materia[];
  secciones: SeccionDetalle[];
}

export function FormCarga({ idCiclo, anio, docentes, materias, secciones }: Props) {
  const t = useTranslations('cargas');
  const [open, setOpen] = useState(false);
  const [idSeccion, setIdSeccion] = useState('');
  const [state, formAction, pending] = useActionState(asignarCarga, {} as ActionState);

  // Solo materias coherentes con la seccion elegida (mismo grado; misma
  // especialidad o transversal). El servidor valida lo mismo.
  const materiasFiltradas = useMemo(() => {
    const s = secciones.find((x) => String(x.id_seccion) === idSeccion);
    if (!s) return [];
    return materias.filter((m) => m.grado === s.grado && (m.id_especialidad === s.id_especialidad || m.id_especialidad === ESPECIALIDAD_GENERAL));
  }, [idSeccion, materias, secciones]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
        {t('asignar')}
      </button>

      <Modal title={t('formTitle', { anio })} open={open} onClose={() => setOpen(false)}>
        <ActionMessageBanner state={state} />
        <form action={formAction} className="space-y-5">
          <input type="hidden" name="id_ciclo" value={idCiclo} />

          <FormField label={t('docente')} required error={state.errors?.dui_docente?.[0]}>
            <select name="dui_docente" required defaultValue="" className={inputClass}>
              <option value="" disabled>{t('seleccioneDocente')}</option>
              {docentes.map((d) => (
                <option key={d.dui_docente} value={d.dui_docente}>{d.primer_nombre} {d.primer_apellido} — {d.especialidad_nombre ?? ''}</option>
              ))}
            </select>
          </FormField>

          <FormField label={t('seccion')} required error={state.errors?.id_seccion?.[0]}>
            <select name="id_seccion" required value={idSeccion} onChange={(e) => setIdSeccion(e.target.value)} className={inputClass}>
              <option value="" disabled>{t('seleccioneSeccion')}</option>
              {secciones.map((s) => (
                <option key={s.id_seccion} value={s.id_seccion}>{s.grado}° {s.nombre} — {s.especialidad_nombre}</option>
              ))}
            </select>
          </FormField>

          <FormField label={t('materia')} required error={state.errors?.cod_materia?.[0]}>
            <select name="cod_materia" required defaultValue="" disabled={!idSeccion} className={`${inputClass} disabled:opacity-60`}>
              <option value="" disabled>{idSeccion ? t('seleccioneMateria') : t('seleccionePrimeroSeccion')}</option>
              {materiasFiltradas.map((m) => (
                <option key={m.cod_materia} value={m.cod_materia}>{m.cod_materia} — {m.nombre}</option>
              ))}
            </select>
            {idSeccion && materiasFiltradas.length === 0 && <span className="text-xs text-gray-500">{t('sinMateriasCompatibles')}</span>}
          </FormField>

          <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-800">
            <button type="submit" disabled={pending} className={submitButtonClass}>
              {pending ? t('guardando') : t('asignar')}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
