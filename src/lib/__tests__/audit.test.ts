import { describe, it, expect, afterAll } from "vitest";
import type { RowDataPacket } from "mysql2";
import { db } from "@/lib/db";
import { registrarAuditoria } from "@/lib/audit";

const TABLA = "__prueba_audit__";

describe.skipIf(!process.env.DB_HOST)("registrarAuditoria", () => {
  afterAll(async () => {
    await db.execute("DELETE FROM log_auditoria WHERE tabla_afectada = ?", [TABLA]);
    await db.end();
  });

  it("inserta con el pool, sin transaccion, guardando ambos JSON", async () => {
    await registrarAuditoria(db, {
      idUsuario: 1,
      tabla: TABLA,
      idRegistro: 42,
      accion: "UPDATE",
      datos: { estado: "Activo" },
      datosAnteriores: { estado: "Inactivo" },
    });

    const [rows] = await db.query<RowDataPacket[]>(
      "SELECT id_registro, tipo_accion, datos_anteriores, datos_nuevos, ip_origen FROM log_auditoria WHERE tabla_afectada = ?",
      [TABLA]
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].id_registro).toBe("42");
    expect(rows[0].tipo_accion).toBe("UPDATE");
    expect(rows[0].datos_anteriores).toEqual({ estado: "Inactivo" });
    expect(rows[0].datos_nuevos).toEqual({ estado: "Activo" });
    expect(rows[0].ip_origen).toBe("0.0.0.0");
  });
});
