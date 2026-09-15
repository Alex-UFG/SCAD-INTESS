import { auth } from "@/auth";

/**
 * Las server actions son endpoints POST invocables sin pasar por las paginas,
 * asi que toda accion que lea o escriba datos debe verificar la sesion aqui.
 */
export async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return session;
}

/**Sesion con rol de administrador (id_rol = 1) o null */
export async function requireAdmin() {
  const session = await requireSession();
  if (!session || session.user.rol !== 1) return null;
  return session;
}
