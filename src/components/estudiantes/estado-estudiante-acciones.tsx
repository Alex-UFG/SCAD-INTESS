'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { cambiarEstadoEstudiante } from '@/app/actions/estudiantes';
import type { EstadoEstudiante } from '@/types/persona';
import { ConfirmModal } from '@/components/ui/confirm-modal';
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

  const opciones: Destino[] = (['Activo', 'Inactivo', 'Egresado'] as Destino[]).filter((d) => d !== estado);

  const cerrar = () => {
    setDestino(null);
    setObservacion('');
  };

  const confirmar = async () => {
    if (!destino) return false;
    const r = await cambiarEstadoEstudiante({ nie, estado: destino, observacion });
    if (!r.success) {
      toast.error(t(`errors.${r.error}`));
      return false;
    }
    toast.success(t('estadoActualizado'));
    router.refresh();
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
      <ConfirmModal
        open={destino !== null}
        title={destino ? t(`marcar.${destino}`) : ''}
        message={destino ? t('confirmarEstado', { estado: t(`estados.${destino}`) }) : ''}
        confirmLabel={t('confirmar')}
        onConfirm={confirmar}
        onClose={cerrar}
        danger={destino === 'Egresado'}
      >
        <label className="block text-sm text-slate-700 dark:text-slate-300">
          {t('observacionEstado')}
          <textarea value={observacion} onChange={(e) => setObservacion(e.target.value)} rows={2} maxLength={500} className={`${inputClass} mt-1`} />
          {destino === 'Egresado' && <span className="text-xs text-slate-500">{t('egresoAyuda')}</span>}
        </label>
      </ConfirmModal>
    </>
  );
}
