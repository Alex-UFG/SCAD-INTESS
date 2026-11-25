'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { desvincularEstudianteTutor } from '@/app/actions/tutores';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { useToast } from '@/components/ui/toast';

export function DesvincularTutorButton({ nie, duiTutor, nombre }: { nie: number; duiTutor: string; nombre: string }) {
  const t = useTranslations('tutores');
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);

  const confirmar = async () => {
    const r = await desvincularEstudianteTutor({ nie, dui_tutor: duiTutor });
    if (!r.success) {
      toast.error(t(`errors.${r.error}`));
      return false;
    }
    toast.success(r.sinTutor ? t('desvinculadoSinTutor') : t('desvinculado'));
    router.refresh();
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="text-xs font-medium text-red-600 hover:underline dark:text-red-400">
        {t('desvincular')}
      </button>
      <ConfirmModal
        open={open}
        title={t('desvincular')}
        message={t('confirmarDesvincular', { nombre })}
        confirmLabel={t('desvincular')}
        onConfirm={confirmar}
        onClose={() => setOpen(false)}
        danger
      />
    </>
  );
}
