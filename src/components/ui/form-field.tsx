import { ReactNode } from 'react';
import type { ActionState } from '@/types/actions';

export const inputClass =
  'w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-intess';

export const submitButtonClass =
  'bg-intess hover:bg-intess/85 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-md font-medium transition-colors';

interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
}

/**Bloque label + control + mensaje de error usado por todos los formularios */
export function FormField({ label, required, error, children }: FormFieldProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}{required ? ' *' : ''}</label>
      {children}
      {error && <p className="text-red-500 text-xs">{error}</p>}
    </div>
  );
}

/**Banner de error devuelto por una server action */
export function ServerErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-md border border-red-200 dark:border-red-800/30">
      {message}
    </div>
  );
}

/**Banner de resultado (exito o error) de una server action usada con useActionState */
export function ActionMessageBanner({ state }: { state: ActionState }) {
  if (!state.message) return null;
  if (!state.success) return <ServerErrorBanner message={state.message} />;
  return (
    <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-md border border-green-200 dark:border-green-800/30">
      {state.message}
    </div>
  );
}
