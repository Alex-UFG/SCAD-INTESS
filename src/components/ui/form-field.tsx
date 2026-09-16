import type { ReactNode } from 'react';
import type { ActionState } from '@/types/actions';

export const inputClass =
  'w-full px-3.5 py-2 border rounded-lg bg-transparent border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none';

const labelClass = 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1';

/**Bloque label + control + mensaje de error usado por los formularios */
export function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      {children}
      {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}
    </div>
  );
}

/**Banner de resultado (exito/error) de una server action con useActionState */
export function ActionMessageBanner({ state }: { state: ActionState }) {
  if (!state.message) return null;
  return (
    <div
      className={`p-4 rounded-lg mb-6 text-sm font-medium ${
        state.success
          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
          : 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300'
      }`}
    >
      {state.message}
    </div>
  );
}
