import { auth } from "@/auth";
import { tienePermiso } from "@/lib/permisos";

/**
 * Las server actions son endpoints POST invocables sin pasar por las paginas,
 * asi que toda accion que lea o escriba datos debe verificar la sesion aqui;
 * ocultar el link en el sidebar no es una barrera.
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

/**
 * Sesion valida cuyo rol posee el permiso (codigo de la tabla permiso), o
 * null. Uso: `const session = await requirePermiso('config.ciclos')`.
 */
export async function requirePermiso(codigo: string) {
  const session = await requireSession();
  if (!session) return null;
  return (await tienePermiso(session.user.rol, codigo)) ? session : null;
}
