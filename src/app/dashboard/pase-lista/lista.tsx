'use client';

import { startTransition, useActionState, useEffect, useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { guardarPaseLista, type PaseLista } from '@/app/actions/asistencia';
import { ESTADOS_ASISTENCIA, type EstadoAsistencia } from '@/lib/asistencia';
import type { ActionState } from '@/types/actions';
import { useToast } from '@/components/ui/toast';
import { inputClass, submitButtonClass } from '@/components/ui/form-field';

export function Lista({ paseLista }: { paseLista: PaseLista }) {
  const t = useTranslations('paseLista');
  const toast = useToast();
  const { carga, fecha, filas } = paseLista;
  const [estados, setEstados] = useState<Record<number, EstadoAsistencia | null>>(
    () => Object.fromEntries(filas.map((f) => [f.nie, f.estado]))
  );
  const [state, formAction, pending] = useActionState(guardarPaseLista, {} as ActionState);

  useEffect(() => {
    if (!state.message) return;
    if (state.success) toast.success(state.message);
    else toast.error(state.message);
  }, [state, toast]);

  // Envio manual: con <form action> React reinicia el formulario tras guardar y los radios quedan en blanco
  const enviar = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const datos = new FormData(e.currentTarget);
    startTransition(() => formAction(datos));
  };

  if (filas.length === 0) {
    return <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">{t('sinEstudiantes')}</p>;
  }

  return (
    <form onSubmit={enviar} className="mt-4 space-y-4">
      <input type="hidden" name="id_carga" value={carga.id_carga} />
      <input type="hidden" name="fecha" value={fecha} />

      <button
        type="button"
        onClick={() => setEstados(Object.fromEntries(filas.map((f) => [f.nie, 'Presente'])))}
        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        {t('marcarTodos')}
      </button>

      <ul className="divide-y divide-slate-200 dark:divide-slate-800">
        {filas.map((f) => (
          <li key={f.nie} className="space-y-2 py-3">
            <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{f.nombre}</p>
            <div role="radiogroup" aria-label={f.nombre} className="flex flex-wrap gap-x-5 gap-y-1">
              {ESTADOS_ASISTENCIA.map((e) => (
                <label key={e} className="flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-300">
                  <input
                    type="radio"
                    name={`estado[${f.nie}]`}
                    value={e}
                    checked={estados[f.nie] === e}
                    onChange={() => setEstados((prev) => ({ ...prev, [f.nie]: e }))}
                  />
                  {t(`estados.${e}`)}
                </label>
              ))}
            </div>
            {estados[f.nie] === 'Justificado' && (
              <input
                type="text"
                name={`observacion[${f.nie}]`}
                defaultValue={f.observacion ?? ''}
                maxLength={200}
                required
                aria-label={t('observacion')}
                placeholder={t('observacion')}
                className={inputClass}
              />
            )}
          </li>
        ))}
      </ul>

      <div className="flex justify-end border-t border-slate-200 pt-4 dark:border-slate-800">
        <button type="submit" disabled={pending} className={submitButtonClass}>
          {pending ? t('guardando') : t('guardar')}
        </button>
      </div>
    </form>
  );
}
