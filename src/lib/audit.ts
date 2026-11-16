import { headers } from "next/headers";
import type { Pool, PoolConnection } from "mysql2/promise";

export type AccionAuditoria = "INSERT" | "UPDATE" | "DELETE" | "LOGIN" | "LOGOUT";

interface RegistroAuditoria {
  idUsuario: number;
  tabla: string;
  idRegistro: string | number;
  accion: AccionAuditoria;
  datos?: unknown;
  datosAnteriores?: unknown;
}

type Ejecutor = Pick<Pool, "execute"> | Pick<PoolConnection, "execute">;

async function ipCliente(): Promise<string> {
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

export async function registrarAuditoria(
  ejecutor: Ejecutor,
  { idUsuario, tabla, idRegistro, accion, datos, datosAnteriores }: RegistroAuditoria
): Promise<void> {
  const ip = await ipCliente();

  await ejecutor.execute(
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
