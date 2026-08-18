import type { RowDataPacket } from "mysql2";
import { db } from "@/lib/db";

interface PreferenciaRow extends RowDataPacket {
  clave: string;
  valor: string;
}

export async function getPreferences(
  idUsuario: number
): Promise<Record<string, string>> {
  const [rows] = await db.query<PreferenciaRow[]>(
    "SELECT clave, valor FROM usuario_preferencia WHERE id_usuario = ?",
    [idUsuario]
  );
  return Object.fromEntries(rows.map((r) => [r.clave, r.valor]));
}

export async function savePreference(
  idUsuario: number,
  clave: string,
  valor: string
): Promise<void> {
  await db.query(
    `INSERT INTO usuario_preferencia (id_usuario, clave, valor)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE valor = VALUES(valor)`,
    [idUsuario, clave, valor]
  );
}
