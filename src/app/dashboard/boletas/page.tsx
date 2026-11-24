"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import BoletaPdfDownload from "./BoletaPdfDownload";
import ConstanciaPdfDownload from "./ConstanciaPdfDownload";
import { getConstanciaMatricula } from "@/app/actions/constancias";
import {
  buscarEstudiantesBoleta,
  getBoletaEstudiante,
  getContextoBoletas,
  type EstudianteBoleta,
} from "@/app/actions/boletas";

type ContextoBoletas = Awaited<ReturnType<typeof getContextoBoletas>>;
type DatosBoleta = Awaited<ReturnType<typeof getBoletaEstudiante>>;
type DatosConstancia = Awaited<ReturnType<typeof getConstanciaMatricula>>;

const reportes = [
  { codigo: "REP-01", titulo: "boleta", descripcion: "boletaDesc" },
  { codigo: "REP-03", titulo: "constancia", descripcion: "constanciaDesc" },
  { codigo: "REP-02", titulo: "consolidado", descripcion: "consolidadoDesc" },
] as const;

function formatoNota(valor: number | null): string {
  return valor === null ? "Pendiente" : valor.toFixed(2);
}

export default function BoletasPage() {
  const t = useTranslations("boletas");

  const [contexto, setContexto] = useState<ContextoBoletas | null>(null);
  const [ciclo, setCiclo] = useState("");
  const [periodo, setPeriodo] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [estudiantes, setEstudiantes] = useState<EstudianteBoleta[]>([]);
  const [seleccionado, setSeleccionado] = useState<EstudianteBoleta | null>(null);
  const [boleta, setBoleta] = useState<DatosBoleta | null>(null);
  const [constancia, setConstancia] = useState<DatosConstancia | null>(null);
  const [cargandoConstancia, setCargandoConstancia] = useState(false);
  const [cargandoContexto, setCargandoContexto] = useState(true);
  const [buscando, setBuscando] = useState(false);
  const [cargandoBoleta, setCargandoBoleta] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let activo = true;

    async function cargarContexto() {
      try {
        const datos = await getContextoBoletas();

        if (!activo) return;

        setContexto(datos);

        const cicloInicial =
          datos.ciclos.find((item) => item.estado === "Activo") ??
          datos.ciclos[0];

        if (cicloInicial) {
          setCiclo(String(cicloInicial.id_ciclo));

          const periodosCiclo = datos.periodos.filter(
            (item) => item.id_ciclo === cicloInicial.id_ciclo
          );

          const periodoInicial =
            periodosCiclo.find((item) => item.estado === "Abierto") ??
            periodosCiclo[0];

          if (periodoInicial) {
            setPeriodo(String(periodoInicial.id_periodo));
          }
        }
      } catch (err) {
        if (activo) {
          setError(
            err instanceof Error
              ? err.message
              : "No fue posible cargar la información."
          );
        }
      } finally {
        if (activo) setCargandoContexto(false);
      }
    }

    void cargarContexto();

    return () => {
      activo = false;
    };
  }, []);

  useEffect(() => {
    let activo = true;

    async function buscar() {
      if (
        seleccionado &&
        busqueda === `${seleccionado.nie} - ${seleccionado.nombre}`
      ) {
        setEstudiantes([]);
        setBuscando(false);
        return;
      }

      setSeleccionado(null);
      setBoleta(null);
      setEstudiantes([]);
      setError("");

      if (!ciclo || busqueda.trim().length < 2) {
        setBuscando(false);
        return;
      }

      setBuscando(true);

      try {
        const resultados = await buscarEstudiantesBoleta(
          busqueda,
          Number(ciclo)
        );

        if (activo) setEstudiantes(resultados);
      } catch (err) {
        if (activo) {
          setError(
            err instanceof Error
              ? err.message
              : "No fue posible buscar estudiantes."
          );
        }
      } finally {
        if (activo) setBuscando(false);
      }
    }

    void buscar();

    return () => {
      activo = false;
    };
  }, [busqueda, ciclo, seleccionado]);

  useEffect(() => {
    let activo = true;

    async function cargarBoleta() {
      if (!seleccionado || !ciclo || !periodo) {
        setBoleta(null);
        return;
      }

      setCargandoBoleta(true);
      setError("");

      try {
        const datos = await getBoletaEstudiante(
          seleccionado.nie,
          Number(ciclo),
          Number(periodo)
        );

        if (activo) setBoleta(datos);
      } catch (err) {
        if (activo) {
          setBoleta(null);
          setError(
            err instanceof Error
              ? err.message
              : "No fue posible consultar la boleta."
          );
        }
      } finally {
        if (activo) setCargandoBoleta(false);
      }
    }

    void cargarBoleta();

    return () => {
      activo = false;
    };
  }, [seleccionado, ciclo, periodo]);

  const periodosDisponibles =
    contexto?.periodos.filter(
      (item) => item.id_ciclo === Number(ciclo)
    ) ?? [];

  function cambiarCiclo(valor: string) {
    setCiclo(valor);
    setSeleccionado(null);
    setBoleta(null);
    setBusqueda("");
    setEstudiantes([]);

    const periodosCiclo =
      contexto?.periodos.filter(
        (item) => item.id_ciclo === Number(valor)
      ) ?? [];

    const periodoInicial =
      periodosCiclo.find((item) => item.estado === "Abierto") ??
      periodosCiclo[0];

    setPeriodo(periodoInicial ? String(periodoInicial.id_periodo) : "");
  }

  function seleccionarEstudiante(estudiante: EstudianteBoleta) {
    setSeleccionado(estudiante);
    setBusqueda(`${estudiante.nie} - ${estudiante.nombre}`);
    setEstudiantes([]);
  }

  useEffect(() => {
    let activo = true;

    async function cargarConstancia() {
      if (!seleccionado || !ciclo) {
        setConstancia(null);
        return;
      }

      setCargandoConstancia(true);

      try {
        const datos = await getConstanciaMatricula(
          seleccionado.nie,
          Number(ciclo)
        );

        if (activo) setConstancia(datos);
      } catch (err) {
        if (activo) {
          setConstancia(null);
          setError(
            err instanceof Error
              ? err.message
              : "No fue posible consultar la constancia de matrícula."
          );
        }
      } finally {
        if (activo) setCargandoConstancia(false);
      }
    }

    void cargarConstancia();

    return () => {
      activo = false;
    };
  }, [seleccionado, ciclo]);

  const reporteSeleccionado = reportes[0];

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

      {error && (
        <div
          role="alert"
          className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
        >
          {error}
        </div>
      )}

      <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
        <h2 className="mb-4 text-sm font-semibold text-intess-dark dark:text-slate-100">
          {t("busqueda")}
        </h2>

        {cargandoContexto ? (
          <p className="text-sm text-slate-500">Cargando ciclos y períodos...</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-sm text-slate-600 dark:text-slate-300">
              {t("estudiante")}
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder={t("buscar")}
                disabled={!ciclo}
                autoComplete="off"
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              />

              {buscando && (
                <span className="mt-1 block text-xs text-slate-500">
                  Buscando estudiantes...
                </span>
              )}

              {estudiantes.length > 0 && (
                <div className="mt-1 max-h-52 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
                  {estudiantes.map((estudiante) => (
                    <button
                      key={estudiante.nie}
                      type="button"
                      onClick={() => seleccionarEstudiante(estudiante)}
                      className="block w-full border-b border-slate-100 px-3 py-2 text-left text-sm last:border-0 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700"
                    >
                      <span className="font-medium text-slate-800 dark:text-slate-100">
                        {estudiante.nombre}
                      </span>
                      <span className="block text-xs text-slate-500">
                        NIE: {estudiante.nie} · {estudiante.grado}° {estudiante.seccion}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {busqueda.trim().length >= 2 &&
                !buscando &&
                estudiantes.length === 0 &&
                !seleccionado && (
                  <span className="mt-1 block text-xs text-slate-500">
                    No se encontraron estudiantes con matrícula vigente.
                  </span>
                )}
            </label>

            <label className="text-sm text-slate-600 dark:text-slate-300">
              {t("ciclo")}
              <select
                value={ciclo}
                onChange={(e) => cambiarCiclo(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              >
                {contexto?.ciclos.map((item) => (
                  <option key={item.id_ciclo} value={item.id_ciclo}>
                    {item.anio} - {item.estado}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm text-slate-600 dark:text-slate-300">
              {t("periodo")}
              <select
                value={periodo}
                onChange={(e) => {
                  setPeriodo(e.target.value);
                  setBoleta(null);
                }}
                disabled={periodosDisponibles.length === 0}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              >
                {periodosDisponibles.map((item) => (
                  <option key={item.id_periodo} value={item.id_periodo}>
                    {t(
                      item.numero === 1
                        ? "primero"
                        : item.numero === 2
                          ? "segundo"
                          : "tercero"
                    )}{" "}
                    - {item.estado}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
      </section>

      <section className="mb-6">
        <h2 className="mb-3 text-sm font-semibold text-intess-dark dark:text-slate-100">
          {t("tipoReporte")}
        </h2>

        <div className="grid gap-4 md:grid-cols-3">
          {reportes.map((reporte) => (
            <div
              key={reporte.codigo}
              className={`rounded-xl border p-4 ${
                reporte.codigo === "REP-01"
                  ? "border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-950/30"
                  : "border-slate-200 bg-white opacity-60 dark:border-slate-700 dark:bg-slate-900"
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
              {reporte.codigo === "REP-02" && (
                <span className="mt-2 inline-block text-xs text-slate-500">
                  Pendiente de implementación
                </span>
              )}
            </div>
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
              {t(reporteSeleccionado.titulo)}
            </p>
          </div>

          {boleta && !cargandoBoleta ? (
            <BoletaPdfDownload boleta={boleta} />
          ) : (
            <button
              type="button"
              disabled
              title={t("pdfPendiente")}
              className="cursor-not-allowed rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white opacity-50"
            >
              {t("generarPdf")}
            </button>
          )}
        </div>

        {cargandoBoleta ? (
          <div className="p-10 text-center text-sm text-slate-500">
            Consultando información académica...
          </div>
        ) : !boleta ? (
          <div className="p-10 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Selecciona un estudiante para consultar su boleta de calificaciones.
            </p>
          </div>
        ) : (
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
                  {t("periodo")} {boleta.periodo.numero} · {boleta.anio}
                </p>
              </div>

              <div className="grid gap-3 py-5 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-slate-400">{t("nombreAlumno")}</p>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {boleta.estudiante.nombre}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">NIE</p>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {boleta.estudiante.nie}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">{t("seccion")}</p>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {boleta.estudiante.grado}° {boleta.estudiante.seccion}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Especialidad</p>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {boleta.estudiante.especialidad}
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-y border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
                      {[t("materia"), t("act1"), t("act2"), t("examen"), t("promedio")].map((col) => (
                        <th
                          key={col}
                          className="px-2 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {boleta.materias.map((nota) => (
                      <tr
                        key={nota.cod_materia}
                        className="border-b border-slate-100 dark:border-slate-800"
                      >
                        <td className="px-2 py-3 text-xs font-medium text-slate-800 dark:text-slate-200">
                          {nota.materia}
                        </td>
                        <td className="px-2 py-3 text-xs text-slate-600 dark:text-slate-400">
                          {formatoNota(nota.act1)}
                        </td>
                        <td className="px-2 py-3 text-xs text-slate-600 dark:text-slate-400">
                          {formatoNota(nota.act2)}
                        </td>
                        <td className="px-2 py-3 text-xs text-slate-600 dark:text-slate-400">
                          {formatoNota(nota.examen)}
                        </td>
                        <td className="px-2 py-3 text-xs font-bold text-slate-800 dark:text-slate-200">
                          {formatoNota(nota.promedio)}
                        </td>
                      </tr>
                    ))}
                    {boleta.materias.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-3 py-8 text-center text-sm text-slate-500"
                        >
                          No hay materias registradas en la carga académica de esta sección.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <p className="mt-5 border-t border-slate-200 pt-4 text-center text-xs text-slate-400 dark:border-slate-700">
                {t("pieDocumento")}
              </p>
            </div>
          </div>
        )}
      </section>

      <section className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <div>
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
              REP-03
            </span>
            <h2 className="mt-1 text-sm font-semibold text-intess-dark dark:text-slate-100">
              Constancia de matrícula
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Documento que acredita la matrícula vigente del estudiante en el ciclo seleccionado.
            </p>
          </div>

          {constancia && !cargandoConstancia ? (
            <ConstanciaPdfDownload constancia={constancia} />
          ) : (
            <button
              type="button"
              disabled
              className="cursor-not-allowed rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white opacity-50"
            >
              {cargandoConstancia ? "Preparando constancia..." : "Selecciona un estudiante"}
            </button>
          )}
        </div>

        {cargandoConstancia ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Consultando matrícula vigente...
          </div>
        ) : !constancia ? (
          <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
            Selecciona un estudiante para consultar y generar su constancia de matrícula.
          </div>
        ) : (
          <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="text-xs text-slate-400">Estudiante</p>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {constancia.nombre}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">NIE</p>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {constancia.nie}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Grado y sección</p>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {constancia.grado}° {constancia.seccion}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Especialidad</p>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {constancia.especialidad}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Ciclo escolar</p>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {constancia.anio}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Estado de matrícula</p>
              <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                {constancia.estado}
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
