import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import type { ResultSetHeader } from "mysql2";
import { db } from "@/lib/db";
import { crearFixtures, limpiarFixtures, DUI_DOCENTE, ESPECIALIDAD_SEED, type Fixtures } from "@/test/db-fixtures";
import { mockSession, sesionDe, type Sesion } from "@/test/mock-session";
import { necesitaCompletarPerfil, RUTA_COMPLETAR_PERFIL } from "@/lib/docente-guard";

const estado = vi.hoisted(() => ({ sesion: null as Sesion | null }));
vi.mock("@/lib/session", () => mockSession(estado));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next-intl/server", () => ({ getTranslations: async () => (k: string) => k }));

const { getDocentes, getDocentePorDui, getDocentePorUsuario, usuarioTieneDocente, completarPerfilDocente, editarPerfilDocente, setEstadoDocente } =
  await import("@/app/actions/docentes");

let fx: Fixtures;
let idUsuarioNuevo = 0;
const DUI_NUEVO = "99000000-8";
const EMAIL_NUEVO = "docente.nuevo@intess.edu.sv";

function fd(obj: Record<string, string | number>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(obj)) f.set(k, String(v));
  return f;
}
const perfil = (dui: string) => ({
  dui_docente: dui, primer_nombre: "Nuevo", segundo_nombre: "", primer_apellido: "Docente", segundo_apellido: "",
  id_especialidad: ESPECIALIDAD_SEED, telefono: "7111-1111", fecha_ingreso: "2024-02-01",
});

describe("necesitaCompletarPerfil (gap 1)", () => {
  it("solo aplica a rol 5 sin fila docente y fuera de las rutas permitidas", () => {
    expect(necesitaCompletarPerfil(5, false, "/dashboard")).toBe(true);
    expect(necesitaCompletarPerfil(5, false, "/dashboard/notas")).toBe(true);
    expect(necesitaCompletarPerfil(5, false, RUTA_COMPLETAR_PERFIL)).toBe(false);
    expect(necesitaCompletarPerfil(5, false, "/dashboard/cuenta")).toBe(false);
    expect(necesitaCompletarPerfil(5, true, "/dashboard")).toBe(false);
    expect(necesitaCompletarPerfil(1, false, "/dashboard")).toBe(false);
  });
});

describe.skipIf(!process.env.DB_HOST)("acciones de docentes", () => {
  beforeAll(async () => {
    fx = await crearFixtures();
    await db.execute("DELETE FROM usuario WHERE email = ?", [EMAIL_NUEVO]);
    const [r] = await db.execute<ResultSetHeader>("INSERT INTO usuario (email, password_hash, id_rol, estado) VALUES (?, 'x', 5, 'Activo')", [EMAIL_NUEVO]);
    idUsuarioNuevo = r.insertId;
  });
  afterAll(async () => {
    await db.execute("DELETE FROM docente WHERE dui_docente = ?", [DUI_NUEVO]);
    await db.execute("DELETE FROM log_auditoria WHERE id_usuario = ?", [idUsuarioNuevo]);
    await db.execute("DELETE FROM log_auditoria WHERE tabla_afectada = 'docente' AND id_registro LIKE '99000000%'");
    await db.execute("DELETE FROM usuario WHERE id_usuario = ?", [idUsuarioNuevo]);
    await limpiarFixtures();
    await db.end();
  });

  it("lecturas: por usuario, por DUI, listado con cargas del ciclo activo", async () => {
    estado.sesion = null;
    await expect(getDocentes()).rejects.toThrow("UNAUTHORIZED");
    estado.sesion = sesionDe(1);
    expect(await usuarioTieneDocente(fx.idUsuarioDocente)).toBe(true);
    expect(await usuarioTieneDocente(idUsuarioNuevo)).toBe(false);
    expect((await getDocentePorUsuario(fx.idUsuarioDocente))?.dui_docente).toBe(DUI_DOCENTE);
    const d = await getDocentePorDui(DUI_DOCENTE);
    expect(d?.cargas).toBe(1);
    expect(d?.fecha_ingreso).toBe("2020-01-01");
    expect((await getDocentes()).some((x) => x.dui_docente === DUI_DOCENTE)).toBe(true);
  });

  it("completarPerfilDocente: solo rol 5, liga al usuario de la sesion, no duplica", async () => {
    estado.sesion = sesionDe(4, idUsuarioNuevo);
    expect((await completarPerfilDocente({}, fd(perfil(DUI_NUEVO)))).message).toBe("errors.soloDocentes");

    estado.sesion = sesionDe(5, idUsuarioNuevo);
    const malTel = await completarPerfilDocente({}, fd({ ...perfil(DUI_NUEVO), telefono: "123" }));
    expect(malTel.errors?.telefono).toBeDefined();

    expect((await completarPerfilDocente({}, fd(perfil(DUI_NUEVO)))).message).toBe("exito");
    expect((await getDocentePorUsuario(idUsuarioNuevo))?.dui_docente).toBe(DUI_NUEVO);
    // mismo usuario otra vez (uq id_usuario) o mismo DUI: duplicado
    expect((await completarPerfilDocente({}, fd(perfil("99000000-7")))).message).toBe("errors.duplicado");
  });

  it("editarPerfilDocente: el propio docente si, otro docente no, usuarios.editar si", async () => {
    estado.sesion = sesionDe(5, idUsuarioNuevo);
    expect((await editarPerfilDocente({}, fd({ ...perfil(DUI_NUEVO), telefono: "7222-2222" }))).message).toBe("actualizado");
    expect((await getDocentePorDui(DUI_NUEVO))?.telefono).toBe("7222-2222");

    expect((await editarPerfilDocente({}, fd({ ...perfil(DUI_DOCENTE), telefono: "7333-3333" }))).message).toBe("errors.sinPermiso");

    estado.sesion = sesionDe(1);
    expect((await editarPerfilDocente({}, fd({ ...perfil(DUI_DOCENTE), primer_nombre: "Docente", primer_apellido: "Prueba", telefono: "7333-3333" }))).message).toBe("actualizado");
    expect((await editarPerfilDocente({}, fd(perfil("00000000-1")))).message).toBe("errors.noExiste");
  });

  it("setEstadoDocente: exige usuarios.editar; Licencia sale del listado de activos", async () => {
    estado.sesion = sesionDe(5, idUsuarioNuevo);
    expect((await setEstadoDocente({}, fd({ dui_docente: DUI_NUEVO, estado: "Licencia" }))).message).toBe("errors.sinPermiso");
    estado.sesion = sesionDe(1);
    expect((await setEstadoDocente({}, fd({ dui_docente: DUI_NUEVO, estado: "Licencia" }))).message).toBe("estadoActualizado");
    expect((await getDocentes(true)).some((d) => d.dui_docente === DUI_NUEVO)).toBe(false);
    expect((await getDocentes()).find((d) => d.dui_docente === DUI_NUEVO)?.estado).toBe("Licencia");
  });
});
