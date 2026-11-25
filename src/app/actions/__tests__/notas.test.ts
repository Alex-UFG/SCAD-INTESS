import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import type { RowDataPacket } from "mysql2";
import { db } from "@/lib/db";
import { crearFixtures, limpiarFixtures, CICLO_SEED, NIE_BASE, PERIODO_ABIERTO_SEED, PERIODO_CERRADO_SEED, COD_MATERIA, type Fixtures } from "@/test/db-fixtures";
import { mockSession, sesionDe, type Sesion } from "@/test/mock-session";

const estado = vi.hoisted(() => ({ sesion: null as Sesion | null }));
vi.mock("@/lib/session", () => mockSession(estado));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next-intl/server", () => ({ getTranslations: async () => (k: string) => k }));

const { getPlanillaNotas, guardarNotas } = await import("@/app/actions/notas");
const { getEstudiantesReporte, getBoleta, getConstanciaMatricula } = await import("@/app/actions/boletas");

let fx: Fixtures;
const NIES = [1, 2, 3].map((i) => NIE_BASE + i);
const LENTO = 30_000;

function fd(idCarga: number, idPeriodo: number, notas: Record<number, [string, string, string]>) {
  const f = new FormData();
  f.set("id_carga", String(idCarga));
  f.set("id_periodo", String(idPeriodo));
  for (const [nie, [a1, a2, ex]] of Object.entries(notas)) {
    f.set(`act1[${nie}]`, a1);
    f.set(`act2[${nie}]`, a2);
    f.set(`examen[${nie}]`, ex);
  }
  return f;
}
const notasDe = async (idPeriodo: number) => {
  const [r] = await db.query<RowDataPacket[]>(
    "SELECT nie, promedio, riesgo_academico, bloqueada FROM nota WHERE cod_materia = ? AND id_periodo = ? ORDER BY nie",
    [COD_MATERIA, idPeriodo]
  );
  return r.map((n) => ({ nie: n.nie, promedio: n.promedio === null ? null : Number(n.promedio), riesgo: Boolean(n.riesgo_academico), bloqueada: Boolean(n.bloqueada) }));
};
const auditorias = async () => {
  const [r] = await db.query<RowDataPacket[]>(
    "SELECT tipo_accion FROM log_auditoria WHERE tabla_afectada = 'nota' AND JSON_EXTRACT(datos_nuevos, '$.nie') IN (?) ORDER BY id_log",
    [NIES]
  );
  return r.map((a) => a.tipo_accion);
};

describe.skipIf(!process.env.DB_HOST)("acciones de notas y boletas", () => {
  beforeAll(async () => {
    fx = await crearFixtures();
    for (const nie of NIES) {
      await db.execute(
        "INSERT INTO matricula (nie, id_seccion, id_ciclo, fecha_matricula, estado, registrada_por) VALUES (?, ?, ?, '2026-01-19', 'Vigente', 1)",
        [nie, fx.idSeccion, CICLO_SEED]
      );
    }
  }, LENTO);
  afterAll(async () => {
    await db.query("DELETE FROM log_auditoria WHERE tabla_afectada = 'nota' AND JSON_EXTRACT(datos_nuevos, '$.nie') IN (?)", [NIES]);
    await limpiarFixtures();
    await db.end();
  }, LENTO);

  it("docente guarda en periodo Abierto: promedio, riesgo y auditoria por nota; re-guardar actualiza", async () => {
    estado.sesion = sesionDe(5, fx.idUsuarioDocente);
    const r1 = await guardarNotas({}, fd(fx.idCarga, PERIODO_ABIERTO_SEED, { [NIES[0]]: ["10", "8", "9"], [NIES[1]]: ["5", "5", ""] }));
    expect(r1).toMatchObject({ success: true, message: "guardadas" });
    expect(await notasDe(PERIODO_ABIERTO_SEED)).toEqual([
      { nie: NIES[0], promedio: 9, riesgo: false, bloqueada: false },
      { nie: NIES[1], promedio: null, riesgo: false, bloqueada: false },
    ]);

    const r2 = await guardarNotas({}, fd(fx.idCarga, PERIODO_ABIERTO_SEED, { [NIES[1]]: ["5", "5", "4"] }));
    expect(r2.success).toBe(true);
    expect((await notasDe(PERIODO_ABIERTO_SEED))[1]).toEqual({ nie: NIES[1], promedio: 4.7, riesgo: true, bloqueada: false });
    expect(await auditorias()).toEqual(["INSERT", "INSERT", "UPDATE"]);

    const planilla = await getPlanillaNotas(fx.idCarga, PERIODO_ABIERTO_SEED);
    expect(planilla).toMatchObject({ editable: true, autorizacionEspecial: false, motivo: null });
    expect(planilla?.filas.map((f) => [f.nie, f.act1, f.act2, f.examen])).toEqual([
      [NIES[0], 10, 8, 9],
      [NIES[1], 5, 5, 4],
      [NIES[2], null, null, null],
    ]);
  }, LENTO);

  it("validaciones: nota fuera de rango, sin registros y estudiante ajeno a la seccion", async () => {
    estado.sesion = sesionDe(5, fx.idUsuarioDocente);
    expect((await guardarNotas({}, fd(fx.idCarga, PERIODO_ABIERTO_SEED, { [NIES[2]]: ["11", "5", "5"] }))).message).toBe("errors.notaInvalida");
    expect((await guardarNotas({}, fd(fx.idCarga, PERIODO_ABIERTO_SEED, {}))).message).toBe("errors.sinRegistros");
    expect((await guardarNotas({}, fd(fx.idCarga, PERIODO_ABIERTO_SEED, { [NIE_BASE + 4]: ["5", "5", "5"] }))).message).toBe("errors.estudianteInvalido");
    expect((await notasDe(PERIODO_ABIERTO_SEED)).length).toBe(2);
  }, LENTO);

  it("permisos: coordinacion consulta sin registrar; un docente ajeno a la carga no la ve", async () => {
    estado.sesion = sesionDe(3);
    expect((await guardarNotas({}, fd(fx.idCarga, PERIODO_ABIERTO_SEED, { [NIES[2]]: ["5", "5", "5"] }))).message).toBe("errors.sinPermiso");
    expect(await getPlanillaNotas(fx.idCarga, PERIODO_ABIERTO_SEED)).toMatchObject({ editable: false, motivo: "sinPermiso" });

    estado.sesion = sesionDe(5, 1);
    expect(await getPlanillaNotas(fx.idCarga, PERIODO_ABIERTO_SEED)).toBeNull();
    expect((await guardarNotas({}, fd(fx.idCarga, PERIODO_ABIERTO_SEED, { [NIES[2]]: ["5", "5", "5"] }))).message).toBe("errors.cargaNoDisponible");
  }, LENTO);

  it("periodo Cerrado fuera de plazo: el docente no guarda; direccion guarda con autorizacion especial y la nota queda bloqueada", async () => {
    estado.sesion = sesionDe(5, fx.idUsuarioDocente);
    expect(await getPlanillaNotas(fx.idCarga, PERIODO_CERRADO_SEED)).toMatchObject({ editable: false, motivo: "fueraDePlazo" });
    expect((await guardarNotas({}, fd(fx.idCarga, PERIODO_CERRADO_SEED, { [NIES[0]]: ["7", "7", "7"] }))).message).toBe("errors.fueraDePlazo");

    estado.sesion = sesionDe(2);
    expect(await getPlanillaNotas(fx.idCarga, PERIODO_CERRADO_SEED)).toMatchObject({ editable: true, autorizacionEspecial: true });
    const r = await guardarNotas({}, fd(fx.idCarga, PERIODO_CERRADO_SEED, { [NIES[0]]: ["7", "7", "7"] }));
    expect(r).toMatchObject({ success: true, message: "guardadasEspecial" });
    expect(await notasDe(PERIODO_CERRADO_SEED)).toEqual([{ nie: NIES[0], promedio: 7, riesgo: false, bloqueada: true }]);
  }, LENTO);

  it("boleta y constancia: datos del estudiante matriculado y permisos por reporte", async () => {
    estado.sesion = sesionDe(4);
    expect((await getEstudiantesReporte(CICLO_SEED)).filter((e) => NIES.includes(e.nie)).length).toBe(3);

    const boleta = await getBoleta(NIES[1], CICLO_SEED, PERIODO_ABIERTO_SEED);
    expect(boleta).toMatchObject({ numeroPeriodo: 2, estudiante: { nie: NIES[1], seccion: "ZT" } });
    expect(boleta?.materias).toEqual([
      { cod_materia: COD_MATERIA, materia: "Materia de prueba", act1: 5, act2: 5, examen: 4, promedio: 4.7, riesgo_academico: true },
    ]);
    expect(await getBoleta(NIE_BASE + 4, CICLO_SEED, PERIODO_ABIERTO_SEED)).toBeNull();
    expect(await getConstanciaMatricula(NIES[1], CICLO_SEED)).toMatchObject({ nie: NIES[1], grado: 1, seccion: "ZT", fecha_matricula: "2026-01-19" });

    estado.sesion = sesionDe(5, fx.idUsuarioDocente);
    expect(await getEstudiantesReporte(CICLO_SEED)).toEqual([]);
    expect(await getBoleta(NIES[1], CICLO_SEED, PERIODO_ABIERTO_SEED)).toBeNull();
    expect(await getConstanciaMatricula(NIES[1], CICLO_SEED)).toBeNull();
  }, LENTO);
});
