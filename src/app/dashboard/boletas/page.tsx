
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

const estudiantes = [
  { nie: "10001", nombre: "Ana María López", seccion: "1° A" },
  { nie: "10002", nombre: "Carlos Hernández", seccion: "1° A" },
  { nie: "10003", nombre: "María Fernanda Pérez", seccion: "1° A" },
  { nie: "10004", nombre: "José Antonio Martínez", seccion: "1° A" },
  { nie: "10005", nombre: "Sofía Ramírez", seccion: "1° A" },
];

const calificaciones = [
  { materia: "Programación", act1: 8.5, act2: 9, examen: 8, promedio: 8.53 },
  { materia: "Matemática", act1: 7, act2: 8, examen: 7.5, promedio: 7.48 },
  { materia: "Contabilidad", act1: 9, act2: 8.5, examen: 9, promedio: 8.83 },
  { materia: "Ciencias", act1: 6, act2: 7, examen: 6.5, promedio: 6.48 },
];

const reportes = [
  { codigo: "REP-01", titulo: "boleta", descripcion: "boletaDesc" },
  { codigo: "REP-03", titulo: "constancia", descripcion: "constanciaDesc" },
  { codigo: "REP-02", titulo: "consolidado", descripcion: "consolidadoDesc" },
] as const;

export default function BoletasPage() {
  const t = useTranslations("boletas");
  const [busqueda, setBusqueda] = useState("");
  const [seleccionado, setSeleccionado] = useState("10001");
  const [periodo, setPeriodo] = useState("2");
  const [ciclo, setCiclo] = useState("2026");
  const [tipo, setTipo] = useState("REP-01");

  const encontrados = estudiantes.filter((est) =>
    `${est.nie} ${est.nombre}`.toLowerCase().includes(busqueda.toLowerCase())
  );

  const estudiante = estudiantes.find((est) => est.nie === seleccionado);

  const reporteSeleccionado = reportes.find((r) => r.codigo === tipo);

  const promedioGeneral = (
    calificaciones.reduce((total, nota) => total + nota.promedio, 0) /
    calificaciones.length
  ).toFixed(2);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-intess-dark dark:text-slate-100">
          {t("title")}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {t("subtitle")}
        </p>
      </div>

      <div className="mb-5 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300">
        {t("demo")}
      </div>

      <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
        <h2 className="mb-4 text-sm font-semibold text-intess-dark dark:text-slate-100">
          {t("busqueda")}
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-sm text-slate-600 dark:text-slate-300">
            {t("estudiante")}
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder={t("buscar")}
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
            <select
              value={seleccionado}
              onChange={(e) => setSeleccionado(e.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              {encontrados.map((est) => (
                <option key={est.nie} value={est.nie}>
                  {est.nie} - {est.nombre}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm text-slate-600 dark:text-slate-300">
            {t("ciclo")}
            <select
              value={ciclo}
              onChange={(e) => setCiclo(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="2026">2026</option>
            </select>
          </label>

          <label className="text-sm text-slate-600 dark:text-slate-300">
            {t("periodo")}
            <select
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="1">{t("primero")}</option>
              <option value="2">{t("segundo")}</option>
              <option value="3">{t("tercero")}</option>
            </select>
          </label>
        </div>
      </section>

      <section className="mb-6">
        <h2 className="mb-3 text-sm font-semibold text-intess-dark dark:text-slate-100">
          {t("tipoReporte")}
        </h2>

        <div className="grid gap-4 md:grid-cols-3">
          {reportes.map((reporte) => (
            <button
              key={reporte.codigo}
              type="button"
              onClick={() => setTipo(reporte.codigo)}
              className={`rounded-xl border p-4 text-left transition-colors ${
                tipo === reporte.codigo
                  ? "border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-950/30"
                  : "border-slate-200 bg-white hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900"
              }`}
            >
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                {reporte.codigo}
              </span>
              <h3 className="mt-2 text-base font-semibold text-intess-dark dark:text-slate-100">
                {t(reporte.titulo)}
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {t(reporte.descripcion)}
              </p>
            </button>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <div>
            <h2 className="text-sm font-semibold text-intess-dark dark:text-slate-100">
              {t("vistaPrevia")}
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {reporteSeleccionado ? t(reporteSeleccionado.titulo) : ""}
            </p>
          </div>

          <button
            type="button"
            disabled
            title={t("pdfPendiente")}
            className="cursor-not-allowed rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white opacity-50"
          >
            {t("generarPdf")}
          </button>
        </div>

        {tipo === "REP-01" && estudiante && (
          <div className="p-5 sm:p-8">
            <div className="mx-auto max-w-3xl border border-slate-200 p-5 sm:p-8 dark:border-slate-700">
              <div className="border-b-2 border-blue-700 pb-4 text-center dark:border-blue-400">
                <h3 className="text-lg font-bold text-intess-dark dark:text-slate-100">
                  SCAD-INTESS
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {t("nombreInstitucion")}
                </p>
                <h4 className="mt-4 text-base font-bold text-intess-dark dark:text-slate-100">
                  {t("boleta")}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t("periodo")} {periodo} · {ciclo}
                </p>
              </div>

              <div className="grid gap-3 py-5 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-slate-400">{t("nombreAlumno")}</p>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {estudiante.nombre}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">NIE</p>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {estudiante.nie}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">{t("seccion")}</p>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {estudiante.seccion}
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-y border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
                      {[t("materia"), t("act1"), t("act2"), t("examen"), t("promedio")].map((col) => (
                        <th key={col} className="px-2 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {calificaciones.map((nota) => (
                      <tr key={nota.materia} className="border-b border-slate-100 dark:border-slate-800">
                        <td className="px-2 py-3 text-xs font-medium text-slate-800 dark:text-slate-200">{nota.materia}</td>
                        <td className="px-2 py-3 text-xs text-slate-600 dark:text-slate-400">{nota.act1.toFixed(2)}</td>
                        <td className="px-2 py-3 text-xs text-slate-600 dark:text-slate-400">{nota.act2.toFixed(2)}</td>
                        <td className="px-2 py-3 text-xs text-slate-600 dark:text-slate-400">{nota.examen.toFixed(2)}</td>
                        <td className="px-2 py-3 text-xs font-bold text-slate-800 dark:text-slate-200">{nota.promedio.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-5 flex justify-end">
                <div className="rounded-lg bg-slate-50 px-5 py-3 dark:bg-slate-800">
                  <p className="text-xs text-slate-500">{t("promedioGeneral")}</p>
                  <p className="text-2xl font-bold text-intess-dark dark:text-slate-100">{promedioGeneral}</p>
                </div>
              </div>

              <p className="mt-8 border-t border-slate-200 pt-4 text-center text-xs text-slate-400 dark:border-slate-700">
                {t("pieDocumento")}
              </p>
            </div>
          </div>
        )}

        {tipo !== "REP-01" && (
          <div className="p-10 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
              <span className="text-xl">PDF</span>
            </div>
            <h3 className="font-semibold text-intess-dark dark:text-slate-100">
              {tipo === "REP-03" ? t("constancia") : t("consolidado")}
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
              {tipo === "REP-03" ? t("constanciaPendiente") : t("consolidadoPendiente")}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
