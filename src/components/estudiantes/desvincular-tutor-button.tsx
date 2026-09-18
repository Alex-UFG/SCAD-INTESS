'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { desvincularEstudianteTutor } from '@/app/actions/tutores';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';

export function DesvincularTutorButton({ nie, duiTutor, nombre }: { nie: number; duiTutor: string; nombre: string }) {
  const t = useTranslations('tutores');
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  const confirmar = () => {
    start(async () => {
      const r = await desvincularEstudianteTutor({ nie, dui_tutor: duiTutor });
      if (r.success) {
        toast.success(r.sinTutor ? t('desvinculadoSinTutor') : t('desvinculado'));
        setOpen(false);
        router.refresh();
      } else {
        toast.error(t(`errors.${r.error}`));
      }
    });
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="text-xs font-medium text-red-600 hover:underline dark:text-red-400">
        {t('desvincular')}
      </button>
      <ConfirmDialog
        open={open}
        title={t('desvincular')}
        text={t('confirmarDesvincular', { nombre })}
        confirmLabel={t('desvincular')}
        onConfirm={confirmar}
        onClose={() => setOpen(false)}
        pending={pending}
        danger
      />
    </>
  );
}
