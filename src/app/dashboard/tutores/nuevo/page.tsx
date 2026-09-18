import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { TutorForm } from '@/components/tutores/tutor-form';

export default async function NuevoTutorPage() {
  const [t, tCommon] = await Promise.all([getTranslations('tutores'), getTranslations('common')]);

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-6">
        <Link href="/dashboard/tutores" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
          ← {tCommon('back')}
        </Link>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{t('registrarTitle')}</h1>
      </div>

      <TutorForm />
    </div>
  );
}
