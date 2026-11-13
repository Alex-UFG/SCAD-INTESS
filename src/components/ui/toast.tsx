'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useTranslations } from 'next-intl';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastInput {
  type?: ToastType;
  message: string;
  duration?: number;
}

interface Toast extends Required<ToastInput> {
  id: number;
}

interface ToastContextValue {
  toast: (input: ToastInput) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const STYLES: Record<ToastType, string> = {
  success:
    'border-aprobado/40 bg-aprobado-bg text-aprobado dark:border-aprobado/40 dark:bg-aprobado/15',
  error:
    'border-reprobado/40 bg-reprobado-bg text-reprobado dark:border-reprobado/40 dark:bg-reprobado/15',
  info: 'border-intess/30 bg-intess-light text-intess dark:border-intess-accent/40 dark:bg-intess/20 dark:text-intess-accent',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const t = useTranslations('common');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const toast = useCallback(
    ({ type = 'info', message, duration = 4000 }: ToastInput) => {
      const id = nextId.current++;
      setToasts((prev) => [...prev, { id, type, message, duration }]);
      if (duration > 0) setTimeout(() => dismiss(id), duration);
    },
    [dismiss]
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      toast,
      success: (message) => toast({ type: 'success', message }),
      error: (message) => toast({ type: 'error', message, duration: 6000 }),
      info: (message) => toast({ type: 'info', message }),
    }),
    [toast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:items-end sm:px-6"
      >
        {toasts.map((item) => (
          <div
            key={item.id}
            role={item.type === 'error' ? 'alert' : 'status'}
            className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border px-4 py-3 text-sm shadow-lg ${STYLES[item.type]}`}
          >
            <span className="flex-1">{item.message}</span>
            <button
              type="button"
              onClick={() => dismiss(item.id)}
              aria-label={t('close')}
              className="shrink-0 opacity-60 transition-opacity hover:opacity-100"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>');
  return ctx;
}
