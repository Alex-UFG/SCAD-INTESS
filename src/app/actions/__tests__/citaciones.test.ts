import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { db } from "@/lib/db";
import { crearFixtures, limpiarFixtures, CICLO_SEED, NIE_BASE, DUI_TUTOR_A, DUI_TUTOR_B, PERIODO_ABIERTO_SEED, type Fixtures } from "@/test/db-fixtures";
import { mockSession, sesionDe, type Sesion } from "@/test/mock-session";
import { ahoraLocal } from "@/lib/disciplina";

const estado = vi.hoisted(() => ({ sesion: null as Sesion | null }));
vi.mock("@/lib/session", () => mockSession(estado));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next-intl/server", () => ({ getTranslations: async () => (k: string) => k }));

const { emitirCitacion, cambiarEstadoCitacion, getCitaciones, getCitacionPorId } = await import("@/app/actions/citaciones");

const EMAIL_OTRO = "otro.docente.zzc@intess.edu.sv";
const NIE = NIE_BASE + 1;
const enDias = (dias: number) => ahoraLocal(new Date(Date.now() + dias * 86_400_000)).replace(" ", "T");

let fx: Fixtures;
let idIncidencia: number;
let idOtroDocente: number;

function fd(campos: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(campos)) f.set(k, v);
  return f;
}
const emitir = (extra: Record<string, string> = {}) =>
  emitirCitacion({}, fd({ id_incidencia: String(idIncidencia), dui_tutor: DUI_TUTOR_A, fecha_citacion: enDias(2), ...extra }));
const cambiar = (id: number, nuevo: string, observaciones = "") =>
  cambiarEstadoCitacion({}, fd({ id_citacion: String(id), estado: nuevo, observaciones }));
const fila = async (id: number) => {
  const [r] = await db.query<RowDataPacket[]>("SELECT estado, observaciones, DATE_FORMAT(fecha_citacion, '%Y-%m-%dT%H:%i') AS fecha FROM citacion WHERE id_citacion = ?", [id!]);
  return r[0];
};

describe.skipIf(!process.env.DB_HOST)("acciones de citaciones", () => {
  beforeAll(async () => {
    fx = await crearFixtures();
    await db.execute("DELETE FROM usuario WHERE email = ?", [EMAIL_OTRO]);
    const [u] = await db.execute<ResultSetHeader>("INSERT INTO usuario (email, password_hash, id_rol, estado) VALUES (?, 'x', 5, 'Activo')", [EMAIL_OTRO]);
    idOtroDocente = u.insertId;
    await db.execute("INSERT INTO estudiante_tutor (nie, dui_tutor, parentesco, contacto_principal) VALUES (?, ?, 'Madre', TRUE)", [NIE, DUI_TUTOR_A]);
    const [inc] = await db.execute<ResultSetHeader>(
      `INSERT INTO incidencia (nie, id_periodo, fecha_incidencia, tipo_falta, descripcion, registrada_por)
       VALUES (?, ?, '2026-05-11', 'Grave', 'Agresion verbal a un companero', ?)`,
      [NIE, PERIODO_ABIERTO_SEED, fx.idUsuarioDocente]
    );
    idIncidencia = inc.insertId;
  });
  afterAll(async () => {
    await limpiarFixtures();
    await db.execute("DELETE FROM usuario WHERE id_usuario = ?", [idOtroDocente]);
    await db.end();
  });

  it("solo quien tiene disciplina.citar emite; se avisa a quien registro la incidencia", async () => {
    estado.sesion = sesionDe(5, fx.idUsuarioDocente);
    expect((await emitir()).message).toBe("errors.sinPermiso");

    estado.sesion = sesionDe(3);
    const fecha = enDias(2);
    const r = await emitir({ fecha_citacion: fecha, observaciones: "Traer DUI" });
    expect(r).toMatchObject({ success: true, message: "emitida" });
    expect(await fila(r.id!)).toMatchObject({ estado: "Emitida", observaciones: "Traer DUI", fecha });

    const [avisos] = await db.query<RowDataPacket[]>("SELECT id_usuario, tipo FROM notificacion WHERE referencia_tipo = 'citacion' AND referencia_id = ?", [String(r.id)]);
    expect(avisos).toEqual([{ id_usuario: fx.idUsuarioDocente, tipo: "Citacion" }]);
    const [log] = await db.query<RowDataPacket[]>("SELECT tipo_accion FROM log_auditoria WHERE tabla_afectada = 'citacion' AND id_registro = ?", [String(r.id)]);
    expect(log.map((l) => l.tipo_accion)).toEqual(["INSERT"]);
  });

  it("validaciones: tutor vinculado, fecha futura e incidencia existente", async () => {
    estado.sesion = sesionDe(3);
    const [antes] = await db.query<RowDataPacket[]>("SELECT COUNT(*) AS n FROM citacion WHERE id_incidencia = ?", [idIncidencia]);

    expect((await emitir({ dui_tutor: DUI_TUTOR_B })).message).toBe("errors.tutorNoVinculado");
    const pasada = await emitir({ fecha_citacion: enDias(-1) });
    expect(pasada.errors?.fecha_citacion).toEqual(["errors.fechaPasada"]);
    expect((await emitir({ fecha_citacion: "2027-01-10" })).errors?.fecha_citacion).toEqual(["errors.fechaInvalida"]);
    expect((await emitir({ id_incidencia: "999999999" })).message).toBe("errors.incidenciaNoExiste");

    const [despues] = await db.query<RowDataPacket[]>("SELECT COUNT(*) AS n FROM citacion WHERE id_incidencia = ?", [idIncidencia]);
    expect(despues[0].n).toBe(antes[0].n);
  });

  it("estados: Emitida -> Entregada -> No_Asistio solo tras la fecha; los finales no cambian", async () => {
    estado.sesion = sesionDe(3);
    const { id } = await emitir();

    expect((await cambiar(id!, "No_Asistio")).message).toBe("errors.reunionPendiente");
    expect((await cambiar(id!, "Entregada", "Recibio la madre")).success).toBe(true);
    expect((await cambiar(id!, "Emitida")).message).toBe("errors.transicionInvalida");
    expect((await cambiar(999999999, "Atendida")).message).toBe("errors.noExiste");

    estado.sesion = sesionDe(5, fx.idUsuarioDocente);
    expect((await cambiar(id!, "Atendida")).message).toBe("errors.sinPermiso");

    estado.sesion = sesionDe(3);
    await db.execute("UPDATE citacion SET fecha_citacion = '2026-01-05 08:00:00' WHERE id_citacion = ?", [id!]);
    expect((await cambiar(id!, "No_Asistio")).success).toBe(true);
    // sin observaciones nuevas se conservan las anteriores
    expect(await fila(id!)).toMatchObject({ estado: "No_Asistio", observaciones: "Recibio la madre" });
    expect((await cambiar(id!, "Atendida")).message).toBe("errors.transicionInvalida");

    const otra = await emitir();
    expect((await cambiar(otra.id!, "Atendida", "Se firmo acta de compromiso")).success).toBe(true);
    expect(await fila(otra.id!)).toMatchObject({ estado: "Atendida", observaciones: "Se firmo acta de compromiso" });
  });

  it("consultas: alcance por rol, filtro por estado y datos para imprimir", async () => {
    estado.sesion = sesionDe(3);
    const todas = await getCitaciones({ idIncidencia });
    expect(todas).toHaveLength(3);
    expect(todas[0]).toMatchObject({ nie: NIE, estudiante: "Alumno Prueba1", tutor: "Tutor A", telefono: "7000-0001", parentesco: "Madre", tipo_falta: "Grave" });
    expect((await getCitaciones({ idIncidencia, estado: "Atendida" })).map((c) => c.estado)).toEqual(["Atendida"]);

    const detalle = await getCitacionPorId(todas[0].id_citacion);
    expect(detalle).toMatchObject({ fecha_incidencia: "2026-05-11", descripcion: "Agresion verbal a un companero", seccion: null });
    expect(detalle).not.toHaveProperty("registrada_por");
    await db.execute(
      "INSERT INTO matricula (nie, id_seccion, id_ciclo, fecha_matricula, estado, registrada_por) VALUES (?, ?, ?, '2026-01-19', 'Vigente', 1)",
      [NIE, fx.idSeccion, CICLO_SEED]
    );
    expect((await getCitacionPorId(todas[0].id_citacion))?.seccion).toBe("1° ZT");

    // quien registro la incidencia ve sus citaciones; otro docente y secretaria, ninguna
    estado.sesion = sesionDe(5, fx.idUsuarioDocente);
    expect(await getCitaciones({ idIncidencia })).toHaveLength(3);
    expect(await getCitacionPorId(todas[0].id_citacion)).not.toBeNull();
    estado.sesion = sesionDe(5, idOtroDocente);
    expect(await getCitaciones()).toEqual([]);
    expect(await getCitacionPorId(todas[0].id_citacion)).toBeNull();
    estado.sesion = sesionDe(4);
    expect(await getCitaciones()).toEqual([]);
    expect(await getCitacionPorId(todas[0].id_citacion)).toBeNull();
  });
});
