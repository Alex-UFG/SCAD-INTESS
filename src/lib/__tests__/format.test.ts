import { describe, it, expect } from "vitest";
import { nombreCompleto, formatFecha } from "@/lib/format";

describe("nombreCompleto", () => {
  it("omite segmentos nulos o vacios", () => {
    expect(
      nombreCompleto({
        primer_nombre: "Ana",
        segundo_nombre: null,
        primer_apellido: "Perez",
        segundo_apellido: "",
      })
    ).toBe("Ana Perez");
  });

  it("une los cuatro segmentos cuando existen", () => {
    expect(
      nombreCompleto({
        primer_nombre: "Ana",
        segundo_nombre: "Maria",
        primer_apellido: "Perez",
        segundo_apellido: "Lopez",
      })
    ).toBe("Ana Maria Perez Lopez");
  });
});

describe("formatFecha", () => {
  it("no retrocede un dia para fechas DATE en UTC", () => {
    expect(formatFecha("2026-01-19T00:00:00.000Z", "en-US")).toBe("1/19/2026");
  });
});
