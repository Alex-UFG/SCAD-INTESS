'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { estudianteSchema, EstudianteFormData } from '@/lib/validations/estudiante';
import { createEstudiante } from '@/app/actions/estudiantes';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';

export default function NuevoEstudiantePage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(estudianteSchema),
    defaultValues: {
      estado: 'Activo',
      genero: 'M'
    }
  });

  const onSubmit = async (data: any) => {
    setServerError(null);
    const result = await createEstudiante(data);
    
    if (result.success) {
      router.push('/dashboard/estudiantes');
      router.refresh();
    } else {
      setServerError(result.error || 'Revisa los campos del formulario.');
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/dashboard/estudiantes" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
          ← Volver
        </Link>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Registrar Estudiante</h1>
      </div>

      <div className="bg-white dark:bg-gray-900 shadow rounded-lg border border-gray-200 dark:border-gray-800 p-6">
        {serverError && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-md border border-red-200 dark:border-red-800/30">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">NIE *</label>
              <input 
                type="number" 
                {...register('nie')} 
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.nie && <p className="text-red-500 text-xs">{errors.nie.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Fecha de Nacimiento *</label>
              <input 
                type="date" 
                {...register('fecha_nacimiento')} 
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.fecha_nacimiento && <p className="text-red-500 text-xs">{errors.fecha_nacimiento.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Primer Nombre *</label>
              <input 
                type="text" 
                {...register('primer_nombre')} 
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.primer_nombre && <p className="text-red-500 text-xs">{errors.primer_nombre.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Segundo Nombre</label>
              <input 
                type="text" 
                {...register('segundo_nombre')} 
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.segundo_nombre && <p className="text-red-500 text-xs">{errors.segundo_nombre.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Primer Apellido *</label>
              <input 
                type="text" 
                {...register('primer_apellido')} 
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.primer_apellido && <p className="text-red-500 text-xs">{errors.primer_apellido.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Segundo Apellido</label>
              <input 
                type="text" 
                {...register('segundo_apellido')} 
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.segundo_apellido && <p className="text-red-500 text-xs">{errors.segundo_apellido.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Género *</label>
              <select 
                {...register('genero')} 
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
              </select>
              {errors.genero && <p className="text-red-500 text-xs">{errors.genero.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Estado *</label>
              <select 
                {...register('estado')} 
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
                <option value="Retirado">Retirado</option>
                <option value="Egresado">Egresado</option>
              </select>
              {errors.estado && <p className="text-red-500 text-xs">{errors.estado.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Dirección</label>
            <textarea 
              {...register('direccion')} 
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.direccion && <p className="text-red-500 text-xs">{errors.direccion.message}</p>}
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-800">
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-md font-medium transition-colors"
            >
              {isSubmitting ? 'Guardando...' : 'Guardar Estudiante'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
