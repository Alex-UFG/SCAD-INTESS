'use client';

import { useMemo, type ReactNode } from 'react';
import { DataTable, type Column } from '@/components/ui/data-table';

export interface RowsTableColumn {
  header: string;
  sortable?: boolean;
  align?: 'left' | 'right' | 'center';
  /**Clase extra para la celda (ej. font-mono) */
  className?: string;
}

/**
 * Fila ya renderizada: las paginas de servidor construyen las celdas como JSX
 * (badges, links) y pasan valores planos para ordenar y buscar. Asi una pagina
 * de servidor usa DataTable sin pasarle funciones (render, rowKey), que no
 * cruzan la frontera servidor/cliente.
 */
export interface RowsTableRow {
  key: string;
  cells: ReactNode[];
  /**Un valor por columna, en el mismo orden; null va al final al ordenar */
  sort: (string | number | null)[];
  /**Texto sobre el que actua la busqueda */
  search: string;
}

interface RowsTableProps {
  columns: RowsTableColumn[];
  rows: RowsTableRow[];
  emptyText: string;
  pageSize?: number;
  searchable?: boolean;
  /**Ordenamiento inicial: indice de columna y direccion */
  defaultSort?: { column: number; dir: 'asc' | 'desc' };
  /**Contenido junto al buscador (filtros, contadores) */
  toolbar?: ReactNode;
}

const rowKey = (r: RowsTableRow) => r.key;
const searchText = (r: RowsTableRow) => r.search;

/**Adaptador de DataTable (kit compartido) para paginas de servidor */
export function RowsTable({ columns, rows, emptyText, pageSize = 20, searchable = true, defaultSort, toolbar }: RowsTableProps) {
  const cols = useMemo<Column<RowsTableRow>[]>(
    () =>
      columns.map((c, i) => ({
        key: String(i),
        header: c.header,
        sortable: c.sortable,
        align: c.align,
        className: c.className,
        sortValue: (r) => r.sort[i],
        render: (r) => r.cells[i],
      })),
    [columns]
  );

  return (
    <section
      className={`overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 ${
        searchable || toolbar ? 'pt-4' : ''
      }`}
    >
      <DataTable
        columns={cols}
        rows={rows}
        rowKey={rowKey}
        pageSize={pageSize}
        initialSort={defaultSort ? { key: String(defaultSort.column), dir: defaultSort.dir } : undefined}
        searchText={searchable ? searchText : undefined}
        emptyMessage={emptyText}
        toolbar={toolbar}
      />
    </section>
  );
}
