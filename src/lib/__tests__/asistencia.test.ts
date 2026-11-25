import { describe, it, expect } from "vitest";
import { porcentajeAsistencia, hoyISO, UMBRAL_INASISTENCIA } from "@/lib/asistencia";

describe("asistencia (logica pura)", () => {
  it("porcentaje: P, A, T da 66.67", () => {
    expect(porcentajeAsistencia({ presentes: 1, tardanzas: 1, justificados: 0, total: 3 })).toBe(66.67);
  });
  it("porcentaje: sin registros es null", () => {
    expect(porcentajeAsistencia({ presentes: 0, tardanzas: 0, justificados: 0, total: 0 })).toBeNull();
  });
  it("hoyISO devuelve YYYY-MM-DD; umbral 80", () => {
    expect(hoyISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(UMBRAL_INASISTENCIA).toBe(80);
  });
});
