"use server";

import { cookies } from "next/headers";
import { AuthError } from "next-auth";
import bcrypt from "bcrypt";
import { z } from "zod";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { signIn, signOut } from "@/auth";
import { db } from "@/lib/db";
import { getPreferences } from "@/lib/preferences";
import { isLocale, LOCALE_COOKIE } from "@/i18n/config";

// Rol por defecto para solicitudes de acceso (5 = Docente en 002_seed.sql);
// un Admin aprueba la cuenta (estado -> 'Activo') y ajusta el rol definitivo.
const DEFAULT_ROL = 5;

export type AuthActionError =
  | "failed"
  | "pendingApproval"
  | "invalid"
  | "emailTaken"
  | "registerFailed";

export type LoginResult =
  | { ok: true; theme?: string }
  | { ok?: never; error: AuthActionError };

export type RegisterResult = { ok: true } | { ok?: never; error: AuthActionError };

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
  remember: z.boolean().optional(),
});

const registerSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    email: z.email().max(100),
    password: z.string().min(8),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword);

interface UsuarioEstadoRow extends RowDataPacket {
  id_usuario: number;
  estado: "Activo" | "Inactivo" | "Bloqueado";
}

export async function loginAction(input: unknown): Promise<LoginResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return { error: "invalid" };

  const email = parsed.data.email.trim().toLowerCase();

  try {
    await signIn("credentials", {
      email,
      password: parsed.data.password,
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      const [rows] = await db.query<UsuarioEstadoRow[]>(
        "SELECT id_usuario, estado FROM usuario WHERE email = ? LIMIT 1",
        [email]
      );
      if (rows[0]?.estado === "Inactivo") return { error: "pendingApproval" };
      return { error: "failed" };
    }
    throw error;
  }

  // Sesión creada: hidratar preferencias guardadas en BD (idioma y tema)
  // para que el usuario recupere su configuración en cualquier dispositivo.
  const [rows] = await db.query<UsuarioEstadoRow[]>(
    "SELECT id_usuario, estado FROM usuario WHERE email = ? LIMIT 1",
    [email]
  );
  let theme: string | undefined;
  if (rows[0]) {
    const prefs = await getPreferences(rows[0].id_usuario);
    if (prefs.idioma && isLocale(prefs.idioma)) {
      const store = await cookies();
      store.set(LOCALE_COOKIE, prefs.idioma, {
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
        sameSite: "lax",
      });
    }
    if (prefs.tema === "dark" || prefs.tema === "light") theme = prefs.tema;
  }

  return { ok: true, theme };
}

export async function registerAction(input: unknown): Promise<RegisterResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) return { error: "invalid" };

  const email = parsed.data.email.trim().toLowerCase();
  const { name, password } = parsed.data;

  try {
    const [existing] = await db.query<RowDataPacket[]>(
      "SELECT id_usuario FROM usuario WHERE email = ? LIMIT 1",
      [email]
    );
    if (existing.length > 0) return { error: "emailTaken" };

    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await db.query<ResultSetHeader>(
      "INSERT INTO usuario (email, password_hash, id_rol, estado) VALUES (?, ?, ?, 'Inactivo')",
      [email, passwordHash, DEFAULT_ROL]
    );
    await db.query(
      "INSERT INTO usuario_preferencia (id_usuario, clave, valor) VALUES (?, 'nombre', ?)",
      [result.insertId, name]
    );
  } catch {
    return { error: "registerFailed" };
  }

  return { ok: true };
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/auth" });
}
