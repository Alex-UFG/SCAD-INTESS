import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

export default async function MatriculasDashboardPage() {
  const t = await getTranslations('matriculas');

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">{t('title')}</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-900 shadow rounded-lg border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">{t('nuevaTitle')}</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
            {t('nuevaText')}
          </p>
          <Link
            href="/dashboard/estudiantes"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            {t('buscarEstudiante')}
          </Link>
        </div>

        <div className="bg-white dark:bg-gray-900 shadow rounded-lg border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">{t('reportesTitle')}</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
            {t('reportesText')}
          </p>
          <button disabled className="bg-gray-200 text-gray-500 px-4 py-2 rounded-md text-sm font-medium cursor-not-allowed">
            {t('generarReporte')}
          </button>
        </div>
      </div>
    </div>
  );
}
