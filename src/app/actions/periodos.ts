
'use server';

import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import { revalidatePath } from 'next/cache';
import { db, getTransaction } from '@/lib/db';
import { requirePermiso } from '@/lib/permisos';
import { registrarAuditoria } from '@/lib/audit';

export interface PeriodoEvaluativo {
  id_periodo: number;
  id_ciclo: number;
  anio: number;
  numero: number;
  fecha_inicio: string;
  fecha_cierre: string;
  estado: 'Pendiente' | 'Abierto' | 'Cerrado';
}

interface PeriodoRow extends RowDataPacket {
  id_periodo: number;
  id_ciclo: number;
  anio: number;
  numero: number;
  fecha_inicio: string;
  fecha_cierre: string;
  estado: 'Pendiente' | 'Abierto' | 'Cerrado';
}

interface PeriodoEstadoRow extends RowDataPacket {
  id_periodo: number;
  id_ciclo: number;
  fecha_inicio: string;
  fecha_cierre: string;
  estado: 'Pendiente' | 'Abierto' | 'Cerrado';
  estado_ciclo: 'Planificado' | 'Activo' | 'Cerrado';
  inicio_ciclo: string;
  fin_ciclo: string;
}

interface PeriodoSolapadoRow extends RowDataPacket {
  id_periodo: number;
}

// ======================================================
// VALIDACIONES DE FECHAS
// ======================================================

function fechaValida(fecha: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return false;
  }

  const date = new Date(`${fecha}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === fecha
  );
}

// ======================================================
// CONSULTAR PERIODOS EVALUATIVOS
// ======================================================

export async function getPeriodos(): Promise<PeriodoEvaluativo[]> {
  const session = await requirePermiso('config.ciclos');

  if (!session) {
    throw new Error(
      'No tienes permiso para consultar los períodos evaluativos.'
    );
  }

  try {
    const [rows] = await db.query<PeriodoRow[]>(`
      SELECT
        p.id_periodo,
        p.id_ciclo,
        c.anio,
        p.numero,
        p.fecha_inicio,
        p.fecha_cierre,
        p.estado
      FROM periodo_evaluativo p
      INNER JOIN ciclo_escolar c ON p.id_ciclo = c.id_ciclo
      ORDER BY c.anio DESC, p.numero ASC
    `);

    return rows;
  } catch (error) {
    console.error('Error consultando períodos evaluativos:', error);
    throw new Error('No se pudieron obtener los períodos evaluativos.');
  }
}

// ======================================================
// CAMBIAR ESTADO DE UN PERIODO
// ======================================================

async function cambiarEstadoPeriodo(
  idPeriodo: number,
  estadoActual: 'Pendiente' | 'Abierto',
  estadoNuevo: 'Abierto' | 'Cerrado'
): Promise<{ success: boolean; message: string }> {
  const session = await requirePermiso('config.ciclos');

  if (!session) {
    return {
      success: false,
      message: 'No tienes permiso para administrar períodos evaluativos.',
    };
  }

  if (!Number.isSafeInteger(idPeriodo) || idPeriodo <= 0) {
    return {
      success: false,
      message: 'El período seleccionado no es válido.',
    };
  }

  const connection = await getTransaction();

  try {
    const [rows] = await connection.query<PeriodoEstadoRow[]>(
      `
        SELECT
          p.id_periodo,
          p.id_ciclo,
          p.fecha_inicio,
          p.fecha_cierre,
          p.estado,
          c.estado AS estado_ciclo,
          c.fecha_inicio AS inicio_ciclo,
          c.fecha_fin AS fin_ciclo
        FROM periodo_evaluativo p
        INNER JOIN ciclo_escolar c ON p.id_ciclo = c.id_ciclo
        WHERE p.id_periodo = ?
        FOR UPDATE
      `,
      [idPeriodo]
    );

    const periodo = rows[0];

    if (!periodo) {
      await connection.rollback();
      return {
        success: false,
        message: 'El período evaluativo no existe.',
      };
    }

    if (periodo.estado_ciclo !== 'Activo') {
      await connection.rollback();
      return {
        success: false,
        message: 'Solo se pueden administrar períodos de ciclos activos.',
      };
    }

    if (periodo.estado !== estadoActual) {
      await connection.rollback();
      return {
        success: false,
        message: 'El estado actual del período no permite esta operación.',
      };
    }

    const [resultado] = await connection.execute<ResultSetHeader>(
      `
        UPDATE periodo_evaluativo
        SET estado = ?
        WHERE id_periodo = ? AND estado = ?
      `,
      [estadoNuevo, idPeriodo, estadoActual]
    );

    if (resultado.affectedRows !== 1) {
      await connection.rollback();
      return {
        success: false,
        message: 'No fue posible actualizar el período evaluativo.',
      };
    }

    await registrarAuditoria(connection, {
      idUsuario: Number(session.user.id),
      tabla: 'periodo_evaluativo',
      idRegistro: idPeriodo,
      accion: 'UPDATE',
      datosAnteriores: {
        estado: estadoActual,
      },
      datos: {
        estado: estadoNuevo,
      },
    });

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    console.error('Error actualizando período evaluativo:', error);

    return {
      success: false,
      message: 'Ocurrió un error al actualizar el período evaluativo.',
    };
  } finally {
    connection.release();
  }

  revalidatePath('/dashboard/periodos');

  return {
    success: true,
    message:
      estadoNuevo === 'Abierto'
        ? 'El período evaluativo fue abierto correctamente.'
        : 'El período evaluativo fue cerrado correctamente.',
  };
}

// ======================================================
// ABRIR PERIODO
// ======================================================

export async function abrirPeriodoEvaluativo(idPeriodo: number) {
  return cambiarEstadoPeriodo(idPeriodo, 'Pendiente', 'Abierto');
}

// ======================================================
// CERRAR PERIODO
// ======================================================

export async function cerrarPeriodoEvaluativo(idPeriodo: number) {
  return cambiarEstadoPeriodo(idPeriodo, 'Abierto', 'Cerrado');
}

// ======================================================
// EDITAR FECHAS DE UN PERIODO
// ======================================================

export async function actualizarFechasPeriodo(
  idPeriodo: number,
  fechaInicio: string,
  fechaCierre: string
): Promise<{ success: boolean; message: string }> {
  const session = await requirePermiso('config.ciclos');

  if (!session) {
    return {
      success: false,
      message: 'No tienes permiso para administrar períodos evaluativos.',
    };
  }

  if (!Number.isSafeInteger(idPeriodo) || idPeriodo <= 0) {
    return {
      success: false,
      message: 'El período seleccionado no es válido.',
    };
  }

  if (!fechaValida(fechaInicio) || !fechaValida(fechaCierre)) {
    return {
      success: false,
      message: 'Las fechas ingresadas no son válidas.',
    };
  }

  if (fechaInicio > fechaCierre) {
    return {
      success: false,
      message: 'La fecha de inicio no puede ser posterior a la fecha de cierre.',
    };
  }

  const connection = await getTransaction();

  try {
    const [rows] = await connection.query<PeriodoEstadoRow[]>(
      `
        SELECT
          p.id_periodo,
          p.id_ciclo,
          p.fecha_inicio,
          p.fecha_cierre,
          p.estado,
          c.estado AS estado_ciclo,
          c.fecha_inicio AS inicio_ciclo,
          c.fecha_fin AS fin_ciclo
        FROM periodo_evaluativo p
        INNER JOIN ciclo_escolar c ON p.id_ciclo = c.id_ciclo
        WHERE p.id_periodo = ?
        FOR UPDATE
      `,
      [idPeriodo]
    );

    const periodo = rows[0];

    if (!periodo) {
      await connection.rollback();
      return {
        success: false,
        message: 'El período evaluativo no existe.',
      };
    }

    if (periodo.estado_ciclo !== 'Activo') {
      await connection.rollback();
      return {
        success: false,
        message: 'Solo se pueden modificar períodos de ciclos activos.',
      };
    }

    if (periodo.estado !== 'Pendiente') {
      await connection.rollback();
      return {
        success: false,
        message: 'Solo se pueden editar fechas de períodos pendientes.',
      };
    }

    const inicioCiclo = String(periodo.inicio_ciclo).slice(0, 10);
    const finCiclo = String(periodo.fin_ciclo).slice(0, 10);

    if (fechaInicio < inicioCiclo || fechaCierre > finCiclo) {
      await connection.rollback();
      return {
        success: false,
        message: 'Las fechas deben estar dentro del ciclo escolar.',
      };
    }

    // Evitar que las fechas se crucen con otro período del mismo ciclo.
    const [solapados] = await connection.query<PeriodoSolapadoRow[]>(
      `
        SELECT id_periodo
        FROM periodo_evaluativo
        WHERE id_ciclo = ?
          AND id_periodo <> ?
          AND fecha_inicio <= ?
          AND fecha_cierre >= ?
        LIMIT 1
        FOR UPDATE
      `,
      [periodo.id_ciclo, idPeriodo, fechaCierre, fechaInicio]
    );

    if (solapados.length > 0) {
      await connection.rollback();
      return {
        success: false,
        message: 'Las fechas se superponen con otro período evaluativo.',
      };
    }

    const [resultado] = await connection.execute<ResultSetHeader>(
      `
        UPDATE periodo_evaluativo
        SET fecha_inicio = ?, fecha_cierre = ?
        WHERE id_periodo = ? AND estado = 'Pendiente'
      `,
      [fechaInicio, fechaCierre, idPeriodo]
    );

    if (resultado.affectedRows !== 1) {
      await connection.rollback();
      return {
        success: false,
        message: 'No fue posible actualizar las fechas del período.',
      };
    }

    await registrarAuditoria(connection, {
      idUsuario: Number(session.user.id),
      tabla: 'periodo_evaluativo',
      idRegistro: idPeriodo,
      accion: 'UPDATE',
      datosAnteriores: {
        fecha_inicio: periodo.fecha_inicio,
        fecha_cierre: periodo.fecha_cierre,
      },
      datos: {
        fecha_inicio: fechaInicio,
        fecha_cierre: fechaCierre,
      },
    });

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    console.error('Error actualizando fechas del período:', error);

    return {
      success: false,
      message: 'Ocurrió un error al actualizar las fechas del período.',
    };
  } finally {
    connection.release();
  }

  revalidatePath('/dashboard/periodos');

  return {
    success: true,
    message: 'Las fechas del período se actualizaron correctamente.',
  };
}
