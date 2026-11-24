"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  getContextoNotas,
  getEstudiantesPorCarga,
  type CargaNota,
  type EstudianteNota,
} from "@/app/actions/notas";
import { guardarNotas } from "@/app/actions/notas-guardar";

type CampoNota = "act1" | "act2" | "examen";

function calcularPromedio(nota: EstudianteNota): number | null {
  if (nota.act1 === null || nota.act2 === null || nota.examen === null) {
    return null;
  }

  return Math.round(
    (nota.act1 * 0.35 + nota.act2 * 0.35 + nota.examen * 0.30) * 100
  ) / 100;
}

export default function NotasPage() {
  const t = useTranslations("notas");

  const [contexto, setContexto] =
    useState<Awaited<ReturnType<typeof getContextoNotas>> | null>(null);

  const [registros, setRegistros] = useState<EstudianteNota[]>([]);
  const [registrosOriginales, setRegistrosOriginales] = useState<EstudianteNota[]>([]);
  const [ciclo, setCiclo] = useState("");
  const [seccion, setSeccion] = useState("");
  const [materia, setMateria] = useState("");
  const [periodo, setPeriodo] = useState("");
  const [busqueda, setBusqueda] = useState("");

  const [cargandoContexto, setCargandoContexto] = useState(true);
  const [cargandoEstudiantes, setCargandoEstudiantes] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    let activo = true;

    async function cargarContexto() {
      try {
        const datos = await getContextoNotas();

        if (!activo) return;

        setContexto(datos);

        const cargasIniciales = datos.cargas;
        const cicloInicial =
          cargasIniciales[0]?.id_ciclo ??
          datos.ciclos.find((item) => item.estado === "Activo")?.id_ciclo ??
          datos.ciclos[0]?.id_ciclo;

        if (cicloInicial === undefined) return;

        setCiclo(String(cicloInicial));

        const cargasCiclo = cargasIniciales.filter(
          (item) => item.id_ciclo === cicloInicial
        );

        setSeccion(String(cargasCiclo[0]?.id_seccion ?? ""));
        setMateria(cargasCiclo[0]?.cod_materia ?? "");

        const periodosCiclo = datos.periodos.filter(
          (item) => item.id_ciclo === cicloInicial
        );

        const periodoInicial =
          periodosCiclo.find((item) => item.estado === "Abierto") ??
          periodosCiclo[0];

        setPeriodo(
          periodoInicial ? String(periodoInicial.id_periodo) : ""
        );
      } catch (err) {
        if (activo) {
          setError(
            err instanceof Error
              ? err.message
              : "No fue posible cargar la información académica."
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

  const ciclosActivos = useMemo(
    () => contexto?.ciclos.filter((item) => item.estado === "Activo") ?? [],
    [contexto]
  );

  const cargasCiclo = useMemo(
    () =>
      contexto?.cargas.filter(
        (item) => String(item.id_ciclo) === ciclo
      ) ?? [],
    [contexto, ciclo]
  );

  const secciones = useMemo(() => {
    const unicas = new Map<number, CargaNota>();

    cargasCiclo.forEach((carga) => {
      if (!unicas.has(carga.id_seccion)) {
        unicas.set(carga.id_seccion, carga);
      }
    });

    return Array.from(unicas.values());
  }, [cargasCiclo]);

  const materias = useMemo(
    () =>
      cargasCiclo.filter(
        (carga) => String(carga.id_seccion) === seccion
      ),
    [cargasCiclo, seccion]
  );

  const periodos = useMemo(
    () =>
      contexto?.periodos.filter(
        (item) => String(item.id_ciclo) === ciclo
      ) ?? [],
    [contexto, ciclo]
  );

  const cargaSeleccionada = useMemo(
    () =>
      cargasCiclo.find(
        (item) =>
          String(item.id_seccion) === seccion &&
          item.cod_materia === materia
      ) ?? null,
    [cargasCiclo, seccion, materia]
  );

  const periodoSeleccionado = periodos.find(
    (item) => String(item.id_periodo) === periodo
  );

  const segundosDesdeCierre = Number(periodoSeleccionado?.segundos_desde_cierre);
  const periodoFueraDePlazo =
    periodoSeleccionado?.estado === "Cerrado" &&
    (periodoSeleccionado.segundos_desde_cierre == null ||
      !Number.isFinite(segundosDesdeCierre) ||
      segundosDesdeCierre >= 72 * 60 * 60);

  const permisoEspecialAplicable =
    Boolean(contexto?.puedeEditarBloqueada) && periodoFueraDePlazo;

  const puedeEditarCalificaciones =
    (periodoSeleccionado?.estado === "Abierto" &&
      Boolean(contexto?.puedeRegistrarNotas)) ||
    permisoEspecialAplicable;

  useEffect(() => {
    let activo = true;

    async function cargarEstudiantes() {
      if (!cargaSeleccionada || !periodoSeleccionado) {
        setRegistros([]);
        setRegistrosOriginales([]);
        return;
      }

      setCargandoEstudiantes(true);
      setError("");
      setMensaje("");
      setRegistros([]);

      try {
        const datos = await getEstudiantesPorCarga(
          cargaSeleccionada.id_carga,
          periodoSeleccionado.id_periodo
        );

        if (activo) {
          setRegistros(datos);
          setRegistrosOriginales(datos);
        }
      } catch (err) {
        if (activo) {
          setError(
            err instanceof Error
              ? err.message
              : "No fue posible consultar los estudiantes."
          );
        }
      } finally {
        if (activo) setCargandoEstudiantes(false);
      }
    }

    void cargarEstudiantes();

    return () => {
      activo = false;
    };
  }, [cargaSeleccionada, periodoSeleccionado]);

  function cambiarCiclo(valor: string) {
    setCiclo(valor);

    const nuevasCargas = contexto?.cargas.filter(
      (item) => String(item.id_ciclo) === valor
    ) ?? [];

    setSeccion(String(nuevasCargas[0]?.id_seccion ?? ""));
    setMateria(nuevasCargas[0]?.cod_materia ?? "");

    const nuevosPeriodos = contexto?.periodos.filter(
      (item) => String(item.id_ciclo) === valor
    ) ?? [];

    const nuevoPeriodo =
      nuevosPeriodos.find((item) => item.estado === "Abierto") ??
      nuevosPeriodos[0];

    setPeriodo(nuevoPeriodo ? String(nuevoPeriodo.id_periodo) : "");
  }

  function cambiarSeccion(valor: string) {
    setSeccion(valor);

    const primeraMateria = cargasCiclo.find(
      (item) => String(item.id_seccion) === valor
    );

    setMateria(primeraMateria?.cod_materia ?? "");
  }

  function cambiarNota(
    nie: number,
    campo: CampoNota,
    valor: string
  ) {
    const nota = valor === "" ? null : Number(valor);

    if (
      nota !== null &&
      (!Number.isFinite(nota) || nota < 0 || nota > 10)
    ) {
      return;
    }

    setRegistros((actuales) =>
      actuales.map((registro) =>
        registro.nie === nie
          ? { ...registro, [campo]: nota }
          : registro
      )
    );

    setMensaje("");
  }

  async function manejarGuardado() {
    if (
      !puedeEditarCalificaciones ||
      !cargaSeleccionada ||
      !periodoSeleccionado ||
      registrosModificados.length === 0
    ) return;

    setGuardando(true);
    setError("");
    setMensaje("");

    try {
      const resultado = await guardarNotas(
        cargaSeleccionada.id_carga,
        periodoSeleccionado.id_periodo,
        registrosModificados.map((registro) => ({
          nie: registro.nie,
          act1: registro.act1,
          act2: registro.act2,
          examen: registro.examen,
        }))
      );

      if (!resultado.success) {
        setError(resultado.message);
        return;
      }

      const actualizados = await getEstudiantesPorCarga(
        cargaSeleccionada.id_carga,
        periodoSeleccionado.id_periodo
      );

      setRegistros(actualizados);
      setRegistrosOriginales(actualizados);
      setMensaje(
        `${resultado.message} Registros guardados: ${resultado.guardadas ?? 0}.`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible guardar las calificaciones."
      );
    } finally {
      setGuardando(false);
    }
  }

  const filtrados = registros.filter((registro) =>
    `${registro.nie} ${registro.nombre}`
      .toLowerCase()
      .includes(busqueda.toLowerCase())
  );

  const promedios = registros.map(calcularPromedio);
  const completos = promedios.filter(
    (promedio): promedio is number => promedio !== null
  );

  const enRiesgo = registros.filter((registro) => {
    const promedio = calcularPromedio(registro);
    return promedio !== null && promedio < 6;
  }).length;

  const promedioGeneral =
    completos.length > 0
      ? (
          completos.reduce((suma, valor) => suma + valor, 0) /
          completos.length
        ).toFixed(2)
      : "—";

  const periodoAbierto = periodoSeleccionado?.estado === "Abierto";
  const puedeRegistrarNotas = Boolean(contexto?.puedeRegistrarNotas);

  const originales = new Map(
    registrosOriginales.map((registro) => [registro.nie, registro])
  );

  const registrosModificados = registros.filter((registro) => {
    const original = originales.get(registro.nie);

    return (
      original !== undefined &&
      (
        registro.act1 !== original.act1 ||
        registro.act2 !== original.act2 ||
        registro.examen !== original.examen
      )
    );
  });

  if (cargandoContexto) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 text-center text-sm text-slate-500">
        Cargando información académica...
      </div>
    );
  }

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
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      )}

      {mensaje && (
        <div className="mb-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-900 dark:bg-green-950/30 dark:text-green-300">
          {mensaje}
        </div>
      )}

      <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
        <h2 className="mb-4 text-sm font-semibold text-intess-dark dark:text-slate-100">
          {t("filtros")}
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm text-slate-600 dark:text-slate-300">
            {t("ciclo")}
            <select
              value={ciclo}
              onChange={(e) => cambiarCiclo(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              {ciclosActivos.map((item) => (
                <option key={item.id_ciclo} value={item.id_ciclo}>
                  {item.anio}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm text-slate-600 dark:text-slate-300">
            {t("seccion")}
            <select
              value={seccion}
              onChange={(e) => cambiarSeccion(e.target.value)}
              disabled={secciones.length === 0}
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              {secciones.map((item) => (
                <option key={item.id_seccion} value={item.id_seccion}>
                  {item.grado}° {item.seccion} — {item.especialidad}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm text-slate-600 dark:text-slate-300">
            {t("materia")}
            <select
              value={materia}
              onChange={(e) => setMateria(e.target.value)}
              disabled={materias.length === 0}
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              {materias.map((item) => (
                <option key={item.cod_materia} value={item.cod_materia}>
                  {item.materia}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm text-slate-600 dark:text-slate-300">
            {t("periodo")}
            <select
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              disabled={periodos.length === 0}
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              {periodos.map((item) => (
                <option key={item.id_periodo} value={item.id_periodo}>
                  {item.numero === 1
                    ? t("primerPeriodo")
                    : item.numero === 2
                      ? t("segundoPeriodo")
                      : item.numero === 3
                        ? t("tercerPeriodo")
                        : `Período ${item.numero}`}
                </option>
              ))}
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

          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {periodoSeleccionado?.estado ?? "Sin período"}
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4 dark:border-slate-700">
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder={t("buscar")}
            className="w-full max-w-sm rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          />

          <button
            type="button"
            onClick={manejarGuardado}
            disabled={
              guardando ||
              cargandoEstudiantes ||
              registros.length === 0 ||
              registrosModificados.length === 0 ||
              !puedeEditarCalificaciones
            }
            className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {guardando ? "Guardando..." : "Guardar calificaciones"}
          </button>
        </div>

        {!periodoAbierto && (
          <div className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
            El período no está abierto. No se permite registrar calificaciones.
          </div>
        )}

        {!puedeRegistrarNotas && (
          <div className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
            Tu usuario tiene permiso de consulta, pero no de registro de calificaciones.
          </div>
        )}

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
              {cargandoEstudiantes ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-sm text-slate-500">
                    Consultando estudiantes...
                  </td>
                </tr>
              ) : !cargaSeleccionada ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-sm text-slate-500">
                    No hay cargas académicas disponibles para este ciclo.
                  </td>
                </tr>
              ) : filtrados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-sm text-slate-500">
                    {registros.length === 0
                      ? "No hay estudiantes matriculados en esta carga académica."
                      : t("sinResultados")}
                  </td>
                </tr>
              ) : (
                filtrados.map((registro) => {
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
                            disabled={
                              !puedeEditarCalificaciones ||
                              (registro.bloqueada && !permisoEspecialAplicable) ||
                              guardando
                            }
                            onChange={(e) =>
                              cambiarNota(
                                registro.nie,
                                campo,
                                e.target.value
                              )
                            }
                            aria-label={`${t(campo)} - ${registro.nombre}`}
                            className="w-20 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-center text-sm text-slate-700 outline-none focus:border-blue-500 disabled:bg-slate-100 disabled:opacity-70 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:disabled:bg-slate-900"
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
                })
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
