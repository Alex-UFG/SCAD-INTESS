'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { createTutorSchema, TutorFormData } from '@/lib/validations/tutor';
import { createTutor, updateTutor } from '@/app/actions/tutores';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { FormField, ServerErrorBanner, inputClass, submitButtonClass } from '@/components/ui/form-field';

interface TutorFormProps {
  /**DUI del tutor a editar; sin el, el formulario crea uno nuevo */
  dui?: string;
  defaultValues?: Partial<TutorFormData>;
}

export function TutorForm({ dui, defaultValues }: TutorFormProps) {
  const t = useTranslations('tutores');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const esEdicion = dui !== undefined;

  const schema = useMemo(() => createTutorSchema((key) => t(`errors.${key}`)), [t]);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<TutorFormData>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const onSubmit = async (data: TutorFormData) => {
    setServerError(null);
    const result = esEdicion ? await updateTutor(dui, data) : await createTutor(data);

    if (result.success) {
      router.push(esEdicion ? `/dashboard/tutores/${dui}` : '/dashboard/tutores');
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

          <FormField label={t('dui')} required error={errors.dui_tutor?.message}>
            <input type="text" placeholder="00000000-0" readOnly={esEdicion} {...register('dui_tutor')} className={`${inputClass} ${esEdicion ? 'opacity-60 cursor-not-allowed' : ''}`} />
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

          <FormField label={t('telefonoPrincipal')} required error={errors.telefono_principal?.message}>
            <input type="text" {...register('telefono_principal')} className={inputClass} />
          </FormField>

          <FormField label={t('telefonoAlterno')} error={errors.telefono_alterno?.message}>
            <input type="text" {...register('telefono_alterno')} className={inputClass} />
          </FormField>

          <FormField label={t('email')} error={errors.email?.message}>
            <input type="email" {...register('email')} className={inputClass} />
          </FormField>

          <FormField label={t('ocupacion')} error={errors.ocupacion?.message}>
            <input type="text" {...register('ocupacion')} className={inputClass} />
          </FormField>

        </div>

        <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-800">
          <button type="submit" disabled={isSubmitting} className={submitButtonClass}>
            {isSubmitting ? tCommon('saving') : esEdicion ? t('guardarCambios') : t('guardar')}
          </button>
        </div>
      </form>
    </div>
  );
}
