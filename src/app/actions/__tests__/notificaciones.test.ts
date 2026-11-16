import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import type { RowDataPacket } from "mysql2";
import { db } from "@/lib/db";
import { crearFixtures, limpiarFixtures, PERIODO_ABIERTO_SEED, CICLO_SEED, type Fixtures } from "@/test/db-fixtures";
import { mockSession, sesionDe, type Sesion } from "@/test/mock-session";

const estado = vi.hoisted(() => ({ sesion: null as Sesion | null }));
vi.mock("@/lib/session", () => mockSession(estado));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next-intl/server", () => ({ getTranslations: async () => (k: string) => k }));

const { getNotificaciones, contarNoLeidas, marcarLeida, marcarTodasLeidas } = await import("@/app/actions/notificaciones");
const { cambiarEstadoPeriodo } = await import("@/app/actions/ciclos");
const { notificarPorPermiso, crearNotificacion } = await import("@/lib/notificaciones");

const ADMIN = 1;
let fx: Fixtures;

const fd = (obj: Record<string, string | number>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(obj)) f.set(k, String(v));
  return f;
};
const filas = async (idUsuario: number) => {
  const [r] = await db.query<RowDataPacket[]>("SELECT * FROM notificacion WHERE id_usuario = ?", [idUsuario]);
  return r;
};

describe.skipIf(!process.env.DB_HOST)("notificaciones", () => {
  beforeAll(async () => {
    fx = await crearFixtures();
    await db.execute("DELETE FROM notificacion");
  });

  afterAll(async () => {
    // el seed no trae notificaciones: se borra todo lo generado
    await db.execute("DELETE FROM notificacion");
    await db.execute("UPDATE periodo_evaluativo SET estado = 'Abierto' WHERE id_periodo = ?", [PERIODO_ABIERTO_SEED]);
    await db.execute("UPDATE ciclo_escolar SET estado = 'Activo' WHERE id_ciclo = ?", [CICLO_SEED]);
    await db.execute("DELETE FROM log_auditoria WHERE tabla_afectada = 'periodo_evaluativo' AND id_usuario = 1 AND ip_origen = '0.0.0.0'");
    await limpiarFixtures();
    await db.end();
  });

  it("notificarPorPermiso crea filas solo para roles con el permiso", async () => {
    await notificarPorPermiso(db, "notas.registrar", { tipo: "Sistema", titulo: "t", mensaje: "m", referenciaTipo: "x", referenciaId: 7 });
    const docente = await filas(fx.idUsuarioDocente);
    expect(docente).toHaveLength(1);
    expect(docente[0]).toMatchObject({ tipo: "Sistema", titulo: "t", referencia_tipo: "x", referencia_id: "7", leida: 0 });
    expect(await filas(ADMIN)).toHaveLength(1);
    // roles sin notas.registrar (2, 3, 4) no reciben nada
    const [otros] = await db.query<RowDataPacket[]>(
      "SELECT COUNT(*) AS n FROM notificacion n INNER JOIN usuario u ON u.id_usuario = n.id_usuario WHERE u.id_rol NOT IN (1, 5)"
    );
    expect(Number(otros[0].n)).toBe(0);
  });

  it("contarNoLeidas y marcarLeida solo afectan al usuario de la sesion", async () => {
    estado.sesion = null;
    expect(await contarNoLeidas()).toBe(0);
    await expect(getNotificaciones()).rejects.toThrow("UNAUTHORIZED");

    estado.sesion = sesionDe(5, fx.idUsuarioDocente);
    expect(await contarNoLeidas()).toBe(1);
    const propias = await getNotificaciones();
    expect(propias).toHaveLength(1);

    const ajena = (await filas(ADMIN))[0].id_notificacion;
    await marcarLeida({}, fd({ id_notificacion: ajena }));
    expect((await filas(ADMIN))[0].leida).toBe(0);

    await marcarLeida({}, fd({ id_notificacion: propias[0].id_notificacion }));
    expect(await contarNoLeidas()).toBe(0);
    expect((await filas(ADMIN))[0].leida).toBe(0);
  });

  it("marcarTodasLeidas solo marca las del usuario", async () => {
    await crearNotificacion(db, { idUsuario: fx.idUsuarioDocente, tipo: "Citacion", titulo: "a", mensaje: "b" });
    await crearNotificacion(db, { idUsuario: fx.idUsuarioDocente, tipo: "Citacion", titulo: "c", mensaje: "d" });
    expect(await contarNoLeidas()).toBe(2);
    await marcarTodasLeidas();
    expect(await contarNoLeidas()).toBe(0);
    expect((await filas(ADMIN))[0].leida).toBe(0);
  });

  it("cerrar un periodo crea una notificacion Cierre_Periodo", async () => {
    await db.execute("DELETE FROM notificacion");
    estado.sesion = sesionDe(2);
    expect((await cambiarEstadoPeriodo({}, fd({ id_periodo: PERIODO_ABIERTO_SEED, estado: "Cerrado" }))).success).toBe(true);
    const [r] = await db.query<RowDataPacket[]>(
      "SELECT * FROM notificacion WHERE tipo = 'Cierre_Periodo' AND id_usuario = ?",
      [fx.idUsuarioDocente]
    );
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ referencia_tipo: "periodo_evaluativo", referencia_id: String(PERIODO_ABIERTO_SEED) });
  });
});
