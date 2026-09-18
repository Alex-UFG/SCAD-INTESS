'use server';

import type { RowDataPacket } from 'mysql2';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requirePermiso } from '@/lib/session';
import { TAMANO_PAGINA_AUDITORIA as TAMANO_PAGINA } from '@/lib/constantes';

const ACCIONES = ['INSERT', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT'] as const;

const filtroSchema = z.object({
  usuario: z.coerce.number().int().positive().optional(),
  tabla: z.string().trim().max(50).optional(),
  accion: z.enum(ACCIONES).optional(),
  desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  hasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page: z.coerce.number().int().min(1).default(1),
});

export type FiltroAuditoria = z.input<typeof filtroSchema>;

export interface LogRow {
  id_log: number;
  id_usuario: number;
  email: string;
  tabla_afectada: string;
  id_registro: string;
  tipo_accion: (typeof ACCIONES)[number];
  datos_anteriores: unknown;
  datos_nuevos: unknown;
  ip_origen: string;
  fecha_hora: Date;
}

export interface ResultadoAuditoria {
  rows: LogRow[];
  total: number;
  page: number;
  totalPaginas: number;
  /**Catalogo de tablas presentes en la bitacora (para el select del filtro) */
  tablas: string[];
}

/**
 * Bitacora filtrable (P-18). Solo lectura: la tabla es inmutable por diseno.
 * Los valores invalidos del filtro se descartan en vez de fallar la pagina.
 */
export async function getAuditoria(filtroCrudo: FiltroAuditoria): Promise<ResultadoAuditoria | null> {
  const session = await requirePermiso('auditoria.ver');
  if (!session) return null;

  const parsed = filtroSchema.safeParse(filtroCrudo);
  const f = parsed.success ? parsed.data : { page: 1 };

  const condiciones: string[] = [];
  const params: (string | number)[] = [];
  if (f.usuario) { condiciones.push('l.id_usuario = ?'); params.push(f.usuario); }
  if (f.tabla) { condiciones.push('l.tabla_afectada = ?'); params.push(f.tabla); }
  if (f.accion) { condiciones.push('l.tipo_accion = ?'); params.push(f.accion); }
  if (f.desde) { condiciones.push('l.fecha_hora >= ?'); params.push(`${f.desde} 00:00:00`); }
  if (f.hasta) { condiciones.push('l.fecha_hora <= ?'); params.push(`${f.hasta} 23:59:59`); }
  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

  const [[conteo], [tablas]] = await Promise.all([
    db.query<RowDataPacket[]>(`SELECT COUNT(*) AS total FROM log_auditoria l ${where}`, params),
    db.query<RowDataPacket[]>('SELECT DISTINCT tabla_afectada FROM log_auditoria ORDER BY tabla_afectada'),
  ]);
  const total = Number(conteo[0].total);
  const totalPaginas = Math.max(1, Math.ceil(total / TAMANO_PAGINA));
  const page = Math.min(f.page, totalPaginas);

  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT l.id_log, l.id_usuario, u.email, l.tabla_afectada, l.id_registro, l.tipo_accion,
            l.datos_anteriores, l.datos_nuevos, l.ip_origen, l.fecha_hora
       FROM log_auditoria l
       INNER JOIN usuario u ON u.id_usuario = l.id_usuario
       ${where}
      ORDER BY l.fecha_hora DESC, l.id_log DESC
      LIMIT ? OFFSET ?`,
    [...params, TAMANO_PAGINA, (page - 1) * TAMANO_PAGINA]
  );

  return {
    rows: rows as LogRow[],
    total,
    page,
    totalPaginas,
    tablas: tablas.map((t) => t.tabla_afectada as string),
  };
}
