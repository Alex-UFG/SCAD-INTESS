import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import type { RowDataPacket } from "mysql2";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getPreferences } from "@/lib/preferences";
import { FormNombre, FormPassword } from "./form-cuenta";

interface RolRow extends RowDataPacket {
  nombre: string;
}

export const dynamic = "force-dynamic";

export default async function CuentaPage() {
  const session = await auth();
  if (!session) redirect("/auth");

  const idUsuario = Number(session.user.id);
  const [t, [roles], prefs] = await Promise.all([
    getTranslations("cuenta"),
    db.query<RolRow[]>("SELECT nombre FROM rol WHERE id_rol = ? LIMIT 1", [session.user.rol]),
    getPreferences(idUsuario),
  ]);

  // La BD manda sobre el JWT: el nombre puede haberse editado en otra sesion
  const nombre = prefs.nombre ?? session.user.name ?? "";

  const campos = [
    { label: t("email"), value: session.user.email ?? "—" },
    { label: t("rol"), value: roles[0]?.nombre ?? String(session.user.rol) },
  ];

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-xl font-bold text-intess-dark dark:text-slate-100">{t("title")}</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("subtitle")}</p>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
        <h2 className="text-sm font-semibold text-intess-dark dark:text-slate-100">{t("profileTitle")}</h2>
        <dl className="mt-4 space-y-3">
          {campos.map((c) => (
            <div key={c.label} className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-4">
              <dt className="w-40 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">{c.label}</dt>
              <dd className="text-sm text-slate-700 dark:text-slate-200">{c.value}</dd>
            </div>
          ))}
        </dl>
        <FormNombre nombreActual={nombre} />
      </section>

      <section className="mt-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
        <h2 className="text-sm font-semibold text-intess-dark dark:text-slate-100">{t("prefsTitle")}</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t("prefsText")}</p>
      </section>

      <section className="mt-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
        <h2 className="text-sm font-semibold text-intess-dark dark:text-slate-100">{t("passwordTitle")}</h2>
        <FormPassword />
      </section>
    </div>
  );
}
