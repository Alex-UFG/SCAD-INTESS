"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

const ESTADOS = ["Activo", "Inactivo", "Bloqueado"] as const;
type Estado = (typeof ESTADOS)[number];

export async function aprobarUsuarioAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const id = Number(formData.get("id"));
  if (!session || !Number.isInteger(id)) return;

  await db.query(
    "UPDATE usuario SET estado = 'Activo' WHERE id_usuario = ? AND estado = 'Inactivo'",
    [id]
  );
  revalidatePath("/dashboard/usuarios");
}

export async function setEstadoUsuarioAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const id = Number(formData.get("id"));
  const estado = String(formData.get("estado")) as Estado;
  if (!session || !Number.isInteger(id) || !ESTADOS.includes(estado)) return;
  if (String(id) === session.user.id) return;

  await db.query("UPDATE usuario SET estado = ? WHERE id_usuario = ?", [
    estado,
    id,
  ]);
  revalidatePath("/dashboard/usuarios");
}

export async function setRolUsuarioAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const id = Number(formData.get("id"));
  const rol = Number(formData.get("rol"));
  if (!session || !Number.isInteger(id) || !Number.isInteger(rol)) return;
  if (rol < 1 || rol > 255) return;
  if (String(id) === session.user.id) return;

  await db.query("UPDATE usuario SET id_rol = ? WHERE id_usuario = ?", [
    rol,
    id,
  ]);
  revalidatePath("/dashboard/usuarios");
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
  revalidatePath("/dashboard/roles");
}
