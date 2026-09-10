import { getTutores } from '@/app/actions/tutores';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function TutoresPage() {
  const tutores = await getTutores();
  
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Tutores y Encargados</h1>
        <Link href="/dashboard/tutores/nuevo" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
          + Nuevo Tutor
        </Link>
      </div>
      
      <div className="bg-white dark:bg-gray-900 shadow rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <th className="p-4 font-semibold text-gray-700 dark:text-gray-200 text-sm">DUI</th>
                <th className="p-4 font-semibold text-gray-700 dark:text-gray-200 text-sm">Nombre Completo</th>
                <th className="p-4 font-semibold text-gray-700 dark:text-gray-200 text-sm">Contacto</th>
                <th className="p-4 font-semibold text-gray-700 dark:text-gray-200 text-sm">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {tutores.map((tutor) => (
                <tr key={tutor.dui_tutor} className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="p-4 text-sm text-gray-900 dark:text-gray-300 font-mono">{tutor.dui_tutor}</td>
                  <td className="p-4 text-sm text-gray-900 dark:text-gray-300">
                    {tutor.primer_nombre} {tutor.segundo_nombre} {tutor.primer_apellido} {tutor.segundo_apellido}
                  </td>
                  <td className="p-4 text-sm text-gray-600 dark:text-gray-400">
                    <div>{tutor.telefono_principal}</div>
                    {tutor.email && <div className="text-xs">{tutor.email}</div>}
                  </td>
                  <td className="p-4 text-sm">
                    <Link href={`/dashboard/tutores/${tutor.dui_tutor}`} className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium hover:underline">
                      Ver Ficha
                    </Link>
                  </td>
                </tr>
              ))}
              {tutores.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-500 dark:text-gray-400">
                    No hay tutores registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
