import { redirect } from 'next/navigation';
import { RowDataPacket } from 'mysql2';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { FormCiclo } from './form-ciclo';

interface CicloRow extends RowDataPacket {
  id_ciclo: number;
  anio: number;
  fecha_inicio: Date;
  fecha_fin: Date;
  estado: string;
}

export default async function CiclosPage() {
  const session = await auth();
  if (!session) redirect('/auth');

  // Obtenemos los ciclos registrados ordenados por año descendente
  const [ciclos] = await db.query<CicloRow[]>(
    'SELECT * FROM ciclo_escolar ORDER BY anio DESC'
  );

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Gestión de Ciclos Escolares</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 mb-6">
        Administración de años lectivos y sus períodos evaluativos.
      </p>

      <FormCiclo />

      <div className="mt-8 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <th className="px-5 py-3 font-medium text-slate-500 dark:text-slate-400">Año</th>
                <th className="px-5 py-3 font-medium text-slate-500 dark:text-slate-400">Inicio</th>
                <th className="px-5 py-3 font-medium text-slate-500 dark:text-slate-400">Fin</th>
                <th className="px-5 py-3 font-medium text-slate-500 dark:text-slate-400">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {ciclos.length === 0 ? (
                <tr><td colSpan={4} className="px-5 py-4 text-center text-slate-500">No hay ciclos registrados.</td></tr>
              ) : (
                ciclos.map((c) => (
                  <tr key={c.id_ciclo}>
                    <td className="px-5 py-3 font-semibold text-slate-900 dark:text-slate-100">{c.anio}</td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{new Date(c.fecha_inicio).toLocaleDateString('es-SV')}</td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{new Date(c.fecha_fin).toLocaleDateString('es-SV')}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                        c.estado === 'Activo' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800'
                      }`}>
                        {c.estado}
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