import { ReactNode } from 'react';

export const inputClass =
  'w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500';

export const submitButtonClass =
  'bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-md font-medium transition-colors';

interface FormFieldProps {
  label: string;
  error?: string;
  children: ReactNode;
}

/**Bloque label + control + mensaje de error usado por todos los formularios */
export function FormField({ label, error, children }: FormFieldProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
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
