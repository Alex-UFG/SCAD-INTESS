"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import bcrypt from "bcrypt";
import type { RowDataPacket } from "mysql2";
import { db } from "@/lib/db";
import { registrarAuditoria } from "@/lib/audit";
import { requirePermiso } from "@/lib/permisos";
import { requireAdmin } from "@/lib/session";
import { PREF_CAMBIAR_PASSWORD, savePreference } from "@/lib/preferences";

const ESTADOS = ["Activo", "Inactivo", "Bloqueado"] as const;
type Estado = (typeof ESTADOS)[number];

interface UsuarioRow extends RowDataPacket {
  id_usuario: number;
  email: string;
  id_rol: number;
  estado: Estado;
}

export type ResultadoAdmin = { success: true } | { success: false; message: string };

export type ResultadoReset =
  | { success: true; password: string; email: string }
  | { success: false; message: string };

async function cargarUsuario(id: number): Promise<UsuarioRow | null> {
  const [rows] = await db.query<UsuarioRow[]>(
    "SELECT id_usuario, email, id_rol, estado FROM usuario WHERE id_usuario = ? LIMIT 1",
    [id]
  );
  return rows[0] ?? null;
}

export async function aprobarUsuarioAction(formData: FormData): Promise<void> {
  const session = await requirePermiso("usuarios.editar");
  const id = Number(formData.get("id"));
  if (!session || !Number.isInteger(id)) return;

  const previo = await cargarUsuario(id);
  if (!previo || previo.estado !== "Inactivo") return;

  await db.query(
    "UPDATE usuario SET estado = 'Activo' WHERE id_usuario = ? AND estado = 'Inactivo'",
    [id]
  );
  await registrarAuditoria(db, {
    idUsuario: Number(session.user.id),
    tabla: "usuario",
    idRegistro: id,
    accion: "UPDATE",
    datosAnteriores: { estado: previo.estado },
    datos: { estado: "Activo", motivo: "aprobacion" },
  });
  revalidatePath("/dashboard/usuarios");
}

export async function setRolUsuarioAction(formData: FormData): Promise<void> {
  const session = await requirePermiso("usuarios.editar");
  const id = Number(formData.get("id"));
  const rol = Number(formData.get("rol"));
  if (!session || !Number.isInteger(id) || !Number.isInteger(rol)) return;
  if (rol < 1 || rol > 255) return;
  if (String(id) === session.user.id) return;

  const previo = await cargarUsuario(id);
  if (!previo || previo.id_rol === rol) return;

  await db.query("UPDATE usuario SET id_rol = ? WHERE id_usuario = ?", [rol, id]);
  await registrarAuditoria(db, {
    idUsuario: Number(session.user.id),
    tabla: "usuario",
    idRegistro: id,
    accion: "UPDATE",
    datosAnteriores: { id_rol: previo.id_rol },
    datos: { id_rol: rol },
  });
  revalidatePath("/dashboard/usuarios");
}

export async function setEstadoUsuario(id: number, estado: Estado): Promise<ResultadoAdmin> {
  const t = await getTranslations("usuarios");
  const session = await requirePermiso("usuarios.desactivar");
  if (!session) return { success: false, message: t("errors.sinPermiso") };
  if (!Number.isInteger(id) || !ESTADOS.includes(estado)) {
    return { success: false, message: t("errors.invalido") };
  }
  if (String(id) === session.user.id) {
    return { success: false, message: t("errors.propiaCuenta") };
  }

  const previo = await cargarUsuario(id);
  if (!previo) return { success: false, message: t("errors.noExiste") };

  await db.query("UPDATE usuario SET estado = ? WHERE id_usuario = ?", [estado, id]);
  await registrarAuditoria(db, {
    idUsuario: Number(session.user.id),
    tabla: "usuario",
    idRegistro: id,
    accion: "UPDATE",
    datosAnteriores: { estado: previo.estado },
    datos: { estado },
  });
  revalidatePath("/dashboard/usuarios");
  return { success: true };
}

export async function setEstadoUsuarioAction(formData: FormData): Promise<void> {
  const id = Number(formData.get("id"));
  const estado = String(formData.get("estado")) as Estado;
  await setEstadoUsuario(id, estado);
}

export async function resetPasswordUsuario(id: number): Promise<ResultadoReset> {
  const t = await getTranslations("usuarios");
  const session = await requirePermiso("usuarios.editar");
  if (!session) return { success: false, message: t("errors.sinPermiso") };
  if (!Number.isInteger(id)) return { success: false, message: t("errors.invalido") };
  if (String(id) === session.user.id) {
    return { success: false, message: t("errors.propiaCuenta") };
  }

  const usuario = await cargarUsuario(id);
  if (!usuario) return { success: false, message: t("errors.noExiste") };

  const alfabeto = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const bytes = randomBytes(12);
  const password = Array.from(bytes, (b) => alfabeto[b % alfabeto.length]).join("");

  try {
    const hash = await bcrypt.hash(password, 10);
    await db.query("UPDATE usuario SET password_hash = ? WHERE id_usuario = ?", [hash, id]);
    await savePreference(id, PREF_CAMBIAR_PASSWORD, "1");
    await registrarAuditoria(db, {
      idUsuario: Number(session.user.id),
      tabla: "usuario",
      idRegistro: id,
      accion: "UPDATE",
      datos: { campo: "password_hash", motivo: "reset_por_admin" },
    });
  } catch (error) {
    console.error("Error restableciendo contrasena:", error);
    return { success: false, message: t("errors.errorServidor") };
  }

  revalidatePath("/dashboard/usuarios");
  return { success: true, password, email: usuario.email };
}

export async function togglePermisoAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const idRol = Number(formData.get("id_rol"));
  const idPermiso = Number(formData.get("id_permiso"));
  const conceder = formData.get("conceder") === "1";
  if (!session || !Number.isInteger(idRol) || !Number.isInteger(idPermiso)) return;
  if (idRol === 1) return;

  if (conceder) {
    await db.query(
      "INSERT IGNORE INTO rol_permiso (id_rol, id_permiso) VALUES (?, ?)",
      [idRol, idPermiso]
    );
  } else {
    await db.query(
      "DELETE FROM rol_permiso WHERE id_rol = ? AND id_permiso = ?",
      [idRol, idPermiso]
    );
  }
  await registrarAuditoria(db, {
    idUsuario: Number(session.user.id),
    tabla: "rol_permiso",
    idRegistro: `${idRol}:${idPermiso}`,
    accion: conceder ? "INSERT" : "DELETE",
    datos: conceder ? { id_rol: idRol, id_permiso: idPermiso } : undefined,
    datosAnteriores: conceder ? undefined : { id_rol: idRol, id_permiso: idPermiso },
  });
  revalidatePath("/dashboard/roles");
  revalidatePath("/dashboard", "layout");
}
