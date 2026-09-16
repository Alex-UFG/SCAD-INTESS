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
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <h1 className="text-xl font-bold text-intess-dark dark:text-slate-100">{t('title')}</h1>
        <FormNuevaSeccion especialidades={especialidades} ciclos={ciclos} />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
                <th className="p-4 font-semibold text-slate-700 dark:text-slate-200">{t('colCiclo')}</th>
                <th className="p-4 font-semibold text-slate-700 dark:text-slate-200">{t('colGrado')}</th>
                <th className="p-4 font-semibold text-slate-700 dark:text-slate-200">{t('colSeccion')}</th>
                <th className="p-4 font-semibold text-slate-700 dark:text-slate-200">{t('colEspecialidad')}</th>
                <th className="p-4 font-semibold text-slate-700 dark:text-slate-200">{t('colDocenteGuia')}</th>
                <th className="p-4 font-semibold text-slate-700 dark:text-slate-200">{t('colCapacidad')}</th>
              </tr>
            </thead>
            <tbody>
              {secciones.map((seccion) => (
                <tr key={seccion.id_seccion} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                  <td className="p-4 text-slate-900 dark:text-slate-300">{seccion.ciclo_anio}</td>
                  <td className="p-4 text-slate-900 dark:text-slate-300">{seccion.grado}°</td>
                  <td className="p-4 font-medium text-slate-900 dark:text-slate-200">{seccion.nombre}</td>
                  <td className="p-4 text-slate-900 dark:text-slate-300">{seccion.especialidad_nombre}</td>
                  <td className="p-4 font-mono text-slate-600 dark:text-slate-400">{seccion.dui_docente_guia || '—'}</td>
                  <td className="p-4 text-slate-900 dark:text-slate-300">{seccion.capacidad_max}</td>
                </tr>
              ))}
              {secciones.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 dark:text-slate-400">
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
