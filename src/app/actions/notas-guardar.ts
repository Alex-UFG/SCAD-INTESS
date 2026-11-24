"use server";

import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { revalidatePath } from "next/cache";
import { getTransaction } from "@/lib/db";
import { requirePermiso } from "@/lib/permisos";
import { registrarAuditoria } from "@/lib/audit";

interface CargaGuardarRow extends RowDataPacket {
  id_carga: number;
  dui_docente: string;
  cod_materia: string;
  id_seccion: number;
  id_ciclo: number;
  estado_ciclo: string;
}

interface PeriodoGuardarRow extends RowDataPacket {
  id_periodo: number;
  id_ciclo: number;
  estado: string;
  segundos_desde_cierre: number | null;
}

interface DocenteGuardarRow extends RowDataPacket {
  dui_docente: string;
}

interface NotaAnteriorRow extends RowDataPacket {
  id_nota: number;
  nota_act1: number | string | null;
  nota_act2: number | string | null;
  nota_examen: number | string | null;
  promedio: number | string | null;
  riesgo_academico: number;
  bloqueada: number;
}

interface MatriculaRow extends RowDataPacket {
  nie: number;
}

interface NotaEntrada {
  nie: number;
  act1: number | null;
  act2: number | null;
  examen: number | null;
}

function validarNota(valor: unknown): valor is number | null {
  return (
    valor === null ||
    (typeof valor === "number" &&
      Number.isFinite(valor) &&
      valor >= 0 &&
      valor <= 10)
  );
}

function calcularPromedio(
  act1: number | null,
  act2: number | null,
  examen: number | null
): number | null {
  if (act1 === null || act2 === null || examen === null) {
    return null;
  }

  return Math.round(
    (act1 * 0.35 + act2 * 0.35 + examen * 0.30) * 100
  ) / 100;
}

export async function guardarNotas(
  idCarga: number,
  idPeriodo: number,
  registros: NotaEntrada[]
): Promise<{ success: boolean; message: string; guardadas?: number }> {
  const sessionNormal = await requirePermiso("notas.registrar");
  const sessionEspecial = await requirePermiso("notas.editar_bloqueada");
  const session = sessionNormal ?? sessionEspecial;
  const permisoEspecial = Boolean(sessionEspecial);

  if (!session) {
    return {
      success: false,
      message: "No tienes permiso para registrar calificaciones.",
    };
  }

  if (
    !Number.isSafeInteger(idCarga) ||
    idCarga <= 0 ||
    !Number.isSafeInteger(idPeriodo) ||
    idPeriodo <= 0
  ) {
    return {
      success: false,
      message: "La carga académica o el período no son válidos.",
    };
  }

  if (
    !Array.isArray(registros) ||
    registros.length === 0 ||
    registros.length > 120
  ) {
    return {
      success: false,
      message: "No hay calificaciones válidas para guardar.",
    };
  }

  const estudiantesUnicos = new Set<number>();

  for (const registro of registros) {
    if (
      !Number.isSafeInteger(registro.nie) ||
      registro.nie <= 0 ||
      estudiantesUnicos.has(registro.nie) ||
      !validarNota(registro.act1) ||
      !validarNota(registro.act2) ||
      !validarNota(registro.examen)
    ) {
      return {
        success: false,
        message: "Hay estudiantes o calificaciones con datos inválidos.",
      };
    }

    estudiantesUnicos.add(registro.nie);
  }

  const connection = await getTransaction();

  try {
    const [cargas] = await connection.query<CargaGuardarRow[]>(
      `
        SELECT
          ca.id_carga,
          ca.dui_docente,
          ca.cod_materia,
          ca.id_seccion,
          ca.id_ciclo,
          c.estado AS estado_ciclo
        FROM carga_academica ca
        INNER JOIN ciclo_escolar c ON c.id_ciclo = ca.id_ciclo
        WHERE ca.id_carga = ?
        FOR UPDATE
      `,
      [idCarga]
    );

    const carga = cargas[0];

    if (!carga || carga.estado_ciclo !== "Activo") {
      await connection.rollback();
      return {
        success: false,
        message: "La carga académica no existe o su ciclo no está activo.",
      };
    }

    // El permiso especial nunca omite la validación de carga docente.
    if (Number(session.user.rol) === 5) {
      const [docentes] = await connection.query<DocenteGuardarRow[]>(
        `
          SELECT dui_docente
          FROM docente
          WHERE id_usuario = ? AND estado = 'Activo'
          LIMIT 1
        `,
        [Number(session.user.id)]
      );

      if (
        !docentes[0] ||
        docentes[0].dui_docente !== carga.dui_docente
      ) {
        await connection.rollback();
        return {
          success: false,
          message: "No tienes acceso para registrar notas en esta carga.",
        };
      }
    }

    const [periodos] = await connection.query<PeriodoGuardarRow[]>(
      `
        SELECT
          p.id_periodo,
          p.id_ciclo,
          p.estado,
          CASE
            WHEN p.estado = 'Cerrado' AND cierre.fecha_cierre IS NOT NULL
            THEN TIMESTAMPDIFF(SECOND, cierre.fecha_cierre, NOW())
            ELSE NULL
          END AS segundos_desde_cierre
        FROM periodo_evaluativo p
        LEFT JOIN (
          SELECT
            id_registro,
            MAX(fecha_hora) AS fecha_cierre
          FROM log_auditoria
          WHERE tabla_afectada = 'periodo_evaluativo'
            AND tipo_accion = 'UPDATE'
            AND JSON_UNQUOTE(
              JSON_EXTRACT(datos_nuevos, '$.estado')
            ) = 'Cerrado'
          GROUP BY id_registro
        ) cierre
          ON cierre.id_registro = CAST(p.id_periodo AS CHAR)
        WHERE p.id_periodo = ? AND p.id_ciclo = ?
        FOR UPDATE
      `,
      [idPeriodo, carga.id_ciclo]
    );

    const periodo = periodos[0];

    if (!periodo || periodo.estado === "Pendiente") {
      await connection.rollback();
      return {
        success: false,
        message: "El período no está disponible para registrar calificaciones.",
      };
    }

    const horas72 = 72 * 60 * 60;
    const segundosCierre = Number(periodo.segundos_desde_cierre);

    const cierreFueraDePlazo =
      periodo.estado === "Cerrado" &&
      (periodo.segundos_desde_cierre === null ||
        !Number.isFinite(segundosCierre) ||
        segundosCierre >= horas72);


    if (periodo.estado === "Cerrado" && !permisoEspecial && cierreFueraDePlazo) {
      await connection.rollback();
      return {
        success: false,
        message: "El período superó las 72 horas. Se requiere autorización especial para modificar calificaciones.",
      };
    }

    if (
      (periodo.estado === "Abierto" ||
        (periodo.estado === "Cerrado" && !cierreFueraDePlazo)) &&
      !sessionNormal
    ) {
      await connection.rollback();
      return {
        success: false,
        message: "Se requiere el permiso normal para registrar calificaciones durante este período.",
      };
    }

    if (periodo.estado !== "Abierto" && periodo.estado !== "Cerrado") {
      await connection.rollback();
      return {
        success: false,
        message: "El estado del período no permite registrar calificaciones.",
      };
    }

    const bloquearNota = cierreFueraDePlazo ? 1 : 0;

    const permisoEspecialAplicado =
      periodo.estado === "Cerrado" &&
      cierreFueraDePlazo &&
      permisoEspecial;

    const listaNie = registros.map((registro) => registro.nie);
    const marcadores = listaNie.map(() => "?").join(",");

    const [matriculas] = await connection.query<MatriculaRow[]>(
      `
        SELECT nie
        FROM matricula
        WHERE id_seccion = ?
          AND id_ciclo = ?
          AND estado = 'Vigente'
          AND nie IN (${marcadores})
        FOR UPDATE
      `,
      [carga.id_seccion, carga.id_ciclo, ...listaNie]
    );

    const matriculados = new Set(matriculas.map((item) => item.nie));

    if (matriculados.size !== registros.length) {
      await connection.rollback();
      return {
        success: false,
        message: "Hay estudiantes que no pertenecen a esta matrícula vigente.",
      };
    }

    let guardadas = 0;

    for (const registro of registros) {
      const [anteriores] = await connection.query<NotaAnteriorRow[]>(
        `
          SELECT
            id_nota,
            nota_act1,
            nota_act2,
            nota_examen,
            promedio,
            riesgo_academico,
            bloqueada
          FROM nota
          WHERE nie = ?
            AND cod_materia = ?
            AND id_periodo = ?
          FOR UPDATE
        `,
        [registro.nie, carga.cod_materia, idPeriodo]
      );

      const anterior = anteriores[0];

      if (anterior?.bloqueada && !permisoEspecialAplicado) {
        await connection.rollback();
        return {
          success: false,
          message: `La calificación del estudiante ${registro.nie} está bloqueada. Se requiere autorización especial.`,
        };
      }

      if (anterior?.bloqueada && !cierreFueraDePlazo) {
        await connection.rollback();
        return {
          success: false,
          message: "La calificación está bloqueada y el período no ha superado las 72 horas de cierre.",
        };
      }

      const promedio = calcularPromedio(
        registro.act1,
        registro.act2,
        registro.examen
      );

      const riesgo = promedio !== null && promedio < 6;

      const [resultado] = await connection.execute<ResultSetHeader>(
        `
          INSERT INTO nota (
            nie,
            cod_materia,
            id_periodo,
            nota_act1,
            nota_act2,
            nota_examen,
            promedio,
            riesgo_academico,
            dui_docente,
            bloqueada
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            nota_act1 = VALUES(nota_act1),
            nota_act2 = VALUES(nota_act2),
            nota_examen = VALUES(nota_examen),
            promedio = VALUES(promedio),
            riesgo_academico = VALUES(riesgo_academico),
            bloqueada = VALUES(bloqueada)
        `,
        [
          registro.nie,
          carga.cod_materia,
          idPeriodo,
          registro.act1,
          registro.act2,
          registro.examen,
          promedio,
          riesgo ? 1 : 0,
          carga.dui_docente,
          bloquearNota,
        ]
      );

      const idNota = anterior?.id_nota ?? resultado.insertId;

      await registrarAuditoria(connection, {
        idUsuario: Number(session.user.id),
        tabla: "nota",
        idRegistro:
          idNota || `${registro.nie}-${carga.cod_materia}-${idPeriodo}`,
        accion: anterior ? "UPDATE" : "INSERT",
        datosAnteriores: anterior
          ? {
              nota_act1: anterior.nota_act1,
              nota_act2: anterior.nota_act2,
              nota_examen: anterior.nota_examen,
              promedio: anterior.promedio,
              riesgo_academico: anterior.riesgo_academico,
              bloqueada: anterior.bloqueada,
            }
          : undefined,
        datos: {
          nie: registro.nie,
          cod_materia: carga.cod_materia,
          id_periodo: idPeriodo,
          nota_act1: registro.act1,
          nota_act2: registro.act2,
          nota_examen: registro.examen,
          promedio,
          riesgo_academico: riesgo,
          bloqueada: Boolean(bloquearNota),
          autorizacion_especial: permisoEspecialAplicado,
        },
      });

      guardadas++;
    }

    await connection.commit();
    revalidatePath("/dashboard/notas");

    return {
      success: true,
      message: permisoEspecialAplicado
        ? "Las calificaciones se modificaron con autorización especial y quedaron bloqueadas."
        : "Las calificaciones se guardaron correctamente.",
      guardadas,
    };
  } catch (error) {
    await connection.rollback();
    console.error("Error guardando calificaciones:", error);

    return {
      success: false,
      message: "Ocurrió un error al guardar las calificaciones.",
    };
  } finally {
    connection.release();
  }
}
