'use server';

import { revalidatePath } from 'next/cache';
import { getTranslations } from 'next-intl/server';
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
  periodo: number | null;
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
    `SELECT n.id_notificacion, n.tipo, n.titulo, n.mensaje, n.leida,
            DATE_FORMAT(n.creada_en, '%Y-%m-%d %H:%i') AS creada_en, p.numero AS periodo
       FROM notificacion n
       LEFT JOIN periodo_evaluativo p ON n.referencia_tipo = 'periodo_evaluativo' AND p.id_periodo = n.referencia_id
      WHERE n.id_usuario = ? ORDER BY n.creada_en DESC, n.id_notificacion DESC LIMIT 50`,
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
  const t = await getTranslations('notificaciones');
  const session = await requireSession();
  if (!session) return { success: false, message: t('errors.noAutorizado') };

  const id = Number(formData.get('id_notificacion'));
  if (!Number.isInteger(id) || id <= 0) return { success: false, message: t('errors.notificacionInvalida') };

  try {
    await db.execute('UPDATE notificacion SET leida = TRUE WHERE id_notificacion = ? AND id_usuario = ?', [id, Number(session.user.id)]);
  } catch (error) {
    console.error('Error marcando notificacion como leida:', error);
    return { success: false, message: t('errors.errorServidor') };
  }
  revalidatePath('/', 'layout'); // refresca tambien el contador del encabezado
  return { success: true };
}

export async function marcarTodasLeidas(): Promise<ActionState> {
  const t = await getTranslations('notificaciones');
  const session = await requireSession();
  if (!session) return { success: false, message: t('errors.noAutorizado') };

  try {
    await db.execute('UPDATE notificacion SET leida = TRUE WHERE id_usuario = ? AND leida = FALSE', [Number(session.user.id)]);
  } catch (error) {
    console.error('Error marcando notificaciones como leidas:', error);
    return { success: false, message: t('errors.errorServidor') };
  }
  revalidatePath('/', 'layout'); // refresca tambien el contador del encabezado
  return { success: true };
}
