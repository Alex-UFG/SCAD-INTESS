import { getLocale, getTranslations } from 'next-intl/server';
import { getEstudiantePorNie } from '@/app/actions/estudiantes';
import { getMatriculasPorEstudiante, getCiclosAbiertos, getSecciones } from '@/app/actions/matriculas';
import { getTutores } from '@/app/actions/tutores';
import { nombreCompleto, formatFecha } from '@/lib/format';
import { EstadoEstudianteBadge } from '@/components/ui/estado-badge';
import { VincularTutorModal } from '@/components/estudiantes/vincular-tutor-modal';
import { MatricularModal } from '@/components/estudiantes/matricular-modal';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function ExpedienteEstudiantePage({ params }: { params: Promise<{ nie: string }> }) {
  const resolvedParams = await params;
  // parseInt solo no basta: '123abc' resolveria al estudiante 123
  if (!/^\d+$/.test(resolvedParams.nie)) return notFound();
  const nie = parseInt(resolvedParams.nie);

  const [t, tCommon, tMatriculas, tTutores, locale, estudiante, matriculas, tutores, ciclos, secciones] = await Promise.all([
    getTranslations('estudiantes'),
    getTranslations('common'),
    getTranslations('matriculas'),
    getTranslations('tutores'),
    getLocale(),
    getEstudiantePorNie(nie),
    getMatriculasPorEstudiante(nie),
    getTutores(),
    getCiclosAbiertos(),
    getSecciones(),
  ]);

  if (!estudiante) return notFound();

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/estudiantes" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            ← {tCommon('back')}
          </Link>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{t('expedienteTitle')}</h1>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/dashboard/estudiantes/${nie}/editar`}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            {t('editar')}
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Datos Personales */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-gray-900 shadow rounded-lg border border-gray-200 dark:border-gray-800 p-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4 border-b pb-2 dark:border-gray-800">
              {t('datosPersonales')}
            </h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('nie')}</p>
                <p className="font-medium text-gray-900 dark:text-gray-200">{estudiante.nie}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('nombreCompleto')}</p>
                <p className="font-medium text-gray-900 dark:text-gray-200">{nombreCompleto(estudiante)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('fechaNacimiento')}</p>
                <p className="font-medium text-gray-900 dark:text-gray-200">
                  {formatFecha(estudiante.fecha_nacimiento, locale)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('genero')}</p>
                <p className="font-medium text-gray-900 dark:text-gray-200">
                  {t(`generos.${estudiante.genero}`)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('estado')}</p>
                <div className="mt-1">
                  <EstadoEstudianteBadge estado={estudiante.estado} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tutores y Matriculas */}
        <div className="lg:col-span-2 space-y-6">

          {/* Tutores */}
          <div className="bg-white dark:bg-gray-900 shadow rounded-lg border border-gray-200 dark:border-gray-800 p-6">
            <div className="flex justify-between items-center border-b pb-2 mb-4 dark:border-gray-800">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                {t('tutoresTitle')}
              </h2>
              <VincularTutorModal nie={nie} tutores={tutores} />
            </div>

            {estudiante.tutores && estudiante.tutores.length > 0 ? (
              <div className="space-y-4">
                {estudiante.tutores.map(tutor => (
                  <div key={tutor.dui_tutor} className="flex justify-between items-start p-3 bg-gray-50 dark:bg-gray-800/50 rounded-md border border-gray-100 dark:border-gray-800">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-200">
                        {tutor.primer_nombre} {tutor.primer_apellido}
                        {tutor.pivot.contacto_principal && (
                          <span className="ml-2 bg-yellow-100 text-yellow-800 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">{t('principal')}</span>
                        )}
                      </p>
                      <p className="text-sm text-gray-500">{t('duiLabel')}: {tutor.dui_tutor} • {t('parentescoLabel')}: {tTutores(`parentescos.${tutor.pivot.parentesco}`)}</p>
                      <p className="text-sm text-gray-500">{t('telLabel')}: {tutor.telefono_principal}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">{t('tutoresEmpty')}</p>
            )}
          </div>

          {/* Historial de Matriculas */}
          <div className="bg-white dark:bg-gray-900 shadow rounded-lg border border-gray-200 dark:border-gray-800 p-6">
            <div className="flex justify-between items-center border-b pb-2 mb-4 dark:border-gray-800">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                {tMatriculas('historialTitle')}
              </h2>
              <MatricularModal nie={nie} ciclos={ciclos} secciones={secciones} />
            </div>

            {matriculas && matriculas.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b dark:border-gray-800 text-gray-500">
                      <th className="pb-2 font-medium">{tMatriculas('colCiclo')}</th>
                      <th className="pb-2 font-medium">{tMatriculas('colSeccion')}</th>
                      <th className="pb-2 font-medium">{tMatriculas('colGrado')}</th>
                      <th className="pb-2 font-medium">{tMatriculas('colEspecialidad')}</th>
                      <th className="pb-2 font-medium">{tMatriculas('colEstado')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matriculas.map(mat => (
                      <tr key={mat.id_matricula} className="border-b dark:border-gray-800/50 last:border-0">
                        <td className="py-3">{mat.ciclo_anio}</td>
                        <td className="py-3">{mat.seccion_nombre}</td>
                        <td className="py-3">{mat.grado}</td>
                        <td className="py-3">{mat.especialidad_nombre}</td>
                        <td className="py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            mat.estado === 'Vigente' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                          }`}>
                            {tMatriculas(`estados.${mat.estado}`)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">{tMatriculas('historialEmpty')}</p>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
