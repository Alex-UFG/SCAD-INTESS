import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import type { RowDataPacket } from "mysql2";
import { db } from "@/lib/db";
import { crearFixtures, limpiarFixtures, NIE_BASE, CICLO_SEED, type Fixtures } from "@/test/db-fixtures";
import { mockSession, sesionDe, type Sesion } from "@/test/mock-session";

const estado = vi.hoisted(() => ({ sesion: null as Sesion | null }));
vi.mock("@/lib/session", () => mockSession(estado));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { getMatriculasPorEstudiante, getCiclosAbiertos, getSecciones, getMatriculas, matricularEstudiante, retirarMatricula, trasladarMatricula } =
  await import("@/app/actions/matriculas");

let fx: Fixtures;
const NIE1 = NIE_BASE + 1;
const NIE2 = NIE_BASE + 2;
const NIE3 = NIE_BASE + 3;

async function estadoEstudiante(nie: number) {
  const [r] = await db.query<RowDataPacket[]>("SELECT estado FROM estudiante WHERE nie = ?", [nie]);
  return r[0]?.estado;
}

describe.skipIf(!process.env.DB_HOST)("acciones de matricula", () => {
  beforeAll(async () => {
    fx = await crearFixtures();
  });
  afterAll(async () => {
    await limpiarFixtures();
    await db.end();
  });

  it("las lecturas exigen sesion", async () => {
    estado.sesion = null;
    await expect(getMatriculasPorEstudiante(NIE1)).rejects.toThrow("UNAUTHORIZED");
    await expect(getCiclosAbiertos()).rejects.toThrow("UNAUTHORIZED");
    await expect(getSecciones()).rejects.toThrow("UNAUTHORIZED");
    await expect(getMatriculas()).rejects.toThrow("UNAUTHORIZED");
  });

  it("Docente no tiene matricula.crear", async () => {
    estado.sesion = sesionDe(5);
    expect(await matricularEstudiante({ nie: NIE1, id_seccion: fx.idSeccion, id_ciclo: CICLO_SEED, fecha_matricula: "2026-02-01" })).toEqual({ success: false, error: "sinPermiso" });
  });

  it("la seccion debe pertenecer al ciclo enviado", async () => {
    estado.sesion = sesionDe(4);
    expect(await matricularEstudiante({ nie: NIE1, id_seccion: fx.idSeccion, id_ciclo: 999, fecha_matricula: "2026-02-01" })).toEqual({ success: false, error: "seccionNoPerteneceAlCiclo" });
  });

  it("seccion y estudiante deben existir", async () => {
    estado.sesion = sesionDe(4);
    expect(await matricularEstudiante({ nie: NIE1, id_seccion: 999999, id_ciclo: CICLO_SEED, fecha_matricula: "2026-02-01" })).toEqual({ success: false, error: "seccionNoExiste" });
    expect(await matricularEstudiante({ nie: 1, id_seccion: fx.idSeccion, id_ciclo: CICLO_SEED, fecha_matricula: "2026-02-01" })).toEqual({ success: false, error: "estudianteNoExiste" });
  });

  it("matricula Vigente, reactiva al estudiante Inactivo y audita", async () => {
    estado.sesion = sesionDe(4);
    await db.execute("UPDATE estudiante SET estado = 'Inactivo' WHERE nie = ?", [NIE1]);

    expect(await matricularEstudiante({ nie: NIE1, id_seccion: fx.idSeccion, id_ciclo: CICLO_SEED, fecha_matricula: "2026-02-01", observaciones: "" })).toEqual({ success: true });

    const [m] = await getMatriculasPorEstudiante(NIE1);
    expect(m.estado).toBe("Vigente");
    expect(m.seccion_nombre).toBe("ZT");
    expect(await estadoEstudiante(NIE1)).toBe("Activo");

    const [log] = await db.query<RowDataPacket[]>(
      "SELECT tipo_accion, datos_nuevos FROM log_auditoria WHERE tabla_afectada = 'matricula' AND id_registro = ?",
      [String(m.id_matricula)]
    );
    expect(log[0].tipo_accion).toBe("INSERT");
    expect(log[0].datos_nuevos.estado).toBe("Vigente");
  });

  it("un estudiante solo tiene una matricula por ciclo", async () => {
    estado.sesion = sesionDe(4);
    expect(await matricularEstudiante({ nie: NIE1, id_seccion: fx.idSeccionB, id_ciclo: CICLO_SEED, fecha_matricula: "2026-02-01" })).toEqual({ success: false, error: "yaMatriculado" });
  });

  it("respeta la capacidad de la seccion", async () => {
    estado.sesion = sesionDe(4);
    await db.execute("UPDATE seccion SET capacidad_max = 1 WHERE id_seccion = ?", [fx.idSeccion]);
    expect(await matricularEstudiante({ nie: NIE2, id_seccion: fx.idSeccion, id_ciclo: CICLO_SEED, fecha_matricula: "2026-02-01" })).toEqual({ success: false, error: "capacidadMaxima" });
    await db.execute("UPDATE seccion SET capacidad_max = 12 WHERE id_seccion = ?", [fx.idSeccion]);
    expect(await matricularEstudiante({ nie: NIE2, id_seccion: fx.idSeccion, id_ciclo: CICLO_SEED, fecha_matricula: "2026-02-01" })).toEqual({ success: true });
  });

  it("un Egresado no se matricula", async () => {
    estado.sesion = sesionDe(4);
    await db.execute("UPDATE estudiante SET estado = 'Egresado' WHERE nie = ?", [NIE3]);
    expect(await matricularEstudiante({ nie: NIE3, id_seccion: fx.idSeccion, id_ciclo: CICLO_SEED, fecha_matricula: "2026-02-01" })).toEqual({ success: false, error: "estudianteEgresado" });
    await db.execute("UPDATE estudiante SET estado = 'Activo' WHERE nie = ?", [NIE3]);
  });

  it("getMatriculas filtra por seccion y estado", async () => {
    estado.sesion = sesionDe(2);
    const enZT = await getMatriculas({ idSeccion: fx.idSeccion });
    expect(enZT.map((m) => m.nie).sort()).toEqual([NIE1, NIE2]);
    expect(await getMatriculas({ idSeccion: fx.idSeccion, estado: "Retirado" })).toEqual([]);
    const activo = await getMatriculas();
    expect(activo.some((m) => m.nie === NIE1)).toBe(true);
  });

  describe("traslado", () => {
    it("Docente no puede trasladar", async () => {
      estado.sesion = sesionDe(5);
      const [m] = await getMatriculasPorEstudiante(NIE1);
      expect(await trasladarMatricula({ id_matricula: m.id_matricula, id_seccion_destino: fx.idSeccionB })).toEqual({ success: false, error: "sinPermiso" });
    });

    it("rechaza misma seccion, seccion llena y seccion inexistente", async () => {
      estado.sesion = sesionDe(4);
      const [m] = await getMatriculasPorEstudiante(NIE1);
      expect(await trasladarMatricula({ id_matricula: m.id_matricula, id_seccion_destino: fx.idSeccion })).toEqual({ success: false, error: "mismaSeccion" });
      expect(await trasladarMatricula({ id_matricula: m.id_matricula, id_seccion_destino: 999999 })).toEqual({ success: false, error: "seccionNoExiste" });
      await db.execute("UPDATE seccion SET capacidad_max = 0 WHERE id_seccion = ?", [fx.idSeccionB]);
      expect(await trasladarMatricula({ id_matricula: m.id_matricula, id_seccion_destino: fx.idSeccionB })).toEqual({ success: false, error: "capacidadMaxima" });
      await db.execute("UPDATE seccion SET capacidad_max = 10 WHERE id_seccion = ?", [fx.idSeccionB]);
    });

    it("mueve la matricula en el mismo ciclo y deja la seccion previa en auditoria", async () => {
      estado.sesion = sesionDe(4);
      const [m] = await getMatriculasPorEstudiante(NIE1);
      expect(await trasladarMatricula({ id_matricula: m.id_matricula, id_seccion_destino: fx.idSeccionB, observaciones: "cambio de turno" })).toEqual({ success: true });
      const [despues] = await getMatriculasPorEstudiante(NIE1);
      expect(despues.id_seccion).toBe(fx.idSeccionB);
      expect(despues.estado).toBe("Vigente");
      expect(despues.observaciones).toContain("cambio de turno");
      const [log] = await db.query<RowDataPacket[]>(
        "SELECT datos_anteriores FROM log_auditoria WHERE tabla_afectada = 'matricula' AND id_registro = ? AND tipo_accion = 'UPDATE' ORDER BY id_log DESC LIMIT 1",
        [String(m.id_matricula)]
      );
      expect(log[0].datos_anteriores).toEqual({ id_seccion: fx.idSeccion });
    });
  });

  describe("retiro", () => {
    it("exige matricula.retirar y una observacion", async () => {
      const [m] = await (async () => { estado.sesion = sesionDe(1); return getMatriculasPorEstudiante(NIE2); })();
      estado.sesion = sesionDe(3);
      expect(await retirarMatricula({ id_matricula: m.id_matricula, motivo: "Retirado", observaciones: "se muda" })).toEqual({ success: false, error: "sinPermiso" });
      estado.sesion = sesionDe(4);
      expect(await retirarMatricula({ id_matricula: m.id_matricula, motivo: "Retirado", observaciones: "" })).toMatchObject({ success: false, error: "checkFields" });
    });

    it("cierra la matricula y el expediente pasa a Retirado", async () => {
      estado.sesion = sesionDe(4);
      const [m] = await getMatriculasPorEstudiante(NIE2);
      expect(await retirarMatricula({ id_matricula: m.id_matricula, motivo: "Trasladado", observaciones: "Se traslada a otro instituto" })).toEqual({ success: true });
      const [despues] = await getMatriculasPorEstudiante(NIE2);
      expect(despues.estado).toBe("Trasladado");
      expect(despues.observaciones).toContain("otro instituto");
      expect(await estadoEstudiante(NIE2)).toBe("Retirado");
    });

    it("no se retira dos veces ni una inexistente", async () => {
      estado.sesion = sesionDe(4);
      const [m] = await getMatriculasPorEstudiante(NIE2);
      expect(await retirarMatricula({ id_matricula: m.id_matricula, motivo: "Retirado", observaciones: "otra vez" })).toEqual({ success: false, error: "matriculaNoVigente" });
      expect(await retirarMatricula({ id_matricula: 999999999, motivo: "Retirado", observaciones: "no existe" })).toEqual({ success: false, error: "matriculaNoExiste" });
    });

    it("un Retirado vuelve a Activo al matricularse de nuevo", async () => {
      estado.sesion = sesionDe(4);
      const [m] = await getMatriculasPorEstudiante(NIE2);
      // la matricula cerrada del mismo ciclo bloquea (uq nie+ciclo): se limpia para simular ciclo nuevo
      await db.execute("DELETE FROM matricula WHERE id_matricula = ?", [m.id_matricula]);
      expect(await matricularEstudiante({ nie: NIE2, id_seccion: fx.idSeccion, id_ciclo: CICLO_SEED, fecha_matricula: "2026-03-01" })).toEqual({ success: true });
      expect(await estadoEstudiante(NIE2)).toBe("Activo");
    });
  });
});
