"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import bcrypt from "bcrypt";
import { z } from "zod";
import type { RowDataPacket } from "mysql2";
import { unstable_update } from "@/auth";
import { db } from "@/lib/db";
import { registrarAuditoria } from "@/lib/audit";
import { requireSession } from "@/lib/session";
import { PREF_CAMBIAR_PASSWORD, savePreference } from "@/lib/preferences";
import type { ActionState } from "@/types/actions";

interface PasswordRow extends RowDataPacket {
  password_hash: string;
}

interface NombreRow extends RowDataPacket {
  valor: string;
}

export async function actualizarNombreAction(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const t = await getTranslations("cuenta");
  const session = await requireSession();
  if (!session) return { success: false, message: t("errors.noAutorizado") };

  const schema = z.object({
    nombre: z.string().trim().min(2, t("errors.nombreMin")).max(120, t("errors.nombreMax")),
  });
  const parsed = schema.safeParse({ nombre: formData.get("nombre") });
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors,
      message: t("errors.revisarCampos"),
    };
  }

  const idUsuario = Number(session.user.id);
  const { nombre } = parsed.data;

  try {
    const [prev] = await db.query<NombreRow[]>(
      "SELECT valor FROM usuario_preferencia WHERE id_usuario = ? AND clave = 'nombre' LIMIT 1",
      [idUsuario]
    );
    await savePreference(idUsuario, "nombre", nombre);
    await registrarAuditoria(db, {
      idUsuario,
      tabla: "usuario_preferencia",
      idRegistro: `${idUsuario}:nombre`,
      accion: "UPDATE",
      datosAnteriores: { nombre: prev[0]?.valor ?? null },
      datos: { nombre },
    });
    await unstable_update({ user: { name: nombre } });
  } catch (error) {
    console.error("Error actualizando nombre:", error);
    return { success: false, message: t("errors.errorServidor") };
  }

  revalidatePath("/dashboard/cuenta");
  revalidatePath("/dashboard", "layout");
  return { success: true, message: t("nombreGuardado") };
}

export async function cambiarPasswordAction(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const t = await getTranslations("cuenta");
  const session = await requireSession();
  if (!session) return { success: false, message: t("errors.noAutorizado") };

  const schema = z
    .object({
      actual: z.string().min(1, t("errors.actualRequerida")),
      nueva: z.string().min(8, t("errors.passwordMin")).max(72, t("errors.passwordMax")),
      confirmar: z.string(),
    })
    .refine((d) => d.nueva === d.confirmar, {
      path: ["confirmar"],
      message: t("errors.confirmMismatch"),
    })
    .refine((d) => d.nueva !== d.actual, {
      path: ["nueva"],
      message: t("errors.passwordIgual"),
    });

  const parsed = schema.safeParse({
    actual: formData.get("actual"),
    nueva: formData.get("nueva"),
    confirmar: formData.get("confirmar"),
  });
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors,
      message: t("errors.revisarCampos"),
    };
  }

  const idUsuario = Number(session.user.id);

  try {
    const [rows] = await db.query<PasswordRow[]>(
      "SELECT password_hash FROM usuario WHERE id_usuario = ? LIMIT 1",
      [idUsuario]
    );
    const hashActual = rows[0]?.password_hash;
    if (!hashActual || !(await bcrypt.compare(parsed.data.actual, hashActual))) {
      return {
        success: false,
        errors: { actual: [t("errors.actualIncorrecta")] },
        message: t("errors.revisarCampos"),
      };
    }

    const nuevoHash = await bcrypt.hash(parsed.data.nueva, 10);
    await db.query("UPDATE usuario SET password_hash = ? WHERE id_usuario = ?", [
      nuevoHash,
      idUsuario,
    ]);
    await db.query(
      "DELETE FROM usuario_preferencia WHERE id_usuario = ? AND clave = ?",
      [idUsuario, PREF_CAMBIAR_PASSWORD]
    );
    await registrarAuditoria(db, {
      idUsuario,
      tabla: "usuario",
      idRegistro: idUsuario,
      accion: "UPDATE",
      datos: { campo: "password_hash", motivo: "cambio_por_usuario" },
    });
  } catch (error) {
    console.error("Error cambiando contrasena:", error);
    return { success: false, message: t("errors.errorServidor") };
  }

  revalidatePath("/dashboard/cuenta");
  return { success: true, message: t("passwordGuardada") };
}
