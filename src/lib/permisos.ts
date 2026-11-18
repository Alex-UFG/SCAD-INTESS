import { cache } from "react";
import type { RowDataPacket } from "mysql2";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";

export type PermisoCodigo =
  | "usuarios.ver"
  | "usuarios.crear"
  | "usuarios.editar"
  | "usuarios.desactivar"
  | "matricula.ver"
  | "matricula.crear"
  | "matricula.editar"
  | "matricula.retirar"
  | "notas.ver"
  | "notas.registrar"
  | "notas.editar_bloqueada"
  | "asistencia.ver"
  | "asistencia.registrar"
  | "disciplina.ver"
  | "disciplina.reportar"
  | "disciplina.resolver"
  | "disciplina.citar"
  | "reportes.boleta"
  | "reportes.conductual"
  | "reportes.constancia"
  | "reportes.consolidado"
  | "config.catalogos"
  | "config.ciclos"
  | "config.carga"
  | "auditoria.ver";

export const ROL_ADMIN = 1;
export const ROL_DOCENTE = 5;

interface PermisoRow extends RowDataPacket {
  codigo: string;
}

export const getPermisosDeRol = cache(
  async (idRol: number): Promise<Set<string>> => {
    const [rows] = await db.query<PermisoRow[]>(
      idRol === ROL_ADMIN
        ? "SELECT codigo FROM permiso"
        : `SELECT p.codigo
             FROM rol_permiso rp
             INNER JOIN permiso p ON p.id_permiso = rp.id_permiso
            WHERE rp.id_rol = ?`,
      [idRol]
    );
    return new Set(rows.map((r) => r.codigo));
  }
);

export async function tienePermiso(codigo: PermisoCodigo): Promise<boolean> {
  const session = await requireSession();
  if (!session) return false;
  const permisos = await getPermisosDeRol(session.user.rol);
  return permisos.has(codigo);
}

export async function requirePermiso(codigo: PermisoCodigo) {
  const session = await requireSession();
  if (!session) return null;
  const permisos = await getPermisosDeRol(session.user.rol);
  return permisos.has(codigo) ? session : null;
}
