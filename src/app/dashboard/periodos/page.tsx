
import { getTranslations } from "next-intl/server";

export const metadata = {
  title: "Períodos evaluativos | SCAD-INTESS",
  description: "Administración de períodos evaluativos",
};

export const dynamic = "force-dynamic";

// Datos demostrativos para construir el frontend.
// Posteriormente se reemplazarán por consultas a MySQL.
const periodos = [
  {
    numero: 1,
    nombre: "Primer período",
    inicio: "02/02/2026",
    cierre: "30/04/2026",
    estado: "Cerrado",
  },
  {
    numero: 2,
    nombre: "Segundo período",
    inicio: "04/05/2026",
    cierre: "31/07/2026",
    estado: "Abierto",
  },
  {
    numero: 3,
    nombre: "Tercer período",
    inicio: "03/08/2026",
    cierre: "30/10/2026",
    estado: "Pendiente",
  },
];

const estadoEstilos: Record<string, string> = {
  Abierto:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  Cerrado:
    "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  Pendiente:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

export default async function PeriodosPage() {
  const t = await getTranslations("periodos");

  const resumen = [
    {
      label: t("total"),
      value: 3,
    },
    {
      label: t("abiertos"),
      value: periodos.filter((p) => p.estado === "Abierto").length,
    },
    {
      label: t("cerrados"),
      value: periodos.filter((p) => p.estado === "Cerrado").length,
    },
    {
      label: t("pendientes"),
      value: periodos.filter((p) => p.estado === "Pendiente").length,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-intess-dark dark:text-slate-100">
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t("subtitle")}
          </p>
        </div>

        <span className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
          {t("ciclo")}: 2026
        </span>
      </div>

      <div className="mb-5 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300">
        {t("demo")}
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {resumen.map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
              {item.label}
            </p>
            <p className="mt-2 text-2xl font-bold tabular-nums text-intess-dark dark:text-slate-100">
              {item.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        {periodos.map((periodo) => (
          <section
            key={periodo.numero}
            className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  {t("periodo")} {periodo.numero}
                </p>
                <h2 className="mt-1 text-lg font-semibold text-intess-dark dark:text-slate-100">
                  {periodo.nombre}
                </h2>
              </div>

              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  estadoEstilos[periodo.estado]
                }`}
              >
                {t(`estados.${periodo.estado}`)}
              </span>
            </div>

            <div className="mt-5 space-y-3 border-t border-slate-100 pt-4 dark:border-slate-800">
              <div>
                <p className="text-xs text-slate-400">{t("fechaInicio")}</p>
                <p className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-200">
                  {periodo.inicio}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">{t("fechaCierre")}</p>
                <p className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-200">
                  {periodo.cierre}
                </p>
              </div>
            </div>
          </section>
        ))}
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <h2 className="text-sm font-semibold text-intess-dark dark:text-slate-100">
            {t("detalle")}
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t("detalleDescripcion")}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
                {[t("colPeriodo"), t("fechaInicio"), t("fechaCierre"), t("colEstado")].map(
                  (col) => (
                    <th
                      key={col}
                      className="px-5 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300"
                    >
                      {col}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {periodos.map((periodo) => (
                <tr
                  key={periodo.numero}
                  className="border-b border-slate-100 last:border-0 dark:border-slate-800"
                >
                  <td className="px-5 py-4 text-sm font-medium text-slate-800 dark:text-slate-200">
                    {periodo.nombre}
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-400">
                    {periodo.inicio}
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-400">
                    {periodo.cierre}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        estadoEstilos[periodo.estado]
                      }`}
                    >
                      {t(`estados.${periodo.estado}`)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
