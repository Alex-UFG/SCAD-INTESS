import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getDetalleAsistencia } from '@/app/actions/asistencia';
import { getCiclos } from '@/app/actions/ciclos';
import { getEstudiantePorNie } from '@/app/actions/estudiantes';
import { requirePermiso } from '@/lib/permisos';
import { nombreCompleto } from '@/lib/format';
import { UMBRAL_INASISTENCIA, porcentajeAsistencia, type EstadoAsistencia } from '@/lib/asistencia';
import { Badge, type Tono } from '@/components/ui/badge';
import { RowsTable, type RowsTableRow } from '@/components/ui/rows-table';

export const dynamic = 'force-dynamic';

const TONO_ESTADO: Record<EstadoAsistencia, Tono> = {
  Presente: 'verde',
  Ausente: 'rojo',
  Tardanza: 'amarillo',
  Justificado: 'azul',
};

export default async function DetalleAsistenciaPage({
  params,
  searchParams,
}: {
  params: Promise<{ nie: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ nie: nieParam }, sp] = await Promise.all([params, searchParams]);
  if (!(await requirePermiso('asistencia.ver'))) redirect('/dashboard');
  if (!/^\d+$/.test(nieParam)) notFound();
  const nie = Number(nieParam);

  const [t, tEstados, ciclos, estudiante] = await Promise.all([
    getTranslations('asistencia'),
    getTranslations('paseLista.estados'),
    getCiclos(),
    getEstudiantePorNie(nie),
  ]);
  if (!estudiante) notFound();

  const cicloParam = Number(Array.isArray(sp.ciclo) ? sp.ciclo[0] : sp.ciclo);
  const ciclo = ciclos.find((c) => c.id_ciclo === cicloParam) ?? ciclos.find((c) => c.estado === 'Activo') ?? ciclos[0];
  const detalle = ciclo ? await getDetalleAsistencia(nie, ciclo.id_ciclo) : [];

  const cuenta = (estado: string) => detalle.filter((d) => d.estado === estado).length;
  const totales = { presentes: cuenta('Presente'), tardanzas: cuenta('Tardanza'), justificados: cuenta('Justificado'), total: detalle.length };
  const porcentaje = porcentajeAsistencia(totales);

  const resumen = [
    { label: t('colTotal'), value: totales.total },
    { label: t('colPresentes'), value: totales.presentes },
    { label: t('colAusentes'), value: cuenta('Ausente') },
    { label: t('colTardanzas'), value: totales.tardanzas },
    { label: t('colJustificados'), value: totales.justificados },
  ];

  const rows: RowsTableRow[] = detalle.map((d, i) => ({
    key: String(i),
    cells: [d.fecha, d.materia, <Badge key="e" tono={TONO_ESTADO[d.estado]}>{tEstados(d.estado)}</Badge>, d.observacion ?? '—'],
    sort: [d.fecha, d.materia, d.estado, d.observacion],
    search: `${d.fecha} ${d.materia} ${tEstados(d.estado)} ${d.observacion ?? ''}`,
  }));

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <Link href={`/dashboard/asistencia${ciclo ? `?ciclo=${ciclo.id_ciclo}` : ''}`} className="text-sm text-blue-600 hover:underline dark:text-blue-400">
        ← {t('volver')}
      </Link>
      <h1 className="mt-2 text-xl font-bold text-intess-dark dark:text-slate-100">{nombreCompleto(estudiante)}</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        {t('detalleSubtitle', { nie, anio: ciclo?.anio ?? '' })}
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {resumen.map((r) => (
          <div key={r.label} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">{r.label}</p>
            <p className="mt-1.5 text-2xl font-bold tabular-nums text-intess-dark dark:text-slate-100">{r.value}</p>
          </div>
        ))}
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">{t('colPorcentaje')}</p>
          <p className="mt-1.5">
            {porcentaje === null ? '—' : <Badge tono={porcentaje < UMBRAL_INASISTENCIA ? 'rojo' : 'verde'}>{porcentaje}%</Badge>}
          </p>
        </div>
      </div>

      <div className="mt-6">
        <RowsTable
          columns={[
            { header: t('colFecha'), sortable: true },
            { header: t('colMateria'), sortable: true },
            { header: t('colEstado'), sortable: true },
            { header: t('colObservacion') },
          ]}
          rows={rows}
          emptyText={t('emptyDetalle')}
          defaultSort={{ column: 0, dir: 'desc' }}
        />
      </div>
    </div>
  );
}
