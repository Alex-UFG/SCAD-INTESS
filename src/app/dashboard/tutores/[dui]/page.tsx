import { getTutorPorDui } from '@/app/actions/tutores';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function FichaTutorPage({ params }: { params: Promise<{ dui: string }> }) {
  const resolvedParams = await params;
  const dui = resolvedParams.dui;
  const tutor = await getTutorPorDui(dui);

  if (!tutor) return notFound();

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/dashboard/tutores" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
          ← Volver
        </Link>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Ficha del Tutor</h1>
      </div>

      <div className="bg-white dark:bg-gray-900 shadow rounded-lg border border-gray-200 dark:border-gray-800 p-6">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4 border-b pb-2 dark:border-gray-800">
          Datos Personales y Contacto
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">DUI</p>
            <p className="font-medium text-gray-900 dark:text-gray-200">{tutor.dui_tutor}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Nombre Completo</p>
            <p className="font-medium text-gray-900 dark:text-gray-200">
              {tutor.primer_nombre} {tutor.segundo_nombre} {tutor.primer_apellido} {tutor.segundo_apellido}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Teléfono Principal</p>
            <p className="font-medium text-gray-900 dark:text-gray-200">{tutor.telefono_principal}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Teléfono Alterno</p>
            <p className="font-medium text-gray-900 dark:text-gray-200">{tutor.telefono_alterno || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
            <p className="font-medium text-gray-900 dark:text-gray-200">{tutor.email || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Ocupación</p>
            <p className="font-medium text-gray-900 dark:text-gray-200">{tutor.ocupacion || '-'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
