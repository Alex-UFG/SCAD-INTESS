import type { RowDataPacket } from "mysql2";
import { db } from "@/lib/db";
import type { AccionAuditoria } from "@/lib/audit";

export const ACCIONES_AUDITORIA: readonly AccionAuditoria[] = [
  "INSERT",
  "UPDATE",
  "DELETE",
  "LOGIN",
  "LOGOUT",
] as const;

export interface FiltrosAuditoria {
  idUsuario?: number;
  tabla?: string;
  accion?: AccionAuditoria;
  desde?: string;
  hasta?: string;
  page: number;
  pageSize: number;
}

export interface EntradaAuditoria {
  id_log: number;
  id_usuario: number;
  usuario_email: string;
  usuario_nombre: string | null;
  tabla_afectada: string;
  id_registro: string;
  tipo_accion: AccionAuditoria;
  datos_anteriores: unknown;
  datos_nuevos: unknown;
  ip_origen: string;
  fecha_hora: Date;
}

interface LogRow extends RowDataPacket, Omit<EntradaAuditoria, "datos_anteriores" | "datos_nuevos"> {
  datos_anteriores: unknown;
  datos_nuevos: unknown;
}

interface TotalRow extends RowDataPacket {
  total: number;
}

interface OpcionRow extends RowDataPacket {
  valor: string;
}

interface UsuarioOpcionRow extends RowDataPacket {
  id_usuario: number;
  email: string;
  nombre: string | null;
}

function parseJson(valor: unknown): unknown {
  if (typeof valor !== "string") return valor;
  try {
    return JSON.parse(valor);
  } catch {
    return valor;
  }
}

export async function getAuditoria(filtros: FiltrosAuditoria): Promise<{
  entradas: EntradaAuditoria[];
  total: number;
}> {
  const where: string[] = [];
  const params: (string | number)[] = [];

  if (filtros.idUsuario) {
    where.push("l.id_usuario = ?");
    params.push(filtros.idUsuario);
  }
  if (filtros.tabla) {
    where.push("l.tabla_afectada = ?");
    params.push(filtros.tabla);
  }
  if (filtros.accion) {
    where.push("l.tipo_accion = ?");
    params.push(filtros.accion);
  }
  if (filtros.desde) {
    where.push("l.fecha_hora >= ?");
    params.push(`${filtros.desde} 00:00:00`);
  }
  if (filtros.hasta) {
    where.push("l.fecha_hora < DATE_ADD(?, INTERVAL 1 DAY)");
    params.push(`${filtros.hasta} 00:00:00`);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const pageSize = Math.min(Math.max(filtros.pageSize, 1), 100);
  const offset = (Math.max(filtros.page, 1) - 1) * pageSize;

  const [[totalRows], [rows]] = await Promise.all([
    db.query<TotalRow[]>(`SELECT COUNT(*) AS total FROM log_auditoria l ${whereSql}`, params),
    db.query<LogRow[]>(
      `SELECT l.id_log, l.id_usuario, u.email AS usuario_email, p.valor AS usuario_nombre,
              l.tabla_afectada, l.id_registro, l.tipo_accion,
              l.datos_anteriores, l.datos_nuevos, l.ip_origen, l.fecha_hora
         FROM log_auditoria l
         INNER JOIN usuario u ON u.id_usuario = l.id_usuario
         LEFT JOIN usuario_preferencia p ON p.id_usuario = u.id_usuario AND p.clave = 'nombre'
         ${whereSql}
        ORDER BY l.fecha_hora DESC, l.id_log DESC
        LIMIT ${pageSize} OFFSET ${offset}`,
      params
    ),
  ]);

  return {
    total: totalRows[0]?.total ?? 0,
    entradas: rows.map((r) => ({
      ...r,
      datos_anteriores: parseJson(r.datos_anteriores),
      datos_nuevos: parseJson(r.datos_nuevos),
    })),
  };
}

export async function getOpcionesAuditoria(): Promise<{
  tablas: string[];
  usuarios: { id_usuario: number; email: string; nombre: string | null }[];
}> {
  const [[tablas], [usuarios]] = await Promise.all([
    db.query<OpcionRow[]>(
      "SELECT DISTINCT tabla_afectada AS valor FROM log_auditoria ORDER BY tabla_afectada"
    ),
    db.query<UsuarioOpcionRow[]>(
      `SELECT u.id_usuario, u.email, p.valor AS nombre
         FROM usuario u
         LEFT JOIN usuario_preferencia p ON p.id_usuario = u.id_usuario AND p.clave = 'nombre'
        ORDER BY p.valor, u.email`
    ),
  ]);
  return {
    tablas: tablas.map((r) => r.valor),
    usuarios: usuarios.map((u) => ({ id_usuario: u.id_usuario, email: u.email, nombre: u.nombre })),
  };
}
