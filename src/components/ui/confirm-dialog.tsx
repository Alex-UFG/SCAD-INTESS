'use client';

import { useTranslations } from 'next-intl';
import { Modal } from '@/components/ui/modal';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  text: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
  /**Boton rojo para acciones irreversibles (retiro, baja) */
  danger?: boolean;
  pending?: boolean;
  /**Campos adicionales (ej. observacion obligatoria) */
  children?: React.ReactNode;
}

/**Confirmacion modal reutilizable; el caller decide que hacer en onConfirm */
export function ConfirmDialog({ open, title, text, confirmLabel, onConfirm, onClose, danger, pending, children }: ConfirmDialogProps) {
  const t = useTranslations('common');
  return (
    <Modal title={title} open={open} onClose={onClose}>
      <p className="text-sm text-gray-600 dark:text-gray-300">{text}</p>
      {children && <div className="mt-4 space-y-4">{children}</div>}
      <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-gray-200 dark:border-gray-800">
        <button
          type="button"
          onClick={onClose}
          disabled={pending}
          className="px-4 py-2 rounded-md text-sm font-medium border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          {t('cancel')}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={pending}
          className={`px-4 py-2 rounded-md text-sm font-medium text-white disabled:opacity-50 ${
            danger ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {pending ? t('saving') : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
