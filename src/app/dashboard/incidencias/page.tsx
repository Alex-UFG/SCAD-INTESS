import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getIncidencias } from '@/app/actions/incidencias';
import { accesoDisciplina } from '@/lib/acceso-disciplina';
import { ESTADOS_INCIDENCIA, TIPOS_FALTA, type EstadoIncidencia, type TipoFalta } from '@/lib/disciplina';
import { inputClass, submitButtonClass } from '@/components/ui/form-field';
import { Badge, TONO_FALTA, TONO_INCIDENCIA } from '@/components/ui/badge';
import { RowsTable, type RowsTableRow } from '@/components/ui/rows-table';

export const dynamic = 'force-dynamic';

type Params = Record<string, string | string[] | undefined>;

const primero = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function IncidenciasPage({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const acceso = await accesoDisciplina();
  if (!acceso || (!acceso.ver && !acceso.reportar)) redirect('/dashboard');

  const estado = ESTADOS_INCIDENCIA.find((e) => e === primero(sp.estado)) as EstadoIncidencia | undefined;
  const tipo = TIPOS_FALTA.find((x) => x === primero(sp.tipo)) as TipoFalta | undefined;
  const nieParam = primero(sp.nie);
  const nie = nieParam && /^\d+$/.test(nieParam) ? Number(nieParam) : undefined;

  const [t, incidencias] = await Promise.all([getTranslations('incidencias'), getIncidencias({ estado, tipo, nie })]);

  const rows: RowsTableRow[] = incidencias.map((i) => ({
    key: String(i.id_incidencia),
    cells: [
      i.fecha,
      <Link key="e" href={`/dashboard/incidencias/${i.id_incidencia}`} className="font-medium text-intess hover:underline dark:text-intess-accent">
        {i.estudiante}
      </Link>,
      <span key="t" className="flex flex-wrap items-center gap-1.5">
        <Badge tono={TONO_FALTA[i.tipo_falta]}>{t(`tipos.${i.tipo_falta}`)}</Badge>
        {i.escalada_auto && <Badge tono="gris">{t('escalada')}</Badge>}
      </span>,
      <Badge key="s" tono={TONO_INCIDENCIA[i.estado]}>{t(`estados.${i.estado}`)}</Badge>,
      t('periodoN', { numero: i.periodo, anio: i.anio }),
      i.reportante ?? '—',
    ],
    sort: [i.fecha, i.estudiante, i.tipo_falta, i.estado, i.anio * 10 + i.periodo, i.reportante],
    search: `${i.nie} ${i.estudiante} ${t(`tipos.${i.tipo_falta}`)} ${t(`estados.${i.estado}`)} ${i.reportante ?? ''} ${i.fecha}`,
  }));

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-intess-dark dark:text-slate-100">{t('title')}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{acceso.ver ? t('subtitle') : t('subtitlePropias')}</p>
        </div>
        {acceso.reportar && (
          <Link href="/dashboard/incidencias/nueva" className="rounded-md bg-intess px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-intess/85">
            {t('nueva')}
          </Link>
        )}
      </div>

      <form method="get" className="mt-6 flex flex-wrap items-end gap-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        {nie && <input type="hidden" name="nie" value={nie} />}
        <div className="space-y-2">
          <label htmlFor="estado" className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('colEstado')}</label>
          <select id="estado" name="estado" defaultValue={estado ?? ''} className={inputClass}>
            <option value="">{t('todosEstados')}</option>
            {ESTADOS_INCIDENCIA.map((e) => (
              <option key={e} value={e}>{t(`estados.${e}`)}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label htmlFor="tipo" className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('colTipo')}</label>
          <select id="tipo" name="tipo" defaultValue={tipo ?? ''} className={inputClass}>
            <option value="">{t('todosTipos')}</option>
            {TIPOS_FALTA.map((x) => (
              <option key={x} value={x}>{t(`tipos.${x}`)}</option>
            ))}
          </select>
        </div>
        <button type="submit" className={submitButtonClass}>{t('filtrar')}</button>
        {nie && (
          <Link href="/dashboard/incidencias" className="py-2 text-sm font-medium text-intess hover:underline dark:text-intess-accent">
            {t('quitarFiltroEstudiante', { nie })}
          </Link>
        )}
      </form>

      <div className="mt-6">
        <RowsTable
          columns={[
            { header: t('colFecha'), sortable: true },
            { header: t('colEstudiante'), sortable: true },
            { header: t('colTipo'), sortable: true },
            { header: t('colEstado'), sortable: true },
            { header: t('colPeriodo'), sortable: true },
            { header: t('colReportante'), sortable: true },
          ]}
          rows={rows}
          emptyText={t('empty')}
          defaultSort={{ column: 0, dir: 'desc' }}
        />
      </div>
    </div>
  );
}
