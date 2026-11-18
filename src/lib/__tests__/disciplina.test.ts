import { describe, it, expect } from "vitest";
import {
  TRANSICIONES_CITACION,
  TRANSICIONES_INCIDENCIA,
  ahoraLocal,
  escalaPorReincidencia,
  puedeTransicionar,
} from "@/lib/disciplina";
import { cambioEstadoIncidenciaSchema, citacionSchema, incidenciaSchema } from "@/lib/validations/disciplina";

describe("escalaPorReincidencia", () => {
  it("escala la 3.a falta leve del periodo y luego cada tercera", () => {
    // indice = leves previas; escalan la 3.a, 6.a y 9.a
    expect([0, 1, 2, 3, 4, 5, 6, 7, 8].map(escalaPorReincidencia)).toEqual([false, false, true, false, false, true, false, false, true]);
  });
});

describe("flujo de estados", () => {
  it("incidencia: Abierta -> En_Proceso -> Resuelta <-> Apelada", () => {
    const puede = (de: keyof typeof TRANSICIONES_INCIDENCIA, a: keyof typeof TRANSICIONES_INCIDENCIA) => puedeTransicionar(TRANSICIONES_INCIDENCIA, de, a);
    expect(puede("Abierta", "En_Proceso")).toBe(true);
    expect(puede("En_Proceso", "Resuelta")).toBe(true);
    expect(puede("Resuelta", "Apelada")).toBe(true);
    expect(puede("Apelada", "Resuelta")).toBe(true);
    // no se salta el proceso ni se apela lo que no tiene resolucion
    expect(puede("Abierta", "Resuelta")).toBe(false);
    expect(puede("En_Proceso", "Apelada")).toBe(false);
    expect(puede("Resuelta", "Abierta")).toBe(false);
    expect(puede("Abierta", "Abierta")).toBe(false);
  });

  it("citacion: Atendida y No_Asistio son finales", () => {
    const puede = (de: keyof typeof TRANSICIONES_CITACION, a: keyof typeof TRANSICIONES_CITACION) => puedeTransicionar(TRANSICIONES_CITACION, de, a);
    expect(puede("Emitida", "Entregada")).toBe(true);
    expect(puede("Emitida", "Atendida")).toBe(true);
    expect(puede("Entregada", "No_Asistio")).toBe(true);
    expect(puede("Entregada", "Emitida")).toBe(false);
    expect(puede("Atendida", "No_Asistio")).toBe(false);
    expect(puede("No_Asistio", "Atendida")).toBe(false);
  });
});

describe("ahoraLocal", () => {
  it("da la hora de pared de El Salvador (UTC-6) como YYYY-MM-DD HH:mm", () => {
    expect(ahoraLocal(new Date("2026-11-17T15:04:00Z"))).toBe("2026-11-17 09:04");
    // de madrugada en UTC todavia es el dia anterior en El Salvador
    expect(ahoraLocal(new Date("2026-03-01T03:30:00Z"))).toBe("2026-02-28 21:30");
    expect(ahoraLocal(new Date("2026-06-10T06:00:00Z"))).toBe("2026-06-10 00:00");
  });
});

describe("schemas de disciplina", () => {
  const base = { nie: "123", fecha: "2026-05-11", tipo_falta: "Leve", descripcion: "Interrumpe la clase" };

  it("incidencia: hora opcional, descripcion de 10 a 2000 caracteres", () => {
    expect(incidenciaSchema().parse(base)).toMatchObject({ nie: 123, hora: "" });
    expect(incidenciaSchema().parse({ ...base, hora: "07:45" }).hora).toBe("07:45");
    expect(incidenciaSchema().safeParse({ ...base, hora: "25:00" }).success).toBe(false);
    expect(incidenciaSchema().safeParse({ ...base, descripcion: "  corta  " }).success).toBe(false);
    expect(incidenciaSchema().safeParse({ ...base, descripcion: "x".repeat(2001) }).success).toBe(false);
    expect(incidenciaSchema().safeParse({ ...base, tipo_falta: "Gravisima" }).success).toBe(false);
    expect(incidenciaSchema().safeParse({ ...base, fecha: "11/05/2026" }).success).toBe(false);
    expect(incidenciaSchema().safeParse({ ...base, nie: undefined }).success).toBe(false);
  });

  it("cambio de estado: el texto es opcional en el schema", () => {
    expect(cambioEstadoIncidenciaSchema().parse({ id_incidencia: "4", estado: "En_Proceso" })).toEqual({ id_incidencia: 4, estado: "En_Proceso", texto: "" });
    expect(cambioEstadoIncidenciaSchema().safeParse({ id_incidencia: "4", estado: "Cerrada" }).success).toBe(false);
  });

  it("citacion: fecha con hora en formato datetime-local y DUI del tutor", () => {
    const ok = { id_incidencia: "1", dui_tutor: "01234567-8", fecha_citacion: "2026-12-01T08:30" };
    expect(citacionSchema().parse(ok).observaciones).toBe("");
    expect(citacionSchema().safeParse({ ...ok, fecha_citacion: "2026-12-01" }).success).toBe(false);
    expect(citacionSchema().safeParse({ ...ok, fecha_citacion: "2026-12-01T24:00" }).success).toBe(false);
    expect(citacionSchema().safeParse({ ...ok, dui_tutor: "012345678" }).success).toBe(false);
    expect(citacionSchema().safeParse({ ...ok, observaciones: "x".repeat(501) }).success).toBe(false);
  });
});
