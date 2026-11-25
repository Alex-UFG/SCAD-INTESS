import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getCitacionPorId } from '@/app/actions/citaciones';
import { accesoDisciplina } from '@/lib/acceso-disciplina';
import { Badge, TONO_CITACION } from '@/components/ui/badge';
import { ImprimirBoton } from '@/components/disciplina/imprimir-boton';

export const dynamic = 'force-dynamic';

/**
 * Citacion lista para imprimir: el encabezado y el menu se ocultan con
 * `print:hidden` y la carta usa colores fijos para salir legible en papel
 * aunque la interfaz este en tema oscuro.
 */
export default async function CitacionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await accesoDisciplina())) redirect('/dashboard');
  if (!/^\d+$/.test(id)) notFound();

  const [t, tUi, tTutores, tIncidencias, citacion] = await Promise.all([
    getTranslations('citaciones'),
    getTranslations('ui'),
    getTranslations('tutores'),
    getTranslations('incidencias'),
    getCitacionPorId(Number(id)),
  ]);
  if (!citacion) notFound();

  const [fecha, hora] = citacion.fecha_citacion.split(' ');
  const datos = [
    { label: t('carta.estudiante'), value: `${citacion.estudiante} (NIE ${citacion.nie})` },
    { label: t('carta.seccion'), value: citacion.seccion ?? '—' },
    { label: t('carta.fecha'), value: fecha },
    { label: t('carta.hora'), value: hora },
  ];

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 print:max-w-none print:p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/dashboard/incidencias/${citacion.id_incidencia}`} className="text-sm text-intess hover:underline dark:text-intess-accent">
          ← {t('volverIncidencia')}
        </Link>
        <div className="flex items-center gap-3">
          <Badge tono={TONO_CITACION[citacion.estado]}>{t(`estados.${citacion.estado}`)}</Badge>
          <ImprimirBoton label={t('imprimir')} />
        </div>
      </div>

      <article className="mt-6 rounded-xl border border-slate-200 bg-white p-10 text-sm leading-relaxed text-black print:mt-0 print:rounded-none print:border-0 print:p-0">
        <header className="border-b border-slate-300 pb-4 text-center">
          <p className="text-base font-bold uppercase tracking-wide">{t('carta.institucion')}</p>
          <p className="text-xs text-slate-600">{tUi('tagline')}</p>
          <h1 className="mt-4 text-lg font-bold uppercase">{t('carta.titulo')}</h1>
          <p className="text-xs text-slate-600">{t('carta.numero', { id: citacion.id_citacion, fecha: citacion.fecha_emision.slice(0, 10) })}</p>
        </header>

        <p className="mt-6">
          {t('carta.saludo')}{' '}
          <strong>{citacion.tutor}</strong>
          {citacion.parentesco ? ` (${tTutores(`parentescos.${citacion.parentesco}`)})` : ''}, DUI {citacion.dui_tutor}:
        </p>
        <p className="mt-4">{t('carta.cuerpo')}</p>

        <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 rounded-md border border-slate-300 p-4">
          {datos.map((d) => (
            <div key={d.label}>
              <dt className="text-xs font-semibold uppercase text-slate-600">{d.label}</dt>
              <dd className="font-medium">{d.value}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-6">
          <strong>{t('carta.motivo')}:</strong>{' '}
          {t('carta.motivoTexto', { tipo: tIncidencias(`tipos.${citacion.tipo_falta}`), fecha: citacion.fecha_incidencia })}
        </p>
        {citacion.observaciones && (
          <p className="mt-3">
            <strong>{t('observaciones')}:</strong> {citacion.observaciones}
          </p>
        )}
        <p className="mt-4">{t('carta.cierre')}</p>

        <div className="mt-16 grid grid-cols-2 gap-10 text-center text-xs">
          <div>
            <div className="border-t border-black pt-2">{t('carta.firmaInstitucion')}</div>
          </div>
          <div>
            <div className="border-t border-black pt-2">{t('carta.firmaTutor')}</div>
          </div>
        </div>
      </article>
    </div>
  );
}
