import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import type { RowDataPacket } from "mysql2";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
  aprobarUsuarioAction,
  setEstadoUsuarioAction,
  setRolUsuarioAction,
} from "@/app/actions/admin";
import { ResetPasswordButton } from "./reset-password-button";

interface UsuarioRow extends RowDataPacket {
  id_usuario: number;
  email: string;
  id_rol: number;
  estado: "Activo" | "Inactivo" | "Bloqueado";
  ultimo_acceso: Date | null;
  creado_en: Date;
  nombre: string | null;
}

interface RolRow extends RowDataPacket {
  id_rol: number;
  nombre: string;
}

const ESTADO_BADGE: Record<string, string> = {
  Activo:
    "bg-aprobado-bg text-aprobado dark:bg-aprobado/15 dark:text-aprobado",
  Inactivo: "bg-riesgo-bg text-riesgo dark:bg-riesgo/15 dark:text-riesgo",
  Bloqueado:
    "bg-reprobado-bg text-reprobado dark:bg-reprobado/15 dark:text-reprobado",
};

function formatFecha(value: Date | null, locale: string): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export default async function UsuariosPage() {
  const session = await auth();
  if (!session) redirect("/auth");
  if (session.user.rol !== 1) redirect("/dashboard");

  const t = await getTranslations("usuarios");

  const [[usuarios], [roles]] = await Promise.all([
    db.query<UsuarioRow[]>(
      `SELECT u.id_usuario, u.email, u.id_rol, u.estado, u.ultimo_acceso, u.creado_en,
              p.valor AS nombre
         FROM usuario u
         LEFT JOIN usuario_preferencia p
           ON p.id_usuario = u.id_usuario AND p.clave = 'nombre'
        ORDER BY u.estado = 'Inactivo' DESC, u.creado_en DESC`
    ),
    db.query<RolRow[]>("SELECT id_rol, nombre FROM rol ORDER BY id_rol"),
  ]);

  const pendientes = usuarios.filter((u) => u.estado === "Inactivo");
  const selfId = session.user.id;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-xl font-bold text-intess-dark dark:text-slate-100">
        {t("title")}
      </h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        {t("subtitle")}
      </p>

      {/* Solicitudes pendientes */}
      <section className="mt-6 rounded-xl border border-riesgo/30 bg-riesgo-bg/40 p-5 dark:border-riesgo/30 dark:bg-riesgo/10">
        <h2 className="text-sm font-semibold text-intess-dark dark:text-slate-100">
          {t("pendingTitle")}{" "}
          <span className="ml-1 rounded-full bg-riesgo px-2 py-0.5 text-xs font-semibold text-white">
            {pendientes.length}
          </span>
        </h2>
        {pendientes.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {t("pendingEmpty")}
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {pendientes.map((u) => (
              <li
                key={u.id_usuario}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900"
              >
                <div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                    {u.nombre ?? u.email}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {u.email} · {formatFecha(u.creado_en, "es-SV")}
                  </p>
                </div>
                <form action={aprobarUsuarioAction}>
                  <input type="hidden" name="id" value={u.id_usuario} />
                  <button
                    type="submit"
                    className="rounded-full bg-aprobado px-5 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-aprobado/85"
                  >
                    {t("approve")}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Todos los usuarios */}
      <section className="mt-6 rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <h2 className="px-5 pt-5 text-sm font-semibold text-intess-dark dark:text-slate-100">
          {t("allTitle")}
        </h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-180 text-left text-sm">
            <thead>
              <tr className="border-y border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:text-slate-400">
                <th className="px-5 py-2.5 font-medium">{t("colUser")}</th>
                <th className="px-3 py-2.5 font-medium">{t("colRol")}</th>
                <th className="px-3 py-2.5 font-medium">{t("colEstado")}</th>
                <th className="px-3 py-2.5 font-medium">{t("colAcceso")}</th>
                <th className="px-5 py-2.5 text-right font-medium">
                  {t("colAcciones")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {usuarios.map((u) => {
                const esYo = String(u.id_usuario) === selfId;
                return (
                  <tr key={u.id_usuario}>
                    <td className="px-5 py-3">
                      <p className="font-medium text-slate-800 dark:text-slate-100">
                        {u.nombre ?? "—"}
                        {esYo && (
                          <span className="ml-2 rounded-full bg-intess-light px-2 py-0.5 text-[10px] font-semibold uppercase text-intess dark:bg-intess/20 dark:text-intess-accent">
                            {t("you")}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {u.email}
                      </p>
                    </td>
                    <td className="px-3 py-3">
                      {esYo ? (
                        <span className="text-slate-600 dark:text-slate-300">
                          {roles.find((r) => r.id_rol === u.id_rol)?.nombre}
                        </span>
                      ) : (
                        <form
                          action={setRolUsuarioAction}
                          className="flex items-center gap-2"
                        >
                          <input type="hidden" name="id" value={u.id_usuario} />
                          <select
                            name="rol"
                            defaultValue={u.id_rol}
                            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                          >
                            {roles.map((r) => (
                              <option key={r.id_rol} value={r.id_rol}>
                                {r.nombre}
                              </option>
                            ))}
                          </select>
                          <button
                            type="submit"
                            className="rounded-full border border-intess px-3 py-1 text-xs font-medium text-intess transition-colors hover:bg-intess-light dark:border-intess-accent dark:text-intess-accent dark:hover:bg-intess-accent/10"
                          >
                            {t("saveRol")}
                          </button>
                        </form>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ESTADO_BADGE[u.estado]}`}
                      >
                        {t(`estados.${u.estado}`)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-500 dark:text-slate-400">
                      {formatFecha(u.ultimo_acceso, "es-SV")}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {!esYo && (
                        <span className="mr-2 inline-block">
                          <ResetPasswordButton id={u.id_usuario} email={u.email} />
                        </span>
                      )}
                      {!esYo && (
                        <form action={setEstadoUsuarioAction} className="inline">
                          <input type="hidden" name="id" value={u.id_usuario} />
                          <input
                            type="hidden"
                            name="estado"
                            value={u.estado === "Bloqueado" ? "Activo" : "Bloqueado"}
                          />
                          <button
                            type="submit"
                            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                              u.estado === "Bloqueado"
                                ? "border border-aprobado text-aprobado hover:bg-aprobado-bg dark:hover:bg-aprobado/10"
                                : "border border-reprobado text-reprobado hover:bg-reprobado-bg dark:hover:bg-reprobado/10"
                            }`}
                          >
                            {u.estado === "Bloqueado" ? t("unblock") : t("block")}
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
