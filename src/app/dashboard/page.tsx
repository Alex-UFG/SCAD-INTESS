import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { signOutAction } from "@/app/actions/auth";

const ROLES: Record<number, string> = {
  1: "Admin",
  2: "Director",
  3: "Coordinador",
  4: "Secretaria",
  5: "Docente",
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/auth");

  const t = await getTranslations("ui");

  return (
    <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h1 className="text-xl font-bold text-intess-dark dark:text-slate-100">
          {t("dashboard")}
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          {session.user.name ?? session.user.email} — {t("role")}:{" "}
          {ROLES[session.user.rol] ?? session.user.rol}
        </p>
        <form action={signOutAction} className="mt-6">
          <button
            type="submit"
            className="rounded-full border border-intess px-6 py-2 text-sm font-semibold text-intess transition-colors hover:bg-intess-light dark:border-intess-accent dark:text-intess-accent dark:hover:bg-intess-accent/10"
          >
            {t("signOut")}
          </button>
        </form>
      </div>
    </div>
  );
}
