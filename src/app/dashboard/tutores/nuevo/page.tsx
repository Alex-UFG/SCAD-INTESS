'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { tutorSchema, TutorFormData } from '@/lib/validations/tutor';
import { createTutor } from '@/app/actions/tutores';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { FormField, ServerErrorBanner, inputClass, submitButtonClass } from '@/components/ui/form-field';

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
        <ServerErrorBanner message={serverError} />

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            <FormField label="DUI *" error={errors.dui_tutor?.message}>
              <input type="text" placeholder="00000000-0" {...register('dui_tutor')} className={inputClass} />
            </FormField>

            <FormField label="Primer Nombre *" error={errors.primer_nombre?.message}>
              <input type="text" {...register('primer_nombre')} className={inputClass} />
            </FormField>

            <FormField label="Segundo Nombre" error={errors.segundo_nombre?.message}>
              <input type="text" {...register('segundo_nombre')} className={inputClass} />
            </FormField>

            <FormField label="Primer Apellido *" error={errors.primer_apellido?.message}>
              <input type="text" {...register('primer_apellido')} className={inputClass} />
            </FormField>

            <FormField label="Segundo Apellido" error={errors.segundo_apellido?.message}>
              <input type="text" {...register('segundo_apellido')} className={inputClass} />
            </FormField>

            <FormField label="Teléfono Principal *" error={errors.telefono_principal?.message}>
              <input type="text" {...register('telefono_principal')} className={inputClass} />
            </FormField>

            <FormField label="Teléfono Alterno" error={errors.telefono_alterno?.message}>
              <input type="text" {...register('telefono_alterno')} className={inputClass} />
            </FormField>

            <FormField label="Email" error={errors.email?.message}>
              <input type="email" {...register('email')} className={inputClass} />
            </FormField>

            <FormField label="Ocupación" error={errors.ocupacion?.message}>
              <input type="text" {...register('ocupacion')} className={inputClass} />
            </FormField>

          </div>

          <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-800">
            <button type="submit" disabled={isSubmitting} className={submitButtonClass}>
              {isSubmitting ? 'Guardando...' : 'Guardar Tutor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
