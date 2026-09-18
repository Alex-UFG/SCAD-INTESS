'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { guardarPeriodo, cambiarEstadoPeriodo, type Periodo } from '@/app/actions/ciclos';
import type { ActionState } from '@/types/actions';
import { ActionMessageBanner, inputClass } from '@/components/ui/form-field';
import { ActionButton } from '@/components/ui/action-button';
import { Badge, TONO_PERIODO } from '@/components/ui/badge';

function FilaPeriodo({ periodo, editable, cicloActivo }: { periodo: Periodo; editable: boolean; cicloActivo: boolean }) {
  const t = useTranslations('ciclos');
  const [state, formAction, pending] = useActionState(guardarPeriodo, {} as ActionState);
  const bloqueado = !editable || periodo.estado === 'Cerrado';

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-gray-800 dark:text-gray-100">
          {t('periodoN', { numero: periodo.numero })}{' '}
          <Badge tono={TONO_PERIODO[periodo.estado]}>{t(`estadosPeriodo.${periodo.estado}`)}</Badge>
        </h3>
        {editable && (
          <div className="flex gap-2">
            {periodo.estado === 'Pendiente' && (
              <ActionButton
                action={cambiarEstadoPeriodo}
                fields={{ id_periodo: periodo.id_periodo, estado: 'Abierto' }}
                label={t('abrirPeriodo')}
                disabled={!cicloActivo}
                confirm={{ title: t('abrirPeriodo'), text: t('confirmarAbrirPeriodo', { numero: periodo.numero }) }}
              />
            )}
            {periodo.estado === 'Abierto' && (
              <ActionButton
                action={cambiarEstadoPeriodo}
                fields={{ id_periodo: periodo.id_periodo, estado: 'Cerrado' }}
                label={t('cerrarPeriodo')}
                danger
                confirm={{ title: t('cerrarPeriodo'), text: t('confirmarCerrarPeriodo', { numero: periodo.numero }) }}
              />
            )}
          </div>
        )}
      </div>
      <ActionMessageBanner state={state} />
      <form action={formAction} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
        <input type="hidden" name="id_periodo" value={periodo.id_periodo} />
        <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
          {t('fechaInicio')}
          <input type="date" name="fecha_inicio" defaultValue={periodo.fecha_inicio} disabled={bloqueado} required className={`${inputClass} mt-1 disabled:opacity-60`} />
          {state.errors?.fecha_inicio?.[0] && <span className="text-red-500 text-xs">{state.errors.fecha_inicio[0]}</span>}
        </label>
        <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
          {t('fechaCierre')}
          <input type="date" name="fecha_cierre" defaultValue={periodo.fecha_cierre} disabled={bloqueado} required className={`${inputClass} mt-1 disabled:opacity-60`} />
          {state.errors?.fecha_cierre?.[0] && <span className="text-red-500 text-xs">{state.errors.fecha_cierre[0]}</span>}
        </label>
        {!bloqueado && (
          <button type="submit" disabled={pending} className="rounded-md border border-blue-600 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 disabled:opacity-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-900/20">
            {pending ? t('guardando') : t('guardarFechas')}
          </button>
        )}
      </form>
    </div>
  );
}

export function Periodos({ periodos, editable, cicloActivo }: { periodos: Periodo[]; editable: boolean; cicloActivo: boolean }) {
  return (
    <div className="space-y-3">
      {periodos.map((p) => (
        <FilaPeriodo key={p.id_periodo} periodo={p} editable={editable} cicloActivo={cicloActivo} />
      ))}
    </div>
  );
}
