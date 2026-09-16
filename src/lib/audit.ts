import { headers } from "next/headers";
import type { PoolConnection } from "mysql2/promise";

interface RegistroAuditoria {
  idUsuario: number;
  tabla: string;
  idRegistro: string;
  accion: "INSERT" | "UPDATE" | "DELETE";
  datos: unknown;
}

/**
 * Inserta en log_auditoria con la IP real del cliente. Recibe la conexion de
 * la transaccion del caller para que el registro sea atomico con la escritura
 * que audita.
 */
export async function registrarAuditoria(
  connection: PoolConnection,
  { idUsuario, tabla, idRegistro, accion, datos }: RegistroAuditoria
): Promise<void> {
  const hdrs = await headers();
  const ip =
    hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    hdrs.get("x-real-ip") ||
    "0.0.0.0";

  await connection.execute(
    `INSERT INTO log_auditoria
      (id_usuario, tabla_afectada, id_registro, tipo_accion, datos_nuevos, ip_origen)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [idUsuario, tabla, idRegistro, accion, JSON.stringify(datos), ip]
  );
}
