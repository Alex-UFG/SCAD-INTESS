'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { estudianteSchema, EstudianteFormData } from '@/lib/validations/estudiante';
import { createEstudiante, updateEstudiante } from '@/app/actions/estudiantes';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FormField, ServerErrorBanner, inputClass, submitButtonClass } from '@/components/ui/form-field';

type EstudianteFormInput = z.input<typeof estudianteSchema>;

interface EstudianteFormProps {
  /**NIE del estudiante a editar; sin él, el formulario crea uno nuevo */
  nie?: number;
  defaultValues?: Partial<EstudianteFormInput>;
}

export function EstudianteForm({ nie, defaultValues }: EstudianteFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const esEdicion = nie !== undefined;

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<EstudianteFormInput, unknown, EstudianteFormData>({
    resolver: zodResolver(estudianteSchema),
    defaultValues: {
      estado: 'Activo',
      genero: 'M',
      ...defaultValues,
    },
  });

  const onSubmit = async (data: EstudianteFormData) => {
    setServerError(null);
    const result = esEdicion ? await updateEstudiante(nie, data) : await createEstudiante(data);

    if (result.success) {
      router.push(esEdicion ? `/dashboard/estudiantes/${nie}` : '/dashboard/estudiantes');
      router.refresh();
    } else {
      setServerError(result.error || 'Revisa los campos del formulario.');
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 shadow rounded-lg border border-gray-200 dark:border-gray-800 p-6">
      <ServerErrorBanner message={serverError} />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          <FormField label="NIE *" error={errors.nie?.message}>
            <input type="number" readOnly={esEdicion} {...register('nie')} className={`${inputClass} ${esEdicion ? 'opacity-60 cursor-not-allowed' : ''}`} />
          </FormField>

          <FormField label="Fecha de Nacimiento *" error={errors.fecha_nacimiento?.message}>
            <input type="date" {...register('fecha_nacimiento')} className={inputClass} />
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

          <FormField label="Género *" error={errors.genero?.message}>
            <select {...register('genero')} className={inputClass}>
              <option value="M">Masculino</option>
              <option value="F">Femenino</option>
            </select>
          </FormField>

          <FormField label="Estado *" error={errors.estado?.message}>
            <select {...register('estado')} className={inputClass}>
              <option value="Activo">Activo</option>
              <option value="Inactivo">Inactivo</option>
              <option value="Retirado">Retirado</option>
              <option value="Egresado">Egresado</option>
            </select>
          </FormField>
        </div>

        <FormField label="Dirección" error={errors.direccion?.message}>
          <textarea {...register('direccion')} rows={3} className={inputClass} />
        </FormField>

        <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-800">
          <button type="submit" disabled={isSubmitting} className={submitButtonClass}>
            {isSubmitting ? 'Guardando...' : esEdicion ? 'Guardar Cambios' : 'Guardar Estudiante'}
          </button>
        </div>
      </form>
    </div>
  );
}
