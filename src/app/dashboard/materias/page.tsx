import { redirect } from 'next/navigation';
import { RowDataPacket } from 'mysql2';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { FormMateria } from './form-materia';

interface MateriaRow extends RowDataPacket {
  cod_materia: string;
  nombre: string;
  grado: number;
  unidades_valorativas: number;
  activa: number;
  especialidad_nombre: string;
}

interface EspecialidadRow extends RowDataPacket {
  id_especialidad: number;
  nombre: string;
}

export default async function MateriasPage() {
  const session = await auth();
  if (!session) redirect('/auth');

  // Obtenemos especialidades para el formulario
  const [especialidades] = await db.query<EspecialidadRow[]>(
    'SELECT id_especialidad, nombre FROM especialidad WHERE activa = TRUE ORDER BY nombre ASC'
  );

  // Obtenemos materias con JOIN a especialidad para mostrar en la tabla
  const [materias] = await db.query<MateriaRow[]>(
    `SELECT m.cod_materia, m.nombre, m.grado, m.unidades_valorativas, m.activa, e.nombre as especialidad_nombre
     FROM materia m
     INNER JOIN especialidad e ON m.id_especialidad = e.id_especialidad
     ORDER BY m.grado ASC, m.nombre ASC`
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Catálogo de Materias</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 mb-6">
        Gestión de asignaturas por especialidad y grado.
      </p>

      <FormMateria especialidades={especialidades} />

      <div className="mt-8 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <th className="px-5 py-3 font-medium text-slate-500 dark:text-slate-400">Código</th>
                <th className="px-5 py-3 font-medium text-slate-500 dark:text-slate-400">Nombre de Materia</th>
                <th className="px-5 py-3 font-medium text-slate-500 dark:text-slate-400">Grado</th>
                <th className="px-5 py-3 font-medium text-slate-500 dark:text-slate-400">Especialidad</th>
                <th className="px-5 py-3 font-medium text-slate-500 dark:text-slate-400">UV</th>
                <th className="px-5 py-3 font-medium text-slate-500 dark:text-slate-400">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {materias.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-4 text-center text-slate-500">No hay materias en el catálogo.</td></tr>
              ) : (
                materias.map((m) => (
                  <tr key={m.cod_materia}>
                    <td className="px-5 py-3 font-mono font-medium text-blue-600 dark:text-blue-400">{m.cod_materia}</td>
                    <td className="px-5 py-3 font-semibold text-slate-900 dark:text-slate-100">{m.nombre}</td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{m.grado}°</td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{m.especialidad_nombre}</td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{m.unidades_valorativas}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                        m.activa ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800'
                      }`}>
                        {m.activa ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
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