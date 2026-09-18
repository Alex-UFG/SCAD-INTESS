import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import type { RowDataPacket } from 'mysql2';
import { db } from '@/lib/db';
import { getAuditoria } from '@/app/actions/auditoria';
import { TAMANO_PAGINA_AUDITORIA as TAMANO_PAGINA } from '@/lib/constantes';
import { inputClass } from '@/components/ui/form-field';

export const dynamic = 'force-dynamic';

const ACCIONES = ['INSERT', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT'];

const ACCION_BADGE: Record<string, string> = {
  INSERT: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  UPDATE: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  DELETE: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  LOGIN: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  LOGOUT: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

interface UsuarioRow extends RowDataPacket {
  id_usuario: number;
  email: string;
}

type Params = Record<string, string | string[] | undefined>;

function primero(v: string | string[] | undefined): string | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  return s ? s : undefined;
}

function Json({ value }: { value: unknown }) {
  if (value === null || value === undefined) return <span className="text-gray-400">—</span>;
  return (
    <pre className="max-w-md whitespace-pre-wrap break-all rounded bg-gray-50 p-2 text-[11px] text-gray-700 dark:bg-gray-800 dark:text-gray-300">
      {JSON.stringify(value, null, 1)}
    </pre>
  );
}

export default async function AuditoriaPage({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const filtro = {
    usuario: primero(sp.usuario),
    tabla: primero(sp.tabla),
    accion: primero(sp.accion) as 'INSERT' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | undefined,
    desde: primero(sp.desde),
    hasta: primero(sp.hasta),
    page: primero(sp.page) ?? '1',
  };

  const [t, locale, resultado] = await Promise.all([
    getTranslations('auditoria'),
    getLocale(),
    getAuditoria(filtro),
  ]);
  if (!resultado) redirect('/dashboard');

  const [usuarios] = await db.query<UsuarioRow[]>('SELECT id_usuario, email FROM usuario ORDER BY email');

  const fmt = new Intl.DateTimeFormat(locale, { dateStyle: 'short', timeStyle: 'medium' });

  const linkPagina = (page: number) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(filtro)) if (v && k !== 'page') q.set(k, v);
    q.set('page', String(page));
    return `/dashboard/auditoria?${q.toString()}`;
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="text-xl font-bold text-intess-dark dark:text-slate-100">{t('title')}</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('subtitle')}</p>

      <form method="get" className="mt-6 grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-6 dark:border-slate-700 dark:bg-slate-900">
        <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {t('usuario')}
          <select name="usuario" defaultValue={filtro.usuario ?? ''} className={`${inputClass} mt-1`}>
            <option value="">{t('todos')}</option>
            {usuarios.map((u) => (
              <option key={u.id_usuario} value={u.id_usuario}>{u.email}</option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {t('tabla')}
          <select name="tabla" defaultValue={filtro.tabla ?? ''} className={`${inputClass} mt-1`}>
            <option value="">{t('todas')}</option>
            {resultado.tablas.map((tb) => (
              <option key={tb} value={tb}>{tb}</option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {t('accion')}
          <select name="accion" defaultValue={filtro.accion ?? ''} className={`${inputClass} mt-1`}>
            <option value="">{t('todas')}</option>
            {ACCIONES.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {t('desde')}
          <input type="date" name="desde" defaultValue={filtro.desde ?? ''} className={`${inputClass} mt-1`} />
        </label>
        <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {t('hasta')}
          <input type="date" name="hasta" defaultValue={filtro.hasta ?? ''} className={`${inputClass} mt-1`} />
        </label>
        <div className="flex items-end gap-2">
          <button type="submit" className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            {t('filtrar')}
          </button>
          <Link href="/dashboard/auditoria" className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
            {t('limpiar')}
          </Link>
        </div>
      </form>

      <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
        {t('total', { total: resultado.total })}
      </p>

      <div className="mt-2 overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <table className="w-full min-w-200 text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:text-slate-400">
              <th className="px-4 py-2.5 font-medium">{t('colFecha')}</th>
              <th className="px-4 py-2.5 font-medium">{t('colUsuario')}</th>
              <th className="px-4 py-2.5 font-medium">{t('colTabla')}</th>
              <th className="px-4 py-2.5 font-medium">{t('colRegistro')}</th>
              <th className="px-4 py-2.5 font-medium">{t('colAccion')}</th>
              <th className="px-4 py-2.5 font-medium">{t('colIp')}</th>
              <th className="px-4 py-2.5 font-medium">{t('colDatos')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {resultado.rows.map((r) => (
              <tr key={r.id_log} className="align-top">
                <td className="whitespace-nowrap px-4 py-2 text-xs text-slate-600 dark:text-slate-300">{fmt.format(new Date(r.fecha_hora))}</td>
                <td className="px-4 py-2 text-xs text-slate-700 dark:text-slate-200">{r.email}</td>
                <td className="px-4 py-2 font-mono text-xs text-slate-700 dark:text-slate-200">{r.tabla_afectada}</td>
                <td className="px-4 py-2 font-mono text-xs text-slate-700 dark:text-slate-200">{r.id_registro}</td>
                <td className="px-4 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${ACCION_BADGE[r.tipo_accion]}`}>{r.tipo_accion}</span>
                </td>
                <td className="px-4 py-2 font-mono text-xs text-slate-500 dark:text-slate-400">{r.ip_origen}</td>
                <td className="px-4 py-2">
                  {r.datos_anteriores === null && r.datos_nuevos === null ? (
                    <span className="text-xs text-slate-400">—</span>
                  ) : (
                    <details>
                      <summary className="cursor-pointer text-xs font-medium text-blue-600 dark:text-blue-400">{t('verDatos')}</summary>
                      <div className="mt-2 grid gap-2 md:grid-cols-2">
                        <div>
                          <p className="text-[10px] font-semibold uppercase text-slate-400">{t('antes')}</p>
                          <Json value={r.datos_anteriores} />
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold uppercase text-slate-400">{t('despues')}</p>
                          <Json value={r.datos_nuevos} />
                        </div>
                      </div>
                    </details>
                  )}
                </td>
              </tr>
            ))}
            {resultado.rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400">{t('empty')}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {resultado.totalPaginas > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
          <span>{t('pagina', { page: resultado.page, total: resultado.totalPaginas, size: TAMANO_PAGINA })}</span>
          <div className="flex gap-2">
            {resultado.page > 1 && (
              <Link href={linkPagina(resultado.page - 1)} className="rounded-md border border-slate-300 px-3 py-1 dark:border-slate-700">{t('anterior')}</Link>
            )}
            {resultado.page < resultado.totalPaginas && (
              <Link href={linkPagina(resultado.page + 1)} className="rounded-md border border-slate-300 px-3 py-1 dark:border-slate-700">{t('siguiente')}</Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
