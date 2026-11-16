'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { marcarLeida, marcarTodasLeidas } from '@/app/actions/notificaciones';
import { submitButtonClass } from '@/components/ui/form-field';
import type { ActionState } from '@/types/actions';

export function BotonMarcarLeida({ id }: { id: number }) {
  const t = useTranslations('notificaciones');
  const [, formAction, pending] = useActionState(marcarLeida, {} as ActionState);
  return (
    <form action={formAction}>
      <input type="hidden" name="id_notificacion" value={id} />
      <button type="submit" disabled={pending} className="text-sm font-medium text-blue-600 hover:underline disabled:opacity-50 dark:text-blue-400">
        {t('marcarLeida')}
      </button>
    </form>
  );
}

export function BotonMarcarTodas() {
  const t = useTranslations('notificaciones');
  const [, formAction, pending] = useActionState(marcarTodasLeidas, {} as ActionState);
  return (
    <form action={formAction}>
      <button type="submit" disabled={pending} className={submitButtonClass}>{t('marcarTodas')}</button>
    </form>
  );
}
