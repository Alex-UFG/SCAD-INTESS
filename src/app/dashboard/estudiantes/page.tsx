import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { getEstudiantes } from '@/app/actions/estudiantes';
import { requirePermiso } from '@/lib/session';
import { nombreCompleto } from '@/lib/format';
import type { EstadoEstudiante } from '@/types/persona';
import { EstadoEstudianteBadge } from '@/components/ui/estado-badge';
import { DataTable, type DataTableRow } from '@/components/ui/data-table';

export const dynamic = 'force-dynamic';

const ESTADOS: EstadoEstudiante[] = ['Activo', 'Inactivo', 'Retirado', 'Egresado'];
type Params = Record<string, string | string[] | undefined>;

export default async function EstudiantesPage({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const estadoParam = (Array.isArray(sp.estado) ? sp.estado[0] : sp.estado) as EstadoEstudiante | undefined;
  const estado = estadoParam && ESTADOS.includes(estadoParam) ? estadoParam : undefined;

  const [t, estudiantes, puedeCrear] = await Promise.all([
    getTranslations('estudiantes'),
    getEstudiantes(estado ? { estado } : undefined),
    requirePermiso('matricula.crear'),
  ]);

  const rows: DataTableRow[] = estudiantes.map((est) => ({
    key: String(est.nie),
    cells: [
      est.nie,
      nombreCompleto(est),
      <EstadoEstudianteBadge key="e" estado={est.estado} />,
      <Link key="v" href={`/dashboard/estudiantes/${est.nie}`} className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium hover:underline">
        {t('verExpediente')}
      </Link>,
    ],
    sort: [est.nie, nombreCompleto(est), est.estado, null],
    search: `${est.nie} ${nombreCompleto(est)} ${est.estado}`,
  }));

  const filtro = (
    <div className="flex flex-wrap gap-1">
      <Link href="/dashboard/estudiantes" className={`rounded-full px-3 py-1 text-xs font-medium ${!estado ? 'bg-blue-600 text-white' : 'border border-gray-300 text-gray-600 dark:border-gray-700 dark:text-gray-300'}`}>
        {t('todos')}
      </Link>
      {ESTADOS.map((e) => (
        <Link key={e} href={`/dashboard/estudiantes?estado=${e}`} className={`rounded-full px-3 py-1 text-xs font-medium ${estado === e ? 'bg-blue-600 text-white' : 'border border-gray-300 text-gray-600 dark:border-gray-700 dark:text-gray-300'}`}>
          {t(`estados.${e}`)}
        </Link>
      ))}
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{t('title')}</h1>
        {puedeCrear && (
          <Link href="/dashboard/estudiantes/nuevo" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
            {t('new')}
          </Link>
        )}
      </div>

      <DataTable
        columns={[
          { header: t('colNie'), sortable: true },
          { header: t('colNombre'), sortable: true },
          { header: t('colEstado'), sortable: true },
          { header: t('colAcciones') },
        ]}
        rows={rows}
        emptyText={t('empty')}
        toolbar={filtro}
        defaultSort={{ column: 1, dir: 'asc' }}
      />
    </div>
  );
}
