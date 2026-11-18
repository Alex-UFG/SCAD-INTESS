import { describe, it, expect, afterAll, vi } from "vitest";
import type { RowDataPacket } from "mysql2";
import { db } from "@/lib/db";
import { CICLO_SEED, PERIODO_ABIERTO_SEED, PERIODO_CERRADO_SEED } from "@/test/db-fixtures";
import { mockSession, sesionDe, type Sesion } from "@/test/mock-session";

const estado = vi.hoisted(() => ({ sesion: null as Sesion | null }));
vi.mock("@/lib/session", () => mockSession(estado));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next-intl/server", () => ({ getTranslations: async () => (k: string) => k }));

const { getCiclos, getCicloPorId, getPeriodoAbierto, crearCiclo, editarCiclo, cambiarEstadoCiclo, guardarPeriodo, cambiarEstadoPeriodo } =
  await import("@/app/actions/ciclos");

const ANIO = 2099;
function fd(obj: Record<string, string | number>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(obj)) f.set(k, String(v));
  return f;
}
async function idCiclo2099() {
  const [r] = await db.query<RowDataPacket[]>("SELECT id_ciclo FROM ciclo_escolar WHERE anio = ?", [ANIO]);
  return r[0]?.id_ciclo as number;
}

describe.skipIf(!process.env.DB_HOST)("acciones de ciclos y periodos", () => {
  afterAll(async () => {
    // restaurar el seed: 2026 Activo con periodo 2 Abierto; borrar 2099
    await db.execute("UPDATE periodo_evaluativo SET estado = 'Abierto' WHERE id_periodo = ?", [PERIODO_ABIERTO_SEED]);
    await db.execute("UPDATE ciclo_escolar SET estado = 'Activo' WHERE id_ciclo = ?", [CICLO_SEED]);
    const id = await idCiclo2099();
    if (id) {
      await db.execute("DELETE FROM periodo_evaluativo WHERE id_ciclo = ?", [id]);
      await db.execute("DELETE FROM ciclo_escolar WHERE id_ciclo = ?", [id]);
      await db.execute("DELETE FROM log_auditoria WHERE tabla_afectada = 'ciclo_escolar' AND id_registro = ?", [String(id)]);
    }
    await db.execute("DELETE FROM log_auditoria WHERE tabla_afectada IN ('ciclo_escolar','periodo_evaluativo') AND id_usuario = 1 AND ip_origen = '0.0.0.0'");
    await db.end();
  });

  it("las lecturas exigen sesion y devuelven el seed", async () => {
    estado.sesion = null;
    await expect(getCiclos()).rejects.toThrow("UNAUTHORIZED");
    estado.sesion = sesionDe(5);
    const ciclos = await getCiclos();
    expect(ciclos.find((c) => c.anio === 2026)?.estado).toBe("Activo");
    expect((await getPeriodoAbierto())?.numero).toBe(2);
    const detalle = await getCicloPorId(CICLO_SEED);
    expect(detalle?.periodos.map((p) => p.estado)).toEqual(["Cerrado", "Abierto", "Pendiente"]);
    expect(detalle?.ciclo.fecha_inicio).toBe("2026-01-19");
  });

  it("crearCiclo: permiso config.ciclos, validacion y 3 trimestres automaticos", async () => {
    estado.sesion = sesionDe(4);
    expect((await crearCiclo({}, fd({ anio: ANIO, fecha_inicio: `${ANIO}-01-20`, fecha_fin: `${ANIO}-11-06` }))).message).toBe("errors.sinPermiso");

    estado.sesion = sesionDe(2);
    const invalido = await crearCiclo({}, fd({ anio: ANIO, fecha_inicio: `${ANIO}-11-06`, fecha_fin: `${ANIO}-01-20` }));
    expect(invalido.success).toBe(false);
    expect(invalido.errors?.fecha_fin).toBeDefined();
    const otroAnio = await crearCiclo({}, fd({ anio: ANIO, fecha_inicio: `2098-01-20`, fecha_fin: `${ANIO}-11-06` }));
    expect(otroAnio.errors?.fecha_inicio).toBeDefined();

    const ok = await crearCiclo({}, fd({ anio: ANIO, fecha_inicio: `${ANIO}-01-20`, fecha_fin: `${ANIO}-11-06` }));
    expect(ok).toEqual({ success: true, message: "creado" });
    const detalle = await getCicloPorId(await idCiclo2099());
    expect(detalle?.ciclo.estado).toBe("Planificado");
    expect(detalle?.periodos).toHaveLength(3);
    expect(detalle?.periodos.map((p) => p.numero)).toEqual([1, 2, 3]);
    expect(detalle?.periodos.every((p) => p.estado === "Pendiente")).toBe(true);
    expect(detalle?.periodos[0].fecha_inicio).toBe(`${ANIO}-01-20`);
    expect(detalle?.periodos[2].fecha_cierre).toBe(`${ANIO}-11-06`);
    for (let i = 1; i < 3; i++) {
      expect(detalle!.periodos[i].fecha_inicio > detalle!.periodos[i - 1].fecha_cierre).toBe(true);
    }

    expect((await crearCiclo({}, fd({ anio: ANIO, fecha_inicio: `${ANIO}-01-20`, fecha_fin: `${ANIO}-11-06` }))).message).toBe("errors.anioDuplicado");
  });

  it("editarCiclo no deja periodos fuera de rango", async () => {
    estado.sesion = sesionDe(1);
    const id = await idCiclo2099();
    const corto = await editarCiclo({}, fd({ id_ciclo: id, anio: ANIO, fecha_inicio: `${ANIO}-01-20`, fecha_fin: `${ANIO}-06-30` }));
    expect(corto.message).toBe("errors.periodosFuera");
    const ok = await editarCiclo({}, fd({ id_ciclo: id, anio: ANIO, fecha_inicio: `${ANIO}-01-15`, fecha_fin: `${ANIO}-11-20` }));
    expect(ok.success).toBe(true);
    expect((await getCicloPorId(id))?.ciclo.fecha_fin).toBe(`${ANIO}-11-20`);
  });

  it("guardarPeriodo valida rango del ciclo, solape y periodos cerrados", async () => {
    estado.sesion = sesionDe(1);
    const { periodos } = (await getCicloPorId(await idCiclo2099()))!;
    const p2 = periodos[1];
    expect((await guardarPeriodo({}, fd({ id_periodo: p2.id_periodo, fecha_inicio: `${ANIO}-01-01`, fecha_cierre: p2.fecha_cierre }))).message).toBe("errors.fueraDelCiclo");
    expect((await guardarPeriodo({}, fd({ id_periodo: p2.id_periodo, fecha_inicio: periodos[0].fecha_inicio, fecha_cierre: p2.fecha_cierre }))).message).toBe("errors.solapaPeriodo");
    const ok = await guardarPeriodo({}, fd({ id_periodo: p2.id_periodo, fecha_inicio: p2.fecha_inicio, fecha_cierre: p2.fecha_cierre }));
    expect(ok.message).toBe("periodoActualizado");
    expect((await guardarPeriodo({}, fd({ id_periodo: PERIODO_CERRADO_SEED, fecha_inicio: "2026-01-19", fecha_cierre: "2026-04-24" }))).message).toBe("errors.periodoCerrado");
  });

  it("solo un ciclo Activo; no se cierra con periodos Abiertos", async () => {
    estado.sesion = sesionDe(2);
    const id = await idCiclo2099();
    expect((await cambiarEstadoCiclo({}, fd({ id_ciclo: id, estado: "Activo" }))).message).toBe("errors.yaHayActivo");
    expect((await cambiarEstadoCiclo({}, fd({ id_ciclo: id, estado: "Cerrado" }))).message).toBe("errors.transicionInvalida");
    expect((await cambiarEstadoCiclo({}, fd({ id_ciclo: CICLO_SEED, estado: "Cerrado" }))).message).toBe("errors.periodoAbierto");
  });

  it("flujo completo: cerrar periodo, cerrar ciclo, activar el nuevo y abrir su primer periodo", async () => {
    estado.sesion = sesionDe(2);
    const id = await idCiclo2099();
    const { periodos } = (await getCicloPorId(id))!;

    expect((await cambiarEstadoPeriodo({}, fd({ id_periodo: periodos[0].id_periodo, estado: "Abierto" }))).message).toBe("errors.cicloNoActivo");

    expect((await cambiarEstadoPeriodo({}, fd({ id_periodo: PERIODO_ABIERTO_SEED, estado: "Cerrado" }))).message).toBe("periodoCerrado");
    expect((await cambiarEstadoCiclo({}, fd({ id_ciclo: CICLO_SEED, estado: "Cerrado" }))).message).toBe("cerrado");
    expect(await getPeriodoAbierto()).toBeNull();

    expect((await cambiarEstadoCiclo({}, fd({ id_ciclo: id, estado: "Activo" }))).message).toBe("activado");
    expect((await cambiarEstadoPeriodo({}, fd({ id_periodo: periodos[0].id_periodo, estado: "Abierto" }))).message).toBe("periodoAbierto");
    expect((await cambiarEstadoPeriodo({}, fd({ id_periodo: periodos[1].id_periodo, estado: "Abierto" }))).message).toBe("errors.yaHayAbierto");
    expect((await cambiarEstadoPeriodo({}, fd({ id_periodo: periodos[1].id_periodo, estado: "Cerrado" }))).message).toBe("errors.transicionInvalida");
    expect((await getPeriodoAbierto())?.id_periodo).toBe(periodos[0].id_periodo);

    const [log] = await db.query<RowDataPacket[]>(
      "SELECT datos_anteriores, datos_nuevos FROM log_auditoria WHERE tabla_afectada = 'ciclo_escolar' AND id_registro = ? ORDER BY id_log DESC LIMIT 1",
      [String(id)]
    );
    expect(log[0].datos_anteriores).toEqual({ estado: "Planificado" });
    expect(log[0].datos_nuevos).toEqual({ estado: "Activo" });

    // ciclo cerrado: no se edita
    expect((await editarCiclo({}, fd({ id_ciclo: CICLO_SEED, anio: 2026, fecha_inicio: "2026-01-19", fecha_fin: "2026-11-06" }))).message).toBe("errors.cicloCerrado");
  });
});
