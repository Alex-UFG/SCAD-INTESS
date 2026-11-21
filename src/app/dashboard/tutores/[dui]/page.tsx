import { getTutorPorDui, getEstudiantesPorTutor } from '@/app/actions/tutores';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import TutorAcciones from './TutorAcciones';
import BotonDesvincular from '@/app/dashboard/estudiantes/[nie]/BotonDesvincular';

export const dynamic = 'force-dynamic';

export default async function FichaTutorPage({ params }: { params: Promise<{ dui: string }> }) {
  const resolvedParams = await params;
  const dui = resolvedParams.dui;
  const [tutor, estudiantes] = await Promise.all([
    getTutorPorDui(dui),
    getEstudiantesPorTutor(dui)
  ]);

  if (!tutor) return notFound();

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/tutores" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            ← Volver
          </Link>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Ficha del Tutor</h1>
        </div>
        <TutorAcciones tutor={tutor} totalEstudiantesVinculados={estudiantes?.length || 0} />
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

      <div className="bg-white dark:bg-gray-900 shadow rounded-lg border border-gray-200 dark:border-gray-800 p-6">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4 border-b pb-2 dark:border-gray-800">
          Estudiantes Vinculados
        </h2>
        {estudiantes && estudiantes.length > 0 ? (
          <div className="space-y-4">
            {estudiantes.map((est) => (
              <div key={est.nie} className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800">
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-200">
                    {est.primer_nombre} {est.primer_apellido}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    NIE: {est.nie} • Parentesco: {est.parentesco}
                    {est.contacto_principal ? (
                      <span className="ml-2 bg-yellow-100 text-yellow-800 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">Principal</span>
                    ) : null}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                    est.estado === 'Activo' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 
                    'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                  }`}>
                    {est.estado}
                  </span>
                  <div className="flex items-center gap-2">
                    <Link href={`/dashboard/estudiantes/${est.nie}`} className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 font-medium">
                      Ver Expediente
                    </Link>
                    <BotonDesvincular nie={est.nie} duiTutor={tutor.dui_tutor} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 italic">Este tutor no tiene estudiantes vinculados actualmente.</p>
        )}
      </div>
    </div>
  );
}
