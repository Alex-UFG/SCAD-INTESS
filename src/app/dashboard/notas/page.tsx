
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

interface RegistroNota {
  nie: number;
  nombre: string;
  act1: number | null;
  act2: number | null;
  examen: number | null;
}

const datosIniciales: RegistroNota[] = [
  { nie: 10001, nombre: "Ana María López", act1: 8.5, act2: 9, examen: 8 },
  { nie: 10002, nombre: "Carlos Hernández", act1: 5, act2: 5.5, examen: 6 },
  { nie: 10003, nombre: "María Fernanda Pérez", act1: 9, act2: 8.5, examen: 9.5 },
  { nie: 10004, nombre: "José Antonio Martínez", act1: 7, act2: 6.5, examen: 7 },
  { nie: 10005, nombre: "Sofía Ramírez", act1: null, act2: null, examen: null },
  { nie: 10006, nombre: "Daniel Ernesto García", act1: 6, act2: 5, examen: 5.5 },
];

function calcularPromedio(nota: RegistroNota) {
  if (nota.act1 === null || nota.act2 === null || nota.examen === null) {
    return null;
  }

  return Math.round(
    (nota.act1 * 0.35 + nota.act2 * 0.35 + nota.examen * 0.30) * 100
  ) / 100;
}

export default function NotasPage() {
  const t = useTranslations("notas");
  const [registros, setRegistros] = useState(datosIniciales);
  const [busqueda, setBusqueda] = useState("");
  const [seccion, setSeccion] = useState("A");
  const [materia, setMateria] = useState("SW-003");
  const [periodo, setPeriodo] = useState("2");

  function actualizarNota(
    nie: number,
    campo: "act1" | "act2" | "examen",
    valor: string
  ) {
    const numero = valor === "" ? null : Number(valor);

    if (numero !== null && (!Number.isFinite(numero) || numero < 0 || numero > 10)) {
      return;
    }

    setRegistros((actuales) =>
      actuales.map((registro) =>
        registro.nie === nie ? { ...registro, [campo]: numero } : registro
      )
    );
  }

  const filtrados = registros.filter((registro) =>
    `${registro.nie} ${registro.nombre}`
      .toLowerCase()
      .includes(busqueda.toLowerCase())
  );

  const promedios = registros.map(calcularPromedio);
  const completos = promedios.filter((p) => p !== null);
  const enRiesgo = completos.filter((p) => p < 6).length;
  const promedioGeneral =
    completos.length > 0
      ? (completos.reduce((suma, p) => suma + p, 0) / completos.length).toFixed(2)
      : "—";

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
          {t("filtros")}
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm text-slate-600 dark:text-slate-300">
            {t("ciclo")}
            <select
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              defaultValue="2026"
            >
              <option value="2026">2026</option>
            </select>
          </label>

          <label className="text-sm text-slate-600 dark:text-slate-300">
            {t("seccion")}
            <select
              value={seccion}
              onChange={(e) => setSeccion(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="A">1° A</option>
              <option value="B">1° B</option>
              <option value="C">2° A</option>
            </select>
          </label>

          <label className="text-sm text-slate-600 dark:text-slate-300">
            {t("materia")}
            <select
              value={materia}
              onChange={(e) => setMateria(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="SW-003">Programación</option>
              <option value="MAT-001">Matemática</option>
              <option value="CON-001">Contabilidad</option>
            </select>
          </label>

          <label className="text-sm text-slate-600 dark:text-slate-300">
            {t("periodo")}
            <select
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="1">{t("primerPeriodo")}</option>
              <option value="2">{t("segundoPeriodo")}</option>
              <option value="3">{t("tercerPeriodo")}</option>
            </select>
          </label>
        </div>
      </section>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: t("totalEstudiantes"), value: registros.length },
          { label: t("notasCompletas"), value: completos.length },
          { label: t("enRiesgo"), value: enRiesgo },
          { label: t("promedioGeneral"), value: promedioGeneral },
        ].map((item) => (
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

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <div>
            <h2 className="text-sm font-semibold text-intess-dark dark:text-slate-100">
              {t("registro")}
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {t("ponderacion")}
            </p>
          </div>

          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
            {t("capturaAbierta")}
          </span>
        </div>

        <div className="border-b border-slate-200 p-4 dark:border-slate-700">
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder={t("buscar")}
            className="w-full max-w-sm rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px] text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
                <th className="px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  NIE
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {t("estudiante")}
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {t("actividad1")}
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {t("actividad2")}
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {t("examen")}
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {t("promedio")}
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {t("estado")}
                </th>
              </tr>
            </thead>

            <tbody>
              {filtrados.map((registro) => {
                const promedio = calcularPromedio(registro);
                const riesgo = promedio !== null && promedio < 6;

                return (
                  <tr
                    key={registro.nie}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                  >
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                      {registro.nie}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-800 dark:text-slate-200">
                      {registro.nombre}
                    </td>

                    {(["act1", "act2", "examen"] as const).map((campo) => (
                      <td key={campo} className="px-4 py-3">
                        <input
                          type="number"
                          min="0"
                          max="10"
                          step="0.01"
                          value={registro[campo] ?? ""}
                          onChange={(e) =>
                            actualizarNota(registro.nie, campo, e.target.value)
                          }
                          aria-label={`${t(campo)} - ${registro.nombre}`}
                          className="w-20 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-center text-sm text-slate-800 outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                        />
                      </td>
                    ))}

                    <td className="px-4 py-3 text-sm font-bold tabular-nums text-slate-800 dark:text-slate-200">
                      {promedio === null ? "—" : promedio.toFixed(2)}
                    </td>

                    <td className="px-4 py-3">
                      {promedio === null ? (
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {t("pendiente")}
                        </span>
                      ) : riesgo ? (
                        <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-400">
                          {t("riesgo")}
                        </span>
                      ) : (
                        <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          {t("aprobado")}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filtrados.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-sm text-slate-500">
                    {t("sinResultados")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-slate-200 px-5 py-3 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
          {t("notaPie")}
        </div>
      </section>
    </div>
  );
}
