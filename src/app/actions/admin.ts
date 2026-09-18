"use server";

import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import bcrypt from "bcrypt";
import { z } from "zod";
import type { RowDataPacket } from "mysql2";
import { getTransaction } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { registrarAuditoria } from "@/lib/audit";
import type { ActionState } from "@/types/actions";

const ESTADOS = ["Activo", "Inactivo", "Bloqueado"] as const;

const idSchema = z.coerce.number().int().positive();
const estadoSchema = z.enum(ESTADOS);
// 1 Admin .. 5 Docente (002_seed.sql); la FK rechaza otros, pero validamos antes
const rolSchema = z.coerce.number().int().min(1).max(5);

interface UsuarioRow extends RowDataPacket {
  id_usuario: number;
  email: string;
  id_rol: number;
  estado: (typeof ESTADOS)[number];
}

/**Fila del usuario bloqueada dentro de la transaccion (imagen previa para auditoria) */
async function bloquearUsuario(connection: Awaited<ReturnType<typeof getTransaction>>, id: number) {
  const [rows] = await connection.query<UsuarioRow[]>(
    "SELECT id_usuario, email, id_rol, estado FROM usuario WHERE id_usuario = ? FOR UPDATE",
    [id]
  );
  return rows[0] ?? null;
}

export async function aprobarUsuarioAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const id = idSchema.safeParse(formData.get("id"));
  if (!session || !id.success) return;

  const connection = await getTransaction();
  try {
    const anterior = await bloquearUsuario(connection, id.data);
    if (!anterior || anterior.estado !== "Inactivo") {
      await connection.rollback();
      return;
    }
    await connection.execute("UPDATE usuario SET estado = 'Activo' WHERE id_usuario = ?", [id.data]);
    await registrarAuditoria(connection, {
      idUsuario: Number(session.user.id),
      tabla: "usuario",
      idRegistro: id.data,
      accion: "UPDATE",
      datosAnteriores: { estado: anterior.estado },
      datos: { estado: "Activo", motivo: "aprobacion" },
    });
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    console.error("Error aprobando usuario:", error);
  } finally {
    connection.release();
  }
  revalidatePath("/dashboard/usuarios");
}

export async function setEstadoUsuarioAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const id = idSchema.safeParse(formData.get("id"));
  const estado = estadoSchema.safeParse(formData.get("estado"));
  if (!session || !id.success || !estado.success) return;
  if (String(id.data) === session.user.id) return;

  const connection = await getTransaction();
  try {
    const anterior = await bloquearUsuario(connection, id.data);
    if (!anterior || anterior.estado === estado.data) {
      await connection.rollback();
      return;
    }
    await connection.execute("UPDATE usuario SET estado = ? WHERE id_usuario = ?", [estado.data, id.data]);
    await registrarAuditoria(connection, {
      idUsuario: Number(session.user.id),
      tabla: "usuario",
      idRegistro: id.data,
      accion: "UPDATE",
      datosAnteriores: { estado: anterior.estado },
      datos: { estado: estado.data },
    });
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    console.error("Error cambiando estado de usuario:", error);
  } finally {
    connection.release();
  }
  revalidatePath("/dashboard/usuarios");
}

export async function setRolUsuarioAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const id = idSchema.safeParse(formData.get("id"));
  const rol = rolSchema.safeParse(formData.get("rol"));
  if (!session || !id.success || !rol.success) return;
  if (String(id.data) === session.user.id) return;

  const connection = await getTransaction();
  try {
    const anterior = await bloquearUsuario(connection, id.data);
    if (!anterior || anterior.id_rol === rol.data) {
      await connection.rollback();
      return;
    }
    await connection.execute("UPDATE usuario SET id_rol = ? WHERE id_usuario = ?", [rol.data, id.data]);
    await registrarAuditoria(connection, {
      idUsuario: Number(session.user.id),
      tabla: "usuario",
      idRegistro: id.data,
      accion: "UPDATE",
      datosAnteriores: { id_rol: anterior.id_rol },
      datos: { id_rol: rol.data },
    });
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    console.error("Error cambiando rol de usuario:", error);
  } finally {
    connection.release();
  }
  revalidatePath("/dashboard/usuarios");
}

export async function togglePermisoAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const idRol = rolSchema.safeParse(formData.get("id_rol"));
  const idPermiso = idSchema.safeParse(formData.get("id_permiso"));
  const conceder = formData.get("conceder") === "1";
  if (!session || !idRol.success || !idPermiso.success) return;
  // Admin conserva siempre todos los permisos
  if (idRol.data === 1) return;

  const connection = await getTransaction();
  try {
    if (conceder) {
      await connection.execute(
        "INSERT IGNORE INTO rol_permiso (id_rol, id_permiso) VALUES (?, ?)",
        [idRol.data, idPermiso.data]
      );
    } else {
      await connection.execute(
        "DELETE FROM rol_permiso WHERE id_rol = ? AND id_permiso = ?",
        [idRol.data, idPermiso.data]
      );
    }
    await registrarAuditoria(connection, {
      idUsuario: Number(session.user.id),
      tabla: "rol_permiso",
      idRegistro: `${idRol.data}:${idPermiso.data}`,
      accion: conceder ? "INSERT" : "DELETE",
      datos: { id_rol: idRol.data, id_permiso: idPermiso.data, concedido: conceder },
    });
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    console.error("Error cambiando permiso:", error);
  } finally {
    connection.release();
  }
  revalidatePath("/dashboard/roles");
}

/**Contrasena temporal legible: 12 caracteres [A-Za-z0-9] */
function generarPasswordTemporal(): string {
  const alfabeto = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const bytes = randomBytes(12);
  let out = "";
  for (const b of bytes) out += alfabeto[b % alfabeto.length];
  return out;
}

/**
 * Cierra el gap 3 (no hay correo ni tokens): el Admin genera una contrasena
 * temporal, la entrega al usuario y este la cambia desde Mi cuenta.
 */
export async function resetPasswordAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireAdmin();
  const id = idSchema.safeParse(formData.get("id"));
  if (!session || !id.success) return { success: false, message: "noAutorizado" };
  if (String(id.data) === session.user.id) return { success: false, message: "propiaCuenta" };

  const temporal = generarPasswordTemporal();
  const hash = await bcrypt.hash(temporal, 10);
  const connection = await getTransaction();
  try {
    const anterior = await bloquearUsuario(connection, id.data);
    if (!anterior) {
      await connection.rollback();
      return { success: false, message: "noExiste" };
    }
    await connection.execute("UPDATE usuario SET password_hash = ? WHERE id_usuario = ?", [hash, id.data]);
    await registrarAuditoria(connection, {
      idUsuario: Number(session.user.id),
      tabla: "usuario",
      idRegistro: id.data,
      accion: "UPDATE",
      // nunca el hash ni la contrasena
      datos: { campo: "password_hash", motivo: "reset por administrador" },
    });
    await connection.commit();
    // la contrasena viaja una sola vez al Admin en el mensaje de la accion
    return { success: true, message: temporal };
  } catch (error) {
    await connection.rollback();
    console.error("Error reseteando contrasena:", error);
    return { success: false, message: "errorServidor" };
  } finally {
    connection.release();
  }
}
