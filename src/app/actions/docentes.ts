'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { getTranslations } from 'next-intl/server';
import { RowDataPacket } from 'mysql2';
import { db, getTransaction, isDuplicateEntry } from '@/lib/db';
import { requireSession } from '@/lib/session';
import { tienePermiso } from '@/lib/permisos';
import { registrarAuditoria } from '@/lib/audit';
import { DUI_REGEX, TELEFONO_REGEX, FECHA_ISO_REGEX } from '@/lib/validations/shared';
import type { ActionState } from '@/types/actions';
import { ESTADOS_DOCENTE, type EstadoDocente } from '@/lib/constantes';

// Rol 5 = Docente (002_seed.sql). El perfil se liga al id_usuario de la sesion,
// asi que solo un docente puede completar el suyo.
const ROL_DOCENTE = 5;

export interface Especialidad {
  id_especialidad: number;
  nombre: string;
}

export interface Docente {
  dui_docente: string;
  id_usuario: number;
  primer_nombre: string;
  segundo_nombre: string | null;
  primer_apellido: string;
  segundo_apellido: string | null;
  id_especialidad: number | null;
  telefono: string | null;
  estado: EstadoDocente;
  fecha_ingreso: string;
}

export interface DocenteRow extends Docente {
  especialidad_nombre: string | null;
  email: string;
  usuario_estado: string;
  /**Cargas del ciclo Activo */
  cargas: number;
}

async function exigirSesion() {
  const session = await requireSession();
  if (!session) throw new Error('UNAUTHORIZED');
  return session;
}

function iso(d: Date | string): string {
  return typeof d === 'string' ? d.slice(0, 10) : d.toISOString().slice(0, 10);
}

function mapDocente<T extends RowDataPacket>(r: T) {
  return { ...r, fecha_ingreso: iso(r.fecha_ingreso), cargas: Number(r.cargas ?? 0) };
}

export async function getEspecialidadesActivas(): Promise<Especialidad[]> {
  await exigirSesion();
  const [rows] = await db.query<RowDataPacket[]>(
    'SELECT id_especialidad, nombre FROM especialidad WHERE activa = TRUE ORDER BY nombre ASC'
  );
  return rows as Especialidad[];
}

const SELECT_DOCENTE = `
  SELECT d.*, e.nombre AS especialidad_nombre, u.email, u.estado AS usuario_estado,
         (SELECT COUNT(*) FROM carga_academica ca
            INNER JOIN ciclo_escolar c ON c.id_ciclo = ca.id_ciclo
           WHERE ca.dui_docente = d.dui_docente AND c.estado = 'Activo') AS cargas
    FROM docente d
    LEFT JOIN especialidad e ON e.id_especialidad = d.id_especialidad
    INNER JOIN usuario u ON u.id_usuario = d.id_usuario`;

export async function getDocentes(soloActivos = false): Promise<DocenteRow[]> {
  await exigirSesion();
  const [rows] = await db.query<RowDataPacket[]>(
    `${SELECT_DOCENTE} ${soloActivos ? "WHERE d.estado = 'Activo'" : ''} ORDER BY d.primer_apellido, d.primer_nombre`
  );
  return rows.map(mapDocente) as DocenteRow[];
}

export async function getDocentePorDui(dui: string): Promise<DocenteRow | null> {
  await exigirSesion();
  const [rows] = await db.query<RowDataPacket[]>(`${SELECT_DOCENTE} WHERE d.dui_docente = ?`, [dui]);
  return rows[0] ? (mapDocente(rows[0]) as DocenteRow) : null;
}

/**Perfil del usuario de la sesion (null si el docente aun no lo completo: gap 1) */
export async function getDocentePorUsuario(idUsuario: number): Promise<DocenteRow | null> {
  await exigirSesion();
  const [rows] = await db.query<RowDataPacket[]>(`${SELECT_DOCENTE} WHERE d.id_usuario = ?`, [idUsuario]);
  return rows[0] ? (mapDocente(rows[0]) as DocenteRow) : null;
}

/**true si el usuario tiene fila en docente; para el guard del layout */
export async function usuarioTieneDocente(idUsuario: number): Promise<boolean> {
  const [rows] = await db.query<RowDataPacket[]>('SELECT 1 FROM docente WHERE id_usuario = ? LIMIT 1', [idUsuario]);
  return rows.length > 0;
}

// Los mensajes salen del catalogo next-intl (locale de la cookie), asi los
// errores de campo llegan ya traducidos al formulario.
const buildDocenteSchema = (t: (key: string) => string) =>
  z.object({
    dui_docente: z.string().regex(DUI_REGEX, t('duiFormato')),
    primer_nombre: z.string().trim().min(2, t('primerNombreRequerido')).max(50),
    segundo_nombre: z.string().max(50).nullable(),
    primer_apellido: z.string().trim().min(2, t('primerApellidoRequerido')).max(50),
    segundo_apellido: z.string().max(50).nullable(),
    id_especialidad: z.coerce.number().int().positive(t('especialidadInvalida')),
    telefono: z.string().regex(TELEFONO_REGEX, t('telefonoFormato')),
    fecha_ingreso: z
      .string()
      .regex(FECHA_ISO_REGEX, t('fechaInvalida'))
      .refine((val) => !isNaN(Date.parse(val)), t('fechaInvalida')),
  });

function leer(formData: FormData) {
  return {
    dui_docente: formData.get('dui_docente'),
    primer_nombre: formData.get('primer_nombre'),
    segundo_nombre: formData.get('segundo_nombre') || null,
    primer_apellido: formData.get('primer_apellido'),
    segundo_apellido: formData.get('segundo_apellido') || null,
    id_especialidad: formData.get('id_especialidad'),
    telefono: formData.get('telefono'),
    fecha_ingreso: formData.get('fecha_ingreso'),
  };
}

export async function completarPerfilDocente(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const t = await getTranslations('docentes');

  const session = await requireSession();
  if (!session) {
    return { success: false, message: t('errors.noAutorizado') };
  }
  if (session.user.rol !== ROL_DOCENTE) {
    return { success: false, message: t('errors.soloDocentes') };
  }

  const userId = Number(session.user.id);

  const validation = buildDocenteSchema((key) => t(`errors.${key}`)).safeParse(leer(formData));
  if (!validation.success) {
    return {
      success: false,
      errors: validation.error.flatten().fieldErrors,
      message: t('errors.revisarCampos'),
    };
  }

  const data = validation.data;
  const connection = await getTransaction();

  try {
    await connection.execute(
      `INSERT INTO docente
        (dui_docente, id_usuario, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, id_especialidad, telefono, estado, fecha_ingreso)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Activo', ?)`,
      [
        data.dui_docente,
        userId,
        data.primer_nombre,
        data.segundo_nombre,
        data.primer_apellido,
        data.segundo_apellido,
        data.id_especialidad,
        data.telefono,
        data.fecha_ingreso,
      ]
    );

    await registrarAuditoria(connection, {
      idUsuario: userId,
      tabla: 'docente',
      idRegistro: data.dui_docente,
      accion: 'INSERT',
      datos: data,
    });

    await connection.commit();

    // El dashboard cuenta docentes en sus indicadores
    revalidatePath('/dashboard');
    revalidatePath('/dashboard/docentes');
    return { success: true, message: t('exito') };
  } catch (error) {
    await connection.rollback();
    if (isDuplicateEntry(error)) {
      return { success: false, message: t('errors.duplicado') };
    }
    console.error('Error creating docente:', error);
    return { success: false, message: t('errors.errorServidor') };
  } finally {
    connection.release();
  }
}

/**
 * Edita el perfil: el propio docente (rol 5, su fila) o quien tenga
 * usuarios.editar. El DUI es la PK y no cambia.
 */
export async function editarPerfilDocente(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const t = await getTranslations('docentes');
  const session = await requireSession();
  if (!session) return { success: false, message: t('errors.noAutorizado') };

  const validation = buildDocenteSchema((key) => t(`errors.${key}`)).safeParse(leer(formData));
  if (!validation.success) {
    return { success: false, errors: validation.error.flatten().fieldErrors, message: t('errors.revisarCampos') };
  }
  const data = validation.data;
  const idUsuario = Number(session.user.id);
  const connection = await getTransaction();
  try {
    const [rows] = await connection.query<RowDataPacket[]>('SELECT * FROM docente WHERE dui_docente = ? FOR UPDATE', [data.dui_docente]);
    if (!rows[0]) { await connection.rollback(); return { success: false, message: t('errors.noExiste') }; }

    const esPropio = rows[0].id_usuario === idUsuario;
    if (!esPropio && !(await tienePermiso(session.user.rol, 'usuarios.editar'))) {
      await connection.rollback();
      return { success: false, message: t('errors.sinPermiso') };
    }

    await connection.execute(
      `UPDATE docente
          SET primer_nombre = ?, segundo_nombre = ?, primer_apellido = ?, segundo_apellido = ?,
              id_especialidad = ?, telefono = ?, fecha_ingreso = ?
        WHERE dui_docente = ?`,
      [data.primer_nombre, data.segundo_nombre, data.primer_apellido, data.segundo_apellido, data.id_especialidad, data.telefono, data.fecha_ingreso, data.dui_docente]
    );
    await registrarAuditoria(connection, {
      idUsuario,
      tabla: 'docente',
      idRegistro: data.dui_docente,
      accion: 'UPDATE',
      datosAnteriores: mapDocente(rows[0]),
      datos: data,
    });
    await connection.commit();
    revalidatePath('/dashboard/docentes');
    revalidatePath(`/dashboard/docentes/${data.dui_docente}`);
    return { success: true, message: t('actualizado') };
  } catch (error) {
    await connection.rollback();
    console.error('Error editando docente:', error);
    return { success: false, message: t('errors.errorServidor') };
  } finally {
    connection.release();
  }
}

/**Activo / Inactivo / Licencia. Un docente no Activo no recibe cargas nuevas */
export async function setEstadoDocente(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const t = await getTranslations('docentes');
  const session = await requireSession();
  if (!session || !(await tienePermiso(session.user.rol, 'usuarios.editar'))) {
    return { success: false, message: t('errors.sinPermiso') };
  }
  const parsed = z.object({ dui_docente: z.string().regex(DUI_REGEX), estado: z.enum(ESTADOS_DOCENTE) })
    .safeParse({ dui_docente: formData.get('dui_docente'), estado: formData.get('estado') });
  if (!parsed.success) return { success: false, message: t('errors.revisarCampos') };

  const connection = await getTransaction();
  try {
    const [rows] = await connection.query<RowDataPacket[]>('SELECT estado FROM docente WHERE dui_docente = ? FOR UPDATE', [parsed.data.dui_docente]);
    if (!rows[0]) { await connection.rollback(); return { success: false, message: t('errors.noExiste') }; }
    await connection.execute('UPDATE docente SET estado = ? WHERE dui_docente = ?', [parsed.data.estado, parsed.data.dui_docente]);
    await registrarAuditoria(connection, {
      idUsuario: Number(session.user.id),
      tabla: 'docente',
      idRegistro: parsed.data.dui_docente,
      accion: 'UPDATE',
      datosAnteriores: { estado: rows[0].estado },
      datos: { estado: parsed.data.estado },
    });
    await connection.commit();
    revalidatePath('/dashboard/docentes');
    revalidatePath(`/dashboard/docentes/${parsed.data.dui_docente}`);
    return { success: true, message: t('estadoActualizado') };
  } catch (error) {
    await connection.rollback();
    console.error('Error cambiando estado de docente:', error);
    return { success: false, message: t('errors.errorServidor') };
  } finally {
    connection.release();
  }
}
