import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import type { RowDataPacket } from "mysql2";
import { db } from "@/lib/db";
import { crearFixtures, limpiarFixtures, NIE_BASE } from "@/test/db-fixtures";
import { mockSession, sesionDe, type Sesion } from "@/test/mock-session";

const estado = vi.hoisted(() => ({ sesion: null as Sesion | null }));
vi.mock("@/lib/session", () => mockSession(estado));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { getEstudiantes, getEstudiantePorNie, createEstudiante, updateEstudiante, cambiarEstadoEstudiante, actualizarFotoEstudiante } =
  await import("@/app/actions/estudiantes");

const NUEVO = NIE_BASE + 4;
const base = {
  nie: NUEVO,
  primer_nombre: "Nuevo",
  segundo_nombre: "",
  primer_apellido: "Alumno",
  segundo_apellido: "",
  fecha_nacimiento: "2011-02-03",
  genero: "F" as const,
  direccion: "Col. Prueba",
  estado: "Activo" as const,
};

async function ultimaAuditoria(tabla: string, id: number | string) {
  const [rows] = await db.query<RowDataPacket[]>(
    "SELECT tipo_accion, datos_anteriores, datos_nuevos FROM log_auditoria WHERE tabla_afectada = ? AND id_registro = ? ORDER BY id_log DESC LIMIT 1",
    [tabla, String(id)]
  );
  return rows[0];
}

const conDb = Boolean(process.env.DB_HOST);

beforeAll(async () => {
  if (conDb) await crearFixtures();
});
afterAll(async () => {
  if (conDb) await limpiarFixtures();
  await db.end();
});

describe.skipIf(!conDb)("acciones de estudiantes", () => {

  describe("lecturas", () => {
    it("rechazan la llamada sin sesion", async () => {
      estado.sesion = null;
      await expect(getEstudiantes()).rejects.toThrow("UNAUTHORIZED");
      await expect(getEstudiantePorNie(NIE_BASE + 1)).rejects.toThrow("UNAUTHORIZED");
    });

    it("devuelven datos con sesion y filtran por estado", async () => {
      estado.sesion = sesionDe(5);
      const todos = await getEstudiantes();
      expect(todos.some((e) => e.nie === NIE_BASE + 1)).toBe(true);
      const inactivos = await getEstudiantes({ estado: "Inactivo" });
      expect(inactivos.every((e) => e.estado === "Inactivo")).toBe(true);
    });

    it("getEstudiantePorNie devuelve null si no existe", async () => {
      estado.sesion = sesionDe(1);
      expect(await getEstudiantePorNie(1)).toBeNull();
    });
  });

  describe("createEstudiante", () => {
    it("Docente (rol 5) no tiene matricula.crear", async () => {
      estado.sesion = sesionDe(5);
      expect(await createEstudiante(base)).toEqual({ success: false, error: "sinPermiso" });
    });

    it("sin sesion devuelve sinPermiso", async () => {
      estado.sesion = null;
      expect(await createEstudiante(base)).toEqual({ success: false, error: "sinPermiso" });
    });

    it("datos invalidos devuelven checkFields con errores por campo", async () => {
      estado.sesion = sesionDe(4);
      const r = await createEstudiante({ ...base, fecha_nacimiento: "31/12/2010" });
      expect(r.success).toBe(false);
      if (!r.success) {
        expect(r.error).toBe("checkFields");
        expect(r.errors?.fecha_nacimiento).toBeDefined();
      }
    });

    it("Secretaria (rol 4) crea y queda auditado", async () => {
      estado.sesion = sesionDe(4);
      expect(await createEstudiante(base)).toEqual({ success: true, nie: NUEVO });
      const est = await getEstudiantePorNie(NUEVO);
      expect(est?.primer_apellido).toBe("Alumno");
      expect(est?.tutores).toEqual([]);
      const log = await ultimaAuditoria("estudiante", NUEVO);
      expect(log.tipo_accion).toBe("INSERT");
      expect(log.datos_nuevos.nie).toBe(NUEVO);
    });

    it("NIE duplicado devuelve nieDuplicado", async () => {
      estado.sesion = sesionDe(4);
      expect(await createEstudiante(base)).toEqual({ success: false, error: "nieDuplicado" });
    });
  });

  describe("updateEstudiante", () => {
    it("rechaza cuando el nie de la ruta no coincide con el del formulario", async () => {
      estado.sesion = sesionDe(4);
      const r = await updateEstudiante(NIE_BASE + 1, base);
      expect(r).toMatchObject({ success: false, error: "checkFields" });
    });

    it("actualiza datos, conserva el estado y guarda imagen previa", async () => {
      estado.sesion = sesionDe(4);
      const r = await updateEstudiante(NUEVO, { ...base, primer_nombre: "Renombrado", estado: "Egresado" });
      expect(r).toEqual({ success: true });
      const est = await getEstudiantePorNie(NUEVO);
      expect(est?.primer_nombre).toBe("Renombrado");
      expect(est?.estado).toBe("Activo");
      const log = await ultimaAuditoria("estudiante", NUEVO);
      expect(log.tipo_accion).toBe("UPDATE");
      expect(log.datos_anteriores.primer_nombre).toBe("Nuevo");
      expect(log.datos_nuevos.primer_nombre).toBe("Renombrado");
      expect(log.datos_nuevos.estado).toBeUndefined();
    });

    it("estudiante inexistente devuelve noExiste", async () => {
      estado.sesion = sesionDe(1);
      expect(await updateEstudiante(NIE_BASE + 5, { ...base, nie: NIE_BASE + 5 })).toEqual({ success: false, error: "noExiste" });
    });
  });

  describe("cambiarEstadoEstudiante", () => {
    it("Egresado sin matricula de 3er grado cerrada y sin observacion se rechaza", async () => {
      estado.sesion = sesionDe(4);
      expect(await cambiarEstadoEstudiante({ nie: NUEVO, estado: "Egresado" })).toEqual({
        success: false,
        error: "egresoRequiereObservacion",
      });
    });

    it("Egresado con observacion (excepcion documentada) se acepta y audita", async () => {
      estado.sesion = sesionDe(4);
      expect(await cambiarEstadoEstudiante({ nie: NUEVO, estado: "Egresado", observacion: "Egreso por equivalencias" })).toEqual({ success: true });
      const est = await getEstudiantePorNie(NUEVO);
      expect(est?.estado).toBe("Egresado");
      const log = await ultimaAuditoria("estudiante", NUEVO);
      expect(log.datos_anteriores).toEqual({ estado: "Activo" });
      expect(log.datos_nuevos.observacion).toBe("Egreso por equivalencias");
    });

    it("Inactivo y Activo cambian libremente; Retirado no es un valor valido aqui", async () => {
      estado.sesion = sesionDe(4);
      expect(await cambiarEstadoEstudiante({ nie: NUEVO, estado: "Inactivo" })).toEqual({ success: true });
      expect(await cambiarEstadoEstudiante({ nie: NUEVO, estado: "Retirado" })).toEqual({ success: false, error: "checkFields" });
      expect(await cambiarEstadoEstudiante({ nie: NUEVO, estado: "Activo" })).toEqual({ success: true });
    });

    it("Docente no puede cambiar estados", async () => {
      estado.sesion = sesionDe(5);
      expect(await cambiarEstadoEstudiante({ nie: NUEVO, estado: "Inactivo" })).toEqual({ success: false, error: "sinPermiso" });
    });
  });
});

describe.skipIf(!conDb)("actualizarFotoEstudiante", () => {
  it("valida permiso, archivo y configuracion del almacenamiento", async () => {
    const fd = new FormData();
    fd.set("foto", new File([new Uint8Array(10)], "foto.jpg", { type: "image/jpeg" }));

    estado.sesion = sesionDe(5);
    expect(await actualizarFotoEstudiante(NIE_BASE + 1, fd)).toEqual({ success: false, error: "sinPermiso" });

    estado.sesion = sesionDe(4);
    const sinArchivo = new FormData();
    expect(await actualizarFotoEstudiante(NIE_BASE + 1, sinArchivo)).toEqual({ success: false, error: "archivoVacio" });

    const pdf = new FormData();
    pdf.set("foto", new File([new Uint8Array(10)], "doc.pdf", { type: "application/pdf" }));
    expect(await actualizarFotoEstudiante(NIE_BASE + 1, pdf)).toEqual({ success: false, error: "tipoNoPermitido" });

    const token = process.env.BLOB_READ_WRITE_TOKEN;
    delete process.env.BLOB_READ_WRITE_TOKEN;
    expect(await actualizarFotoEstudiante(NIE_BASE + 1, fd)).toEqual({ success: false, error: "almacenamientoNoConfigurado" });
    if (token) process.env.BLOB_READ_WRITE_TOKEN = token;
  });

  it("quitar=1 limpia la foto sin necesitar almacenamiento", async () => {
    estado.sesion = sesionDe(4);
    await db.execute("UPDATE estudiante SET foto_url = 'https://ejemplo/foto.jpg' WHERE nie = ?", [NIE_BASE + 1]);
    const fd = new FormData();
    fd.set("quitar", "1");
    expect(await actualizarFotoEstudiante(NIE_BASE + 1, fd)).toEqual({ success: true, nie: NIE_BASE + 1 });
    const est = await getEstudiantePorNie(NIE_BASE + 1);
    expect(est?.foto_url).toBeNull();
    const log = await ultimaAuditoria("estudiante", NIE_BASE + 1);
    expect(log.datos_anteriores).toEqual({ foto_url: "https://ejemplo/foto.jpg" });
  });
});
