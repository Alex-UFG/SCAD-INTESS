import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";

// Slug de la URL -> clave de traduccion en menu.items.
// Al construir un modulo real, crear su carpeta propia (gana sobre esta ruta
// dinamica) y quitar su entrada de aqui.
const MODULOS: Record<string, string> = {
  estudiantes: "estudiantes",
  matriculas: "matriculas",
  secciones: "secciones",
  ciclos: "ciclos",
  notas: "notas",
  periodos: "periodos",
  boletas: "boletas",
  "pase-lista": "paseLista",
  asistencia: "resumenAsistencia",
  incidencias: "incidencias",
  citaciones: "citaciones",
  notificaciones: "notificaciones",
  tutores: "tutores",
  reportes: "reportes",
  auditoria: "auditoria",
};

export default async function ModuloPlaceholderPage({
  params,
}: PageProps<"/dashboard/[modulo]">) {
  const session = await auth();
  if (!session) redirect("/auth");

  const { modulo } = await params;
  const itemKey = MODULOS[modulo];
  if (!itemKey) notFound();

  const [tMenu, t] = await Promise.all([
    getTranslations("menu.items"),
    getTranslations("placeholder"),
  ]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-xl font-bold text-intess-dark dark:text-slate-100">
        {tMenu(itemKey)}
      </h1>
      <div className="mt-6 flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-300 bg-white/50 px-6 py-20 text-center dark:border-slate-700 dark:bg-slate-900/50">
        <svg
          aria-hidden="true"
          className="h-10 w-10 text-slate-300 dark:text-slate-600"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14.7 6.3a4.5 4.5 0 0 0-6.4 6.4L3 18v3h3l5.3-5.3a4.5 4.5 0 0 0 6.4-6.4l-2.9 2.9-2.1-2.1 2.9-2.9z" />
        </svg>
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
          {t("title")}
        </p>
        <p className="max-w-sm text-sm text-slate-400 dark:text-slate-500">
          {t("text")}
        </p>
      </div>
    </div>
  );
}
