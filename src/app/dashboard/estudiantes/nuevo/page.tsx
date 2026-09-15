import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { EstudianteForm } from '@/components/estudiantes/estudiante-form';

export default async function NuevoEstudiantePage() {
  const t = await getTranslations('estudiantes');
  const tCommon = await getTranslations('common');

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/dashboard/estudiantes" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
          ← {tCommon('back')}
        </Link>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{t('registrarTitle')}</h1>
      </div>

      <EstudianteForm />
    </div>
  );
}
