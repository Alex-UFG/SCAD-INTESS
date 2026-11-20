'use client';

import { useActionState } from 'react';
import { crearMateria, MateriaActionState } from '@/actions/materia-actions';

interface Especialidad { id_especialidad: number; nombre: string; }

export function FormMateria({ especialidades }: { especialidades: Especialidad[] }) {
  const initialState: MateriaActionState = { success: false };
  const [state, formAction, isPending] = useActionState(crearMateria, initialState);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Registrar Nueva Materia</h3>
      
      {state.message && (
        <div className={`p-3 rounded-md mb-4 text-sm font-medium ${state.success ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'}`}>
          {state.message}
        </div>
      )}

      <form action={formAction} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Código *</label>
            <input type="text" name="cod_materia" placeholder="Ej: MAT-01" maxLength={8} required className="w-full px-3 py-2 border rounded-lg bg-transparent border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none uppercase" />
          </div>
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre de Materia *</label>
            <input type="text" name="nombre" required className="w-full px-3 py-2 border rounded-lg bg-transparent border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Especialidad *</label>
            <select name="id_especialidad" required defaultValue="" className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="" disabled>Seleccione...</option>
              {especialidades.map(esp => (
                <option key={esp.id_especialidad} value={esp.id_especialidad}>{esp.nombre}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <div className="w-1/2">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Grado *</label>
              <select name="grado" required defaultValue="1" className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="1">1°</option>
                <option value="2">2°</option>
                <option value="3">3°</option>
              </select>
            </div>
            <div className="w-1/2">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">UV *</label>
              <input type="number" name="unidades_valorativas" defaultValue="1" min="1" max="10" required className="w-full px-3 py-2 border rounded-lg bg-transparent border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>
        </div>
        <div className="flex justify-end pt-2">
          <button type="submit" disabled={isPending} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
            {isPending ? 'Guardando...' : 'Registrar Materia'}
          </button>
        </div>
      </form>
    </div>
  );
}