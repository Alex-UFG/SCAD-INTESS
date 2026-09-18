'use client';

import { startTransition, useActionState, useEffect, useRef, useState } from 'react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';
import type { ActionState } from '@/types/actions';

interface ActionButtonProps {
  /**Server action con firma useActionState */
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  /**Campos ocultos que se envian */
  fields: Record<string, string | number>;
  label: string;
  /**Si se indica, pide confirmacion antes de ejecutar */
  confirm?: { title: string; text: string };
  danger?: boolean;
  disabled?: boolean;
  className?: string;
}

const base = 'rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50';
const normal = 'border-blue-600 text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-900/20';
const peligro = 'border-red-600 text-red-600 hover:bg-red-50 dark:border-red-400 dark:text-red-400 dark:hover:bg-red-900/20';

/**
 * Boton que dispara una server action (con confirmacion opcional) y muestra
 * el mensaje resultante como toast. Para cambios de estado y bajas.
 */
export function ActionButton({ action, fields, label, confirm, danger, disabled, className }: ActionButtonProps) {
  const toast = useToast();
  const [state, formAction, pending] = useActionState(action, {} as ActionState);
  const [abierto, setAbierto] = useState(false);
  const ultimo = useRef<ActionState>(state);

  useEffect(() => {
    if (state !== ultimo.current && state.message) {
      (state.success ? toast.success : toast.error)(state.message);
    }
    ultimo.current = state;
  }, [state, toast]);

  const ejecutar = () => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(fields)) fd.set(k, String(v));
    startTransition(() => formAction(fd));
    setAbierto(false);
  };

  return (
    <>
      <button
        type="button"
        disabled={disabled || pending}
        onClick={() => (confirm ? setAbierto(true) : ejecutar())}
        className={`${base} ${danger ? peligro : normal} ${className ?? ''}`}
      >
        {label}
      </button>
      {confirm && (
        <ConfirmDialog
          open={abierto}
          title={confirm.title}
          text={confirm.text}
          confirmLabel={label}
          onConfirm={ejecutar}
          onClose={() => setAbierto(false)}
          danger={danger}
          pending={pending}
        />
      )}
    </>
  );
}
