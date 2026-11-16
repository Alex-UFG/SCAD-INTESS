'use server';

import { revalidatePath } from 'next/cache';
import { RowDataPacket } from 'mysql2';
import { db } from '@/lib/db';
import { requireSession } from '@/lib/session';
import type { TipoNotificacion } from '@/lib/notificaciones';
import type { ActionState } from '@/types/actions';

export interface NotificacionRow {
  id_notificacion: number;
  tipo: TipoNotificacion;
  titulo: string;
  mensaje: string;
  leida: boolean;
  /**YYYY-MM-DD HH:mm (UTC) */
  creada_en: string;
}

async function exigirSesion() {
  const session = await requireSession();
  if (!session) throw new Error('UNAUTHORIZED');
  return Number(session.user.id);
}

/**Las 50 notificaciones mas recientes del usuario de la sesion */
export async function getNotificaciones(): Promise<NotificacionRow[]> {
  const idUsuario = await exigirSesion();
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT id_notificacion, tipo, titulo, mensaje, leida, DATE_FORMAT(creada_en, '%Y-%m-%d %H:%i') AS creada_en
       FROM notificacion WHERE id_usuario = ? ORDER BY creada_en DESC, id_notificacion DESC LIMIT 50`,
    [idUsuario]
  );
  return rows.map((r) => ({ ...(r as NotificacionRow), leida: Boolean(r.leida) }));
}

/**0 sin sesion */
export async function contarNoLeidas(): Promise<number> {
  const session = await requireSession();
  if (!session) return 0;
  const [rows] = await db.query<RowDataPacket[]>(
    'SELECT COUNT(*) AS n FROM notificacion WHERE id_usuario = ? AND leida = FALSE',
    [Number(session.user.id)]
  );
  return Number(rows[0].n);
}

export async function marcarLeida(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const idUsuario = await exigirSesion();
  const id = Number(formData.get('id_notificacion'));
  if (!Number.isInteger(id) || id <= 0) return { success: false };
  await db.execute('UPDATE notificacion SET leida = TRUE WHERE id_notificacion = ? AND id_usuario = ?', [id, idUsuario]);
  revalidatePath('/', 'layout'); // refresca tambien el contador del encabezado
  return { success: true };
}

export async function marcarTodasLeidas(): Promise<ActionState> {
  const idUsuario = await exigirSesion();
  await db.execute('UPDATE notificacion SET leida = TRUE WHERE id_usuario = ? AND leida = FALSE', [idUsuario]);
  revalidatePath('/', 'layout'); // refresca tambien el contador del encabezado
  return { success: true };
}
