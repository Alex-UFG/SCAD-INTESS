import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { db } from "@/lib/db";
import { crearFixtures, limpiarFixtures, CICLO_SEED, DUI_DOCENTE, ESPECIALIDAD_SEED, NIE_BASE, type Fixtures } from "@/test/db-fixtures";
import { mockSession, sesionDe, type Sesion } from "@/test/mock-session";

const estado = vi.hoisted(() => ({ sesion: null as Sesion | null }));
vi.mock("@/lib/session", () => mockSession(estado));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next-intl/server", () => ({ getTranslations: async () => (k: string) => k }));

const { getSecciones, getSeccionPorId, crearSeccion, editarSeccion } = await import("@/app/actions/secciones");

let fx: Fixtures;
let idCicloCerrado = 0;
function fd(obj: Record<string, string | number>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(obj)) f.set(k, String(v));
  return f;
}
const base = { nombre: "zv", grado: 1, id_especialidad: ESPECIALIDAD_SEED, id_ciclo: CICLO_SEED, dui_docente_guia: DUI_DOCENTE, capacidad_max: 30 };

describe.skipIf(!process.env.DB_HOST)("acciones de secciones", () => {
  beforeAll(async () => {
    fx = await crearFixtures();
    const [r] = await db.execute<ResultSetHeader>(
      "INSERT INTO ciclo_escolar (anio, fecha_inicio, fecha_fin, estado) VALUES (2097, '2097-01-20', '2097-11-06', 'Cerrado')"
    );
    idCicloCerrado = r.insertId;
  });
  afterAll(async () => {
    await db.execute("DELETE FROM seccion WHERE nombre = 'ZV' AND id_ciclo = ?", [CICLO_SEED]);
    await db.execute("DELETE FROM ciclo_escolar WHERE id_ciclo = ?", [idCicloCerrado]);
    await db.execute("DELETE FROM log_auditoria WHERE tabla_afectada = 'seccion' AND id_usuario = 1 AND ip_origen = '0.0.0.0'");
    await limpiarFixtures();
    await db.end();
  });

  it("lecturas: nombre del docente guia y matriculas vigentes", async () => {
    estado.sesion = null;
    await expect(getSecciones()).rejects.toThrow("UNAUTHORIZED");
    estado.sesion = sesionDe(5);
    await db.execute("UPDATE seccion SET dui_docente_guia = ? WHERE id_seccion = ?", [DUI_DOCENTE, fx.idSeccion]);
    await db.execute(
      "INSERT INTO matricula (nie, id_seccion, id_ciclo, fecha_matricula, estado, registrada_por) VALUES (?, ?, ?, '2026-02-01', 'Vigente', 1)",
      [NIE_BASE + 1, fx.idSeccion, CICLO_SEED]
    );
    const s = await getSeccionPorId(fx.idSeccion);
    expect(s?.docente_guia).toBe("Docente Prueba");
    expect(s?.vigentes).toBe(1);
    expect((await getSecciones(CICLO_SEED)).every((x) => x.id_ciclo === CICLO_SEED)).toBe(true);
  });

  it("crearSeccion: permiso config.catalogos (Secretaria si, Coordinador no)", async () => {
    estado.sesion = sesionDe(3);
    expect((await crearSeccion({}, fd(base))).message).toBe("errors.sinPermiso");
    estado.sesion = sesionDe(4);
    expect((await crearSeccion({}, fd({ ...base, dui_docente_guia: "00000000-0" }))).errors?.dui_docente_guia).toEqual(["errors.docenteNoExiste"]);
    expect((await crearSeccion({}, fd({ ...base, id_ciclo: idCicloCerrado }))).message).toBe("errors.cicloCerrado");
    expect((await crearSeccion({}, fd({ ...base, capacidad_max: 5 }))).errors?.capacidad_max).toBeDefined();
    expect((await crearSeccion({}, fd(base))).message).toBe("exito");
    // nombre normalizado a mayusculas; duplicado por (ciclo, grado, especialidad, nombre)
    expect((await getSecciones(CICLO_SEED)).some((s) => s.nombre === "ZV" && s.docente_guia === "Docente Prueba")).toBe(true);
    expect((await crearSeccion({}, fd(base))).message).toBe("errors.duplicada");
  });

  it("editarSeccion: con matriculas solo cambian guia y capacidad; nunca por debajo de vigentes", async () => {
    estado.sesion = sesionDe(4);
    const actual = (await getSeccionPorId(fx.idSeccion))!;
    const datos = { nombre: actual.nombre, grado: actual.grado, id_especialidad: actual.id_especialidad, id_ciclo: actual.id_ciclo, dui_docente_guia: "", capacidad_max: 12 };

    expect((await editarSeccion({}, fd({ ...datos, id_seccion: fx.idSeccion, nombre: "ZW" }))).message).toBe("errors.tieneMatriculas");
    expect((await editarSeccion({}, fd({ ...datos, id_seccion: fx.idSeccion, id_ciclo: idCicloCerrado }))).message).toBe("errors.cicloNoEditable");

    await db.execute("UPDATE seccion SET capacidad_max = 20 WHERE id_seccion = ?", [fx.idSeccion]);
    for (let i = 2; i <= 3; i++) {
      await db.execute(
        "INSERT INTO matricula (nie, id_seccion, id_ciclo, fecha_matricula, estado, registrada_por) VALUES (?, ?, ?, '2026-02-01', 'Vigente', 1)",
        [NIE_BASE + i, fx.idSeccion, CICLO_SEED]
      );
    }
    await db.execute("UPDATE seccion SET capacidad_max = 3 WHERE id_seccion = ?", [fx.idSeccion]);
    // 3 vigentes: pedir 10 (minimo del formulario) es valido; forzar 2 debe rechazarse antes del minimo? no: zod min 10 gana
    const bajo = await editarSeccion({}, fd({ ...datos, id_seccion: fx.idSeccion, capacidad_max: 2 }));
    expect(bajo.errors?.capacidad_max).toBeDefined();

    const ok = await editarSeccion({}, fd({ ...datos, id_seccion: fx.idSeccion, capacidad_max: 15 }));
    expect(ok.message).toBe("actualizada");
    const despues = (await getSeccionPorId(fx.idSeccion))!;
    expect(despues.capacidad_max).toBe(15);
    expect(despues.dui_docente_guia).toBeNull();

    const [log] = await db.query<RowDataPacket[]>(
      "SELECT datos_anteriores FROM log_auditoria WHERE tabla_afectada = 'seccion' AND id_registro = ? AND tipo_accion = 'UPDATE' ORDER BY id_log DESC LIMIT 1",
      [String(fx.idSeccion)]
    );
    expect(log[0].datos_anteriores.dui_docente_guia).toBe(DUI_DOCENTE);
  });

  it("editarSeccion sin matriculas permite cambiar nombre y grado", async () => {
    estado.sesion = sesionDe(1);
    const b = (await getSeccionPorId(fx.idSeccionB))!;
    const ok = await editarSeccion({}, fd({ id_seccion: fx.idSeccionB, nombre: "zu", grado: 2, id_especialidad: b.id_especialidad, id_ciclo: b.id_ciclo, dui_docente_guia: "", capacidad_max: 10 }));
    expect(ok.message).toBe("actualizada");
    expect((await getSeccionPorId(fx.idSeccionB))?.grado).toBe(2);
    expect((await editarSeccion({}, fd({ id_seccion: 999999, ...base }))).message).toBe("errors.noExiste");
  });
});
