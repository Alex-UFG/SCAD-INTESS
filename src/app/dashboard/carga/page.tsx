import { redirect } from 'next/navigation';
import { RowDataPacket } from 'mysql2';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { FormCarga } from './form-carga';

interface AsignacionRow extends RowDataPacket {
  id_carga: number;
  docente_nombre: string;
  cod_materia: string;
  materia_nombre: string;
  seccion_nombre: string;
  ciclo_anio: number;
}

export default async function CargaAcademicaPage() {
  const session = await auth();
  if (!session) redirect('/auth');

  // 1. Promesas concurrentes para nutrir los selects del formulario
  const [
    [docentes], [materias], [secciones], [ciclos], [asignaciones]
  ] = await Promise.all([
    db.query<RowDataPacket[]>("SELECT dui_docente, CONCAT(primer_nombre, ' ', primer_apellido) AS nombre_completo FROM docente WHERE estado = 'Activo' ORDER BY primer_nombre"),
    db.query<RowDataPacket[]>("SELECT cod_materia, nombre FROM materia WHERE activa = TRUE ORDER BY nombre"),
    db.query<RowDataPacket[]>("SELECT s.id_seccion, CONCAT(s.grado, '° ', e.nombre, ' ', s.nombre) AS nombre_completo FROM seccion s INNER JOIN especialidad e ON s.id_especialidad = e.id_especialidad ORDER BY s.grado, e.nombre, s.nombre"),
    db.query<RowDataPacket[]>("SELECT id_ciclo, anio FROM ciclo_escolar ORDER BY anio DESC"),
    
    // 2. Consulta principal para la tabla de registros
    db.query<AsignacionRow[]>(
      `SELECT 
         c.id_carga, 
         CONCAT(d.primer_nombre, ' ', d.primer_apellido) AS docente_nombre,
         c.cod_materia, 
         m.nombre AS materia_nombre,
         CONCAT(s.grado, '° ', e.nombre, ' ', s.nombre) AS seccion_nombre,
         ce.anio AS ciclo_anio
       FROM carga_academica c
       INNER JOIN docente d ON c.dui_docente = d.dui_docente
       INNER JOIN materia m ON c.cod_materia = m.cod_materia
       INNER JOIN seccion s ON c.id_seccion = s.id_seccion
       INNER JOIN especialidad e ON s.id_especialidad = e.id_especialidad
       INNER JOIN ciclo_escolar ce ON c.id_ciclo = ce.id_ciclo
       ORDER BY ce.anio DESC, d.primer_nombre ASC, m.nombre ASC`
    )
  ]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Distribución de Carga Académica</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 mb-6">
        Asignación de asignaturas a docentes por sección y ciclo lectivo.
      </p>

      <FormCarga 
        docentes={docentes as any} 
        materias={materias as any} 
        secciones={secciones as any} 
        ciclos={ciclos as any} 
      />

      <div className="mt-8 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <th className="px-5 py-3 font-medium text-slate-500 dark:text-slate-400">Ciclo</th>
                <th className="px-5 py-3 font-medium text-slate-500 dark:text-slate-400">Docente Titular</th>
                <th className="px-5 py-3 font-medium text-slate-500 dark:text-slate-400">Asignatura</th>
                <th className="px-5 py-3 font-medium text-slate-500 dark:text-slate-400">Sección Asignada</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {asignaciones.length === 0 ? (
                <tr><td colSpan={4} className="px-5 py-4 text-center text-slate-500">No hay cargas académicas asignadas aún.</td></tr>
              ) : (
                asignaciones.map((a) => (
                  <tr key={a.id_carga}>
                    <td className="px-5 py-3 font-semibold text-slate-900 dark:text-slate-100">{a.ciclo_anio}</td>
                    <td className="px-5 py-3 text-slate-800 dark:text-slate-200">{a.docente_nombre}</td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-300">
                      <span className="font-mono text-xs text-blue-600 dark:text-blue-400 mr-2">{a.cod_materia}</span>
                      {a.materia_nombre}
                    </td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{a.seccion_nombre}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}