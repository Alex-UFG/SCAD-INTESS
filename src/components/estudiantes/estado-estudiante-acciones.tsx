'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { cambiarEstadoEstudiante } from '@/app/actions/estudiantes';
import type { EstadoEstudiante } from '@/types/persona';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';
import { inputClass } from '@/components/ui/form-field';

type Destino = 'Activo' | 'Inactivo' | 'Egresado';

/**
 * Egresar / Inactivar / Reactivar desde el expediente. Retirado no se elige
 * aqui: lo asigna el retiro de matricula.
 */
export function EstadoEstudianteAcciones({ nie, estado }: { nie: number; estado: EstadoEstudiante }) {
  const t = useTranslations('estudiantes');
  const router = useRouter();
  const toast = useToast();
  const [destino, setDestino] = useState<Destino | null>(null);
  const [observacion, setObservacion] = useState('');
  const [pending, start] = useTransition();

  const opciones: Destino[] = (['Activo', 'Inactivo', 'Egresado'] as Destino[]).filter((d) => d !== estado);

  const confirmar = () => {
    if (!destino) return;
    start(async () => {
      const r = await cambiarEstadoEstudiante({ nie, estado: destino, observacion });
      if (r.success) {
        toast.success(t('estadoActualizado'));
        setDestino(null);
        setObservacion('');
        router.refresh();
      } else {
        toast.error(t(`errors.${r.error}`));
      }
    });
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {opciones.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDestino(d)}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              d === 'Activo'
                ? 'border-green-600 text-green-700 hover:bg-green-50 dark:border-green-400 dark:text-green-400'
                : 'border-slate-400 text-slate-600 hover:bg-slate-50 dark:border-slate-500 dark:text-slate-300'
            }`}
          >
            {t(`marcar.${d}`)}
          </button>
        ))}
      </div>
      <ConfirmDialog
        open={destino !== null}
        title={destino ? t(`marcar.${destino}`) : ''}
        text={destino ? t('confirmarEstado', { estado: t(`estados.${destino}`) }) : ''}
        confirmLabel={t('confirmar')}
        onConfirm={confirmar}
        onClose={() => setDestino(null)}
        pending={pending}
        danger={destino === 'Egresado'}
      >
        <label className="block text-sm text-gray-700 dark:text-gray-300">
          {t('observacionEstado')}
          <textarea value={observacion} onChange={(e) => setObservacion(e.target.value)} rows={2} maxLength={500} className={`${inputClass} mt-1`} />
          {destino === 'Egresado' && <span className="text-xs text-gray-500">{t('egresoAyuda')}</span>}
        </label>
      </ConfirmDialog>
    </>
  );
}
