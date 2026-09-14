'use client';

import { useActionState } from 'react';
import { completarPerfilDocente, DocenteActionState } from '@/actions/docente-actions';

interface EspecialidadOption {
  id_especialidad: number;
  nombre: string;
}

export function FormCompletarPerfilDocente({ especialidades }: { especialidades: EspecialidadOption[] }) {
  const initialState: DocenteActionState = { success: false };
  const [state, formAction, isPending] = useActionState(completarPerfilDocente, initialState);

  return (
    <div className="max-w-3xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 shadow-sm">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5 mb-6">
        <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 dark:bg-blue-950/50 px-2.5 py-1 rounded">
          Dev 3 · Estructura Académica
        </span>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-2">
          Completar Perfil Profesional Docente
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Requisito mandatario según la Ley de la Carrera Docente para habilitar la captura de asistencia y calificaciones (Cierre de Gap N.° 1).
        </p>
      </div>

      {state.message && (
        <div className={`p-4 rounded-lg mb-6 text-sm font-medium ${
          state.success 
            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300' 
            : 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300'
        }`}>
          {state.message}
        </div>
      )}

      <form action={formAction} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* DUI */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              DUI (con guion) *
            </label>
            <input
              type="text"
              name="dui_docente"
              placeholder="01234567-8"
              maxLength={10}
              required
              className="w-full px-3.5 py-2 border rounded-lg bg-transparent border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            {state.errors?.dui_docente && (
              <p className="text-xs text-rose-600 mt-1">{state.errors.dui_docente[0]}</p>
            )}
          </div>

          {/* Teléfono */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Teléfono de Contacto *
            </label>
            <input
              type="text"
              name="telefono"
              placeholder="7000-0000"
              maxLength={9}
              required
              className="w-full px-3.5 py-2 border rounded-lg bg-transparent border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            {state.errors?.telefono && (
              <p className="text-xs text-rose-600 mt-1">{state.errors.telefono[0]}</p>
            )}
          </div>

          {/* Primer Nombre */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Primer Nombre *
            </label>
            <input
              type="text"
              name="primer_nombre"
              required
              className="w-full px-3.5 py-2 border rounded-lg bg-transparent border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            {state.errors?.primer_nombre && (
              <p className="text-xs text-rose-600 mt-1">{state.errors.primer_nombre[0]}</p>
            )}
          </div>

          {/* Segundo Nombre */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Segundo Nombre
            </label>
            <input
              type="text"
              name="segundo_nombre"
              className="w-full px-3.5 py-2 border rounded-lg bg-transparent border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Primer Apellido */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Primer Apellido *
            </label>
            <input
              type="text"
              name="primer_apellido"
              required
              className="w-full px-3.5 py-2 border rounded-lg bg-transparent border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            {state.errors?.primer_apellido && (
              <p className="text-xs text-rose-600 mt-1">{state.errors.primer_apellido[0]}</p>
            )}
          </div>

          {/* Segundo Apellido */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Segundo Apellido
            </label>
            <input
              type="text"
              name="segundo_apellido"
              className="w-full px-3.5 py-2 border rounded-lg bg-transparent border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Especialidad Asignada */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Área / Especialidad Técnica *
            </label>
            <select
              name="id_especialidad"
              required
              defaultValue=""
              className="w-full px-3.5 py-2 border rounded-lg bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="" disabled>Seleccione especialidad...</option>
              {especialidades.map(esp => (
                <option key={esp.id_especialidad} value={esp.id_especialidad}>
                  {esp.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Fecha de Ingreso */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Fecha de Inicio Laboral *
            </label>
            <input
              type="date"
              name="fecha_ingreso"
              required
              className="w-full px-3.5 py-2 border rounded-lg bg-transparent border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            {state.errors?.fecha_ingreso && (
              <p className="text-xs text-rose-600 mt-1">{state.errors.fecha_ingreso[0]}</p>
            )}
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg shadow-sm transition-colors disabled:opacity-50"
          >
            {isPending ? 'Validando y Guardando...' : 'Guardar y Habilitar Docente'}
          </button>
        </div>
      </form>
    </div>
  );
}
