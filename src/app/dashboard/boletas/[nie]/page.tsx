import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { getBoleta } from '@/app/actions/boletas';
import { requirePermiso } from '@/lib/permisos';
import { formatFecha } from '@/lib/format';
import { hoyISO } from '@/lib/asistencia';
import { DescargarPdfBoton } from '@/components/reportes/descargar-pdf-boton';
import type { DocumentoPdfDatos } from '@/components/reportes/documento-pdf';

export const dynamic = 'force-dynamic';

type Params = Record<string, string | string[] | undefined>;

const primero = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function BoletaPage({ params, searchParams }: { params: Promise<{ nie: string }>; searchParams: Promise<Params> }) {
  const [{ nie }, sp] = await Promise.all([params, searchParams]);
  if (!(await requirePermiso('reportes.boleta'))) redirect('/dashboard');
  const ciclo = primero(sp.ciclo) ?? '';
  const periodo = primero(sp.periodo) ?? '';
  if (![nie, ciclo, periodo].every((v) => /^\d+$/.test(v))) notFound();

  const [t, tUi, locale, boleta] = await Promise.all([
    getTranslations('boletas'),
    getTranslations('ui'),
    getLocale(),
    getBoleta(Number(nie), Number(ciclo), Number(periodo)),
  ]);
  if (!boleta) notFound();

  const { estudiante, materias } = boleta;
  const nota = (v: number | null) => (v === null ? t('doc.pendiente') : v.toFixed(2));
  const datos = [
    { label: t('doc.estudiante'), value: estudiante.nombre },
    { label: t('doc.nie'), value: String(estudiante.nie) },
    { label: t('doc.gradoSeccion'), value: `${estudiante.grado}° ${estudiante.seccion}` },
    { label: t('doc.especialidad'), value: estudiante.especialidad },
  ];
  const columnas = [t('doc.materia'), t('doc.act1'), t('doc.act2'), t('doc.examen'), t('doc.promedio'), t('doc.riesgo')];
  const filas = materias.map((m) => [m.materia, nota(m.act1), nota(m.act2), nota(m.examen), nota(m.promedio), t(m.riesgo_academico ? 'doc.si' : 'doc.no')]);
  const subtitulos = [
    t('doc.cicloPeriodo', { anio: boleta.anio, numero: boleta.numeroPeriodo }),
    t('doc.emitido', { fecha: formatFecha(hoyISO(), locale) }),
  ];
  const firmas = [t('doc.firmaDocente'), t('doc.firmaDireccion')];
  const documento: DocumentoPdfDatos = {
    institucion: t('doc.institucion'),
    lema: tUi('tagline'),
    titulo: t('doc.tituloBoleta'),
    subtitulos,
    datos,
    tabla: { columnas, filas, vacio: t('doc.sinMaterias') },
    firmas,
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 print:max-w-none print:p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/dashboard/boletas?ciclo=${ciclo}&periodo=${periodo}`} className="text-sm text-intess hover:underline dark:text-intess-accent">
          ← {t('volver')}
        </Link>
        <DescargarPdfBoton
          documento={documento}
          fileName={`Boleta_${estudiante.nie}_${boleta.anio}_P${boleta.numeroPeriodo}.pdf`}
          label={t('descargarPdf')}
          pendingLabel={t('generandoPdf')}
          errorLabel={t('errorPdf')}
        />
      </div>

      <article className="mt-6 rounded-xl border border-slate-200 bg-white p-10 text-sm leading-relaxed text-black print:mt-0 print:rounded-none print:border-0 print:p-0">
        <header className="border-b border-slate-300 pb-4 text-center">
          <p className="text-base font-bold uppercase tracking-wide">{t('doc.institucion')}</p>
          <p className="text-xs text-slate-600">{tUi('tagline')}</p>
          <h1 className="mt-4 text-lg font-bold uppercase">{t('doc.tituloBoleta')}</h1>
          <p className="text-xs text-slate-600">{t('doc.cicloPeriodo', { anio: boleta.anio, numero: boleta.numeroPeriodo })}</p>
          <p className="text-xs text-slate-600">{t('doc.emitido', { fecha: formatFecha(hoyISO(), locale) })}</p>
        </header>

        <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 rounded-md border border-slate-300 p-4">
          {datos.map((d) => (
            <div key={d.label}>
              <dt className="text-xs font-semibold uppercase text-slate-600">{d.label}</dt>
              <dd className="font-medium">{d.value}</dd>
            </div>
          ))}
        </dl>

        <table className="mt-6 w-full text-left">
          <thead>
            <tr className="border-y border-slate-300 text-xs uppercase text-slate-600">
              {columnas.map((c, i) => (
                <th key={c} scope="col" className={`px-2 py-2 font-semibold ${i ? 'text-center' : ''}`}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {materias.map((m) => (
              <tr key={m.cod_materia} className="border-b border-slate-200">
                <td className="px-2 py-2 font-medium">{m.materia}</td>
                <td className="px-2 py-2 text-center tabular-nums">{nota(m.act1)}</td>
                <td className="px-2 py-2 text-center tabular-nums">{nota(m.act2)}</td>
                <td className="px-2 py-2 text-center tabular-nums">{nota(m.examen)}</td>
                <td className="px-2 py-2 text-center font-bold tabular-nums">{nota(m.promedio)}</td>
                <td className="px-2 py-2 text-center">{t(m.riesgo_academico ? 'doc.si' : 'doc.no')}</td>
              </tr>
            ))}
            {materias.length === 0 && (
              <tr>
                <td colSpan={columnas.length} className="px-2 py-8 text-center text-slate-600">{t('doc.sinMaterias')}</td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="mt-16 grid grid-cols-2 gap-10 text-center text-xs">
          <div>
            <div className="border-t border-black pt-2">{t('doc.firmaDocente')}</div>
          </div>
          <div>
            <div className="border-t border-black pt-2">{t('doc.firmaDireccion')}</div>
          </div>
        </div>
      </article>
    </div>
  );
}
