'use server';

import { revalidatePath } from 'next/cache';
import { getTranslations } from 'next-intl/server';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { db, getTransaction } from '@/lib/db';
import { requirePermiso, tienePermiso, ROL_DOCENTE } from '@/lib/permisos';
import { registrarAuditoria } from '@/lib/audit';
import { guardarNotasSchema } from '@/lib/validations/nota';
import { ESTADOS_PERIODO } from '@/lib/validations/ciclo';
import { CAMPOS_NOTA, HORAS_GRACIA_CIERRE, enRiesgo, promedioNota, type Notas } from '@/lib/notas';
import { getCargaPorId, type CargaRow } from '@/app/actions/cargas';
import { getDocentePorUsuario } from '@/app/actions/docentes';
import type { ActionState } from '@/types/actions';

type EstadoPeriodo = (typeof ESTADOS_PERIODO)[number];

export interface FilaNota extends Notas {
  nie: number;
  nombre: string;
  bloqueada: boolean;
}

/**Por que la planilla es de solo lectura para el usuario actual */
export type MotivoSoloLectura = 'pendiente' | 'fueraDePlazo' | 'sinPermiso';

export interface PlanillaNotas {
  carga: CargaRow;
  periodo: { id_periodo: number; numero: number; estado: EstadoPeriodo };
  filas: FilaNota[];
  editable: boolean;
  /**Edicion fuera de plazo con notas.editar_bloqueada: lo guardado queda bloqueado */
  autorizacionEspecial: boolean;
  motivo: MotivoSoloLectura | null;
}

const NOMBRE_ESTUDIANTE = "CONCAT_WS(' ', e.primer_nombre, e.segundo_nombre, e.primer_apellido, e.segundo_apellido)";

/**
 * Periodo con los segundos transcurridos desde su cierre. El cierre no tiene
 * columna propia: se toma del registro de auditoria que lo paso a Cerrado.
 */
const PERIODO_CON_CIERRE = `
  SELECT p.id_periodo, p.numero, p.estado, c.estado AS ciclo_estado,
         CASE WHEN p.estado = 'Cerrado' AND cierre.fecha_cierre IS NOT NULL
              THEN TIMESTAMPDIFF(SECOND, cierre.fecha_cierre, NOW()) END AS segundos_desde_cierre
    FROM periodo_evaluativo p
    INNER JOIN ciclo_escolar c ON c.id_ciclo = p.id_ciclo
    LEFT JOIN (
      SELECT id_registro, MAX(fecha_hora) AS fecha_cierre
        FROM log_auditoria
       WHERE tabla_afectada = 'periodo_evaluativo' AND tipo_accion = 'UPDATE'
         AND JSON_UNQUOTE(JSON_EXTRACT(datos_nuevos, '$.estado')) = 'Cerrado'
       GROUP BY id_registro
    ) cierre ON cierre.id_registro = CAST(p.id_periodo AS CHAR)
   WHERE p.id_periodo = ? AND p.id_ciclo = ?`;

/**Cerrado hace mas de HORAS_GRACIA_CIERRE (o sin registro del cierre) */
function fueraDePlazo(periodo: RowDataPacket): boolean {
  if (periodo.estado !== 'Cerrado') return false;
  if (periodo.segundos_desde_cierre === null) return true;
  const segundos = Number(periodo.segundos_desde_cierre);
  return !Number.isFinite(segundos) || segundos >= HORAS_GRACIA_CIERRE * 3600;
}

/**
 * Abierto, o Cerrado dentro del plazo: exige notas.registrar. Cerrado fuera de
 * plazo: exige notas.editar_bloqueada. Pendiente: nadie registra.
 */
function reglaEdicion(periodo: RowDataPacket, normal: boolean, especial: boolean) {
  const fuera = fueraDePlazo(periodo);
  let motivo: MotivoSoloLectura | null = null;
  if (periodo.estado === 'Pendiente') motivo = 'pendiente';
  else if (fuera && !especial) motivo = 'fueraDePlazo';
  else if (!fuera && !normal) motivo = 'sinPermiso';
  return { fuera, motivo, autorizacionEspecial: fuera && especial && motivo === null };
}

/**La carga existe y, si el usuario es docente, le pertenece */
async function cargaAccesible(idCarga: number, idUsuario: number, rol: number): Promise<CargaRow | null> {
  const esDocente = rol === ROL_DOCENTE;
  const [carga, docente] = await Promise.all([getCargaPorId(idCarga), esDocente ? getDocentePorUsuario(idUsuario) : null]);
  if (!carga) return null;
  if (esDocente && carga.dui_docente !== docente?.dui_docente) return null;
  return carga;
}

const aNumero = (v: number | string | null) => (v === null ? null : Number(v));

/**Estudiantes con matricula Vigente en la seccion de la carga y sus notas del periodo */
export async function getPlanillaNotas(idCarga: number, idPeriodo: number): Promise<PlanillaNotas | null> {
  const session = await requirePermiso('notas.ver');
  if (!session) return null;
  const carga = await cargaAccesible(idCarga, Number(session.user.id), session.user.rol);
  if (!carga) return null;

  const [[periodo]] = await db.query<RowDataPacket[]>(PERIODO_CON_CIERRE, [idPeriodo, carga.id_ciclo]);
  if (!periodo || periodo.ciclo_estado !== 'Activo') return null;

  const [[rows], normal, especial] = await Promise.all([
    db.query<RowDataPacket[]>(
      `SELECT e.nie, ${NOMBRE_ESTUDIANTE} AS nombre, n.nota_act1, n.nota_act2, n.nota_examen, n.bloqueada
         FROM matricula m
         INNER JOIN estudiante e ON e.nie = m.nie
         LEFT JOIN nota n ON n.nie = m.nie AND n.cod_materia = ? AND n.id_periodo = ?
        WHERE m.id_seccion = ? AND m.id_ciclo = ? AND m.estado = 'Vigente'
        ORDER BY e.primer_apellido, e.segundo_apellido, e.primer_nombre`,
      [carga.cod_materia, idPeriodo, carga.id_seccion, carga.id_ciclo]
    ),
    tienePermiso('notas.registrar'),
    tienePermiso('notas.editar_bloqueada'),
  ]);
  const regla = reglaEdicion(periodo, normal, especial);

  return {
    carga,
    periodo: { id_periodo: periodo.id_periodo, numero: periodo.numero, estado: periodo.estado },
    filas: rows.map((r) => ({
      nie: r.nie,
      nombre: r.nombre,
      act1: aNumero(r.nota_act1),
      act2: aNumero(r.nota_act2),
      examen: aNumero(r.nota_examen),
      bloqueada: Boolean(r.bloqueada),
    })),
    editable: regla.motivo === null,
    autorizacionEspecial: regla.autorizacionEspecial,
    motivo: regla.motivo,
  };
}

/**Campos: id_carga, id_periodo, act1[<nie>], act2[<nie>], examen[<nie>]. Solo se envian los estudiantes modificados */
export async function guardarNotas(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const t = await getTranslations('notas');
  const [normal, especial] = await Promise.all([requirePermiso('notas.registrar'), requirePermiso('notas.editar_bloqueada')]);
  const session = normal ?? especial;
  if (!session) return { success: false, message: t('errors.sinPermiso') };

  const nies = new Set<string>();
  for (const k of formData.keys()) {
    const m = /^(?:act1|act2|examen)\[(\d+)\]$/.exec(k);
    if (m) nies.add(m[1]);
  }
  const parsed = guardarNotasSchema((k) => t(`errors.${k}`)).safeParse({
    id_carga: formData.get('id_carga'),
    id_periodo: formData.get('id_periodo'),
    registros: [...nies].map((nie) => ({
      nie,
      ...Object.fromEntries(CAMPOS_NOTA.map((c) => [c, formData.get(`${c}[${nie}]`)])),
    })),
  });
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors, message: parsed.error.issues[0]?.message ?? t('errors.revisarCampos') };
  }
  const d = parsed.data;

  // El permiso especial nunca omite la validacion de carga docente
  const carga = await cargaAccesible(d.id_carga, Number(session.user.id), session.user.rol);
  if (!carga) return { success: false, message: t('errors.cargaNoDisponible') };

  const connection = await getTransaction();
  try {
    const [[periodo]] = await connection.query<RowDataPacket[]>(`${PERIODO_CON_CIERRE} FOR UPDATE`, [d.id_periodo, carga.id_ciclo]);
    if (!periodo || periodo.ciclo_estado !== 'Activo') {
      await connection.rollback();
      return { success: false, message: t('errors.periodoNoDisponible') };
    }
    const regla = reglaEdicion(periodo, Boolean(normal), Boolean(especial));
    if (regla.motivo) {
      await connection.rollback();
      return { success: false, message: t(`errors.${regla.motivo}`) };
    }

    const [vigentes] = await connection.query<RowDataPacket[]>(
      "SELECT nie FROM matricula WHERE id_seccion = ? AND id_ciclo = ? AND estado = 'Vigente'",
      [carga.id_seccion, carga.id_ciclo]
    );
    const validos = new Set(vigentes.map((r) => Number(r.nie)));
    if (d.registros.some((r) => !validos.has(r.nie))) {
      await connection.rollback();
      return { success: false, message: t('errors.estudianteInvalido') };
    }

    const [previas] = await connection.query<RowDataPacket[]>(
      `SELECT id_nota, nie, nota_act1, nota_act2, nota_examen, promedio, riesgo_academico, bloqueada
         FROM nota WHERE cod_materia = ? AND id_periodo = ? AND nie IN (?) FOR UPDATE`,
      [carga.cod_materia, d.id_periodo, d.registros.map((r) => r.nie)]
    );
    const anterior = new Map(previas.map((r) => [Number(r.nie), r]));
    const bloqueada = d.registros.find((r) => anterior.get(r.nie)?.bloqueada && !regla.autorizacionEspecial);
    if (bloqueada) {
      await connection.rollback();
      return { success: false, message: t('errors.notaBloqueada', { nie: bloqueada.nie }) };
    }

    for (const r of d.registros) {
      const promedio = promedioNota(r);
      const riesgo = enRiesgo(promedio);
      const previa = anterior.get(r.nie);
      const [res] = await connection.execute<ResultSetHeader>(
        `INSERT INTO nota (nie, cod_materia, id_periodo, nota_act1, nota_act2, nota_examen, promedio, riesgo_academico, dui_docente, bloqueada)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE nota_act1 = VALUES(nota_act1), nota_act2 = VALUES(nota_act2), nota_examen = VALUES(nota_examen),
           promedio = VALUES(promedio), riesgo_academico = VALUES(riesgo_academico), bloqueada = VALUES(bloqueada)`,
        [r.nie, carga.cod_materia, d.id_periodo, r.act1, r.act2, r.examen, promedio, riesgo, carga.dui_docente, regla.fuera]
      );
      await registrarAuditoria(connection, {
        idUsuario: Number(session.user.id),
        tabla: 'nota',
        idRegistro: previa?.id_nota ?? res.insertId,
        accion: previa ? 'UPDATE' : 'INSERT',
        datosAnteriores: previa
          ? {
              nota_act1: previa.nota_act1,
              nota_act2: previa.nota_act2,
              nota_examen: previa.nota_examen,
              promedio: previa.promedio,
              riesgo_academico: previa.riesgo_academico,
              bloqueada: previa.bloqueada,
            }
          : undefined,
        datos: {
          nie: r.nie,
          cod_materia: carga.cod_materia,
          id_periodo: d.id_periodo,
          nota_act1: r.act1,
          nota_act2: r.act2,
          nota_examen: r.examen,
          promedio,
          riesgo_academico: riesgo,
          bloqueada: regla.fuera,
          autorizacion_especial: regla.autorizacionEspecial,
        },
      });
    }
    await connection.commit();
    revalidatePath('/dashboard/notas');
    revalidatePath('/dashboard/boletas');
    return { success: true, message: t(regla.autorizacionEspecial ? 'guardadasEspecial' : 'guardadas', { total: d.registros.length }) };
  } catch (error) {
    await connection.rollback();
    console.error('Error guardando notas:', error);
    return { success: false, message: t('errors.errorServidor') };
  } finally {
    connection.release();
  }
}
