/**
 * Estado compartido para el mock de '@/lib/session' en pruebas de acciones.
 * Cada archivo de prueba declara:
 *
 *   const estado = vi.hoisted(() => ({ sesion: null as Sesion | null }));
 *   vi.mock('@/lib/session', () => mockSession(estado));
 *
 * y cambia estado.sesion = sesionDe(4) para simular el rol deseado.
 * requirePermiso consulta rol_permiso real (seed 002) para que las pruebas
 * cubran tambien la matriz de permisos.
 */
export interface Sesion {
  user: { id: string; rol: number; email: string; name: string };
  expires: string;
}

export function sesionDe(rol: number, id = 1): Sesion {
  return { user: { id: String(id), rol, email: "x@intess.edu.sv", name: "Prueba" }, expires: "" };
}

export async function mockSession(estado: { sesion: Sesion | null }) {
  const { tienePermiso } = await import("@/lib/permisos");
  return {
    requireSession: async () => estado.sesion,
    requireAdmin: async () => (estado.sesion?.user.rol === 1 ? estado.sesion : null),
    requirePermiso: async (codigo: string) => {
      if (!estado.sesion) return null;
      return (await tienePermiso(estado.sesion.user.rol, codigo)) ? estado.sesion : null;
    },
  };
}
