'use client';

import { useActionState } from 'react';
import { asignarCarga, CargaActionState } from '@/actions/carga-actions';

interface SeleccionProps {
  docentes: { dui_docente: string; nombre_completo: string }[];
  materias: { cod_materia: string; nombre: string }[];
  secciones: { id_seccion: number; nombre_completo: string }[];
  ciclos: { id_ciclo: number; anio: number }[];
}

export function FormCarga({ docentes, materias, secciones, ciclos }: SeleccionProps) {
  const initialState: CargaActionState = { success: false };
  const [state, formAction, isPending] = useActionState(asignarCarga, initialState);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Asignar Carga Académica</h3>
      
      {state.message && (
        <div className={`p-3 rounded-md mb-4 text-sm font-medium ${state.success ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'}`}>
          {state.message}
        </div>
      )}

      <form action={formAction} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Docente *</label>
            <select name="dui_docente" required defaultValue="" className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="" disabled>Seleccione docente...</option>
              {docentes.map(d => <option key={d.dui_docente} value={d.dui_docente}>{d.nombre_completo}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Materia *</label>
            <select name="cod_materia" required defaultValue="" className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="" disabled>Seleccione materia...</option>
              {materias.map(m => <option key={m.cod_materia} value={m.cod_materia}>{m.cod_materia} - {m.nombre}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Sección *</label>
            <select name="id_seccion" required defaultValue="" className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="" disabled>Seleccione sección...</option>
              {secciones.map(s => <option key={s.id_seccion} value={s.id_seccion}>{s.nombre_completo}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Ciclo *</label>
            <select name="id_ciclo" required defaultValue="" className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="" disabled>Seleccione ciclo...</option>
              {ciclos.map(c => <option key={c.id_ciclo} value={c.id_ciclo}>{c.anio}</option>)}
            </select>
          </div>

        </div>
        <div className="flex justify-end pt-2">
          <button type="submit" disabled={isPending} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
            {isPending ? 'Asignando...' : 'Confirmar Asignación'}
          </button>
        </div>
      </form>
    </div>
  );
}