
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  abrirPeriodoEvaluativo,
  cerrarPeriodoEvaluativo,
  actualizarFechasPeriodo,
  type PeriodoEvaluativo,
} from "@/app/actions/periodos";

interface Props {
  periodos: PeriodoEvaluativo[];
  labels: {
    total: string;
    abiertos: string;
    cerrados: string;
    pendientes: string;
    title: string;
    subtitle: string;
    ciclo: string;
    periodo: string;
    fechaInicio: string;
    fechaCierre: string;
    detalle: string;
    detalleDescripcion: string;
    colPeriodo: string;
    colEstado: string;
    sinPeriodos: string;
    abrir: string;
    cerrar: string;
    confirmarAbrir: string;
    confirmarCerrar: string;
    procesando: string;
    exitoAbrir: string;
    exitoCerrar: string;
    errorOperacion: string;
    editarFechas: string;
    guardarFechas: string;
    cancelar: string;
    confirmarFechas: string;
    exitoFechas: string;
    fechaInvalida: string;
  };
}

const estadoEstilos: Record<string, string> = {
  Abierto:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  Cerrado:
    "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  Pendiente:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

function formatearFecha(fecha: string | Date): string {
  const valor =
    typeof fecha === "string"
      ? fecha.slice(0, 10)
      : fecha.toISOString().slice(0, 10);

  const [anio, mes, dia] = valor.split("-");
  return `${dia}/${mes}/${anio}`;
}

function fechaInput(fecha: string | Date): string {
  return typeof fecha === "string"
    ? fecha.slice(0, 10)
    : fecha.toISOString().slice(0, 10);
}

function nombrePeriodo(numero: number): string {
  const nombres = [
    "",
    "Primer período",
    "Segundo período",
    "Tercer período",
  ];

  return nombres[numero] ?? `Período ${numero}`;
}

export default function PeriodosClient({ periodos, labels }: Props) {
  const router = useRouter();

  const [procesando, setProcesando] = useState<number | null>(null);
  const [mensaje, setMensaje] = useState<{
    tipo: "success" | "error";
    texto: string;
  } | null>(null);

  const [editando, setEditando] = useState<number | null>(null);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaCierre, setFechaCierre] = useState("");

  const ciclos = [...new Set(periodos.map((p) => p.anio))];

  const resumen = [
    { label: labels.total, value: periodos.length },
    {
      label: labels.abiertos,
      value: periodos.filter((p) => p.estado === "Abierto").length,
    },
    {
      label: labels.cerrados,
      value: periodos.filter((p) => p.estado === "Cerrado").length,
    },
    {
      label: labels.pendientes,
      value: periodos.filter((p) => p.estado === "Pendiente").length,
    },
  ];

  async function ejecutarAccion(periodo: PeriodoEvaluativo) {
    const abrir = periodo.estado === "Pendiente";

    if (!abrir && periodo.estado !== "Abierto") return;

    const confirmacion = window.confirm(
      abrir ? labels.confirmarAbrir : labels.confirmarCerrar
    );

    if (!confirmacion) return;

    setProcesando(periodo.id_periodo);
    setMensaje(null);

    try {
      const resultado = abrir
        ? await abrirPeriodoEvaluativo(periodo.id_periodo)
        : await cerrarPeriodoEvaluativo(periodo.id_periodo);

      if (!resultado.success) {
        setMensaje({
          tipo: "error",
          texto: resultado.message || labels.errorOperacion,
        });
        return;
      }

      setMensaje({
        tipo: "success",
        texto: abrir ? labels.exitoAbrir : labels.exitoCerrar,
      });

      router.refresh();
    } catch (error) {
      console.error("Error ejecutando operación del período:", error);
      setMensaje({ tipo: "error", texto: labels.errorOperacion });
    } finally {
      setProcesando(null);
    }
  }

  function iniciarEdicion(periodo: PeriodoEvaluativo) {
    setEditando(periodo.id_periodo);
    setFechaInicio(fechaInput(periodo.fecha_inicio));
    setFechaCierre(fechaInput(periodo.fecha_cierre));
    setMensaje(null);
  }

  function cancelarEdicion() {
    setEditando(null);
    setFechaInicio("");
    setFechaCierre("");
  }

  async function guardarFechas(idPeriodo: number) {
    if (!fechaInicio || !fechaCierre) {
      setMensaje({ tipo: "error", texto: labels.errorOperacion });
      return;
    }

    if (fechaInicio > fechaCierre) {
        setMensaje({
            tipo: "error",
            texto: labels.fechaInvalida,
        });
        return;
    }

    if (!window.confirm(labels.confirmarFechas)) return;

    setProcesando(idPeriodo);
    setMensaje(null);

    try {
      const resultado = await actualizarFechasPeriodo(
        idPeriodo,
        fechaInicio,
        fechaCierre
      );

      if (!resultado.success) {
        setMensaje({
          tipo: "error",
          texto: resultado.message || labels.errorOperacion,
        });
        return;
      }

      setMensaje({ tipo: "success", texto: labels.exitoFechas });
      cancelarEdicion();
      router.refresh();
    } catch (error) {
      console.error("Error actualizando fechas del período:", error);
      setMensaje({ tipo: "error", texto: labels.errorOperacion });
    } finally {
      setProcesando(null);
    }
  }

  function botonAccion(periodo: PeriodoEvaluativo) {
    if (periodo.estado === "Cerrado") return null;

    const ocupado = procesando === periodo.id_periodo;
    const abrir = periodo.estado === "Pendiente";

    return (
      <button
        type="button"
        disabled={procesando !== null}
        onClick={() => ejecutarAccion(periodo)}
        className={`mt-4 w-full rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
          abrir
            ? "bg-blue-600 text-white hover:bg-blue-700"
            : "bg-amber-600 text-white hover:bg-amber-700"
        }`}
      >
        {ocupado
          ? labels.procesando
          : abrir
            ? labels.abrir
            : labels.cerrar}
      </button>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-intess-dark dark:text-slate-100">
            {labels.title}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {labels.subtitle}
          </p>
        </div>

        <span className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
          {labels.ciclo}: {ciclos.length > 0 ? ciclos.join(", ") : "—"}
        </span>
      </div>

      {mensaje && (
        <div
          role="status"
          aria-live="polite"
          className={`mb-5 rounded-lg border px-4 py-3 text-sm ${
            mensaje.tipo === "success"
              ? "border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950/30 dark:text-green-300"
              : "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
          }`}
        >
          {mensaje.texto}
        </div>
      )}

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

      {periodos.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-10 text-center dark:border-slate-700 dark:bg-slate-900">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
            {labels.sinPeriodos}
          </p>
        </div>
      ) : (
        <>
          <div className="mb-6 grid gap-4 lg:grid-cols-3">
            {periodos.map((periodo) => (
              <section
                key={periodo.id_periodo}
                className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                      {labels.periodo} {periodo.numero}
                    </p>
                    <h2 className="mt-1 text-lg font-semibold text-intess-dark dark:text-slate-100">
                      {nombrePeriodo(periodo.numero)}
                    </h2>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {labels.ciclo} {periodo.anio}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${estadoEstilos[periodo.estado]}`}
                  >
                    {periodo.estado}
                  </span>
                </div>

                {editando === periodo.id_periodo ? (
                  <div className="mt-5 space-y-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                      {labels.fechaInicio}
                      <input
                        type="date"
                        value={fechaInicio}
                        onChange={(e) => setFechaInicio(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      />
                    </label>

                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                      {labels.fechaCierre}
                      <input
                        type="date"
                        value={fechaCierre}
                        min={fechaInicio || undefined}
                        onChange={(e) => setFechaCierre(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      />
                    </label>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={procesando !== null}
                        onClick={() => guardarFechas(periodo.id_periodo)}
                        className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        {procesando === periodo.id_periodo
                          ? labels.procesando
                          : labels.guardarFechas}
                      </button>

                      <button
                        type="button"
                        disabled={procesando !== null}
                        onClick={cancelarEdicion}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        {labels.cancelar}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="mt-5 space-y-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                      <div>
                        <p className="text-xs text-slate-400">
                          {labels.fechaInicio}
                        </p>
                        <p className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-200">
                          {formatearFecha(periodo.fecha_inicio)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-400">
                          {labels.fechaCierre}
                        </p>
                        <p className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-200">
                          {formatearFecha(periodo.fecha_cierre)}
                        </p>
                      </div>
                    </div>

                    {periodo.estado === "Pendiente" && (
                      <button
                        type="button"
                        disabled={procesando !== null}
                        onClick={() => iniciarEdicion(periodo)}
                        className="mt-4 w-full rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        {labels.editarFechas}
                      </button>
                    )}

                    {botonAccion(periodo)}
                  </>
                )}
              </section>
            ))}
          </div>

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
            <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-700">
              <h2 className="text-sm font-semibold text-intess-dark dark:text-slate-100">
                {labels.detalle}
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {labels.detalleDescripcion}
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
                    {[
                      labels.colPeriodo,
                      labels.fechaInicio,
                      labels.fechaCierre,
                      labels.colEstado,
                    ].map((col) => (
                      <th
                        key={col}
                        className="px-5 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {periodos.map((periodo) => (
                    <tr
                      key={periodo.id_periodo}
                      className="border-b border-slate-100 last:border-0 dark:border-slate-800"
                    >
                      <td className="px-5 py-4 text-sm font-medium text-slate-800 dark:text-slate-200">
                        {nombrePeriodo(periodo.numero)}
                        <span className="ml-2 text-xs text-slate-400">
                          ({periodo.anio})
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-400">
                        {formatearFecha(periodo.fecha_inicio)}
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-400">
                        {formatearFecha(periodo.fecha_cierre)}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${estadoEstilos[periodo.estado]}`}
                        >
                          {periodo.estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
