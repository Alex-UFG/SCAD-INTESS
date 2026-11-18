'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { retirarMatricula, trasladarMatricula } from '@/app/actions/matriculas';
import type { SeccionConEspecialidad } from '@/types/academico';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { useToast } from '@/components/ui/toast';
import { inputClass } from '@/components/ui/form-field';

interface Props {
  idMatricula: number;
  idSeccion: number;
  idCiclo: number;
  secciones: SeccionConEspecialidad[];
  puedeRetirar: boolean;
  puedeTrasladar: boolean;
}

/**Retiro (con motivo y observacion) y traslado de seccion de una matricula Vigente */
export function MatriculaAcciones({ idMatricula, idSeccion, idCiclo, secciones, puedeRetirar, puedeTrasladar }: Props) {
  const t = useTranslations('matriculas');
  const router = useRouter();
  const toast = useToast();
  const [modal, setModal] = useState<'retiro' | 'traslado' | null>(null);
  const [motivo, setMotivo] = useState<'Retirado' | 'Trasladado'>('Retirado');
  const [observaciones, setObservaciones] = useState('');
  const [destino, setDestino] = useState('');

  const destinos = secciones.filter((s) => s.id_ciclo === idCiclo && s.id_seccion !== idSeccion);

  const cerrar = () => {
    setModal(null);
    setObservaciones('');
    setDestino('');
  };

  const ejecutar = async () => {
    const r =
      modal === 'retiro'
        ? await retirarMatricula({ id_matricula: idMatricula, motivo, observaciones })
        : await trasladarMatricula({ id_matricula: idMatricula, id_seccion_destino: Number(destino), observaciones });
    if (!r.success) {
      toast.error(t(`errors.${r.error}`));
      return false;
    }
    toast.success(t(modal === 'retiro' ? 'retirada' : 'trasladada'));
    router.refresh();
  };

  if (!puedeRetirar && !puedeTrasladar) return null;

  return (
    <>
      <span className="flex gap-3">
        {puedeTrasladar && (
          <button type="button" onClick={() => setModal('traslado')} className="text-xs font-medium text-intess hover:underline dark:text-intess-accent">
            {t('trasladar')}
          </button>
        )}
        {puedeRetirar && (
          <button type="button" onClick={() => setModal('retiro')} className="text-xs font-medium text-red-600 hover:underline dark:text-red-400">
            {t('retirar')}
          </button>
        )}
      </span>

      <ConfirmModal
        open={modal === 'retiro'}
        title={t('retirarTitle')}
        message={t('retirarTexto')}
        confirmLabel={t('retirar')}
        onConfirm={ejecutar}
        onClose={cerrar}
        danger
      >
        <label className="block text-sm text-slate-700 dark:text-slate-300">
          {t('motivo')}
          <select value={motivo} onChange={(e) => setMotivo(e.target.value as 'Retirado' | 'Trasladado')} className={`${inputClass} mt-1`}>
            <option value="Retirado">{t('motivos.Retirado')}</option>
            <option value="Trasladado">{t('motivos.Trasladado')}</option>
          </select>
        </label>
        <label className="block text-sm text-slate-700 dark:text-slate-300">
          {t('observaciones')} *
          <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} rows={3} minLength={5} maxLength={500} required className={`${inputClass} mt-1`} />
        </label>
      </ConfirmModal>

      <ConfirmModal
        open={modal === 'traslado'}
        title={t('trasladarTitle')}
        message={t('trasladarTexto')}
        confirmLabel={t('trasladar')}
        onConfirm={ejecutar}
        onClose={cerrar}
        confirmDisabled={!destino}
      >
        <label className="block text-sm text-slate-700 dark:text-slate-300">
          {t('seccionDestino')} *
          <select value={destino} onChange={(e) => setDestino(e.target.value)} className={`${inputClass} mt-1`}>
            <option value="" disabled>{t('seleccioneSeccion')}</option>
            {destinos.map((s) => (
              <option key={s.id_seccion} value={s.id_seccion}>{s.grado}° {s.nombre} — {s.especialidad_nombre}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm text-slate-700 dark:text-slate-300">
          {t('observaciones')}
          <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} rows={2} maxLength={500} className={`${inputClass} mt-1`} />
        </label>
      </ConfirmModal>
    </>
  );
}
