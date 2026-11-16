"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

interface Props {
  usuarios: { id_usuario: number; email: string; nombre: string | null }[];
  tablas: string[];
  acciones: string[];
  valores: { usuario: string; tabla: string; accion: string; desde: string; hasta: string };
}

const selectClass =
  "w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-700 focus:border-intess focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100";

export function FiltrosAuditoriaForm({ usuarios, tablas, acciones, valores }: Props) {
  const t = useTranslations("auditoria");
  const hayFiltros = Object.values(valores).some(Boolean);

  return (
    <form
      method="get"
      className="mt-6 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-6 dark:border-slate-700 dark:bg-slate-900"
    >
      <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
        {t("filtroUsuario")}
        <select name="usuario" defaultValue={valores.usuario} className={`mt-1 ${selectClass}`}>
          <option value="">{t("todos")}</option>
          {usuarios.map((u) => (
            <option key={u.id_usuario} value={u.id_usuario}>
              {u.nombre ? `${u.nombre} · ${u.email}` : u.email}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
        {t("filtroTabla")}
        <select name="tabla" defaultValue={valores.tabla} className={`mt-1 ${selectClass}`}>
          <option value="">{t("todas")}</option>
          {tablas.map((tb) => (
            <option key={tb} value={tb}>
              {tb}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
        {t("filtroAccion")}
        <select name="accion" defaultValue={valores.accion} className={`mt-1 ${selectClass}`}>
          <option value="">{t("todas")}</option>
          {acciones.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
        {t("filtroDesde")}
        <input type="date" name="desde" defaultValue={valores.desde} className={`mt-1 ${selectClass}`} />
      </label>
      <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
        {t("filtroHasta")}
        <input type="date" name="hasta" defaultValue={valores.hasta} className={`mt-1 ${selectClass}`} />
      </label>
      <div className="flex items-end gap-2">
        <button
          type="submit"
          className="rounded-full bg-intess px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-intess/85"
        >
          {t("filtrar")}
        </button>
        {hayFiltros && (
          <Link
            href="/dashboard/auditoria"
            className="rounded-full border border-slate-300 px-4 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {t("limpiar")}
          </Link>
        )}
      </div>
    </form>
  );
}
