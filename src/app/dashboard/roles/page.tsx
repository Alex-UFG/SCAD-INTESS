import { Fragment } from "react";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import type { RowDataPacket } from "mysql2";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { togglePermisoAction } from "@/app/actions/admin";

interface RolRow extends RowDataPacket {
  id_rol: number;
  nombre: string;
  descripcion: string | null;
}

interface PermisoRow extends RowDataPacket {
  id_permiso: number;
  codigo: string;
  descripcion: string | null;
  modulo: string;
}

interface RolPermisoRow extends RowDataPacket {
  id_rol: number;
  id_permiso: number;
}

export default async function RolesPage() {
  const session = await auth();
  if (!session) redirect("/auth");
  if (session.user.rol !== 1) redirect("/dashboard");

  const t = await getTranslations("roles");

  const [[roles], [permisos], [asignaciones]] = await Promise.all([
    db.query<RolRow[]>(
      "SELECT id_rol, nombre, descripcion FROM rol ORDER BY id_rol"
    ),
    db.query<PermisoRow[]>(
      "SELECT id_permiso, codigo, descripcion, modulo FROM permiso ORDER BY modulo, codigo"
    ),
    db.query<RolPermisoRow[]>("SELECT id_rol, id_permiso FROM rol_permiso"),
  ]);

  const concedidos = new Set(
    asignaciones.map((a) => `${a.id_rol}:${a.id_permiso}`)
  );

  const modulos = [...new Set(permisos.map((p) => p.modulo))];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-xl font-bold text-intess-dark dark:text-slate-100">
        {t("title")}
      </h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        {t("subtitle")}
      </p>

      {/* Tarjetas de rol (solo escritorio; en movil la descripcion va en el acordeon) */}
      <div className="mt-6 hidden gap-3 lg:grid lg:grid-cols-5">
        {roles.map((r) => (
          <div
            key={r.id_rol}
            className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
          >
            <p className="text-sm font-semibold text-intess-dark dark:text-slate-100">
              {r.nombre}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              {r.descripcion}
            </p>
          </div>
        ))}
      </div>

      {/* Movil: acordeon por rol */}
      <section className="mt-6 space-y-3 lg:hidden">
        {roles.map((r) => {
          const esAdmin = r.id_rol === 1;
          const totalRol = esAdmin
            ? permisos.length
            : permisos.filter((p) => concedidos.has(`${r.id_rol}:${p.id_permiso}`))
                .length;
          return (
            <details
              key={r.id_rol}
              className="group rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 [&::-webkit-details-marker]:hidden">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-intess-dark dark:text-slate-100">
                    {r.nombre}
                  </p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {r.descripcion}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="rounded-full bg-intess-light px-2.5 py-0.5 text-xs font-semibold tabular-nums text-intess dark:bg-intess/20 dark:text-intess-accent">
                    {totalRol}/{permisos.length}
                  </span>
                  <svg
                    aria-hidden="true"
                    className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-180"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </div>
              </summary>
              <div className="border-t border-slate-100 px-4 pb-4 dark:border-slate-800">
                {esAdmin && (
                  <p className="mt-3 rounded-lg bg-intess-light px-3 py-2 text-xs text-intess dark:bg-intess/15 dark:text-intess-accent">
                    {t("adminLocked")}
                  </p>
                )}
                {modulos.map((modulo) => (
                  <div key={modulo}>
                    <p className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      {modulo}
                    </p>
                    <ul className="mt-1.5 space-y-1">
                      {permisos
                        .filter((p) => p.modulo === modulo)
                        .map((p) => {
                          const tiene =
                            esAdmin ||
                            concedidos.has(`${r.id_rol}:${p.id_permiso}`);
                          return (
                            <li
                              key={p.id_permiso}
                              className="flex items-center justify-between gap-3"
                            >
                              <div className="min-w-0">
                                <p className="truncate font-mono text-xs text-slate-700 dark:text-slate-200">
                                  {p.codigo}
                                </p>
                                <p className="truncate text-xs text-slate-400 dark:text-slate-500">
                                  {p.descripcion}
                                </p>
                              </div>
                              {esAdmin ? (
                                <span
                                  aria-label={t("adminLocked")}
                                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-intess/10 text-xs text-intess dark:bg-intess/25 dark:text-intess-accent"
                                >
                                  ●
                                </span>
                              ) : (
                                <form action={togglePermisoAction} className="shrink-0">
                                  <input type="hidden" name="id_rol" value={r.id_rol} />
                                  <input
                                    type="hidden"
                                    name="id_permiso"
                                    value={p.id_permiso}
                                  />
                                  <input
                                    type="hidden"
                                    name="conceder"
                                    value={tiene ? "0" : "1"}
                                  />
                                  <button
                                    type="submit"
                                    aria-pressed={tiene}
                                    title={p.codigo}
                                    className={`inline-flex h-7 w-7 items-center justify-center rounded-md border text-xs font-bold transition-colors ${
                                      tiene
                                        ? "border-intess bg-intess text-white hover:bg-intess/80"
                                        : "border-slate-300 text-transparent hover:border-intess hover:text-intess/40 dark:border-slate-600"
                                    }`}
                                  >
                                    ●
                                  </button>
                                </form>
                              )}
                            </li>
                          );
                        })}
                    </ul>
                  </div>
                ))}
              </div>
            </details>
          );
        })}
      </section>

      {/* Escritorio: matriz de permisos */}
      <section className="mt-6 hidden rounded-xl border border-slate-200 bg-white lg:block dark:border-slate-700 dark:bg-slate-900">
        <div className="px-5 pt-5">
          <h2 className="text-sm font-semibold text-intess-dark dark:text-slate-100">
            {t("matrixTitle")}
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t("adminLocked")}
          </p>
        </div>
        <div className="mt-3 overflow-x-auto pb-2">
          <table className="w-full min-w-190 text-left text-sm">
            <thead>
              <tr className="border-y border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:text-slate-400">
                <th className="px-5 py-2.5 font-medium">{t("permiso")}</th>
                {roles.map((r) => (
                  <th key={r.id_rol} className="px-3 py-2.5 text-center font-medium">
                    {r.nombre}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {modulos.map((modulo) => (
                <Fragment key={modulo}>
                  <tr
                    className="border-y border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50"
                  >
                    <td
                      colSpan={roles.length + 1}
                      className="px-5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500"
                    >
                      {modulo}
                    </td>
                  </tr>
                  {permisos
                    .filter((p) => p.modulo === modulo)
                    .map((p) => (
                      <tr
                        key={p.id_permiso}
                        className="border-b border-slate-100 dark:border-slate-800"
                      >
                        <td className="px-5 py-2.5">
                          <p className="font-mono text-xs text-slate-700 dark:text-slate-200">
                            {p.codigo}
                          </p>
                          <p className="text-xs text-slate-400 dark:text-slate-500">
                            {p.descripcion}
                          </p>
                        </td>
                        {roles.map((r) => {
                          const tiene = concedidos.has(
                            `${r.id_rol}:${p.id_permiso}`
                          );
                          const bloqueado = r.id_rol === 1;
                          return (
                            <td key={r.id_rol} className="px-3 py-2.5 text-center">
                              {bloqueado ? (
                                <span
                                  aria-label={t("adminLocked")}
                                  className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-intess/10 text-xs text-intess dark:bg-intess/25 dark:text-intess-accent"
                                >
                                  ●
                                </span>
                              ) : (
                                <form action={togglePermisoAction} className="inline">
                                  <input type="hidden" name="id_rol" value={r.id_rol} />
                                  <input
                                    type="hidden"
                                    name="id_permiso"
                                    value={p.id_permiso}
                                  />
                                  <input
                                    type="hidden"
                                    name="conceder"
                                    value={tiene ? "0" : "1"}
                                  />
                                  <button
                                    type="submit"
                                    aria-pressed={tiene}
                                    title={p.codigo}
                                    className={`inline-flex h-6 w-6 items-center justify-center rounded-md border text-xs font-bold transition-colors ${
                                      tiene
                                        ? "border-intess bg-intess text-white hover:bg-intess/80"
                                        : "border-slate-300 text-transparent hover:border-intess hover:text-intess/40 dark:border-slate-600"
                                    }`}
                                  >
                                    ●
                                  </button>
                                </form>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
