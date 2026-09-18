import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import type { RowDataPacket } from "mysql2";
import { db } from "@/lib/db";
import { crearFixtures, limpiarFixtures, NIE_BASE, DUI_TUTOR_A, DUI_TUTOR_B } from "@/test/db-fixtures";
import { mockSession, sesionDe, type Sesion } from "@/test/mock-session";

const estado = vi.hoisted(() => ({ sesion: null as Sesion | null }));
vi.mock("@/lib/session", () => mockSession(estado));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { getTutores, getTutorPorDui, getEstudiantesDelTutor, createTutor, updateTutor, vincularEstudianteTutor, desvincularEstudianteTutor } =
  await import("@/app/actions/tutores");

const NIE = NIE_BASE + 1;
const DUI_NUEVO = "99000000-3";
const nuevo = {
  dui_tutor: DUI_NUEVO,
  primer_nombre: "Carla",
  segundo_nombre: "",
  primer_apellido: "Prueba",
  segundo_apellido: "",
  telefono_principal: "7000-0003",
  telefono_alterno: "",
  email: "",
  ocupacion: "Docente",
};

async function principales(nie: number) {
  const [rows] = await db.query<RowDataPacket[]>(
    "SELECT dui_tutor, contacto_principal FROM estudiante_tutor WHERE nie = ? ORDER BY dui_tutor",
    [nie]
  );
  return rows.map((r) => [r.dui_tutor, Boolean(r.contacto_principal)]);
}

describe.skipIf(!process.env.DB_HOST)("acciones de tutores", () => {
  beforeAll(async () => {
    await crearFixtures();
  });
  afterAll(async () => {
    await db.execute("DELETE FROM tutor WHERE dui_tutor = ?", [DUI_NUEVO]);
    await db.execute("DELETE FROM log_auditoria WHERE tabla_afectada = 'tutor' AND id_registro LIKE '99000000%'");
    await limpiarFixtures();
    await db.end();
  });

  it("las lecturas exigen sesion", async () => {
    estado.sesion = null;
    await expect(getTutores()).rejects.toThrow("UNAUTHORIZED");
    await expect(getTutorPorDui(DUI_TUTOR_A)).rejects.toThrow("UNAUTHORIZED");
    await expect(getEstudiantesDelTutor(DUI_TUTOR_A)).rejects.toThrow("UNAUTHORIZED");
  });

  it("createTutor: sin permiso, invalido, exito y duplicado", async () => {
    estado.sesion = sesionDe(5);
    expect(await createTutor(nuevo)).toEqual({ success: false, error: "sinPermiso" });

    estado.sesion = sesionDe(4);
    const invalido = await createTutor({ ...nuevo, dui_tutor: "123" });
    expect(invalido).toMatchObject({ success: false, error: "checkFields" });

    expect(await createTutor(nuevo)).toEqual({ success: true, dui_tutor: DUI_NUEVO });
    expect((await getTutorPorDui(DUI_NUEVO))?.ocupacion).toBe("Docente");
    expect(await createTutor(nuevo)).toEqual({ success: false, error: "duiDuplicado" });
  });

  it("updateTutor exige DUI coincidente y guarda imagen previa", async () => {
    estado.sesion = sesionDe(4);
    expect(await updateTutor(DUI_TUTOR_A, nuevo)).toMatchObject({ success: false, error: "checkFields" });
    expect(await updateTutor(DUI_NUEVO, { ...nuevo, telefono_principal: "7999-9999" })).toEqual({ success: true, dui_tutor: DUI_NUEVO });
    expect((await getTutorPorDui(DUI_NUEVO))?.telefono_principal).toBe("7999-9999");
    const [log] = await db.query<RowDataPacket[]>(
      "SELECT datos_anteriores FROM log_auditoria WHERE tabla_afectada = 'tutor' AND id_registro = ? AND tipo_accion = 'UPDATE'",
      [DUI_NUEVO]
    );
    expect(log[0].datos_anteriores.telefono_principal).toBe("7000-0003");
    expect(await updateTutor("00000000-0", { ...nuevo, dui_tutor: "00000000-0" })).toEqual({ success: false, error: "noExiste" });
  });

  it("vincular: el primero queda principal aunque no lo pida; un nuevo principal degrada al anterior", async () => {
    estado.sesion = sesionDe(4);
    expect(await vincularEstudianteTutor({ nie: NIE, dui_tutor: DUI_TUTOR_A, parentesco: "Madre", contacto_principal: false })).toEqual({ success: true });
    expect(await principales(NIE)).toEqual([[DUI_TUTOR_A, true]]);

    expect(await vincularEstudianteTutor({ nie: NIE, dui_tutor: DUI_TUTOR_B, parentesco: "Padre", contacto_principal: true })).toEqual({ success: true });
    expect(await principales(NIE)).toEqual([[DUI_TUTOR_A, false], [DUI_TUTOR_B, true]]);

    const ficha = await getEstudiantesDelTutor(DUI_TUTOR_B);
    expect(ficha).toHaveLength(1);
    expect(ficha[0]).toMatchObject({ nie: NIE, parentesco: "Padre", contacto_principal: true });
  });

  it("vincular a un estudiante inexistente falla", async () => {
    estado.sesion = sesionDe(4);
    expect(await vincularEstudianteTutor({ nie: 1, dui_tutor: DUI_TUTOR_A, parentesco: "Madre", contacto_principal: false })).toEqual({ success: false, error: "estudianteNoExiste" });
  });

  it("desvincular al principal promueve a otro; el ultimo avisa sinTutor", async () => {
    estado.sesion = sesionDe(4);
    expect(await desvincularEstudianteTutor({ nie: NIE, dui_tutor: DUI_TUTOR_B })).toEqual({ success: true, sinTutor: false });
    expect(await principales(NIE)).toEqual([[DUI_TUTOR_A, true]]);

    expect(await desvincularEstudianteTutor({ nie: NIE, dui_tutor: DUI_TUTOR_B })).toEqual({ success: false, error: "vinculoNoExiste" });

    expect(await desvincularEstudianteTutor({ nie: NIE, dui_tutor: DUI_TUTOR_A })).toEqual({ success: true, sinTutor: true });
    expect(await principales(NIE)).toEqual([]);

    const [log] = await db.query<RowDataPacket[]>(
      "SELECT tipo_accion FROM log_auditoria WHERE tabla_afectada = 'estudiante_tutor' AND id_registro = ? ORDER BY id_log DESC LIMIT 1",
      [`${NIE}:${DUI_TUTOR_A}`]
    );
    expect(log[0].tipo_accion).toBe("DELETE");
  });

  it("Docente no puede vincular ni desvincular", async () => {
    estado.sesion = sesionDe(5);
    expect(await vincularEstudianteTutor({ nie: NIE, dui_tutor: DUI_TUTOR_A, parentesco: "Madre", contacto_principal: true })).toEqual({ success: false, error: "sinPermiso" });
    expect(await desvincularEstudianteTutor({ nie: NIE, dui_tutor: DUI_TUTOR_A })).toEqual({ success: false, error: "sinPermiso" });
  });
});
