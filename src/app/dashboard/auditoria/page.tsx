import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { getPermisosDeRol } from "@/lib/permisos";
import {
  ACCIONES_AUDITORIA,
  getAuditoria,
  getOpcionesAuditoria,
  type EntradaAuditoria,
} from "@/app/actions/auditoria";
import type { AccionAuditoria } from "@/lib/audit";
import { FiltrosAuditoriaForm } from "./filtros";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;
const FECHA_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const ACCION_BADGE: Record<AccionAuditoria, string> = {
  INSERT: "bg-aprobado-bg text-aprobado dark:bg-aprobado/15",
  UPDATE: "bg-riesgo-bg text-riesgo dark:bg-riesgo/15",
  DELETE: "bg-reprobado-bg text-reprobado dark:bg-reprobado/15",
  LOGIN: "bg-intess-light text-intess dark:bg-intess/20 dark:text-intess-accent",
  LOGOUT: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};

function primero(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

function Json({ valor }: { valor: unknown }) {
  if (valor === null || valor === undefined) {
    return <span className="text-slate-400">—</span>;
  }
  return (
    <pre className="max-h-48 overflow-auto rounded-md bg-slate-50 p-2 text-[11px] leading-snug text-slate-700 dark:bg-slate-800 dark:text-slate-200">
      {JSON.stringify(valor, null, 2)}
    </pre>
  );
}

export default async function AuditoriaPage({
  searchParams,
}: PageProps<"/dashboard/auditoria">) {
  const session = await auth();
  if (!session) redirect("/auth");
  const permisos = await getPermisosDeRol(session.user.rol);
  if (!permisos.has("auditoria.ver")) redirect("/dashboard");

  const sp = await searchParams;
  const [t, locale, opciones] = await Promise.all([
    getTranslations("auditoria"),
    getLocale(),
    getOpcionesAuditoria(),
  ]);

  const accionParam = primero(sp.accion);
  const desdeParam = primero(sp.desde);
  const hastaParam = primero(sp.hasta);
  const filtros = {
    idUsuario: Number(primero(sp.usuario)) || undefined,
    tabla: primero(sp.tabla) || undefined,
    accion: ACCIONES_AUDITORIA.includes(accionParam as AccionAuditoria)
      ? (accionParam as AccionAuditoria)
      : undefined,
    desde: desdeParam && FECHA_REGEX.test(desdeParam) ? desdeParam : undefined,
    hasta: hastaParam && FECHA_REGEX.test(hastaParam) ? hastaParam : undefined,
    page: Math.max(1, Number(primero(sp.page)) || 1),
    pageSize: PAGE_SIZE,
  };

  const { entradas, total } = await getAuditoria(filtros);
  const totalPaginas = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pagina = Math.min(filtros.page, totalPaginas);

  const fmt = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "medium" });

  function hrefPagina(p: number): string {
    const q = new URLSearchParams();
    if (filtros.idUsuario) q.set("usuario", String(filtros.idUsuario));
    if (filtros.tabla) q.set("tabla", filtros.tabla);
    if (filtros.accion) q.set("accion", filtros.accion);
    if (filtros.desde) q.set("desde", filtros.desde);
    if (filtros.hasta) q.set("hasta", filtros.hasta);
    q.set("page", String(p));
    return `/dashboard/auditoria?${q.toString()}`;
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-xl font-bold text-intess-dark dark:text-slate-100">
        {t("title")}
      </h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("subtitle")}</p>

      <FiltrosAuditoriaForm
        usuarios={opciones.usuarios}
        tablas={opciones.tablas}
        acciones={[...ACCIONES_AUDITORIA]}
        valores={{
          usuario: filtros.idUsuario ? String(filtros.idUsuario) : "",
          tabla: filtros.tabla ?? "",
          accion: filtros.accion ?? "",
          desde: filtros.desde ?? "",
          hasta: filtros.hasta ?? "",
        }}
      />

      <section className="mt-4 rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between px-5 pt-5">
          <h2 className="text-sm font-semibold text-intess-dark dark:text-slate-100">
            {t("resultados", { total })}
          </h2>
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-200 text-left text-sm">
            <thead>
              <tr className="border-y border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:text-slate-400">
                <th className="px-5 py-2.5 font-medium">{t("colFecha")}</th>
                <th className="px-3 py-2.5 font-medium">{t("colUsuario")}</th>
                <th className="px-3 py-2.5 font-medium">{t("colAccion")}</th>
                <th className="px-3 py-2.5 font-medium">{t("colTabla")}</th>
                <th className="px-3 py-2.5 font-medium">{t("colRegistro")}</th>
                <th className="px-3 py-2.5 font-medium">{t("colIp")}</th>
                <th className="px-5 py-2.5 text-right font-medium">{t("colDatos")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {entradas.map((e: EntradaAuditoria) => (
                <tr key={e.id_log} className="align-top">
                  <td className="whitespace-nowrap px-5 py-3 text-xs text-slate-500 dark:text-slate-400">
                    {fmt.format(e.fecha_hora)}
                  </td>
                  <td className="px-3 py-3">
                    <p className="font-medium text-slate-800 dark:text-slate-100">
                      {e.usuario_nombre ?? "—"}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{e.usuario_email}</p>
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${ACCION_BADGE[e.tipo_accion]}`}
                    >
                      {e.tipo_accion}
                    </span>
                  </td>
                  <td className="px-3 py-3 font-mono text-xs text-slate-700 dark:text-slate-200">
                    {e.tabla_afectada}
                  </td>
                  <td className="px-3 py-3 font-mono text-xs text-slate-700 dark:text-slate-200">
                    {e.id_registro}
                  </td>
                  <td className="px-3 py-3 font-mono text-xs text-slate-500 dark:text-slate-400">
                    {e.ip_origen}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {e.datos_anteriores == null && e.datos_nuevos == null ? (
                      <span className="text-xs text-slate-400">—</span>
                    ) : (
                      <details className="text-left">
                        <summary className="cursor-pointer text-xs font-medium text-intess hover:underline dark:text-intess-accent">
                          {t("verDatos")}
                        </summary>
                        <div className="mt-2 grid w-72 gap-2 sm:w-96">
                          {e.datos_anteriores != null && (
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                {t("antes")}
                              </p>
                              <Json valor={e.datos_anteriores} />
                            </div>
                          )}
                          {e.datos_nuevos != null && (
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                {t("despues")}
                              </p>
                              <Json valor={e.datos_nuevos} />
                            </div>
                          )}
                        </div>
                      </details>
                    )}
                  </td>
                </tr>
              ))}
              {entradas.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                    {t("empty")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {total > PAGE_SIZE && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <span>
              {t("rango", {
                from: (pagina - 1) * PAGE_SIZE + 1,
                to: Math.min(pagina * PAGE_SIZE, total),
                total,
              })}
            </span>
            <div className="flex items-center gap-2">
              <Link
                href={hrefPagina(pagina - 1)}
                aria-disabled={pagina <= 1}
                className={`rounded-full border border-slate-300 px-3 py-1 font-medium text-slate-600 transition-colors hover:border-intess hover:text-intess dark:border-slate-600 dark:text-slate-300 ${
                  pagina <= 1 ? "pointer-events-none opacity-40" : ""
                }`}
              >
                {t("anterior")}
              </Link>
              <span className="tabular-nums">
                {t("pagina", { page: pagina, total: totalPaginas })}
              </span>
              <Link
                href={hrefPagina(pagina + 1)}
                aria-disabled={pagina >= totalPaginas}
                className={`rounded-full border border-slate-300 px-3 py-1 font-medium text-slate-600 transition-colors hover:border-intess hover:text-intess dark:border-slate-600 dark:text-slate-300 ${
                  pagina >= totalPaginas ? "pointer-events-none opacity-40" : ""
                }`}
              >
                {t("siguiente")}
              </Link>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
