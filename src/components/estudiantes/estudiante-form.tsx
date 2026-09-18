'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { z } from 'zod';
import { createEstudianteSchema, estudianteSchema, EstudianteFormData } from '@/lib/validations/estudiante';
import { createEstudiante, updateEstudiante } from '@/app/actions/estudiantes';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { FormField, ServerErrorBanner, inputClass, submitButtonClass } from '@/components/ui/form-field';

type EstudianteFormInput = z.input<typeof estudianteSchema>;

interface EstudianteFormProps {
  /**NIE del estudiante a editar; sin él, el formulario crea uno nuevo */
  nie?: number;
  defaultValues?: Partial<EstudianteFormInput>;
}

export function EstudianteForm({ nie, defaultValues }: EstudianteFormProps) {
  const t = useTranslations('estudiantes');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const esEdicion = nie !== undefined;

  const schema = useMemo(() => createEstudianteSchema((key) => t(`errors.${key}`)), [t]);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<EstudianteFormInput, unknown, EstudianteFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
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
      setServerError(t(`errors.${result.error ?? 'checkFields'}`));
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 shadow rounded-lg border border-gray-200 dark:border-gray-800 p-6">
      <ServerErrorBanner message={serverError} />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          <FormField label={t('nie')} required error={errors.nie?.message}>
            <input type="number" readOnly={esEdicion} {...register('nie')} className={`${inputClass} ${esEdicion ? 'opacity-60 cursor-not-allowed' : ''}`} />
          </FormField>

          <FormField label={t('fechaNacimiento')} required error={errors.fecha_nacimiento?.message}>
            <input type="date" {...register('fecha_nacimiento')} className={inputClass} />
          </FormField>

          <FormField label={t('primerNombre')} required error={errors.primer_nombre?.message}>
            <input type="text" {...register('primer_nombre')} className={inputClass} />
          </FormField>

          <FormField label={t('segundoNombre')} error={errors.segundo_nombre?.message}>
            <input type="text" {...register('segundo_nombre')} className={inputClass} />
          </FormField>

          <FormField label={t('primerApellido')} required error={errors.primer_apellido?.message}>
            <input type="text" {...register('primer_apellido')} className={inputClass} />
          </FormField>

          <FormField label={t('segundoApellido')} error={errors.segundo_apellido?.message}>
            <input type="text" {...register('segundo_apellido')} className={inputClass} />
          </FormField>

          <FormField label={t('genero')} required error={errors.genero?.message}>
            <select {...register('genero')} className={inputClass}>
              <option value="M">{t('generos.M')}</option>
              <option value="F">{t('generos.F')}</option>
            </select>
          </FormField>

          {/* El estado se cambia desde el expediente (egreso, retiro por matricula) */}
        </div>

        <FormField label={t('direccion')} error={errors.direccion?.message}>
          <textarea {...register('direccion')} rows={3} className={inputClass} />
        </FormField>

        <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-800">
          <button type="submit" disabled={isSubmitting} className={submitButtonClass}>
            {isSubmitting ? tCommon('saving') : esEdicion ? t('guardarCambios') : t('guardar')}
          </button>
        </div>
      </form>
    </div>
  );
}
