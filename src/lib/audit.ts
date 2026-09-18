import { headers } from "next/headers";
import type { Pool, PoolConnection } from "mysql2/promise";

export type AccionAuditoria = "INSERT" | "UPDATE" | "DELETE" | "LOGIN" | "LOGOUT";

interface RegistroAuditoria {
  idUsuario: number;
  tabla: string;
  idRegistro: string | number;
  accion: AccionAuditoria;
  /**Estado nuevo del registro (JSON). Nunca incluir hashes ni secretos. */
  datos?: unknown;
  /**Estado previo del registro (JSON) en UPDATE/DELETE. */
  datosAnteriores?: unknown;
}

/**IP real del cliente; fuera de un request (pruebas, scripts) devuelve 0.0.0.0 */
async function ipOrigen(): Promise<string> {
  try {
    const hdrs = await headers();
    return (
      hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      hdrs.get("x-real-ip") ||
      "0.0.0.0"
    );
  } catch {
    return "0.0.0.0";
  }
}

/**
 * Inserta en log_auditoria. Recibe la conexion de la transaccion del caller
 * para que el registro sea atomico con la escritura que audita; acepta el pool
 * (`db`) para eventos sin transaccion como LOGIN/LOGOUT.
 */
export async function registrarAuditoria(
  executor: PoolConnection | Pool,
  { idUsuario, tabla, idRegistro, accion, datos, datosAnteriores }: RegistroAuditoria
): Promise<void> {
  const ip = await ipOrigen();

  await executor.execute(
    `INSERT INTO log_auditoria
      (id_usuario, tabla_afectada, id_registro, tipo_accion, datos_anteriores, datos_nuevos, ip_origen)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      idUsuario,
      tabla,
      String(idRegistro),
      accion,
      datosAnteriores === undefined ? null : JSON.stringify(datosAnteriores),
      datos === undefined ? null : JSON.stringify(datos),
      ip,
    ]
  );
}
