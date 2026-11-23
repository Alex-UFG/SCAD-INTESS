import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getCitaciones } from '@/app/actions/citaciones';
import { accesoDisciplina } from '@/lib/acceso-disciplina';
import { ESTADOS_CITACION, type EstadoCitacion } from '@/lib/disciplina';
import { inputClass, submitButtonClass } from '@/components/ui/form-field';
import { Badge, TONO_CITACION } from '@/components/ui/badge';
import { RowsTable, type RowsTableRow } from '@/components/ui/rows-table';
import { CitacionAcciones } from '@/components/disciplina/citacion-acciones';

export const dynamic = 'force-dynamic';

export default async function CitacionesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const acceso = await accesoDisciplina();
  if (!acceso || (!acceso.ver && !acceso.citar)) redirect('/dashboard');

  const estadoParam = Array.isArray(sp.estado) ? sp.estado[0] : sp.estado;
  const estado = ESTADOS_CITACION.find((e) => e === estadoParam) as EstadoCitacion | undefined;

  const [t, citaciones] = await Promise.all([getTranslations('citaciones'), getCitaciones({ estado })]);

  const rows: RowsTableRow[] = citaciones.map((c) => ({
    key: String(c.id_citacion),
    cells: [
      c.fecha_citacion,
      <Link key="e" href={`/dashboard/incidencias/${c.id_incidencia}`} className="font-medium text-intess hover:underline dark:text-intess-accent">
        {c.estudiante}
      </Link>,
      <span key="t">
        <span className="block">{c.tutor}</span>
        <span className="block text-xs text-slate-500 dark:text-slate-400">{c.telefono}</span>
      </span>,
      <Badge key="s" tono={TONO_CITACION[c.estado]}>{t(`estados.${c.estado}`)}</Badge>,
      c.fecha_emision.slice(0, 10),
      <CitacionAcciones key="a" idCitacion={c.id_citacion} estado={c.estado} puedeGestionar={acceso.citar} />,
    ],
    sort: [c.fecha_citacion, c.estudiante, c.tutor, c.estado, c.fecha_emision, null],
    search: `${c.nie} ${c.estudiante} ${c.tutor} ${c.dui_tutor} ${c.telefono} ${t(`estados.${c.estado}`)} ${c.fecha_citacion}`,
  }));

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-xl font-bold text-intess-dark dark:text-slate-100">{t('title')}</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('subtitle')}</p>

      <form method="get" className="mt-6 flex flex-wrap items-end gap-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="space-y-2">
          <label htmlFor="estado" className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('colEstado')}</label>
          <select id="estado" name="estado" defaultValue={estado ?? ''} className={inputClass}>
            <option value="">{t('todosEstados')}</option>
            {ESTADOS_CITACION.map((e) => (
              <option key={e} value={e}>{t(`estados.${e}`)}</option>
            ))}
          </select>
        </div>
        <button type="submit" className={submitButtonClass}>{t('filtrar')}</button>
      </form>

      <div className="mt-6">
        <RowsTable
          columns={[
            { header: t('colReunion'), sortable: true },
            { header: t('colEstudiante'), sortable: true },
            { header: t('colTutor'), sortable: true },
            { header: t('colEstado'), sortable: true },
            { header: t('colEmitida'), sortable: true },
            { header: t('colAcciones') },
          ]}
          rows={rows}
          emptyText={t('empty')}
          defaultSort={{ column: 0, dir: 'desc' }}
        />
      </div>
    </div>
  );
}
