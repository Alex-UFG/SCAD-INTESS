'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { tutorSchema, TutorFormData } from '@/lib/validations/tutor';
import { createTutor } from '@/app/actions/tutores';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';

export default function NuevoTutorPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<TutorFormData>({
    resolver: zodResolver(tutorSchema)
  });

  const onSubmit = async (data: TutorFormData) => {
    setServerError(null);
    const result = await createTutor(data);
    
    if (result.success) {
      router.push('/dashboard/tutores');
      router.refresh();
    } else {
      setServerError(result.error || 'Revisa los campos del formulario.');
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/dashboard/tutores" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
          ← Volver
        </Link>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Registrar Tutor</h1>
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
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">DUI *</label>
              <input 
                type="text" 
                placeholder="00000000-0"
                {...register('dui_tutor')} 
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.dui_tutor && <p className="text-red-500 text-xs">{errors.dui_tutor.message}</p>}
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
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Teléfono Principal *</label>
              <input 
                type="text" 
                {...register('telefono_principal')} 
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.telefono_principal && <p className="text-red-500 text-xs">{errors.telefono_principal.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Teléfono Alterno</label>
              <input 
                type="text" 
                {...register('telefono_alterno')} 
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.telefono_alterno && <p className="text-red-500 text-xs">{errors.telefono_alterno.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
              <input 
                type="email" 
                {...register('email')} 
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.email && <p className="text-red-500 text-xs">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Ocupación</label>
              <input 
                type="text" 
                {...register('ocupacion')} 
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.ocupacion && <p className="text-red-500 text-xs">{errors.ocupacion.message}</p>}
            </div>

          </div>

          <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-800">
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-md font-medium transition-colors"
            >
              {isSubmitting ? 'Guardando...' : 'Guardar Tutor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
