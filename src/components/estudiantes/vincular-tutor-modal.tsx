'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { z } from 'zod';
import { createEstudianteTutorSchema, estudianteTutorSchema, EstudianteTutorFormData } from '@/lib/validations/tutor';
import { vincularEstudianteTutor } from '@/app/actions/tutores';
import { Tutor, Parentesco } from '@/types/persona';
import { nombreCompleto } from '@/lib/format';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { FormField, ServerErrorBanner, inputClass, submitButtonClass } from '@/components/ui/form-field';
import Link from 'next/link';

const PARENTESCOS: Parentesco[] = ['Padre', 'Madre', 'Abuelo', 'Abuela', 'Tio', 'Tia', 'Hermano', 'Hermana', 'Encargado'];

type VincularTutorInput = z.input<typeof estudianteTutorSchema>;

interface VincularTutorModalProps {
  nie: number;
  tutores: Tutor[];
}

export function VincularTutorModal({ nie, tutores }: VincularTutorModalProps) {
  const t = useTranslations('tutores');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const schema = useMemo(() => createEstudianteTutorSchema((key) => t(`errors.${key}`)), [t]);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<VincularTutorInput, unknown, EstudianteTutorFormData>({
    resolver: zodResolver(schema),
    defaultValues: { nie, contacto_principal: false },
  });

  const cerrar = () => {
    setOpen(false);
    setServerError(null);
    reset({ nie, contacto_principal: false });
  };

  const onSubmit = async (data: EstudianteTutorFormData) => {
    setServerError(null);
    const result = await vincularEstudianteTutor(data);

    if (result.success) {
      cerrar();
      router.refresh();
    } else {
      setServerError(t(`errors.${result.error ?? 'checkFields'}`));
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
      >
        {t('vincularBoton')}
      </button>

      <Modal title={t('vincularTitle')} open={open} onClose={cerrar}>
        <ServerErrorBanner message={serverError} />

        {tutores.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('sinTutores')}{' '}
            <Link href="/dashboard/tutores/nuevo" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium hover:underline">
              {t('registrarUno')}
            </Link>
          </p>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <input type="hidden" {...register('nie')} />

            <FormField label={t('tutor')} required error={errors.dui_tutor?.message}>
              <select {...register('dui_tutor')} defaultValue="" className={inputClass}>
                <option value="" disabled>{t('seleccioneTutor')}</option>
                {tutores.map((tutor) => (
                  <option key={tutor.dui_tutor} value={tutor.dui_tutor}>
                    {nombreCompleto(tutor)} — {tutor.dui_tutor}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label={t('parentesco')} required error={errors.parentesco?.message}>
              <select {...register('parentesco')} defaultValue="" className={inputClass}>
                <option value="" disabled>{t('seleccioneParentesco')}</option>
                {PARENTESCOS.map((parentesco) => (
                  <option key={parentesco} value={parentesco}>{t(`parentescos.${parentesco}`)}</option>
                ))}
              </select>
            </FormField>

            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input type="checkbox" {...register('contacto_principal')} className="h-4 w-4 rounded border-gray-300 dark:border-gray-700 text-blue-600 focus:ring-blue-500" />
              {t('contactoPrincipal')}
            </label>

            <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-800">
              <button type="submit" disabled={isSubmitting} className={submitButtonClass}>
                {isSubmitting ? tCommon('saving') : t('vincularGuardar')}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
