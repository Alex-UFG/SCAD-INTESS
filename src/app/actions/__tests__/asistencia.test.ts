import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import type { RowDataPacket } from "mysql2";
import { db } from "@/lib/db";
import { crearFixtures, limpiarFixtures, CICLO_SEED, NIE_BASE, PERIODO_ABIERTO_SEED, COD_MATERIA, DUI_DOCENTE, type Fixtures } from "@/test/db-fixtures";
import { mockSession, sesionDe, type Sesion } from "@/test/mock-session";
import { hoyISO } from "@/lib/asistencia";

const estado = vi.hoisted(() => ({ sesion: null as Sesion | null }));
vi.mock("@/lib/session", () => mockSession(estado));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next-intl/server", () => ({ getTranslations: async () => (k: string) => k }));

const { getPaseLista, guardarPaseLista, getResumenAsistencia, getDetalleAsistencia, getIndicadoresAsistencia } = await import("@/app/actions/asistencia");

let fx: Fixtures;
let cicloOriginal: RowDataPacket;
let periodoOriginal: RowDataPacket;
const HOY = hoyISO();
const hace = (dias: number) => {
  const d = new Date(`${HOY}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - dias);
  return d.toISOString().slice(0, 10);
};
const NIES = [1, 2, 3].map((i) => NIE_BASE + i);

function fd(idCarga: number, fecha: string, estados: Record<number, [string, string?]>) {
  const f = new FormData();
  f.set("id_carga", String(idCarga));
  f.set("fecha", fecha);
  for (const [nie, [e, obs]] of Object.entries(estados)) {
    f.set(`estado[${nie}]`, e);
    if (obs !== undefined) f.set(`observacion[${nie}]`, obs);
  }
  return f;
}
const contar = async () => {
  const [r] = await db.query<RowDataPacket[]>("SELECT COUNT(*) AS n FROM asistencia WHERE nie IN (?)", [NIES]);
  return Number(r[0].n);
};
const auditorias = async () => {
  const [r] = await db.query<RowDataPacket[]>("SELECT tipo_accion, id_registro FROM log_auditoria WHERE tabla_afectada = 'asistencia' AND id_registro LIKE ? ORDER BY id_log", [`${fx.idCarga}:%`]);
  return r;
};

describe.skipIf(!process.env.DB_HOST)("acciones de asistencia", () => {
  beforeAll(async () => {
    fx = await crearFixtures();
    for (const nie of NIES) {
      await db.execute(
        "INSERT INTO matricula (nie, id_seccion, id_ciclo, fecha_matricula, estado, registrada_por) VALUES (?, ?, ?, '2026-01-19', 'Vigente', 1)",
        [nie, fx.idSeccion, CICLO_SEED]
      );
    }
    // el seed termina ciclo y periodo antes de "hoy": se amplian mientras dura la prueba
    const [rc] = await db.query<RowDataPacket[]>("SELECT DATE_FORMAT(fecha_inicio, '%Y-%m-%d') AS i, DATE_FORMAT(fecha_fin, '%Y-%m-%d') AS f FROM ciclo_escolar WHERE id_ciclo = ?", [CICLO_SEED]);
    cicloOriginal = rc[0];
    const [rp] = await db.query<RowDataPacket[]>("SELECT DATE_FORMAT(fecha_inicio, '%Y-%m-%d') AS i, DATE_FORMAT(fecha_cierre, '%Y-%m-%d') AS f FROM periodo_evaluativo WHERE id_periodo = ?", [PERIODO_ABIERTO_SEED]);
    periodoOriginal = rp[0];
    await db.execute("UPDATE periodo_evaluativo SET fecha_inicio = '2000-01-01', fecha_cierre = '2999-12-31' WHERE id_periodo = ?", [PERIODO_ABIERTO_SEED]);
    await db.execute("UPDATE ciclo_escolar SET fecha_inicio = '2000-01-01', fecha_fin = '2999-12-31' WHERE id_ciclo = ?", [CICLO_SEED]);
  });
  afterAll(async () => {
    if (periodoOriginal) await db.execute("UPDATE periodo_evaluativo SET fecha_inicio = ?, fecha_cierre = ? WHERE id_periodo = ?", [periodoOriginal.i, periodoOriginal.f, PERIODO_ABIERTO_SEED]);
    if (cicloOriginal) await db.execute("UPDATE ciclo_escolar SET fecha_inicio = ?, fecha_fin = ? WHERE id_ciclo = ?", [cicloOriginal.i, cicloOriginal.f, CICLO_SEED]);
    if (fx) await db.execute("DELETE FROM log_auditoria WHERE tabla_afectada = 'asistencia' AND id_registro LIKE ?", [`${fx.idCarga}:%`]);
    await limpiarFixtures();
    await db.end();
  });

  it("docente guarda y re-guardar la misma fecha actualiza sin duplicar; una auditoria por guardado", async () => {
    estado.sesion = sesionDe(5, fx.idUsuarioDocente);
    const fecha = hace(1);
    const r1 = await guardarPaseLista({}, fd(fx.idCarga, fecha, { [NIES[0]]: ["Presente"], [NIES[1]]: ["Ausente"], [NIES[2]]: ["Tardanza"] }));
    expect(r1.message).toBe("guardada");
    expect(await contar()).toBe(3);

    const r2 = await guardarPaseLista({}, fd(fx.idCarga, fecha, { [NIES[1]]: ["Justificado", "Cita medica"] }));
    expect(r2.success).toBe(true);
    expect(await contar()).toBe(3);

    const pase = await getPaseLista(fx.idCarga, fecha);
    expect(pase?.filas.map((f) => f.estado).sort()).toEqual(["Justificado", "Presente", "Tardanza"]);
    expect(pase?.filas.find((f) => f.nie === NIES[1])?.observacion).toBe("Cita medica");

    expect((await auditorias()).map((a) => a.tipo_accion)).toEqual(["INSERT", "UPDATE"]);
  });

  it("Justificado sin observacion falla y no escribe", async () => {
    estado.sesion = sesionDe(5, fx.idUsuarioDocente);
    const antes = await contar();
    const r = await guardarPaseLista({}, fd(fx.idCarga, hace(2), { [NIES[0]]: ["Justificado", "  "] }));
    expect(r.success).toBe(false);
    expect(r.message).toBe("errors.observacionRequerida");
    expect(await contar()).toBe(antes);
  });

  it("fecha: docente no puede ir mas de 7 dias atras; admin si; nadie en el futuro", async () => {
    estado.sesion = sesionDe(5, fx.idUsuarioDocente);
    expect((await guardarPaseLista({}, fd(fx.idCarga, hace(10), { [NIES[0]]: ["Presente"] }))).message).toBe("errors.fechaMuyAntigua");
    expect((await guardarPaseLista({}, fd(fx.idCarga, hace(-1), { [NIES[0]]: ["Presente"] }))).message).toBe("errors.fechaFueraDeRango");
    estado.sesion = sesionDe(1);
    expect((await guardarPaseLista({}, fd(fx.idCarga, hace(10), { [NIES[0]]: ["Presente"] }))).success).toBe(true);
  });

  it("permisos y propiedad de la carga", async () => {
    estado.sesion = sesionDe(4);
    expect((await guardarPaseLista({}, fd(fx.idCarga, hace(1), { [NIES[0]]: ["Presente"] }))).message).toBe("errors.sinPermiso");
    expect(await getPaseLista(fx.idCarga, hace(1))).not.toBeNull();

    estado.sesion = sesionDe(5, fx.idUsuarioDocente);
    expect((await getDetalleAsistencia(NIES[0], CICLO_SEED)).length).toBeGreaterThan(0);

    // otro usuario docente: no es dueno de la carga
    const [u] = await db.execute<import("mysql2").ResultSetHeader>(
      "INSERT INTO usuario (email, password_hash, id_rol, estado) VALUES ('otro.docente.zzt@intess.edu.sv', 'x', 5, 'Activo')"
    );
    const sinAcceso = async () => {
      expect((await guardarPaseLista({}, fd(fx.idCarga, hace(1), { [NIES[0]]: ["Presente"] }))).message).toBe("errors.cargaNoDisponible");
      expect(await getPaseLista(fx.idCarga, hace(1))).toBeNull();
      expect(await getDetalleAsistencia(NIES[0], CICLO_SEED)).toEqual([]);
      expect(await getResumenAsistencia({ idCiclo: CICLO_SEED, idSeccion: fx.idSeccion })).toEqual([]);
    };
    try {
      estado.sesion = sesionDe(5, u.insertId);
      await sinAcceso();
      await db.execute(
        "INSERT INTO docente (dui_docente, id_usuario, primer_nombre, primer_apellido, telefono, fecha_ingreso) VALUES ('99000000-8', ?, 'Otro', 'Docente', '7000-0000', '2020-01-01')",
        [u.insertId]
      );
      await sinAcceso();
    } finally {
      await db.execute("DELETE FROM docente WHERE dui_docente = '99000000-8'");
      await db.execute("DELETE FROM usuario WHERE id_usuario = ?", [u.insertId]);
    }
  });

  it("auditoria: guardar otro estudiante en la misma fecha es INSERT, no UPDATE", async () => {
    estado.sesion = sesionDe(1);
    const fecha = hace(6);
    const antes = (await auditorias()).length;
    await guardarPaseLista({}, fd(fx.idCarga, fecha, { [NIES[0]]: ["Presente"] }));
    await guardarPaseLista({}, fd(fx.idCarga, fecha, { [NIES[1]]: ["Presente"] }));
    expect((await auditorias()).slice(antes).map((a) => a.tipo_accion)).toEqual(["INSERT", "INSERT"]);
  });

  it("solo estudiantes con matricula vigente en la seccion", async () => {
    estado.sesion = sesionDe(1);
    const r = await guardarPaseLista({}, fd(fx.idCarga, hace(1), { [NIE_BASE + 4]: ["Presente"] }));
    expect(r.message).toBe("errors.estudianteInvalido");
  });

  it("resumen: P, A, T da 66.67; detalle e indicadores", async () => {
    estado.sesion = sesionDe(1);
    await db.query("DELETE FROM asistencia WHERE nie IN (?)", [NIES]);
    const fecha = hace(3);
    await guardarPaseLista({}, fd(fx.idCarga, fecha, { [NIES[0]]: ["Presente"], [NIES[1]]: ["Presente"], [NIES[2]]: ["Presente"] }));
    await guardarPaseLista({}, fd(fx.idCarga, hace(4), { [NIES[0]]: ["Ausente"], [NIES[1]]: ["Presente"], [NIES[2]]: ["Presente"] }));
    await guardarPaseLista({}, fd(fx.idCarga, hace(5), { [NIES[0]]: ["Tardanza"], [NIES[1]]: ["Presente"], [NIES[2]]: ["Presente"] }));
    await guardarPaseLista({}, fd(fx.idCarga, HOY, { [NIES[0]]: ["Ausente"] }));

    const filas = await getResumenAsistencia({ idCiclo: CICLO_SEED, idSeccion: fx.idSeccion, hasta: hace(3) });
    const a = filas.find((f) => f.nie === NIES[0])!;
    expect(a).toMatchObject({ total: 3, presentes: 1, ausentes: 1, tardanzas: 1, justificados: 0, porcentaje: 66.67, seccion: "ZT" });
    expect(filas.find((f) => f.nie === NIES[1])?.porcentaje).toBe(100);

    const det = await getDetalleAsistencia(NIES[0], CICLO_SEED);
    expect(det).toHaveLength(4);
    expect(det[0]).toMatchObject({ fecha: HOY, estado: "Ausente", materia: "Materia de prueba" });

    const ind = await getIndicadoresAsistencia();
    expect(ind?.ausenciasHoy).toBeGreaterThanOrEqual(1);
    expect(ind?.bajoUmbral).toBeGreaterThanOrEqual(1);

    estado.sesion = sesionDe(6);
    expect(await getResumenAsistencia({ idCiclo: CICLO_SEED })).toEqual([]);
    expect(await getIndicadoresAsistencia()).toBeNull();
  });

  it("resumen: no cuenta asistencias con fecha fuera del ciclo", async () => {
    estado.sesion = sesionDe(1);
    await db.query("DELETE FROM asistencia WHERE nie IN (?)", [NIES]);
    // registro dentro del ciclo ampliado (2000-01-01 a 2999-12-31)
    await db.execute(
      "INSERT INTO asistencia (nie, cod_materia, fecha, estado, dui_docente) VALUES (?, ?, '2026-03-01', 'Presente', ?)",
      [NIES[0], COD_MATERIA, DUI_DOCENTE]
    );
    // registro ANTERIOR al inicio del ciclo ampliado — no debe contarse
    await db.execute(
      "INSERT INTO asistencia (nie, cod_materia, fecha, estado, dui_docente) VALUES (?, ?, '1999-06-15', 'Presente', ?)",
      [NIES[0], COD_MATERIA, DUI_DOCENTE]
    );
    const filas = await getResumenAsistencia({ idCiclo: CICLO_SEED, idSeccion: fx.idSeccion });
    const a = filas.find((f) => f.nie === NIES[0])!;
    expect(a.total).toBe(1);
  });
});
