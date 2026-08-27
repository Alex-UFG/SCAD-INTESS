import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import type { RowDataPacket } from "mysql2";
import { auth } from "@/auth";
import { db } from "@/lib/db";

interface CountRow extends RowDataPacket {
  total: number;
}

interface RolRow extends RowDataPacket {
  nombre: string;
}

async function contar(tabla: string): Promise<number> {
  const [rows] = await db.query<CountRow[]>(
    `SELECT COUNT(*) AS total FROM \`${tabla}\``
  );
  return rows[0]?.total ?? 0;
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/auth");

  const t = await getTranslations("dash");

  const [estudiantes, docentes, matriculas, incidencias, roles] =
    await Promise.all([
      contar("estudiante"),
      contar("docente"),
      contar("matricula"),
      contar("incidencia"),
      db
        .query<RolRow[]>("SELECT nombre FROM rol WHERE id_rol = ? LIMIT 1", [
          session.user.rol,
        ])
        .then(([r]) => r),
    ]);

  const stats = [
    { key: "estudiantes", value: estudiantes, href: "/dashboard/estudiantes" },
    { key: "docentes", value: docentes, href: "/dashboard/usuarios" },
    { key: "matriculas", value: matriculas, href: "/dashboard/matriculas" },
    { key: "incidencias", value: incidencias, href: "/dashboard/incidencias" },
  ];

  const accesos = [
    { key: "paseLista", href: "/dashboard/pase-lista" },
    { key: "notas", href: "/dashboard/notas" },
    { key: "incidencia", href: "/dashboard/incidencias" },
    { key: "reportes", href: "/dashboard/reportes" },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-xl font-bold text-intess-dark dark:text-slate-100">
        {t("welcome", { name: session.user.name ?? session.user.email ?? "" })}
      </h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        {roles[0]?.nombre} · {t("subtitle")}
      </p>

      {/* Indicadores */}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <Link
            key={s.key}
            href={s.href}
            className="rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-intess dark:border-slate-700 dark:bg-slate-900 dark:hover:border-intess-accent"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
              {t(`stats.${s.key}`)}
            </p>
            <p className="mt-1.5 text-2xl font-bold tabular-nums text-intess-dark dark:text-slate-100">
              {s.value}
            </p>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <section className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-2 dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-sm font-semibold text-intess-dark dark:text-slate-100">
            {t("attendanceTitle")}
          </h2>
          <div className="mt-4 flex h-44 items-center justify-center rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-700">
            <p className="max-w-xs text-center text-sm text-slate-400 dark:text-slate-500">
              {t("attendanceEmpty")}
            </p>
          </div>
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-sm font-semibold text-intess-dark dark:text-slate-100">
            {t("quickTitle")}
          </h2>
          <ul className="mt-3 space-y-1.5">
            {accesos.map((a) => (
              <li key={a.key}>
                <Link
                  href={a.href}
                  className="flex items-center justify-between rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-600 transition-colors hover:border-intess hover:text-intess dark:border-slate-700 dark:text-slate-300 dark:hover:border-intess-accent dark:hover:text-intess-accent"
                >
                  {t(`quick.${a.key}`)}
                  <span aria-hidden="true">→</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <section className="mt-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
        <h2 className="text-sm font-semibold text-intess-dark dark:text-slate-100">
          {t("incidentsTitle")}
        </h2>
        <div className="mt-4 flex h-28 items-center justify-center rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-700">
          <p className="max-w-xs text-center text-sm text-slate-400 dark:text-slate-500">
            {t("incidentsEmpty")}
          </p>
        </div>
      </section>
    </div>
  );
}
