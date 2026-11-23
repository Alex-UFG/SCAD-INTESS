import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getIncidenciaPorId } from '@/app/actions/incidencias';
import { getCitaciones } from '@/app/actions/citaciones';
import { getEstudiantePorNie } from '@/app/actions/estudiantes';
import { accesoDisciplina, puedeAdjuntarEvidencia } from '@/lib/acceso-disciplina';
import { ahoraLocal } from '@/lib/disciplina';
import { nombreCompleto } from '@/lib/format';
import { Badge, TONO_CITACION, TONO_FALTA, TONO_INCIDENCIA } from '@/components/ui/badge';
import { EstadoIncidenciaAcciones } from '@/components/disciplina/estado-incidencia-acciones';
import { Evidencias } from '@/components/disciplina/evidencias';
import { EmitirCitacionModal } from '@/components/disciplina/emitir-citacion-modal';
import { CitacionAcciones } from '@/components/disciplina/citacion-acciones';

export const dynamic = 'force-dynamic';

const tarjeta = 'rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900';
const titulo = 'text-sm font-semibold text-intess-dark dark:text-slate-100';

export default async function IncidenciaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const acceso = await accesoDisciplina();
  if (!acceso) redirect('/dashboard');
  if (!/^\d+$/.test(id)) notFound();

  const [t, tCitaciones, incidencia] = await Promise.all([
    getTranslations('incidencias'),
    getTranslations('citaciones'),
    getIncidenciaPorId(Number(id)),
  ]);
  if (!incidencia) notFound();

  const [citaciones, estudiante] = await Promise.all([
    getCitaciones({ idIncidencia: incidencia.id_incidencia }),
    acceso.citar ? getEstudiantePorNie(incidencia.nie) : null,
  ]);

  const datos = [
    { label: t('colFecha'), value: incidencia.hora ? `${incidencia.fecha} · ${incidencia.hora}` : incidencia.fecha },
    { label: t('colPeriodo'), value: t('periodoN', { numero: incidencia.periodo, anio: incidencia.anio }) },
    { label: t('colReportante'), value: incidencia.reportante ?? '—' },
    { label: t('resolutor'), value: incidencia.resolutor ?? '—' },
  ];

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8 sm:px-6">
      <div>
        <Link href="/dashboard/incidencias" className="text-sm text-intess hover:underline dark:text-intess-accent">
          ← {t('volver')}
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold text-intess-dark dark:text-slate-100">{incidencia.estudiante}</h1>
          <Badge tono={TONO_FALTA[incidencia.tipo_falta]}>{t(`tipos.${incidencia.tipo_falta}`)}</Badge>
          <Badge tono={TONO_INCIDENCIA[incidencia.estado]}>{t(`estados.${incidencia.estado}`)}</Badge>
        </div>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {t('detalleSubtitle', { id: incidencia.id_incidencia, nie: incidencia.nie })}
        </p>
      </div>

      {incidencia.escalada_auto && (
        <p className="rounded-md border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-900 dark:border-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-200">
          {t('avisoEscalada')}
        </p>
      )}

      <section className={tarjeta}>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {datos.map((d) => (
            <div key={d.label}>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">{d.label}</dt>
              <dd className="mt-1 break-words text-sm text-slate-800 dark:text-slate-100">{d.value}</dd>
            </div>
          ))}
        </dl>
        <h2 className={`mt-5 ${titulo}`}>{t('descripcion')}</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">{incidencia.descripcion}</p>
      </section>

      <section className={tarjeta}>
        <h2 className={titulo}>{t('resolucion')}</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">
          {incidencia.resolucion ?? t('sinResolucion')}
        </p>
        {acceso.resolver && (
          <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-800">
            <EstadoIncidenciaAcciones idIncidencia={incidencia.id_incidencia} estado={incidencia.estado} />
          </div>
        )}
      </section>

      <section className={tarjeta}>
        <h2 className={`mb-3 ${titulo}`}>{t('evidencias')}</h2>
        <Evidencias
          idIncidencia={incidencia.id_incidencia}
          archivos={incidencia.archivos}
          puedeAdjuntar={puedeAdjuntarEvidencia(acceso, incidencia)}
          puedeQuitarTodas={acceso.resolver}
          idUsuario={acceso.idUsuario}
        />
      </section>

      <section className={tarjeta}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className={titulo}>{tCitaciones('title')}</h2>
          {estudiante && (
            <EmitirCitacionModal
              idIncidencia={incidencia.id_incidencia}
              nie={incidencia.nie}
              ahora={ahoraLocal().replace(' ', 'T')}
              tutores={estudiante.tutores.map((tutor) => ({
                dui: tutor.dui_tutor,
                nombre: nombreCompleto(tutor),
                parentesco: tutor.pivot.parentesco,
                principal: tutor.pivot.contacto_principal,
              }))}
            />
          )}
        </div>
        {citaciones.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">{tCitaciones('emptyIncidencia')}</p>
        ) : (
          <ul className="divide-y divide-slate-200 dark:divide-slate-800">
            {citaciones.map((c) => (
              <li key={c.id_citacion} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-100">
                    {c.fecha_citacion}
                    <Badge tono={TONO_CITACION[c.estado]}>{tCitaciones(`estados.${c.estado}`)}</Badge>
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {c.tutor} · {c.telefono}
                    {c.observaciones ? ` · ${c.observaciones}` : ''}
                  </p>
                </div>
                <CitacionAcciones idCitacion={c.id_citacion} estado={c.estado} puedeGestionar={acceso.citar} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
