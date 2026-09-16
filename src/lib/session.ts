import { auth } from "@/auth";

/**
 * Las server actions son endpoints POST invocables sin pasar por las paginas,
 * asi que toda accion que escriba datos debe verificar la sesion aqui;
 * ocultar el link en el sidebar no es una barrera.
 */
export async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return session;
}
