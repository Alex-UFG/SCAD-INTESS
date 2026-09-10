import mysql from "mysql2/promise";

const globalForDb = globalThis as unknown as { dbPool?: mysql.Pool };

export const db =
  globalForDb.dbPool ??
  mysql.createPool({
    host: process.env.DB_HOST ?? "localhost",
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? "root",
    password: process.env.DB_PASSWORD ?? "",
    database: process.env.DB_NAME ?? "scad_intess",
    ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: true } : undefined,
    connectionLimit: 10,
    timezone: "Z",
  });

if (process.env.NODE_ENV !== "production") globalForDb.dbPool = db;

/**Obtiene una conex exclusiva del pool e inicia las transacciones de mysql */
export async function getTransaction(){
    const connection = await db.getConnection();
    await connection.beginTransaction();
    return connection;
}