import { cache } from "react";
import type { RowDataPacket } from "mysql2";
import { db } from "@/lib/db";

/**
 * Codigos de permiso de un rol (tabla rol_permiso, seed 002). Memorizado por
 * request con React.cache: una pagina que gatea varias acciones hace una sola
 * consulta. Fuera de un render (pruebas, scripts) cache es transparente.
 */
export const permisosDeRol = cache(async (idRol: number): Promise<Set<string>> => {
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT p.codigo
       FROM rol_permiso rp
       INNER JOIN permiso p ON p.id_permiso = rp.id_permiso
      WHERE rp.id_rol = ?`,
    [idRol]
  );
  return new Set(rows.map((r) => r.codigo as string));
});

/**
 * true si el rol posee el permiso (ej. 'notas.registrar'). Gatear acciones con
 * codigos de permiso, nunca con ids de rol en duro: la matriz de
 * /dashboard/roles es editable y debe tener efecto real.
 */
export async function tienePermiso(idRol: number, codigo: string): Promise<boolean> {
  return (await permisosDeRol(idRol)).has(codigo);
}
