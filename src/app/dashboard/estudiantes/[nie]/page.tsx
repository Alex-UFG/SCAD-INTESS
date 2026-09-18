import { getLocale, getTranslations } from 'next-intl/server';
import { getEstudiantePorNie } from '@/app/actions/estudiantes';
import { getMatriculasPorEstudiante, getCiclosAbiertos, getSecciones } from '@/app/actions/matriculas';
import { getTutores } from '@/app/actions/tutores';
import { requirePermiso } from '@/lib/session';
import { nombreCompleto, formatFecha } from '@/lib/format';
import { EstadoEstudianteBadge } from '@/components/ui/estado-badge';
import { Badge, TONO_MATRICULA } from '@/components/ui/badge';
import { VincularTutorModal } from '@/components/estudiantes/vincular-tutor-modal';
import { MatricularModal } from '@/components/estudiantes/matricular-modal';
import { FotoEstudiante } from '@/components/estudiantes/foto-estudiante';
import { EstadoEstudianteAcciones } from '@/components/estudiantes/estado-estudiante-acciones';
import { DesvincularTutorButton } from '@/components/estudiantes/desvincular-tutor-button';
import { MatriculaAcciones } from '@/components/estudiantes/matricula-acciones';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function ExpedienteEstudiantePage({ params }: { params: Promise<{ nie: string }> }) {
  const resolvedParams = await params;
  // parseInt solo no basta: '123abc' resolveria al estudiante 123
  if (!/^\d+$/.test(resolvedParams.nie)) return notFound();
  const nie = parseInt(resolvedParams.nie);

  const [t, tCommon, tMatriculas, tTutores, locale, estudiante, matriculas, tutores, ciclos, secciones, puedeCrear, puedeEditar, puedeRetirar] =
    await Promise.all([
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
      requirePermiso('matricula.crear'),
      requirePermiso('matricula.editar'),
      requirePermiso('matricula.retirar'),
    ]);

  if (!estudiante) return notFound();
  const editar = Boolean(puedeEditar);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <Link href="/dashboard/estudiantes" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            ← {tCommon('back')}
          </Link>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{t('expedienteTitle')}</h1>
        </div>
        {editar && (
          <Link
            href={`/dashboard/estudiantes/${nie}/editar`}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            {t('editar')}
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Datos Personales */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-gray-900 shadow rounded-lg border border-gray-200 dark:border-gray-800 p-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4 border-b pb-2 dark:border-gray-800">
              {t('datosPersonales')}
            </h2>
            <div className="mb-4">
              <FotoEstudiante nie={nie} fotoUrl={estudiante.foto_url} nombre={estudiante.primer_nombre} puedeEditar={editar} />
            </div>
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
                <p className="font-medium text-gray-900 dark:text-gray-200">{formatFecha(estudiante.fecha_nacimiento, locale)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('genero')}</p>
                <p className="font-medium text-gray-900 dark:text-gray-200">{t(`generos.${estudiante.genero}`)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('direccion')}</p>
                <p className="font-medium text-gray-900 dark:text-gray-200">{estudiante.direccion || '—'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('estado')}</p>
                <div className="mt-1 flex flex-col gap-3">
                  <EstadoEstudianteBadge estado={estudiante.estado} />
                  {editar && <EstadoEstudianteAcciones nie={nie} estado={estudiante.estado} />}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tutores y Matriculas */}
        <div className="lg:col-span-2 space-y-6">

          {/* Tutores */}
          <div className="bg-white dark:bg-gray-900 shadow rounded-lg border border-gray-200 dark:border-gray-800 p-6">
            <div className="flex flex-wrap justify-between items-center gap-2 border-b pb-2 mb-4 dark:border-gray-800">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{t('tutoresTitle')}</h2>
              {editar && <VincularTutorModal nie={nie} tutores={tutores} />}
            </div>

            {estudiante.tutores && estudiante.tutores.length > 0 ? (
              <div className="space-y-4">
                {estudiante.tutores.map(tutor => (
                  <div key={tutor.dui_tutor} className="flex justify-between items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-md border border-gray-100 dark:border-gray-800">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-200">
                        <Link href={`/dashboard/tutores/${tutor.dui_tutor}`} className="hover:underline">{nombreCompleto(tutor)}</Link>
                        {tutor.pivot.contacto_principal && (
                          <span className="ml-2 bg-yellow-100 text-yellow-800 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">{t('principal')}</span>
                        )}
                      </p>
                      <p className="text-sm text-gray-500">{t('duiLabel')}: {tutor.dui_tutor} • {t('parentescoLabel')}: {tTutores(`parentescos.${tutor.pivot.parentesco}`)}</p>
                      <p className="text-sm text-gray-500">{t('telLabel')}: {tutor.telefono_principal}</p>
                    </div>
                    {editar && <DesvincularTutorButton nie={nie} duiTutor={tutor.dui_tutor} nombre={nombreCompleto(tutor)} />}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">{t('tutoresEmpty')}</p>
            )}
          </div>

          {/* Historial de Matriculas */}
          <div className="bg-white dark:bg-gray-900 shadow rounded-lg border border-gray-200 dark:border-gray-800 p-6">
            <div className="flex flex-wrap justify-between items-center gap-2 border-b pb-2 mb-4 dark:border-gray-800">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{tMatriculas('historialTitle')}</h2>
              {puedeCrear && estudiante.estado !== 'Egresado' && <MatricularModal nie={nie} ciclos={ciclos} secciones={secciones} />}
            </div>

            {matriculas && matriculas.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b dark:border-gray-800 text-gray-500">
                      <th className="pb-2 font-medium">{tMatriculas('colCiclo')}</th>
                      <th className="pb-2 font-medium">{tMatriculas('colSeccion')}</th>
                      <th className="pb-2 font-medium">{tMatriculas('colEspecialidad')}</th>
                      <th className="pb-2 font-medium">{tMatriculas('colFecha')}</th>
                      <th className="pb-2 font-medium">{tMatriculas('colEstado')}</th>
                      <th className="pb-2 font-medium">{tMatriculas('colAcciones')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matriculas.map(mat => (
                      <tr key={mat.id_matricula} className="border-b dark:border-gray-800/50 last:border-0 align-top">
                        <td className="py-3">{mat.ciclo_anio}</td>
                        <td className="py-3">{mat.grado}° {mat.seccion_nombre}</td>
                        <td className="py-3">{mat.especialidad_nombre}</td>
                        <td className="py-3">{formatFecha(mat.fecha_matricula, locale)}</td>
                        <td className="py-3">
                          <Badge tono={TONO_MATRICULA[mat.estado]}>{tMatriculas(`estados.${mat.estado}`)}</Badge>
                          {mat.observaciones && <p className="mt-1 max-w-xs whitespace-pre-line text-xs text-gray-500">{mat.observaciones}</p>}
                        </td>
                        <td className="py-3">
                          {mat.estado === 'Vigente' && (
                            <MatriculaAcciones
                              idMatricula={mat.id_matricula}
                              idSeccion={mat.id_seccion}
                              idCiclo={mat.id_ciclo}
                              secciones={secciones}
                              puedeRetirar={Boolean(puedeRetirar)}
                              puedeTrasladar={editar}
                            />
                          )}
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
