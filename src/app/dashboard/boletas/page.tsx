import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getEstudiantesReporte } from '@/app/actions/boletas';
import { getCiclos, getPeriodos } from '@/app/actions/ciclos';
import { requirePermiso, tienePermiso } from '@/lib/permisos';
import { inputClass, submitButtonClass } from '@/components/ui/form-field';
import { RowsTable, type RowsTableRow } from '@/components/ui/rows-table';

export const dynamic = 'force-dynamic';

type Params = Record<string, string | string[] | undefined>;

const primero = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const linkClass = 'text-intess hover:underline dark:text-intess-accent';

export default async function BoletasPage({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  if (!(await requirePermiso('reportes.boleta'))) redirect('/dashboard');

  const [t, tCiclos, ciclos, puedeConstancia] = await Promise.all([
    getTranslations('boletas'),
    getTranslations('ciclos'),
    getCiclos(),
    tienePermiso('reportes.constancia'),
  ]);
  const ciclo = ciclos.find((c) => c.id_ciclo === Number(primero(sp.ciclo))) ?? ciclos.find((c) => c.estado === 'Activo') ?? ciclos[0];
  const [periodos, estudiantes] = ciclo ? await Promise.all([getPeriodos(ciclo.id_ciclo), getEstudiantesReporte(ciclo.id_ciclo)]) : [[], []];
  const periodo =
    periodos.find((p) => p.id_periodo === Number(primero(sp.periodo))) ?? periodos.find((p) => p.estado === 'Abierto') ?? periodos[0];

  const rows: RowsTableRow[] = estudiantes.map((e) => ({
    key: String(e.nie),
    cells: [
      e.nie,
      e.nombre,
      `${e.grado}° ${e.seccion}`,
      e.especialidad,
      <span key="d" className="flex flex-wrap gap-x-4 gap-y-1">
        {periodo && (
          <Link href={`/dashboard/boletas/${e.nie}?ciclo=${ciclo.id_ciclo}&periodo=${periodo.id_periodo}`} className={linkClass}>
            {t('verBoleta')}
          </Link>
        )}
        {puedeConstancia && (
          <Link href={`/dashboard/boletas/${e.nie}/constancia?ciclo=${ciclo.id_ciclo}`} className={linkClass}>
            {t('verConstancia')}
          </Link>
        )}
      </span>,
    ],
    sort: [e.nie, e.nombre, `${e.grado} ${e.seccion}`, e.especialidad, null],
    search: `${e.nie} ${e.nombre} ${e.grado}° ${e.seccion} ${e.especialidad}`,
  }));

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-xl font-bold text-intess-dark dark:text-slate-100">{t('title')}</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('subtitle')}</p>

      <form method="get" className="mt-6 flex flex-wrap items-end gap-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="space-y-2">
          <label htmlFor="ciclo" className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('ciclo')}</label>
          <select id="ciclo" name="ciclo" defaultValue={ciclo?.id_ciclo ?? ''} className={inputClass}>
            {ciclos.map((c) => (
              <option key={c.id_ciclo} value={c.id_ciclo}>{c.anio} ({tCiclos(`estados.${c.estado}`)})</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label htmlFor="periodo" className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('periodo')}</label>
          <select id="periodo" name="periodo" defaultValue={periodo?.id_periodo ?? ''} className={inputClass}>
            {periodos.map((p) => (
              <option key={p.id_periodo} value={p.id_periodo}>
                {tCiclos('periodoN', { numero: p.numero })} ({tCiclos(`estadosPeriodo.${p.estado}`)})
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className={submitButtonClass}>{t('ver')}</button>
      </form>

      <div className="mt-6">
        <RowsTable
          columns={[
            { header: t('colNie'), sortable: true, className: 'font-mono' },
            { header: t('colEstudiante'), sortable: true },
            { header: t('colSeccion'), sortable: true },
            { header: t('colEspecialidad'), sortable: true },
            { header: t('colDocumentos') },
          ]}
          rows={rows}
          emptyText={t('empty')}
        />
      </div>
    </div>
  );
}
