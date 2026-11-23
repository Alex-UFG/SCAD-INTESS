import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { db } from "@/lib/db";
import { crearFixtures, limpiarFixtures, COD_MATERIA, ESPECIALIDAD_SEED } from "@/test/db-fixtures";
import { mockSession, sesionDe, type Sesion } from "@/test/mock-session";

const estado = vi.hoisted(() => ({ sesion: null as Sesion | null }));
vi.mock("@/lib/session", () => mockSession(estado));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next-intl/server", () => ({ getTranslations: async () => (k: string) => k }));

const { getMaterias, getMateriaPorCodigo, crearMateria, editarMateria, toggleMateriaActiva } = await import("@/app/actions/materias");

const COD = "ZZT-010";
function fd(obj: Record<string, string | number>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(obj)) f.set(k, String(v));
  return f;
}
const base = { cod_materia: "zzt-010", nombre: "Materia nueva", unidades_valorativas: 2, id_especialidad: ESPECIALIDAD_SEED, grado: 1 };

describe.skipIf(!process.env.DB_HOST)("acciones de materias", () => {
  beforeAll(async () => {
    await crearFixtures();
  });
  afterAll(async () => {
    await db.execute("DELETE FROM materia WHERE cod_materia = ?", [COD]);
    await db.execute("DELETE FROM log_auditoria WHERE tabla_afectada = 'materia' AND id_registro LIKE 'ZZT-%'");
    await limpiarFixtures();
    await db.end();
  });

  it("lecturas con sesion y filtros", async () => {
    estado.sesion = null;
    await expect(getMaterias()).rejects.toThrow("UNAUTHORIZED");
    estado.sesion = sesionDe(5);
    const m = await getMateriaPorCodigo(COD_MATERIA);
    expect(m?.cargas).toBe(1);
    expect(m?.activa).toBe(true);
    expect((await getMaterias({ grado: 3 })).every((x) => x.grado === 3)).toBe(true);
  });

  it("crearMateria: permiso, normalizacion del codigo, duplicado", async () => {
    estado.sesion = sesionDe(5);
    expect((await crearMateria({}, fd(base))).message).toBe("errors.sinPermiso");

    estado.sesion = sesionDe(4);
    const malCodigo = await crearMateria({}, fd({ ...base, cod_materia: "SOFT-1" }));
    expect(malCodigo.errors?.cod_materia).toBeDefined();

    expect((await crearMateria({}, fd(base))).message).toBe("creada");
    expect((await getMateriaPorCodigo(COD))?.nombre).toBe("Materia nueva");
    expect((await crearMateria({}, fd(base))).message).toBe("errors.codigoDuplicado");
  });

  it("editarMateria: nombre libre, grado bloqueado si tiene cargas", async () => {
    estado.sesion = sesionDe(1);
    expect((await editarMateria({}, fd({ ...base, nombre: "Renombrada" }))).message).toBe("actualizada");
    expect((await getMateriaPorCodigo(COD))?.nombre).toBe("Renombrada");
    expect((await editarMateria({}, fd({ ...base, cod_materia: COD_MATERIA, nombre: "Materia de prueba", grado: 2 }))).message).toBe("errors.tieneCargas");
    expect((await editarMateria({}, fd({ ...base, cod_materia: "ZZT-999" }))).message).toBe("errors.noExiste");
  });

  it("toggle: inactiva sale de soloActivas y vuelve", async () => {
    estado.sesion = sesionDe(4);
    expect((await toggleMateriaActiva({}, fd({ cod_materia: COD, activa: "0" }))).message).toBe("desactivada");
    expect((await getMaterias({ soloActivas: true })).some((m) => m.cod_materia === COD)).toBe(false);
    expect((await getMaterias()).some((m) => m.cod_materia === COD)).toBe(true);
    expect((await toggleMateriaActiva({}, fd({ cod_materia: COD, activa: "1" }))).message).toBe("activada");
  });
});
