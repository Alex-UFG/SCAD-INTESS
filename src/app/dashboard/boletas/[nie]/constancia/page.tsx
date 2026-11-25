import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { getConstanciaMatricula } from '@/app/actions/boletas';
import { requirePermiso } from '@/lib/permisos';
import { formatFecha } from '@/lib/format';
import { hoyISO } from '@/lib/asistencia';
import { DescargarPdfBoton } from '@/components/reportes/descargar-pdf-boton';
import type { DocumentoPdfDatos } from '@/components/reportes/documento-pdf';

export const dynamic = 'force-dynamic';

type Params = Record<string, string | string[] | undefined>;

const primero = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function ConstanciaPage({ params, searchParams }: { params: Promise<{ nie: string }>; searchParams: Promise<Params> }) {
  const [{ nie }, sp] = await Promise.all([params, searchParams]);
  if (!(await requirePermiso('reportes.constancia'))) redirect('/dashboard');
  const ciclo = primero(sp.ciclo) ?? '';
  if (![nie, ciclo].every((v) => /^\d+$/.test(v))) notFound();

  const [t, tUi, tMatriculas, locale, constancia] = await Promise.all([
    getTranslations('boletas'),
    getTranslations('ui'),
    getTranslations('matriculas'),
    getLocale(),
    getConstanciaMatricula(Number(nie), Number(ciclo)),
  ]);
  if (!constancia) notFound();

  const datos = [
    { label: t('doc.estudiante'), value: constancia.nombre },
    { label: t('doc.nie'), value: String(constancia.nie) },
    { label: t('doc.gradoSeccion'), value: `${constancia.grado}° ${constancia.seccion}` },
    { label: t('doc.especialidad'), value: constancia.especialidad },
    { label: t('doc.fechaMatricula'), value: formatFecha(constancia.fecha_matricula, locale) },
    { label: t('doc.estadoMatricula'), value: tMatriculas('estados.Vigente') },
  ];
  const valores = { nombre: constancia.nombre, nie: constancia.nie, anio: constancia.anio };
  const emitido = t('doc.emitido', { fecha: formatFecha(hoyISO(), locale) });
  const documento: DocumentoPdfDatos = {
    institucion: t('doc.institucion'),
    lema: tUi('tagline'),
    titulo: t('doc.tituloConstancia'),
    subtitulos: [emitido],
    parrafoInicial: t.markup('doc.constanciaCuerpo', { ...valores, b: (chunks) => chunks }),
    datos,
    parrafoFinal: t('doc.constanciaCierre'),
    firmas: [t('doc.firmaDireccion')],
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 print:max-w-none print:p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/dashboard/boletas?ciclo=${ciclo}`} className="text-sm text-intess hover:underline dark:text-intess-accent">
          ← {t('volver')}
        </Link>
        <DescargarPdfBoton
          documento={documento}
          fileName={`Constancia_${constancia.nie}_${constancia.anio}.pdf`}
          label={t('descargarPdf')}
          pendingLabel={t('generandoPdf')}
          errorLabel={t('errorPdf')}
        />
      </div>

      <article className="mt-6 rounded-xl border border-slate-200 bg-white p-10 text-sm leading-relaxed text-black print:mt-0 print:rounded-none print:border-0 print:p-0">
        <header className="border-b border-slate-300 pb-4 text-center">
          <p className="text-base font-bold uppercase tracking-wide">{t('doc.institucion')}</p>
          <p className="text-xs text-slate-600">{tUi('tagline')}</p>
          <h1 className="mt-4 text-lg font-bold uppercase">{t('doc.tituloConstancia')}</h1>
          <p className="text-xs text-slate-600">{t('doc.emitido', { fecha: formatFecha(hoyISO(), locale) })}</p>
        </header>

        <p className="mt-6">
          {t.rich('doc.constanciaCuerpo', {
            nombre: constancia.nombre,
            nie: constancia.nie,
            anio: constancia.anio,
            b: (chunks) => <strong>{chunks}</strong>,
          })}
        </p>

        <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 rounded-md border border-slate-300 p-4">
          {datos.map((d) => (
            <div key={d.label}>
              <dt className="text-xs font-semibold uppercase text-slate-600">{d.label}</dt>
              <dd className="font-medium">{d.value}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-6">{t('doc.constanciaCierre')}</p>

        <div className="mt-16 grid grid-cols-2 gap-10 text-center text-xs">
          <div />
          <div>
            <div className="border-t border-black pt-2">{t('doc.firmaDireccion')}</div>
          </div>
        </div>
      </article>
    </div>
  );
}
