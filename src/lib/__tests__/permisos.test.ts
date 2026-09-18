import { describe, it, expect } from "vitest";
import { tienePermiso } from "@/lib/permisos";

describe.skipIf(!process.env.DB_HOST)("tienePermiso (seed 002)", () => {
  it("Admin (1) posee config.ciclos", async () => {
    expect(await tienePermiso(1, "config.ciclos")).toBe(true);
  });

  it("Docente (5) no posee config.ciclos pero si notas.registrar", async () => {
    expect(await tienePermiso(5, "config.ciclos")).toBe(false);
    expect(await tienePermiso(5, "notas.registrar")).toBe(true);
  });

  it("un codigo inexistente es false", async () => {
    expect(await tienePermiso(1, "no.existe")).toBe(false);
  });
});
