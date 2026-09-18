'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';

export interface DataTableColumn {
  header: string;
  sortable?: boolean;
  align?: 'left' | 'right' | 'center';
  /**Clase extra para la celda (ej. font-mono) */
  className?: string;
}

/**
 * Fila ya renderizada: las paginas de servidor construyen las celdas como JSX
 * (badges, links) y pasan valores planos para ordenar y buscar. Asi la tabla
 * es un client component sin recibir funciones desde el servidor.
 */
export interface DataTableRow {
  key: string;
  cells: ReactNode[];
  /**Un valor por columna, en el mismo orden; null va al final al ordenar */
  sort: (string | number | null)[];
  /**Texto sobre el que actua la busqueda (normalizado en minusculas) */
  search: string;
}

interface DataTableProps {
  columns: DataTableColumn[];
  rows: DataTableRow[];
  emptyText: string;
  pageSize?: number;
  searchable?: boolean;
  /**Ordenamiento inicial: indice de columna y direccion */
  defaultSort?: { column: number; dir: 'asc' | 'desc' };
  /**Contenido a la izquierda del buscador (filtros, contadores) */
  toolbar?: ReactNode;
}

const alignClass = { left: 'text-left', right: 'text-right', center: 'text-center' } as const;

function compare(a: string | number | null, b: string | number | null): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
}

export function DataTable({ columns, rows, emptyText, pageSize = 20, searchable = true, defaultSort, toolbar }: DataTableProps) {
  const t = useTranslations('common.table');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<{ column: number; dir: 'asc' | 'desc' } | null>(defaultSort ?? null);
  const [page, setPage] = useState(1);

  const filtradas = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q ? rows.filter((r) => r.search.toLowerCase().includes(q)) : rows;
    if (!sort) return base;
    const factor = sort.dir === 'asc' ? 1 : -1;
    return [...base].sort((a, b) => factor * compare(a.sort[sort.column], b.sort[sort.column]));
  }, [rows, query, sort]);

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / pageSize));
  const paginaActual = Math.min(page, totalPaginas);
  const inicio = (paginaActual - 1) * pageSize;
  const visibles = filtradas.slice(inicio, inicio + pageSize);

  const ordenarPor = (i: number) => {
    setPage(1);
    setSort((prev) => (prev?.column === i ? { column: i, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { column: i, dir: 'asc' }));
  };

  return (
    <div className="bg-white dark:bg-gray-900 shadow rounded-lg border border-gray-200 dark:border-gray-800">
      {(searchable || toolbar) && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex flex-wrap items-center gap-3">{toolbar}</div>
          {searchable && (
            <input
              type="search"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1); }}
              placeholder={t('search')}
              aria-label={t('search')}
              className="w-full sm:w-64 px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              {columns.map((c, i) => (
                <th
                  key={i}
                  aria-sort={c.sortable ? (sort?.column === i ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none') : undefined}
                  className={`p-4 font-semibold text-gray-700 dark:text-gray-200 text-sm ${alignClass[c.align ?? 'left']}`}
                >
                  {c.sortable ? (
                    <button
                      type="button"
                      onClick={() => ordenarPor(i)}
                      className="inline-flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400"
                    >
                      {c.header}
                      <span aria-hidden="true" className="text-xs text-gray-400">
                        {sort?.column === i ? (sort.dir === 'asc' ? '▲' : '▼') : '↕'}
                      </span>
                    </button>
                  ) : (
                    c.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibles.map((r) => (
              <tr key={r.key} className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                {r.cells.map((cell, i) => (
                  <td key={i} className={`p-4 text-sm text-gray-900 dark:text-gray-300 ${alignClass[columns[i]?.align ?? 'left']} ${columns[i]?.className ?? ''}`}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
            {visibles.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="p-8 text-center text-gray-500 dark:text-gray-400">
                  {query ? t('noResults') : emptyText}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {filtradas.length > pageSize && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-t border-gray-200 dark:border-gray-800 text-sm text-gray-600 dark:text-gray-400">
          <span>{t('range', { from: inicio + 1, to: Math.min(inicio + pageSize, filtradas.length), total: filtradas.length })}</span>
          <div className="flex items-center gap-2">
            <button type="button" disabled={paginaActual === 1} onClick={() => setPage(paginaActual - 1)} className="px-3 py-1 rounded-md border border-gray-300 dark:border-gray-700 disabled:opacity-40">
              {t('prev')}
            </button>
            <span>{t('pageOf', { page: paginaActual, total: totalPaginas })}</span>
            <button type="button" disabled={paginaActual === totalPaginas} onClick={() => setPage(paginaActual + 1)} className="px-3 py-1 rounded-md border border-gray-300 dark:border-gray-700 disabled:opacity-40">
              {t('next')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
