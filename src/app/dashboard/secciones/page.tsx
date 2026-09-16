import { getTranslations } from 'next-intl/server';
import { getSecciones, getCiclosAbiertos } from '@/app/actions/secciones';
import { getEspecialidadesActivas } from '@/app/actions/docentes';
import { FormNuevaSeccion } from './form-seccion';

export const metadata = {
  title: 'Secciones | SCAD-INTESS',
  description: 'Gestión de secciones por ciclo escolar'
};

export const dynamic = 'force-dynamic';

export default async function SeccionesPage() {
  const [t, secciones, especialidades, ciclos] = await Promise.all([
    getTranslations('secciones'),
    getSecciones(),
    getEspecialidadesActivas(),
    getCiclosAbiertos(),
  ]);

  return (
    <div className="p-6">
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{t('title')}</h1>
        <FormNuevaSeccion especialidades={especialidades} ciclos={ciclos} />
      </div>

      <div className="bg-white dark:bg-gray-900 shadow rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <th className="p-4 font-semibold text-gray-700 dark:text-gray-200 text-sm">{t('colCiclo')}</th>
                <th className="p-4 font-semibold text-gray-700 dark:text-gray-200 text-sm">{t('colGrado')}</th>
                <th className="p-4 font-semibold text-gray-700 dark:text-gray-200 text-sm">{t('colSeccion')}</th>
                <th className="p-4 font-semibold text-gray-700 dark:text-gray-200 text-sm">{t('colEspecialidad')}</th>
                <th className="p-4 font-semibold text-gray-700 dark:text-gray-200 text-sm">{t('colDocenteGuia')}</th>
                <th className="p-4 font-semibold text-gray-700 dark:text-gray-200 text-sm">{t('colCapacidad')}</th>
              </tr>
            </thead>
            <tbody>
              {secciones.map((seccion) => (
                <tr key={seccion.id_seccion} className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="p-4 text-sm text-gray-900 dark:text-gray-300">{seccion.ciclo_anio}</td>
                  <td className="p-4 text-sm text-gray-900 dark:text-gray-300">{seccion.grado}°</td>
                  <td className="p-4 text-sm font-medium text-gray-900 dark:text-gray-200">{seccion.nombre}</td>
                  <td className="p-4 text-sm text-gray-900 dark:text-gray-300">{seccion.especialidad_nombre}</td>
                  <td className="p-4 text-sm font-mono text-gray-600 dark:text-gray-400">{seccion.dui_docente_guia || '—'}</td>
                  <td className="p-4 text-sm text-gray-900 dark:text-gray-300">{seccion.capacidad_max}</td>
                </tr>
              ))}
              {secciones.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500 dark:text-gray-400">
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
