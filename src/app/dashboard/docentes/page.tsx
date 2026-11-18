import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { getDocentes } from '@/app/actions/docentes';
import { nombreCompleto } from '@/lib/format';
import { RowsTable, type RowsTableRow } from '@/components/ui/rows-table';
import { Badge, TONO_DOCENTE } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

export default async function DocentesPage() {
  const [t, docentes] = await Promise.all([getTranslations('docentes'), getDocentes()]);

  const rows: RowsTableRow[] = docentes.map((d) => ({
    key: d.dui_docente,
    cells: [
      <span key="d" className="font-mono">{d.dui_docente}</span>,
      <Link key="n" href={`/dashboard/docentes/${d.dui_docente}`} className="font-medium text-intess hover:underline dark:text-intess-accent">{nombreCompleto(d)}</Link>,
      d.especialidad_nombre ?? '—',
      d.email,
      <Badge key="e" tono={TONO_DOCENTE[d.estado]}>{t(`estados.${d.estado}`)}</Badge>,
      d.cargas,
    ],
    sort: [d.dui_docente, nombreCompleto(d), d.especialidad_nombre, d.email, d.estado, d.cargas],
    search: `${d.dui_docente} ${nombreCompleto(d)} ${d.especialidad_nombre ?? ''} ${d.email} ${d.estado}`,
  }));

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-intess-dark dark:text-slate-100">{t('listaTitle')}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">{t('listaSubtitle')}</p>
      </div>
      <RowsTable
        columns={[
          { header: t('colDui'), sortable: true },
          { header: t('colNombre'), sortable: true },
          { header: t('colEspecialidad'), sortable: true },
          { header: t('colEmail'), sortable: true },
          { header: t('colEstado'), sortable: true },
          { header: t('colCargas'), sortable: true, align: 'right' },
        ]}
        rows={rows}
        emptyText={t('listaEmpty')}
        defaultSort={{ column: 1, dir: 'asc' }}
      />
    </div>
  );
}
