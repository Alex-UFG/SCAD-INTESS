import { auth } from "@/auth";

/** Devuelve la sesión activa o null. Usar en toda Server Action que modifique datos. */
export async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return session;
}

export const NO_AUTH = { success: false as const, error: "Sesión no válida. Inicie sesión nuevamente." };
