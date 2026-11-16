import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import type { RowDataPacket } from "mysql2";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getPermisosDeRol } from "@/lib/permisos";
import { aprobarUsuarioAction } from "@/app/actions/admin";
import { UsuariosTable, type RolOpcion, type UsuarioFila } from "./usuarios-table";

interface UsuarioRow extends RowDataPacket {
  id_usuario: number;
  email: string;
  id_rol: number;
  estado: "Activo" | "Inactivo" | "Bloqueado";
  ultimo_acceso: Date | null;
  creado_en: Date;
  nombre: string | null;
}

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

  const permisos = await getPermisosDeRol(session.user.rol);
  if (!permisos.has("usuarios.ver")) redirect("/dashboard");
  const puedeEditar = permisos.has("usuarios.editar");
  const puedeBloquear = permisos.has("usuarios.desactivar");

  const [t, locale] = await Promise.all([getTranslations("usuarios"), getLocale()]);

  const [[usuarios], [roles]] = await Promise.all([
    db.query<UsuarioRow[]>(
      `SELECT u.id_usuario, u.email, u.id_rol, u.estado, u.ultimo_acceso, u.creado_en,
              p.valor AS nombre
         FROM usuario u
         LEFT JOIN usuario_preferencia p
           ON p.id_usuario = u.id_usuario AND p.clave = 'nombre'
        ORDER BY u.estado = 'Inactivo' DESC, u.creado_en DESC`
    ),
    db.query<RolOpcion[] & RowDataPacket[]>("SELECT id_rol, nombre FROM rol ORDER BY id_rol"),
  ]);

  const pendientes = usuarios.filter((u) => u.estado === "Inactivo");
  const filas: UsuarioFila[] = usuarios.map((u) => ({
    id_usuario: u.id_usuario,
    email: u.email,
    id_rol: u.id_rol,
    estado: u.estado,
    nombre: u.nombre,
    ultimoAccesoTexto: formatFecha(u.ultimo_acceso, locale),
    ultimoAccesoMs: u.ultimo_acceso ? u.ultimo_acceso.getTime() : null,
  }));

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
                    {u.email} · {formatFecha(u.creado_en, locale)}
                  </p>
                </div>
                {puedeEditar && (
                  <form action={aprobarUsuarioAction}>
                    <input type="hidden" name="id" value={u.id_usuario} />
                    <button
                      type="submit"
                      className="rounded-full bg-aprobado px-5 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-aprobado/85"
                    >
                      {t("approve")}
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Todos los usuarios */}
      <section className="mt-6 rounded-xl border border-slate-200 bg-white pt-5 dark:border-slate-700 dark:bg-slate-900">
        <h2 className="px-5 pb-3 text-sm font-semibold text-intess-dark dark:text-slate-100">
          {t("allTitle")}
        </h2>
        <UsuariosTable
          usuarios={filas}
          roles={roles}
          selfId={session.user.id}
          puedeEditar={puedeEditar}
          puedeBloquear={puedeBloquear}
        />
      </section>
    </div>
  );
}
