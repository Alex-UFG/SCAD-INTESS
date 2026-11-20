'use client';

import { useActionState } from 'react';
import { crearCiclo, CicloActionState } from '@/actions/ciclo-actions';

export function FormCiclo() {
  const initialState: CicloActionState = { success: false };
  const [state, formAction, isPending] = useActionState(crearCiclo, initialState);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Aperturar Nuevo Ciclo Escolar</h3>
      
      {state.message && (
        <div className={`p-3 rounded-md mb-4 text-sm font-medium ${state.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}`}>
          {state.message}
        </div>
      )}

      <form action={formAction} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Año Escolar</label>
            <input type="number" name="anio" defaultValue={new Date().getFullYear()} required className="w-full px-3 py-2 border rounded-lg bg-transparent border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Fecha de Inicio</label>
            <input type="date" name="fecha_inicio" required className="w-full px-3 py-2 border rounded-lg bg-transparent border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Fecha de Fin</label>
            <input type="date" name="fecha_fin" required className="w-full px-3 py-2 border rounded-lg bg-transparent border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
        </div>
        <div className="flex justify-end pt-2">
          <button type="submit" disabled={isPending} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
            {isPending ? 'Guardando...' : 'Crear Ciclo Escolar'}
          </button>
        </div>
      </form>
    </div>
  );
}