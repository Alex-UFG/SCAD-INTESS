import mysql from "mysql2/promise";

const globalForDb = globalThis as unknown as { dbPool?: mysql.Pool };

// Sin valores por defecto para usuario/contrasena: un despliegue mal
// configurado debe fallar en el arranque, no conectarse como root sin clave.
for (const v of ["DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME"] as const) {
  if (process.env[v] === undefined) {
    throw new Error(`Variable de entorno ${v} no definida (ver README, seccion Variables de entorno)`);
  }
}

export const db =
  globalForDb.dbPool ??
  mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: true } : undefined,
    connectionLimit: 10,
    timezone: "Z",
  });

if (process.env.NODE_ENV !== "production") globalForDb.dbPool = db;

/**Obtiene una conexion exclusiva del pool e inicia una transaccion */
export async function getTransaction() {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
    } catch (error) {
        // si beginTransaction falla la conexion debe volver al pool o se agota
        connection.release();
        throw error;
    }
    return connection;
}

/**Detecta violaciones de clave unica/primaria de MySQL (ER_DUP_ENTRY) */
export function isDuplicateEntry(error: unknown): boolean {
    return (
        typeof error === "object" &&
        error !== null &&
        (error as { code?: string }).code === "ER_DUP_ENTRY"
    );
}
