/**
 * Fixtures compartidos para pruebas contra el MySQL de podman (seed 002).
 * Todo lleva un prefijo reconocible y se elimina en limpiarFixtures().
 * Usa el ciclo 2026 (id 1, Activo) y la especialidad 1 del seed.
 */
import type { RowDataPacket, ResultSetHeader } from "mysql2";
import { db } from "@/lib/db";

export const CICLO_SEED = 1;
export const PERIODO_ABIERTO_SEED = 2;
export const PERIODO_CERRADO_SEED = 1;
export const ESPECIALIDAD_SEED = 1;

export const NIE_BASE = 990000000;
export const DUI_TUTOR_A = "99000000-1";
export const DUI_TUTOR_B = "99000000-2";
export const DUI_DOCENTE = "99000000-9";
export const COD_MATERIA = "ZZT-001";
export const EMAIL_DOCENTE = "docente.prueba@intess.edu.sv";

export interface Fixtures {
  idSeccion: number;
  idSeccionB: number;
  idUsuarioDocente: number;
  idCarga: number;
}

export async function crearFixtures(): Promise<Fixtures> {
  await limpiarFixtures();

  const [sec] = await db.execute<ResultSetHeader>(
    `INSERT INTO seccion (nombre, grado, id_especialidad, id_ciclo, capacidad_max)
     VALUES ('ZT', 1, ?, ?, 12)`,
    [ESPECIALIDAD_SEED, CICLO_SEED]
  );
  const [secB] = await db.execute<ResultSetHeader>(
    `INSERT INTO seccion (nombre, grado, id_especialidad, id_ciclo, capacidad_max)
     VALUES ('ZU', 1, ?, ?, 10)`,
    [ESPECIALIDAD_SEED, CICLO_SEED]
  );

  const [usr] = await db.execute<ResultSetHeader>(
    `INSERT INTO usuario (email, password_hash, id_rol, estado)
     VALUES (?, '$2b$10$/mPXcJyZz3Grl84vJEcrAOs8OsNuiJ6PQzplrafvNBQMpnkDhUJK2', 5, 'Activo')`,
    [EMAIL_DOCENTE]
  );
  await db.execute(
    `INSERT INTO docente (dui_docente, id_usuario, primer_nombre, primer_apellido, id_especialidad, telefono, fecha_ingreso)
     VALUES (?, ?, 'Docente', 'Prueba', ?, '7000-0000', '2020-01-01')`,
    [DUI_DOCENTE, usr.insertId, ESPECIALIDAD_SEED]
  );
  await db.execute(
    `INSERT INTO materia (cod_materia, nombre, unidades_valorativas, id_especialidad, grado, activa)
     VALUES (?, 'Materia de prueba', 1, ?, 1, TRUE)`,
    [COD_MATERIA, ESPECIALIDAD_SEED]
  );
  const [carga] = await db.execute<ResultSetHeader>(
    `INSERT INTO carga_academica (dui_docente, cod_materia, id_seccion, id_ciclo) VALUES (?, ?, ?, ?)`,
    [DUI_DOCENTE, COD_MATERIA, sec.insertId, CICLO_SEED]
  );

  for (let i = 1; i <= 3; i++) {
    await db.execute(
      `INSERT INTO estudiante (nie, primer_nombre, primer_apellido, fecha_nacimiento, genero, estado)
       VALUES (?, 'Alumno', ?, '2010-05-05', 'M', 'Activo')`,
      [NIE_BASE + i, `Prueba${i}`]
    );
  }
  await db.execute(
    `INSERT INTO tutor (dui_tutor, primer_nombre, primer_apellido, telefono_principal) VALUES (?, 'Tutor', 'A', '7000-0001'), (?, 'Tutor', 'B', '7000-0002')`,
    [DUI_TUTOR_A, DUI_TUTOR_B]
  );

  return { idSeccion: sec.insertId, idSeccionB: secB.insertId, idUsuarioDocente: usr.insertId, idCarga: carga.insertId };
}

export async function limpiarFixtures(): Promise<void> {
  const nies = [1, 2, 3, 4, 5].map((i) => NIE_BASE + i);
  const inNies = nies.map(() => "?").join(",");
  await db.execute(`DELETE FROM nota WHERE nie IN (${inNies})`, nies);
  await db.execute(`DELETE FROM asistencia WHERE nie IN (${inNies})`, nies);
  await db.execute(`DELETE FROM matricula WHERE nie IN (${inNies})`, nies);
  await db.execute(`DELETE FROM estudiante_tutor WHERE nie IN (${inNies})`, nies);
  await db.execute(`DELETE FROM estudiante WHERE nie IN (${inNies})`, nies);
  await db.execute("DELETE FROM tutor WHERE dui_tutor IN (?, ?)", [DUI_TUTOR_A, DUI_TUTOR_B]);
  await db.execute("DELETE FROM carga_academica WHERE cod_materia = ? OR dui_docente = ?", [COD_MATERIA, DUI_DOCENTE]);
  await db.execute("DELETE FROM materia WHERE cod_materia = ?", [COD_MATERIA]);
  await db.execute("UPDATE seccion SET dui_docente_guia = NULL WHERE dui_docente_guia = ?", [DUI_DOCENTE]);
  await db.execute("DELETE FROM docente WHERE dui_docente = ?", [DUI_DOCENTE]);
  await db.execute("DELETE FROM seccion WHERE nombre IN ('ZT','ZU') AND id_ciclo = ?", [CICLO_SEED]);
  const [u] = await db.query<RowDataPacket[]>("SELECT id_usuario FROM usuario WHERE email = ?", [EMAIL_DOCENTE]);
  if (u[0]) {
    await db.execute("DELETE FROM log_auditoria WHERE id_usuario = ?", [u[0].id_usuario]);
    await db.execute("DELETE FROM usuario_preferencia WHERE id_usuario = ?", [u[0].id_usuario]);
    await db.execute("DELETE FROM usuario WHERE id_usuario = ?", [u[0].id_usuario]);
  }
  await db.execute(
    "DELETE FROM log_auditoria WHERE (tabla_afectada IN ('estudiante','matricula','estudiante_tutor') AND id_registro LIKE '99000000%') OR tabla_afectada = '__prueba__'"
  );
}
