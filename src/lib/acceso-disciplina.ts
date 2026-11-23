import { requireSession } from '@/lib/session';
import { getPermisosDeRol } from '@/lib/permisos';

export interface AccesoDisciplina {
  idUsuario: number;
  rol: number;
  /**Consulta todo el historial; sin el, quien reporta solo ve lo que registro */
  ver: boolean;
  reportar: boolean;
  resolver: boolean;
  citar: boolean;
}

/**Adjunta quien resuelve, o quien registro la incidencia; nadie una vez resuelta */
export function puedeAdjuntarEvidencia(
  acceso: Pick<AccesoDisciplina, 'idUsuario' | 'reportar' | 'resolver'>,
  incidencia: { estado: string; registrada_por: number | null }
): boolean {
  if (incidencia.estado === 'Resuelta') return false;
  return acceso.resolver || (acceso.reportar && incidencia.registrada_por === acceso.idUsuario);
}

/**
 * Permisos de disciplina del usuario de la sesion, o null si no tiene ninguno.
 * El rol Docente solo trae `disciplina.reportar`: entra al modulo, pero
 * limitado a las incidencias que el mismo registro.
 */
export async function accesoDisciplina(): Promise<AccesoDisciplina | null> {
  const session = await requireSession();
  if (!session) return null;
  const permisos = await getPermisosDeRol(session.user.rol);
  const acceso: AccesoDisciplina = {
    idUsuario: Number(session.user.id),
    rol: session.user.rol,
    ver: permisos.has('disciplina.ver'),
    reportar: permisos.has('disciplina.reportar'),
    resolver: permisos.has('disciplina.resolver'),
    citar: permisos.has('disciplina.citar'),
  };
  return acceso.ver || acceso.reportar || acceso.resolver || acceso.citar ? acceso : null;
}
