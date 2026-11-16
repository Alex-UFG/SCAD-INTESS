import type { Ejecutor } from '@/lib/audit';
import type { PermisoCodigo } from '@/lib/permisos';

export type TipoNotificacion = 'Riesgo_Academico' | 'Reincidencia' | 'Citacion' | 'Cierre_Periodo' | 'Sistema';

export interface DatosNotificacion {
  tipo: TipoNotificacion;
  titulo: string;
  mensaje: string;
  referenciaTipo?: string;
  referenciaId?: string | number;
}

export async function crearNotificacion(
  ejecutor: Ejecutor,
  { idUsuario, tipo, titulo, mensaje, referenciaTipo, referenciaId }: DatosNotificacion & { idUsuario: number }
): Promise<void> {
  await ejecutor.execute(
    `INSERT INTO notificacion (id_usuario, tipo, titulo, mensaje, referencia_tipo, referencia_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [idUsuario, tipo, titulo, mensaje, referenciaTipo ?? null, referenciaId === undefined ? null : String(referenciaId)]
  );
}

/**Una notificacion para cada usuario Activo cuyo rol tiene el permiso */
export async function notificarPorPermiso(
  ejecutor: Ejecutor,
  codigoPermiso: PermisoCodigo,
  { tipo, titulo, mensaje, referenciaTipo, referenciaId }: DatosNotificacion
): Promise<void> {
  await ejecutor.execute(
    `INSERT INTO notificacion (id_usuario, tipo, titulo, mensaje, referencia_tipo, referencia_id)
     SELECT u.id_usuario, ?, ?, ?, ?, ?
       FROM usuario u
       INNER JOIN rol_permiso rp ON rp.id_rol = u.id_rol
       INNER JOIN permiso p ON p.id_permiso = rp.id_permiso
      WHERE p.codigo = ? AND u.estado = 'Activo'`,
    [tipo, titulo, mensaje, referenciaTipo ?? null, referenciaId === undefined ? null : String(referenciaId), codigoPermiso]
  );
}
