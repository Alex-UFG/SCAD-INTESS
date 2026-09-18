"use server";

import bcrypt from "bcrypt";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import type { RowDataPacket } from "mysql2";
import { getTransaction } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { registrarAuditoria } from "@/lib/audit";
import { unstable_update } from "@/auth";
import type { ActionState } from "@/types/actions";
import { PASSWORD_REGEX } from "@/lib/constantes";

const nombreSchema = z.object({
  nombre: z.string().trim().min(2).max(120),
});

const passwordSchema = z
  .object({
    actual: z.string().min(1),
    nueva: z.string().regex(PASSWORD_REGEX),
    confirmacion: z.string(),
  })
  .refine((d) => d.nueva === d.confirmacion, { path: ["confirmacion"], message: "noCoincide" })
  .refine((d) => d.nueva !== d.actual, { path: ["nueva"], message: "igualActual" });

/**El nombre visible vive en usuario_preferencia (clave 'nombre'), como en el registro */
export async function actualizarNombre(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const t = await getTranslations("cuenta");
  const session = await requireSession();
  if (!session) return { success: false, message: t("errors.noAutorizado") };

  const parsed = nombreSchema.safeParse({ nombre: formData.get("nombre") });
  if (!parsed.success) {
    return { success: false, errors: { nombre: [t("errors.nombreInvalido")] }, message: t("errors.revisarCampos") };
  }
  const idUsuario = Number(session.user.id);
  const connection = await getTransaction();
  try {
    const [prev] = await connection.query<RowDataPacket[]>(
      "SELECT valor FROM usuario_preferencia WHERE id_usuario = ? AND clave = 'nombre' FOR UPDATE",
      [idUsuario]
    );
    await connection.execute(
      `INSERT INTO usuario_preferencia (id_usuario, clave, valor) VALUES (?, 'nombre', ?)
       ON DUPLICATE KEY UPDATE valor = VALUES(valor)`,
      [idUsuario, parsed.data.nombre]
    );
    await registrarAuditoria(connection, {
      idUsuario,
      tabla: "usuario_preferencia",
      idRegistro: `${idUsuario}:nombre`,
      accion: "UPDATE",
      datosAnteriores: { nombre: prev[0]?.valor ?? null },
      datos: { nombre: parsed.data.nombre },
    });
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    console.error("Error actualizando nombre:", error);
    return { success: false, message: t("errors.errorServidor") };
  } finally {
    connection.release();
  }

  // Refresca el nombre en el JWT sin cerrar sesion (ver callback jwt en auth.ts)
  try {
    await unstable_update({ user: { name: parsed.data.nombre } });
  } catch {
    // fuera de un request (pruebas) no hay cookie que actualizar
  }
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/cuenta");
  return { success: true, message: t("nombreActualizado") };
}

export async function cambiarPassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const t = await getTranslations("cuenta");
  const session = await requireSession();
  if (!session) return { success: false, message: t("errors.noAutorizado") };

  const parsed = passwordSchema.safeParse({
    actual: formData.get("actual"),
    nueva: formData.get("nueva"),
    confirmacion: formData.get("confirmacion"),
  });
  if (!parsed.success) {
    const campos = parsed.error.flatten().fieldErrors;
    const errors: Record<string, string[]> = {};
    if (campos.actual) errors.actual = [t("errors.actualRequerida")];
    if (campos.nueva) errors.nueva = [campos.nueva.includes("igualActual") ? t("errors.igualActual") : t("errors.nuevaDebil")];
    if (campos.confirmacion) errors.confirmacion = [t("errors.noCoincide")];
    return { success: false, errors, message: t("errors.revisarCampos") };
  }

  const idUsuario = Number(session.user.id);
  const connection = await getTransaction();
  try {
    const [rows] = await connection.query<RowDataPacket[]>(
      "SELECT password_hash FROM usuario WHERE id_usuario = ? FOR UPDATE",
      [idUsuario]
    );
    const coincide = rows[0] && (await bcrypt.compare(parsed.data.actual, rows[0].password_hash));
    if (!coincide) {
      await connection.rollback();
      return { success: false, errors: { actual: [t("errors.actualIncorrecta")] }, message: t("errors.revisarCampos") };
    }
    const hash = await bcrypt.hash(parsed.data.nueva, 10);
    await connection.execute("UPDATE usuario SET password_hash = ? WHERE id_usuario = ?", [hash, idUsuario]);
    await registrarAuditoria(connection, {
      idUsuario,
      tabla: "usuario",
      idRegistro: idUsuario,
      accion: "UPDATE",
      // nunca el hash ni la contrasena
      datos: { campo: "password_hash", motivo: "cambio por el usuario" },
    });
    await connection.commit();
    return { success: true, message: t("passwordActualizada") };
  } catch (error) {
    await connection.rollback();
    console.error("Error cambiando contrasena:", error);
    return { success: false, message: t("errors.errorServidor") };
  } finally {
    connection.release();
  }
}
