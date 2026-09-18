import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { getDocentePorDui, getEspecialidadesActivas, setEstadoDocente } from '@/app/actions/docentes';
import { ESTADOS_DOCENTE } from '@/lib/constantes';
import { getCargas } from '@/app/actions/cargas';
import { requirePermiso } from '@/lib/session';
import { nombreCompleto, formatFecha } from '@/lib/format';
import { DUI_REGEX } from '@/lib/validations/shared';
import { Badge, TONO_DOCENTE } from '@/components/ui/badge';
import { ActionButton } from '@/components/ui/action-button';
import { FormCompletarPerfilDocente } from '../completar-perfil/form-docente';

export const dynamic = 'force-dynamic';

export default async function FichaDocentePage({ params }: { params: Promise<{ dui: string }> }) {
  const { dui } = await params;
  if (!DUI_REGEX.test(dui)) return notFound();

  const [t, tCommon, tCargas, locale, docente, editor] = await Promise.all([
    getTranslations('docentes'),
    getTranslations('common'),
    getTranslations('cargas'),
    getLocale(),
    getDocentePorDui(dui),
    requirePermiso('usuarios.editar'),
  ]);
  if (!docente) return notFound();

  const [cargas, especialidades] = await Promise.all([getCargas({ duiDocente: dui }), editor ? getEspecialidadesActivas() : []]);
  const puedeEditar = Boolean(editor);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <Link href="/dashboard/docentes" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">← {tCommon('back')}</Link>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
          {nombreCompleto(docente)} <Badge tono={TONO_DOCENTE[docente.estado]}>{t(`estados.${docente.estado}`)}</Badge>
        </h1>
      </div>

      <div className="bg-white dark:bg-gray-900 shadow rounded-lg border border-gray-200 dark:border-gray-800 p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-2 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{t('fichaTitle')}</h2>
          {puedeEditar && (
            <div className="flex flex-wrap gap-2">
              {ESTADOS_DOCENTE.filter((e) => e !== docente.estado).map((e) => (
                <ActionButton
                  key={e}
                  action={setEstadoDocente}
                  fields={{ dui_docente: docente.dui_docente, estado: e }}
                  label={t(`marcar.${e}`)}
                  danger={e !== 'Activo'}
                  confirm={{ title: t(`marcar.${e}`), text: t('confirmarEstado', { nombre: nombreCompleto(docente), estado: t(`estados.${e}`) }) }}
                />
              ))}
            </div>
          )}
        </div>
        <dl className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
          <div><dt className="text-gray-500">{t('dui')}</dt><dd className="font-mono font-medium text-gray-900 dark:text-gray-200">{docente.dui_docente}</dd></div>
          <div><dt className="text-gray-500">{t('colEmail')}</dt><dd className="font-medium text-gray-900 dark:text-gray-200">{docente.email}</dd></div>
          <div><dt className="text-gray-500">{t('especialidad')}</dt><dd className="font-medium text-gray-900 dark:text-gray-200">{docente.especialidad_nombre ?? '—'}</dd></div>
          <div><dt className="text-gray-500">{t('telefono')}</dt><dd className="font-medium text-gray-900 dark:text-gray-200">{docente.telefono ?? '—'}</dd></div>
          <div><dt className="text-gray-500">{t('fechaIngreso')}</dt><dd className="font-medium text-gray-900 dark:text-gray-200">{formatFecha(docente.fecha_ingreso, locale)}</dd></div>
        </dl>
      </div>

      <div className="bg-white dark:bg-gray-900 shadow rounded-lg border border-gray-200 dark:border-gray-800 p-6">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 border-b pb-2 mb-4 dark:border-gray-800">{t('cargasTitle')}</h2>
        {cargas.length === 0 ? (
          <p className="text-sm text-gray-500 italic">{t('cargasEmpty')}</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b dark:border-gray-800 text-gray-500">
                <th className="pb-2 font-medium">{tCargas('colCiclo')}</th>
                <th className="pb-2 font-medium">{tCargas('colSeccion')}</th>
                <th className="pb-2 font-medium">{tCargas('colMateria')}</th>
                <th className="pb-2 font-medium text-right">{tCargas('colEstudiantes')}</th>
              </tr>
            </thead>
            <tbody>
              {cargas.map((c) => (
                <tr key={c.id_carga} className="border-b dark:border-gray-800/50 last:border-0">
                  <td className="py-2">{c.anio}</td>
                  <td className="py-2">{c.grado}° {c.seccion} — {c.especialidad}</td>
                  <td className="py-2"><span className="font-mono">{c.cod_materia}</span> {c.materia}</td>
                  <td className="py-2 text-right">{c.estudiantes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {puedeEditar && (
        <div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3">{t('editarTitle')}</h2>
          <FormCompletarPerfilDocente especialidades={especialidades} docente={docente} />
        </div>
      )}
    </div>
  );
}
