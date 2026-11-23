'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { cambiarEstadoIncidencia } from '@/app/actions/incidencias';
import { ESTADOS_CON_TEXTO, TRANSICIONES_INCIDENCIA, type EstadoIncidencia } from '@/lib/disciplina';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { useToast } from '@/components/ui/toast';
import { inputClass } from '@/components/ui/form-field';

const MIN_TEXTO = 10;

/**Botones del flujo de resolucion: uno por cada estado al que se puede pasar */
export function EstadoIncidenciaAcciones({ idIncidencia, estado }: { idIncidencia: number; estado: EstadoIncidencia }) {
  const t = useTranslations('incidencias');
  const router = useRouter();
  const toast = useToast();
  const [destino, setDestino] = useState<EstadoIncidencia | null>(null);
  const [texto, setTexto] = useState('');

  const destinos = TRANSICIONES_INCIDENCIA[estado];
  if (destinos.length === 0) return null;

  const pideTexto = destino !== null && ESTADOS_CON_TEXTO.includes(destino);
  // Resolver una apelacion no es lo mismo que resolver el caso por primera vez
  const clave = (d: EstadoIncidencia) => (estado === 'Apelada' && d === 'Resuelta' ? 'ResolverApelacion' : d);

  const cerrar = () => {
    setDestino(null);
    setTexto('');
  };

  const confirmar = async () => {
    if (!destino) return false;
    const fd = new FormData();
    fd.set('id_incidencia', String(idIncidencia));
    fd.set('estado', destino);
    fd.set('texto', texto);
    const r = await cambiarEstadoIncidencia({}, fd);
    if (!r.success) {
      toast.error(r.message ?? t('errors.errorServidor'));
      return false;
    }
    toast.success(r.message ?? t('estadoActualizado'));
    router.refresh();
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {destinos.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDestino(d)}
            className="rounded-md bg-intess px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-intess/85"
          >
            {t(`acciones.${clave(d)}`)}
          </button>
        ))}
      </div>
      <ConfirmModal
        open={destino !== null}
        title={destino ? t(`acciones.${clave(destino)}`) : ''}
        message={destino ? t(`confirmar.${clave(destino)}`) : ''}
        confirmDisabled={pideTexto && texto.trim().length < MIN_TEXTO}
        onConfirm={confirmar}
        onClose={cerrar}
      >
        {pideTexto && (
          <label className="block space-y-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            <span>{t(destino === 'Apelada' ? 'motivoApelacion' : 'resolucion')} *</span>
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={5}
              maxLength={2000}
              placeholder={t(destino === 'Apelada' ? 'motivoPlaceholder' : 'resolucionPlaceholder')}
              className={inputClass}
            />
          </label>
        )}
      </ConfirmModal>
    </>
  );
}
