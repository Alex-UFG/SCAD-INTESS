import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { getCiclos } from '@/app/actions/ciclos';
import { requirePermiso } from '@/lib/session';
import { formatFecha } from '@/lib/format';
import { DataTable, type DataTableRow } from '@/components/ui/data-table';
import { Badge, TONO_CICLO } from '@/components/ui/badge';
import { FormCiclo } from './form-ciclo';

export const dynamic = 'force-dynamic';

export default async function CiclosPage() {
  const [t, locale, ciclos, puedeEditar] = await Promise.all([
    getTranslations('ciclos'),
    getLocale(),
    getCiclos(),
    requirePermiso('config.ciclos'),
  ]);

  const rows: DataTableRow[] = ciclos.map((c) => ({
    key: String(c.id_ciclo),
    cells: [
      <Link key="a" href={`/dashboard/ciclos/${c.id_ciclo}`} className="font-medium text-blue-600 hover:underline dark:text-blue-400">{c.anio}</Link>,
      formatFecha(c.fecha_inicio, locale),
      formatFecha(c.fecha_fin, locale),
      <Badge key="e" tono={TONO_CICLO[c.estado]}>{t(`estados.${c.estado}`)}</Badge>,
      c.secciones,
      <Link key="v" href={`/dashboard/ciclos/${c.id_ciclo}`} className="text-blue-600 hover:underline dark:text-blue-400">{t('verDetalle')}</Link>,
    ],
    sort: [c.anio, c.fecha_inicio, c.fecha_fin, c.estado, c.secciones, null],
    search: `${c.anio} ${c.estado}`,
  }));

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{t('title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('subtitle')}</p>
        </div>
        {puedeEditar && <FormCiclo />}
      </div>

      <DataTable
        columns={[
          { header: t('colAnio'), sortable: true },
          { header: t('colInicio'), sortable: true },
          { header: t('colFin'), sortable: true },
          { header: t('colEstado'), sortable: true },
          { header: t('colSecciones'), sortable: true, align: 'right' },
          { header: t('colAcciones') },
        ]}
        rows={rows}
        emptyText={t('empty')}
        searchable={false}
        defaultSort={{ column: 0, dir: 'desc' }}
      />
    </div>
  );
}
