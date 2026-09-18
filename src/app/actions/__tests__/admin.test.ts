import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import bcrypt from "bcrypt";
import type { RowDataPacket, ResultSetHeader } from "mysql2";
import { db } from "@/lib/db";
import { mockSession, sesionDe, type Sesion } from "@/test/mock-session";

const estado = vi.hoisted(() => ({ sesion: null as Sesion | null }));
vi.mock("@/lib/session", () => mockSession(estado));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { aprobarUsuarioAction, setEstadoUsuarioAction, setRolUsuarioAction, togglePermisoAction, resetPasswordAction } =
  await import("@/app/actions/admin");

const EMAIL = "solicitante.prueba@intess.edu.sv";
let idUsuario = 0;

function fd(obj: Record<string, string | number>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(obj)) f.set(k, String(v));
  return f;
}

async function usuario() {
  const [r] = await db.query<RowDataPacket[]>("SELECT id_rol, estado, password_hash FROM usuario WHERE id_usuario = ?", [idUsuario]);
  return r[0];
}

async function auditorias() {
  const [r] = await db.query<RowDataPacket[]>(
    "SELECT tipo_accion, datos_anteriores, datos_nuevos FROM log_auditoria WHERE tabla_afectada = 'usuario' AND id_registro = ? ORDER BY id_log",
    [String(idUsuario)]
  );
  return r;
}

describe.skipIf(!process.env.DB_HOST)("acciones de administracion", () => {
  beforeAll(async () => {
    await db.execute("DELETE FROM usuario WHERE email = ?", [EMAIL]);
    const [r] = await db.execute<ResultSetHeader>(
      "INSERT INTO usuario (email, password_hash, id_rol, estado) VALUES (?, 'x', 5, 'Inactivo')",
      [EMAIL]
    );
    idUsuario = r.insertId;
  });
  afterAll(async () => {
    await db.execute("DELETE FROM log_auditoria WHERE tabla_afectada = 'usuario' AND id_registro = ?", [String(idUsuario)]);
    await db.execute("DELETE FROM log_auditoria WHERE tabla_afectada = 'rol_permiso' AND id_registro LIKE '4:%'");
    await db.execute("DELETE FROM usuario WHERE id_usuario = ?", [idUsuario]);
    await db.end();
  });

  it("solo un Admin puede aprobar", async () => {
    estado.sesion = sesionDe(2);
    await aprobarUsuarioAction(fd({ id: idUsuario }));
    expect((await usuario()).estado).toBe("Inactivo");
  });

  it("aprobar activa y audita; aprobar de nuevo no hace nada", async () => {
    estado.sesion = sesionDe(1);
    await aprobarUsuarioAction(fd({ id: idUsuario }));
    expect((await usuario()).estado).toBe("Activo");
    await aprobarUsuarioAction(fd({ id: idUsuario }));
    const logs = await auditorias();
    expect(logs).toHaveLength(1);
    expect(logs[0].datos_anteriores).toEqual({ estado: "Inactivo" });
  });

  it("rol invalido se ignora; rol valido cambia y audita", async () => {
    estado.sesion = sesionDe(1);
    await setRolUsuarioAction(fd({ id: idUsuario, rol: 9 }));
    expect((await usuario()).id_rol).toBe(5);
    await setRolUsuarioAction(fd({ id: idUsuario, rol: "abc" }));
    expect((await usuario()).id_rol).toBe(5);
    await setRolUsuarioAction(fd({ id: idUsuario, rol: 4 }));
    expect((await usuario()).id_rol).toBe(4);
    const logs = await auditorias();
    expect(logs.at(-1)?.datos_nuevos).toEqual({ id_rol: 4 });
  });

  it("el Admin no puede bloquearse a si mismo; bloquear a otro audita", async () => {
    estado.sesion = sesionDe(1, idUsuario);
    await setEstadoUsuarioAction(fd({ id: idUsuario, estado: "Bloqueado" }));
    expect((await usuario()).estado).toBe("Activo");

    estado.sesion = sesionDe(1);
    await setEstadoUsuarioAction(fd({ id: idUsuario, estado: "Suspendido" }));
    expect((await usuario()).estado).toBe("Activo");
    await setEstadoUsuarioAction(fd({ id: idUsuario, estado: "Bloqueado" }));
    expect((await usuario()).estado).toBe("Bloqueado");
    await setEstadoUsuarioAction(fd({ id: idUsuario, estado: "Activo" }));
  });

  it("togglePermiso no toca al Admin y concede/revoca con auditoria", async () => {
    estado.sesion = sesionDe(1);
    const [[p]] = await db.query<RowDataPacket[]>("SELECT id_permiso FROM permiso WHERE codigo = 'auditoria.ver'");
    const idPermiso = p.id_permiso as number;

    await togglePermisoAction(fd({ id_rol: 1, id_permiso: idPermiso, conceder: 0 }));
    const [admin] = await db.query<RowDataPacket[]>("SELECT 1 FROM rol_permiso WHERE id_rol = 1 AND id_permiso = ?", [idPermiso]);
    expect(admin).toHaveLength(1);

    await togglePermisoAction(fd({ id_rol: 4, id_permiso: idPermiso, conceder: 1 }));
    const [dado] = await db.query<RowDataPacket[]>("SELECT 1 FROM rol_permiso WHERE id_rol = 4 AND id_permiso = ?", [idPermiso]);
    expect(dado).toHaveLength(1);

    await togglePermisoAction(fd({ id_rol: 4, id_permiso: idPermiso, conceder: 0 }));
    const [quitado] = await db.query<RowDataPacket[]>("SELECT 1 FROM rol_permiso WHERE id_rol = 4 AND id_permiso = ?", [idPermiso]);
    expect(quitado).toHaveLength(0);

    const [logs] = await db.query<RowDataPacket[]>(
      "SELECT tipo_accion FROM log_auditoria WHERE tabla_afectada = 'rol_permiso' AND id_registro = ? ORDER BY id_log",
      [`4:${idPermiso}`]
    );
    expect(logs.map((l) => l.tipo_accion)).toEqual(["INSERT", "DELETE"]);
  });

  it("resetPassword genera una temporal valida y nunca guarda la clave en la bitacora", async () => {
    estado.sesion = sesionDe(1, idUsuario);
    expect(await resetPasswordAction({}, fd({ id: idUsuario }))).toEqual({ success: false, message: "propiaCuenta" });

    estado.sesion = sesionDe(1);
    const r = await resetPasswordAction({}, fd({ id: idUsuario }));
    expect(r.success).toBe(true);
    expect(r.message).toMatch(/^[A-Za-z0-9]{12}$/);
    expect(await bcrypt.compare(r.message!, (await usuario()).password_hash)).toBe(true);

    const logs = await auditorias();
    const ultimo = logs.at(-1)!;
    expect(ultimo.datos_nuevos.campo).toBe("password_hash");
    expect(JSON.stringify(ultimo)).not.toContain(r.message);

    expect(await resetPasswordAction({}, fd({ id: 999999 }))).toEqual({ success: false, message: "noExiste" });
  });
});
