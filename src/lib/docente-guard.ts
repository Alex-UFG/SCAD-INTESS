export const RUTA_COMPLETAR_PERFIL = '/dashboard/docentes/completar-perfil';

/**Rutas que un docente sin perfil puede visitar (para completar el perfil o salir) */
const RUTAS_PERMITIDAS = [RUTA_COMPLETAR_PERFIL, '/dashboard/cuenta'];

/**
 * Gap 1: aprobar un usuario no crea su fila en `docente`, y notas/asistencia
 * exigen dui_docente. Un rol Docente (5) sin perfil solo puede ir a
 * completarlo. Pura para poder probarla sin sesion ni BD.
 */
export function necesitaCompletarPerfil(rol: number, tieneDocente: boolean, pathname: string): boolean {
  if (rol !== 5 || tieneDocente) return false;
  return !RUTAS_PERMITIDAS.some((r) => pathname === r || pathname.startsWith(`${r}/`));
}
