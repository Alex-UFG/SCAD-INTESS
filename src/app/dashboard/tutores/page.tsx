import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { getTutores } from '@/app/actions/tutores';
import { requirePermiso } from '@/lib/session';
import { nombreCompleto } from '@/lib/format';
import { DataTable, type DataTableRow } from '@/components/ui/data-table';

export const dynamic = 'force-dynamic';

export default async function TutoresPage() {
  const [t, tutores, puedeCrear] = await Promise.all([getTranslations('tutores'), getTutores(), requirePermiso('matricula.crear')]);

  const rows: DataTableRow[] = tutores.map((tutor) => ({
    key: tutor.dui_tutor,
    cells: [
      <span key="d" className="font-mono">{tutor.dui_tutor}</span>,
      nombreCompleto(tutor),
      <span key="c">
        <div>{tutor.telefono_principal}</div>
        {tutor.email && <div className="text-xs text-gray-500">{tutor.email}</div>}
      </span>,
      <Link key="v" href={`/dashboard/tutores/${tutor.dui_tutor}`} className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium hover:underline">
        {t('verFicha')}
      </Link>,
    ],
    sort: [tutor.dui_tutor, nombreCompleto(tutor), tutor.telefono_principal, null],
    search: `${tutor.dui_tutor} ${nombreCompleto(tutor)} ${tutor.telefono_principal} ${tutor.email ?? ''}`,
  }));

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{t('title')}</h1>
        {puedeCrear && (
          <Link href="/dashboard/tutores/nuevo" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
            {t('new')}
          </Link>
        )}
      </div>

      <DataTable
        columns={[
          { header: t('colDui'), sortable: true },
          { header: t('colNombre'), sortable: true },
          { header: t('colContacto') },
          { header: t('colAcciones') },
        ]}
        rows={rows}
        emptyText={t('empty')}
        defaultSort={{ column: 1, dir: 'asc' }}
      />
    </div>
  );
}
