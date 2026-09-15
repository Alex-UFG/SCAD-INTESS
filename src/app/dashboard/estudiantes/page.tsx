import { getTranslations } from 'next-intl/server';
import { getEstudiantes } from '@/app/actions/estudiantes';
import { nombreCompleto } from '@/lib/format';
import { EstadoEstudianteBadge } from '@/components/ui/estado-badge';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function EstudiantesPage() {
  const t = await getTranslations('estudiantes');
  const estudiantes = await getEstudiantes();

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{t('title')}</h1>
        <Link href="/dashboard/estudiantes/nuevo" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
          {t('new')}
        </Link>
      </div>

      <div className="bg-white dark:bg-gray-900 shadow rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <th className="p-4 font-semibold text-gray-700 dark:text-gray-200 text-sm">{t('colNie')}</th>
                <th className="p-4 font-semibold text-gray-700 dark:text-gray-200 text-sm">{t('colNombre')}</th>
                <th className="p-4 font-semibold text-gray-700 dark:text-gray-200 text-sm">{t('colEstado')}</th>
                <th className="p-4 font-semibold text-gray-700 dark:text-gray-200 text-sm">{t('colAcciones')}</th>
              </tr>
            </thead>
            <tbody>
              {estudiantes.map((est) => (
                <tr key={est.nie} className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="p-4 text-sm text-gray-900 dark:text-gray-300">{est.nie}</td>
                  <td className="p-4 text-sm text-gray-900 dark:text-gray-300">
                    {nombreCompleto(est)}
                  </td>
                  <td className="p-4 text-sm">
                    <EstadoEstudianteBadge estado={est.estado} />
                  </td>
                  <td className="p-4 text-sm">
                    <Link href={`/dashboard/estudiantes/${est.nie}`} className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium hover:underline">
                      {t('verExpediente')}
                    </Link>
                  </td>
                </tr>
              ))}
              {estudiantes.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-500 dark:text-gray-400">
                    {t('empty')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
