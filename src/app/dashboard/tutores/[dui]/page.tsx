import { getTranslations } from 'next-intl/server';
import { getTutorPorDui, getEstudiantesDelTutor } from '@/app/actions/tutores';
import { requirePermiso } from '@/lib/permisos';
import { nombreCompleto } from '@/lib/format';
import { DUI_REGEX } from '@/lib/validations/shared';
import { EstadoEstudianteBadge } from '@/components/ui/estado-badge';
import type { EstadoEstudiante } from '@/types/persona';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function FichaTutorPage({ params }: { params: Promise<{ dui: string }> }) {
  const { dui } = await params;
  if (!DUI_REGEX.test(dui)) return notFound();

  const [t, tCommon, tutor, estudiantes, puedeEditar] = await Promise.all([
    getTranslations('tutores'),
    getTranslations('common'),
    getTutorPorDui(dui),
    getEstudiantesDelTutor(dui),
    requirePermiso('matricula.editar'),
  ]);

  if (!tutor) return notFound();

  const campos = [
    [t('dui'), tutor.dui_tutor],
    [t('nombreCompleto'), nombreCompleto(tutor)],
    [t('telefonoPrincipal'), tutor.telefono_principal],
    [t('telefonoAlterno'), tutor.telefono_alterno || '-'],
    [t('email'), tutor.email || '-'],
    [t('ocupacion'), tutor.ocupacion || '-'],
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <Link href="/dashboard/tutores" className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
            ← {tCommon('back')}
          </Link>
          <h1 className="text-2xl font-bold text-intess-dark dark:text-slate-100">{t('fichaTitle')}</h1>
        </div>
        {puedeEditar && (
          <Link href={`/dashboard/tutores/${dui}/editar`} className="bg-intess hover:bg-intess/85 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
            {t('editar')}
          </Link>
        )}
      </div>

      <div className="bg-white dark:bg-slate-900 shadow rounded-lg border border-slate-200 dark:border-slate-800 p-6">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 border-b pb-2 dark:border-slate-800">{t('datosTitle')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {campos.map(([label, value]) => (
            <div key={label}>
              <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
              <p className="font-medium text-slate-900 dark:text-slate-200">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 shadow rounded-lg border border-slate-200 dark:border-slate-800 p-6">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 border-b pb-2 dark:border-slate-800">{t('estudiantesTitle')}</h2>
        {estudiantes.length === 0 ? (
          <p className="text-sm text-slate-500 italic">{t('estudiantesEmpty')}</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b dark:border-slate-800 text-slate-500">
                <th className="pb-2 font-medium">{t('colEstudiante')}</th>
                <th className="pb-2 font-medium">{t('colParentesco')}</th>
                <th className="pb-2 font-medium">{t('colEstado')}</th>
              </tr>
            </thead>
            <tbody>
              {estudiantes.map((e) => (
                <tr key={e.nie} className="border-b dark:border-slate-800/50 last:border-0">
                  <td className="py-2">
                    <Link href={`/dashboard/estudiantes/${e.nie}`} className="font-medium text-intess hover:underline dark:text-intess-accent">{nombreCompleto(e)}</Link>
                    <span className="ml-2 text-xs text-slate-500">NIE {e.nie}</span>
                    {e.contacto_principal && (
                      <span className="ml-2 bg-yellow-100 text-yellow-800 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">{t('principal')}</span>
                    )}
                  </td>
                  <td className="py-2">{t(`parentescos.${e.parentesco}`)}</td>
                  <td className="py-2"><EstadoEstudianteBadge estado={e.estado as EstadoEstudiante} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
