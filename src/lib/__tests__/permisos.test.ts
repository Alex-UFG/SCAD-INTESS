import { describe, it, expect, afterAll, vi } from "vitest";
import { db } from "@/lib/db";
import { mockSession, sesionDe, type Sesion } from "@/test/mock-session";

const estado = vi.hoisted(() => ({ sesion: null as Sesion | null }));
vi.mock("@/lib/session", () => mockSession(estado));

const { getPermisosDeRol, requirePermiso, tienePermiso } = await import("@/lib/permisos");

describe.skipIf(!process.env.DB_HOST)("permisos por rol (seed 002)", () => {
  afterAll(async () => {
    await db.end();
  });

  it("Admin (1) tiene config.ciclos", async () => {
    expect((await getPermisosDeRol(1)).has("config.ciclos")).toBe(true);
  });

  it("Docente (5) no tiene config.ciclos pero si notas.registrar", async () => {
    const permisos = await getPermisosDeRol(5);
    expect(permisos.has("config.ciclos")).toBe(false);
    expect(permisos.has("notas.registrar")).toBe(true);
  });

  it("un codigo inexistente es false, tambien para Admin", async () => {
    expect((await getPermisosDeRol(1)).has("no.existe")).toBe(false);
  });

  it("requirePermiso devuelve la sesion solo si el rol posee el codigo", async () => {
    estado.sesion = null;
    expect(await requirePermiso("config.catalogos")).toBeNull();
    expect(await tienePermiso("config.catalogos")).toBe(false);

    estado.sesion = sesionDe(5);
    expect(await requirePermiso("config.catalogos")).toBeNull();

    estado.sesion = sesionDe(4);
    expect(await requirePermiso("config.catalogos")).toBe(estado.sesion);
    expect(await tienePermiso("config.catalogos")).toBe(true);
    expect(await tienePermiso("config.ciclos")).toBe(false);
  });
});
