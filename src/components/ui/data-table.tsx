'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';

export type SortDir = 'asc' | 'desc';

export interface Column<T> {
  key: string;
  header: ReactNode;
  sortable?: boolean;
  sortValue?: (row: T) => string | number | Date | null | undefined;
  render?: (row: T) => ReactNode;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  pageSize?: number;
  initialSort?: { key: string; dir: SortDir };
  searchText?: (row: T) => string;
  emptyMessage?: string;
  toolbar?: ReactNode;
}

const ALIGN: Record<NonNullable<Column<unknown>['align']>, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

function valorCelda<T>(row: T, col: Column<T>): unknown {
  if (col.sortValue) return col.sortValue(row);
  return (row as Record<string, unknown>)[col.key];
}

function comparar(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  pageSize = 10,
  initialSort,
  searchText,
  emptyMessage,
  toolbar,
}: DataTableProps<T>) {
  const t = useTranslations('common.table');
  const [sort, setSort] = useState<{ key: string; dir: SortDir } | null>(initialSort ?? null);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  const filtradas = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    if (!q || !searchText) return rows;
    return rows.filter((r) => searchText(r).toLocaleLowerCase().includes(q));
  }, [rows, query, searchText]);

  const ordenadas = useMemo(() => {
    if (!sort) return filtradas;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return filtradas;
    const factor = sort.dir === 'asc' ? 1 : -1;
    return [...filtradas].sort((a, b) => comparar(valorCelda(a, col), valorCelda(b, col)) * factor);
  }, [filtradas, sort, columns]);

  const totalPaginas = pageSize > 0 ? Math.max(1, Math.ceil(ordenadas.length / pageSize)) : 1;
  const paginaActual = Math.min(page, totalPaginas);
  const visibles =
    pageSize > 0
      ? ordenadas.slice((paginaActual - 1) * pageSize, paginaActual * pageSize)
      : ordenadas;

  function toggleSort(col: Column<T>) {
    if (!col.sortable) return;
    setSort((prev) =>
      prev?.key === col.key
        ? { key: col.key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key: col.key, dir: 'asc' }
    );
    setPage(1);
  }

  return (
    <div className="flex flex-col">
      {(searchText || toolbar) && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pb-3">
          {searchText ? (
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder={t('search')}
              aria-label={t('search')}
              className="w-full max-w-xs rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 placeholder:text-slate-400 focus:border-intess focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
          ) : (
            <span />
          )}
          {toolbar}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-y border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:text-slate-400">
              {columns.map((col) => {
                const activa = sort?.key === col.key;
                return (
                  <th
                    key={col.key}
                    scope="col"
                    aria-sort={activa ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                    className={`px-4 py-2.5 font-medium ${ALIGN[col.align ?? 'left']} ${col.className ?? ''}`}
                  >
                    {col.sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(col)}
                        className="inline-flex items-center gap-1 uppercase hover:text-intess dark:hover:text-intess-accent"
                      >
                        {col.header}
                        <span aria-hidden="true" className={activa ? 'text-intess dark:text-intess-accent' : 'text-slate-300 dark:text-slate-600'}>
                          {activa && sort.dir === 'desc' ? '▼' : '▲'}
                        </span>
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {visibles.map((row) => (
              <tr key={rowKey(row)} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3 text-slate-700 dark:text-slate-200 ${ALIGN[col.align ?? 'left']} ${col.className ?? ''}`}
                  >
                    {col.render ? col.render(row) : String(valorCelda(row, col) ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
            {visibles.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                  {emptyMessage ?? t('empty')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pageSize > 0 && ordenadas.length > pageSize && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
          <span>
            {t('summary', {
              from: (paginaActual - 1) * pageSize + 1,
              to: Math.min(paginaActual * pageSize, ordenadas.length),
              total: ordenadas.length,
            })}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={paginaActual <= 1}
              className="rounded-full border border-slate-300 px-3 py-1 font-medium text-slate-600 transition-colors hover:border-intess hover:text-intess disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:text-slate-300"
            >
              {t('prev')}
            </button>
            <span className="tabular-nums">
              {t('page', { page: paginaActual, total: totalPaginas })}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPaginas, p + 1))}
              disabled={paginaActual >= totalPaginas}
              className="rounded-full border border-slate-300 px-3 py-1 font-medium text-slate-600 transition-colors hover:border-intess hover:text-intess disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:text-slate-300"
            >
              {t('next')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
