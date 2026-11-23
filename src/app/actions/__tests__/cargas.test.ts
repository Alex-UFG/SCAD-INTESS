import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { db } from "@/lib/db";
import { crearFixtures, limpiarFixtures, CICLO_SEED, COD_MATERIA, DUI_DOCENTE, ESPECIALIDAD_SEED, NIE_BASE, PERIODO_ABIERTO_SEED, type Fixtures } from "@/test/db-fixtures";
import { mockSession, sesionDe, type Sesion } from "@/test/mock-session";

const estado = vi.hoisted(() => ({ sesion: null as Sesion | null }));
vi.mock("@/lib/session", () => mockSession(estado));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next-intl/server", () => ({ getTranslations: async () => (k: string) => k }));

const { getCargas, getCargasDelDocente, getCargaPorId, asignarCarga, quitarCarga } = await import("@/app/actions/cargas");

let fx: Fixtures;
const MAT_G2 = "ZZT-002";
const MAT_OTRA_ESP = "ZZT-003";
function fd(obj: Record<string, string | number>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(obj)) f.set(k, String(v));
  return f;
}

describe.skipIf(!process.env.DB_HOST)("acciones de carga academica", () => {
  beforeAll(async () => {
    fx = await crearFixtures();
    await db.execute("DELETE FROM materia WHERE cod_materia IN (?, ?)", [MAT_G2, MAT_OTRA_ESP]);
    await db.execute(
      "INSERT INTO materia (cod_materia, nombre, unidades_valorativas, id_especialidad, grado, activa) VALUES (?, 'Grado 2', 1, ?, 2, TRUE), (?, 'Otra esp', 1, 2, 1, TRUE)",
      [MAT_G2, ESPECIALIDAD_SEED, MAT_OTRA_ESP]
    );
  });
  afterAll(async () => {
    await db.execute("DELETE FROM carga_academica WHERE cod_materia IN (?, ?)", [MAT_G2, MAT_OTRA_ESP]);
    await db.execute("DELETE FROM materia WHERE cod_materia IN (?, ?)", [MAT_G2, MAT_OTRA_ESP]);
    await db.execute("DELETE FROM log_auditoria WHERE tabla_afectada = 'carga_academica' AND id_usuario = 1 AND ip_origen = '0.0.0.0'");
    await limpiarFixtures();
    await db.end();
  });

  it("lecturas: por docente (ciclo activo) y por filtro", async () => {
    estado.sesion = null;
    await expect(getCargas()).rejects.toThrow("UNAUTHORIZED");
    estado.sesion = sesionDe(5, fx.idUsuarioDocente);
    const mias = await getCargasDelDocente(fx.idUsuarioDocente);
    expect(mias).toHaveLength(1);
    expect(mias[0]).toMatchObject({ cod_materia: COD_MATERIA, seccion: "ZT", docente: "Docente Prueba", estudiantes: 0 });
    expect((await getCargas({ duiDocente: DUI_DOCENTE, idCiclo: CICLO_SEED })).map((c) => c.id_carga)).toEqual([fx.idCarga]);
    expect((await getCargaPorId(fx.idCarga))?.materia).toBe("Materia de prueba");
  });

  it("asignarCarga: permiso config.carga y reglas de coherencia", async () => {
    const enZU = { dui_docente: DUI_DOCENTE, cod_materia: COD_MATERIA, id_seccion: 0, id_ciclo: CICLO_SEED };
    estado.sesion = sesionDe(3);
    expect((await asignarCarga({}, fd({ ...enZU, id_seccion: fx.idSeccionB }))).message).toBe("errors.sinPermiso");

    estado.sesion = sesionDe(2);
    expect((await asignarCarga({}, fd({ ...enZU, id_seccion: fx.idSeccion }))).message).toBe("errors.duplicada");
    expect((await asignarCarga({}, fd({ ...enZU, id_seccion: fx.idSeccionB, cod_materia: MAT_G2 }))).message).toBe("errors.gradoNoCoincide");
    expect((await asignarCarga({}, fd({ ...enZU, id_seccion: fx.idSeccionB, cod_materia: MAT_OTRA_ESP }))).message).toBe("errors.especialidadNoCoincide");
    expect((await asignarCarga({}, fd({ ...enZU, id_seccion: fx.idSeccionB, cod_materia: "ZZT-404" }))).message).toBe("errors.materiaNoExiste");
    expect((await asignarCarga({}, fd({ ...enZU, id_seccion: 999999 }))).message).toBe("errors.seccionNoExiste");
    expect((await asignarCarga({}, fd({ ...enZU, id_seccion: fx.idSeccionB, id_ciclo: 999 }))).message).toBe("errors.seccionDeOtroCiclo");
    expect((await asignarCarga({}, fd({ ...enZU, id_seccion: fx.idSeccionB, dui_docente: "00000000-0" }))).message).toBe("errors.docenteNoExiste");

    await db.execute("UPDATE materia SET activa = FALSE WHERE cod_materia = ?", [COD_MATERIA]);
    expect((await asignarCarga({}, fd({ ...enZU, id_seccion: fx.idSeccionB }))).message).toBe("errors.materiaInactiva");
    await db.execute("UPDATE materia SET activa = TRUE WHERE cod_materia = ?", [COD_MATERIA]);

    await db.execute("UPDATE docente SET estado = 'Licencia' WHERE dui_docente = ?", [DUI_DOCENTE]);
    expect((await asignarCarga({}, fd({ ...enZU, id_seccion: fx.idSeccionB }))).message).toBe("errors.docenteNoActivo");
    await db.execute("UPDATE docente SET estado = 'Activo' WHERE dui_docente = ?", [DUI_DOCENTE]);

    expect((await asignarCarga({}, fd({ ...enZU, id_seccion: fx.idSeccionB }))).message).toBe("asignada");
    expect(await getCargasDelDocente(fx.idUsuarioDocente)).toHaveLength(2);
  });

  it("quitarCarga: bloqueada con notas registradas, libre sin registros", async () => {
    estado.sesion = sesionDe(2);
    await db.execute(
      "INSERT INTO nota (nie, cod_materia, id_periodo, nota_act1, dui_docente) VALUES (?, ?, ?, 8, ?)",
      [NIE_BASE + 1, COD_MATERIA, PERIODO_ABIERTO_SEED, DUI_DOCENTE]
    );
    expect((await quitarCarga({}, fd({ id_carga: fx.idCarga }))).message).toBe("errors.tieneRegistros");
    await db.execute("DELETE FROM nota WHERE nie = ?", [NIE_BASE + 1]);

    const nueva = (await getCargas({ duiDocente: DUI_DOCENTE, idSeccion: fx.idSeccionB }))[0];
    expect((await quitarCarga({}, fd({ id_carga: nueva.id_carga }))).message).toBe("eliminada");
    expect(await getCargasDelDocente(fx.idUsuarioDocente)).toHaveLength(1);
    expect((await quitarCarga({}, fd({ id_carga: 999999 }))).message).toBe("errors.noExiste");
  });
});
