'use client';

import { useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Modal } from '@/components/ui/modal';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  /**Deshabilita confirmar (ej. falta un campo obligatorio) */
  confirmDisabled?: boolean;
  /**Devolver false deja el modal abierto (ej. la accion fallo) */
  onConfirm: () => void | boolean | Promise<void | boolean>;
  onClose: () => void;
  /**Campos adicionales (ej. observacion obligatoria) */
  children?: ReactNode;
}

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  danger = false,
  confirmDisabled = false,
  onConfirm,
  onClose,
  children,
}: ConfirmModalProps) {
  const t = useTranslations('common');
  const [pending, setPending] = useState(false);

  async function confirmar() {
    setPending(true);
    try {
      const ok = await onConfirm();
      if (ok !== false) onClose();
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal title={title} open={open} onClose={pending ? () => {} : onClose}>
      <div className="text-sm text-slate-600 dark:text-slate-300">{message}</div>
      {children && <div className="mt-4 space-y-4">{children}</div>}
      <div className="mt-6 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={pending}
          className="rounded-full border border-slate-300 px-4 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          {cancelLabel ?? t('cancel')}
        </button>
        <button
          type="button"
          onClick={confirmar}
          disabled={pending || confirmDisabled}
          className={`rounded-full px-4 py-1.5 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
            danger ? 'bg-reprobado hover:bg-reprobado/85' : 'bg-intess hover:bg-intess/85'
          }`}
        >
          {pending ? t('saving') : (confirmLabel ?? t('confirm'))}
        </button>
      </div>
    </Modal>
  );
}
