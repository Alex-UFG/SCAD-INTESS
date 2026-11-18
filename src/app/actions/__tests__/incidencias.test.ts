import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { db } from "@/lib/db";
import { crearFixtures, limpiarFixtures, NIE_BASE, DUI_DOCENTE, PERIODO_ABIERTO_SEED, PERIODO_CERRADO_SEED, type Fixtures } from "@/test/db-fixtures";
import { mockSession, sesionDe, type Sesion } from "@/test/mock-session";
import { MAX_EVIDENCIAS } from "@/lib/disciplina";
import { hoyISO } from "@/lib/asistencia";

const estado = vi.hoisted(() => ({ sesion: null as Sesion | null }));
const blob = vi.hoisted(() => ({ put: vi.fn(), del: vi.fn() }));
vi.mock("@/lib/session", () => mockSession(estado));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next-intl/server", () => ({ getTranslations: async () => (k: string) => k }));
vi.mock("@vercel/blob", () => blob);

const { registrarIncidencia, cambiarEstadoIncidencia, getIncidencias, getIncidenciaPorId, subirEvidencia, eliminarEvidencia } = await import("@/app/actions/incidencias");

// Fechas pasadas dentro de los periodos del seed (ciclo 2026)
const FECHA_P2 = "2026-05-11";
const FECHA_P1 = "2026-02-10";
const EMAIL_OTRO = "otro.docente.zzd@intess.edu.sv";
const [NIE_A, NIE_B, NIE_C] = [1, 2, 3].map((i) => NIE_BASE + i);

let fx: Fixtures;
let idOtroDocente: number;
let tokenOriginal: string | undefined;

function fd(campos: Record<string, string | File>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(campos)) f.set(k, v);
  return f;
}
const registrar = (nie: number, extra: Record<string, string> = {}) =>
  registrarIncidencia({}, fd({ nie: String(nie), fecha: FECHA_P2, tipo_falta: "Leve", descripcion: "Interrumpe la clase repetidamente", ...extra }));
const cambiar = (id: number, nuevo: string, texto = "") => cambiarEstadoIncidencia({}, fd({ id_incidencia: String(id), estado: nuevo, texto }));
const fila = async (id: number) => {
  const [r] = await db.query<RowDataPacket[]>("SELECT * FROM incidencia WHERE id_incidencia = ?", [id]);
  return r[0];
};
const avisos = async (id: number) => {
  const [r] = await db.query<RowDataPacket[]>("SELECT tipo, id_usuario FROM notificacion WHERE referencia_tipo = 'incidencia' AND referencia_id = ?", [String(id)]);
  return r;
};
const pdf = (nombre = "acta.pdf") => new File([new Uint8Array(64)], nombre, { type: "application/pdf" });

describe.skipIf(!process.env.DB_HOST)("acciones de incidencias", () => {
  beforeAll(async () => {
    fx = await crearFixtures();
    await db.execute("DELETE FROM usuario WHERE email = ?", [EMAIL_OTRO]);
    const [u] = await db.execute<ResultSetHeader>("INSERT INTO usuario (email, password_hash, id_rol, estado) VALUES (?, 'x', 5, 'Activo')", [EMAIL_OTRO]);
    idOtroDocente = u.insertId;
    tokenOriginal = process.env.BLOB_READ_WRITE_TOKEN;
    blob.put.mockImplementation(async (ruta: string) => ({ url: `https://blob.test/${ruta}` }));
  });
  afterAll(async () => {
    process.env.BLOB_READ_WRITE_TOKEN = tokenOriginal;
    if (tokenOriginal === undefined) delete process.env.BLOB_READ_WRITE_TOKEN;
    await limpiarFixtures();
    await db.execute("DELETE FROM log_auditoria WHERE id_usuario = ?", [idOtroDocente]);
    await db.execute("DELETE FROM usuario WHERE id_usuario = ?", [idOtroDocente]);
    await db.end();
  });

  it("la 3.a leve del periodo se guarda como Grave escalada y avisa a quienes resuelven; la 6.a tambien", async () => {
    estado.sesion = sesionDe(5, fx.idUsuarioDocente);
    const r = [];
    for (let i = 0; i < 6; i++) r.push(await registrar(NIE_A));
    expect(r.map((x) => x.message)).toEqual(["registrada", "registrada", "registradaEscalada", "registrada", "registrada", "registradaEscalada"]);

    const tercera = await fila(r[2].id!);
    expect(tercera).toMatchObject({ tipo_falta: "Grave", escalada_auto: 1, estado: "Abierta", id_periodo: PERIODO_ABIERTO_SEED, dui_reportante: DUI_DOCENTE, registrada_por: fx.idUsuarioDocente });
    expect(await fila(r[3].id!)).toMatchObject({ tipo_falta: "Leve", escalada_auto: 0 });

    const [resolutores] = await db.query<RowDataPacket[]>(
      `SELECT u.id_usuario FROM usuario u
         INNER JOIN rol_permiso rp ON rp.id_rol = u.id_rol INNER JOIN permiso p ON p.id_permiso = rp.id_permiso
        WHERE p.codigo = 'disciplina.resolver' AND u.estado = 'Activo'`
    );
    expect(resolutores.length).toBeGreaterThan(0);
    const avisosTercera = await avisos(r[2].id!);
    expect(avisosTercera.map((a) => a.id_usuario).sort()).toEqual(resolutores.map((u) => u.id_usuario).sort());
    expect(new Set(avisosTercera.map((a) => a.tipo))).toEqual(new Set(["Reincidencia"]));
    expect(await avisos(r[0].id!)).toEqual([]);
  });

  it("el conteo es por estudiante y por periodo", async () => {
    estado.sesion = sesionDe(5, fx.idUsuarioDocente);
    // otro periodo del mismo estudiante (que ya acumula 6 en el periodo 2)
    const otroPeriodo = await registrar(NIE_A, { fecha: FECHA_P1 });
    expect(otroPeriodo.message).toBe("registrada");
    expect(await fila(otroPeriodo.id!)).toMatchObject({ tipo_falta: "Leve", id_periodo: PERIODO_CERRADO_SEED });
    // otro estudiante
    expect((await registrar(NIE_B)).message).toBe("registrada");
  });

  it("las faltas Grave directas no cuentan como leves, y avisan como Sistema", async () => {
    estado.sesion = sesionDe(5, fx.idUsuarioDocente);
    const grave = await registrar(NIE_C, { tipo_falta: "Grave", hora: "07:45" });
    expect(await fila(grave.id!)).toMatchObject({ tipo_falta: "Grave", escalada_auto: 0, hora_incidencia: "07:45:00" });
    expect(new Set((await avisos(grave.id!)).map((a) => a.tipo))).toEqual(new Set(["Sistema"]));
    await registrar(NIE_C, { tipo_falta: "Muy Grave" });
    // dos leves despues de dos graves: ninguna escala
    expect((await registrar(NIE_C)).message).toBe("registrada");
    expect((await registrar(NIE_C)).message).toBe("registrada");
    expect((await registrar(NIE_C)).message).toBe("registradaEscalada");
  });

  it("validaciones: campos, fecha futura, fecha sin periodo y estudiante no activo", async () => {
    estado.sesion = sesionDe(5, fx.idUsuarioDocente);
    const [antes] = await db.query<RowDataPacket[]>("SELECT COUNT(*) AS n FROM incidencia WHERE nie = ?", [NIE_B]);

    const corta = await registrar(NIE_B, { descripcion: "corta" });
    expect(corta).toMatchObject({ success: false, message: "errors.revisarCampos" });
    expect(corta.errors?.descripcion).toEqual(["errors.descripcionCorta"]);

    const manana = new Date(`${hoyISO()}T00:00:00Z`);
    manana.setUTCDate(manana.getUTCDate() + 1);
    expect((await registrar(NIE_B, { fecha: manana.toISOString().slice(0, 10) })).message).toBe("errors.fechaFutura");
    expect((await registrar(NIE_B, { fecha: "2025-06-01" })).message).toBe("errors.fechaFueraDePeriodo");
    expect((await registrar(NIE_BASE + 4)).message).toBe("errors.estudianteNoDisponible");

    await db.execute("UPDATE estudiante SET estado = 'Retirado' WHERE nie = ?", [NIE_B]);
    expect((await registrar(NIE_B)).message).toBe("errors.estudianteNoDisponible");
    await db.execute("UPDATE estudiante SET estado = 'Activo' WHERE nie = ?", [NIE_B]);

    const [despues] = await db.query<RowDataPacket[]>("SELECT COUNT(*) AS n FROM incidencia WHERE nie = ?", [NIE_B]);
    expect(despues[0].n).toBe(antes[0].n);
  });

  it("permisos: secretaria no registra; quien no tiene perfil docente registra con su usuario", async () => {
    estado.sesion = sesionDe(4);
    expect((await registrar(NIE_B)).message).toBe("errors.sinPermiso");
    expect(await getIncidencias()).toEqual([]);
    estado.sesion = null;
    expect((await registrar(NIE_B)).message).toBe("errors.sinPermiso");

    // Coordinacion (rol 3) con el usuario admin del seed, que no tiene fila en docente
    estado.sesion = sesionDe(3);
    const r = await registrar(NIE_B, { tipo_falta: "Grave" });
    expect(r.success).toBe(true);
    expect(await fila(r.id!)).toMatchObject({ dui_reportante: null, registrada_por: 1 });
    const detalle = await getIncidenciaPorId(r.id!);
    expect(detalle?.reportante).toBe("admin@intess.edu.sv");
    expect(detalle?.estudiante).toBe("Alumno Prueba2");
  });

  it("alcance: el docente solo ve lo que registro; con disciplina.ver se ve todo", async () => {
    estado.sesion = sesionDe(3);
    const todas = await getIncidencias();
    const deCoordinacion = todas.find((i) => i.registrada_por === 1 && i.nie === NIE_B)!;
    expect(todas.some((i) => i.registrada_por === fx.idUsuarioDocente)).toBe(true);
    expect((await getIncidencias({ nie: NIE_C, tipo: "Muy Grave" })).map((i) => i.tipo_falta)).toEqual(["Muy Grave"]);
    expect((await getIncidencias({ nie: NIE_A, estado: "Resuelta" }))).toEqual([]);

    estado.sesion = sesionDe(5, fx.idUsuarioDocente);
    const propias = await getIncidencias();
    expect(propias.length).toBeGreaterThan(0);
    expect(propias.every((i) => i.registrada_por === fx.idUsuarioDocente)).toBe(true);
    expect(await getIncidenciaPorId(deCoordinacion.id_incidencia)).toBeNull();
    expect(await getIncidenciaPorId(propias[0].id_incidencia)).not.toBeNull();

    estado.sesion = sesionDe(5, idOtroDocente);
    expect(await getIncidencias()).toEqual([]);
    expect(await getIncidenciaPorId(propias[0].id_incidencia)).toBeNull();
  });

  it("flujo de resolucion: Abierta -> En_Proceso -> Resuelta -> Apelada -> Resuelta, con auditoria", async () => {
    estado.sesion = sesionDe(5, fx.idUsuarioDocente);
    const { id } = await registrar(NIE_B, { tipo_falta: "Grave" });
    expect((await cambiar(id!, "En_Proceso")).message).toBe("errors.sinPermiso");

    estado.sesion = sesionDe(3);
    expect((await cambiar(id!, "Resuelta", "Se acuerda trabajo comunitario")).message).toBe("errors.transicionInvalida");
    expect((await cambiar(999999999, "En_Proceso")).message).toBe("errors.noExiste");
    expect((await cambiar(id!, "En_Proceso")).success).toBe(true);
    expect(await fila(id!)).toMatchObject({ estado: "En_Proceso", resuelta_por: 1, dui_resolutor: null, resolucion: null });

    expect((await cambiar(id!, "Resuelta", "  corto  ")).message).toBe("errors.resolucionRequerida");
    expect((await fila(id!)).estado).toBe("En_Proceso");
    expect((await cambiar(id!, "Resuelta", "Se acuerda trabajo comunitario")).success).toBe(true);
    expect(await fila(id!)).toMatchObject({ estado: "Resuelta", resolucion: "Se acuerda trabajo comunitario" });

    expect((await cambiar(id!, "Apelada")).message).toBe("errors.motivoRequerido");
    expect((await cambiar(id!, "Apelada", "El tutor aporta un testigo")).success).toBe(true);
    expect((await cambiar(id!, "Resuelta", "Se mantiene la sancion original")).success).toBe(true);
    const final = await fila(id!);
    expect(final.estado).toBe("Resuelta");
    expect(final.resolucion).toBe(
      "Se acuerda trabajo comunitario\n\nmarcaApelacion\nEl tutor aporta un testigo\n\nmarcaResolucionApelacion\nSe mantiene la sancion original"
    );
    expect((await getIncidenciaPorId(id!))?.resolutor).toBe("admin@intess.edu.sv");

    const [log] = await db.query<RowDataPacket[]>("SELECT tipo_accion FROM log_auditoria WHERE tabla_afectada = 'incidencia' AND id_registro = ? ORDER BY id_log", [String(id)]);
    expect(log.map((l) => l.tipo_accion)).toEqual(["INSERT", "UPDATE", "UPDATE", "UPDATE", "UPDATE"]);
  });

  it("evidencias: tipo, almacenamiento, propiedad, tope y bloqueo al resolver", async () => {
    estado.sesion = sesionDe(5, fx.idUsuarioDocente);
    const { id } = await registrar(NIE_B, { tipo_falta: "Muy Grave" });
    const subir = (archivo: File) => subirEvidencia({}, fd({ id_incidencia: String(id), archivo }));
    const contar = async () => (await getIncidenciaPorId(id!))!.archivos.length;

    delete process.env.BLOB_READ_WRITE_TOKEN;
    expect((await subir(new File(["x"], "nota.docx", { type: "application/msword" }))).message).toBe("errors.tipoNoPermitido");
    expect((await subir(pdf())).message).toBe("errors.almacenamientoNoConfigurado");
    process.env.BLOB_READ_WRITE_TOKEN = "token-de-prueba";

    expect((await subir(pdf())).message).toBe("evidenciaSubida");
    const [primera] = (await getIncidenciaPorId(id!))!.archivos;
    expect(primera).toMatchObject({ nombre: "acta.pdf", mime_type: "application/pdf", subida_por: fx.idUsuarioDocente, url: `https://blob.test/evidencias/${id}.pdf` });

    // otro docente no la ve ni puede adjuntar o quitar
    estado.sesion = sesionDe(5, idOtroDocente);
    expect((await subir(pdf())).message).toBe("errors.noExiste");
    expect((await eliminarEvidencia({}, fd({ id_evidencia: String(primera.id_evidencia) }))).message).toBe("errors.evidenciaInvalida");
    expect(blob.put).toHaveBeenCalledTimes(1);

    estado.sesion = sesionDe(5, fx.idUsuarioDocente);
    for (let i = 1; i < MAX_EVIDENCIAS; i++) expect((await subir(pdf(`acta-${i}.pdf`))).success).toBe(true);
    expect((await subir(pdf("sobra.pdf"))).message).toBe("errors.maxEvidencias");
    expect(await contar()).toBe(MAX_EVIDENCIAS);

    expect((await eliminarEvidencia({}, fd({ id_evidencia: String(primera.id_evidencia) }))).message).toBe("evidenciaEliminada");
    expect(blob.del).toHaveBeenCalledWith(primera.url);
    expect(await contar()).toBe(MAX_EVIDENCIAS - 1);

    // si la BD falla tras subir, el archivo no queda huerfano
    // (un usuario inexistente rompe la FK de subida_por despues de la carga)
    blob.del.mockClear();
    estado.sesion = sesionDe(3, 987654321);
    expect((await subir(pdf("huerfano.pdf"))).message).toBe("errors.evidenciaError");
    expect(blob.del).toHaveBeenCalledExactlyOnceWith(`https://blob.test/evidencias/${id}.pdf`);

    estado.sesion = sesionDe(3);
    expect(await contar()).toBe(MAX_EVIDENCIAS - 1);
    await cambiar(id!, "En_Proceso");
    await cambiar(id!, "Resuelta", "Suspension de tres dias");
    const [otra] = (await getIncidenciaPorId(id!))!.archivos;
    expect((await subir(pdf())).message).toBe("errors.incidenciaResuelta");
    expect((await eliminarEvidencia({}, fd({ id_evidencia: String(otra.id_evidencia) }))).message).toBe("errors.incidenciaResuelta");
    expect(await contar()).toBe(MAX_EVIDENCIAS - 1);
  });
});
