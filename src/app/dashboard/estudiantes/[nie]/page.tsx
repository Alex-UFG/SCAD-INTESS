import { getEstudiantePorNie } from '@/app/actions/estudiantes';
import { getMatriculasPorEstudiante } from '@/app/actions/matriculas';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function ExpedienteEstudiantePage({ params }: { params: Promise<{ nie: string }> }) {
  const resolvedParams = await params;
  const nie = parseInt(resolvedParams.nie);
  if (isNaN(nie)) return notFound();

  const [estudiante, matriculas] = await Promise.all([
    getEstudiantePorNie(nie),
    getMatriculasPorEstudiante(nie)
  ]);

  if (!estudiante) return notFound();

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/estudiantes" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            ← Volver
          </Link>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Expediente del Estudiante</h1>
        </div>
        <div className="flex gap-2">
          {/* Action buttons could go here */}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Datos Personales */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-gray-900 shadow rounded-lg border border-gray-200 dark:border-gray-800 p-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4 border-b pb-2 dark:border-gray-800">
              Datos Personales
            </h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">NIE</p>
                <p className="font-medium text-gray-900 dark:text-gray-200">{estudiante.nie}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Nombre Completo</p>
                <p className="font-medium text-gray-900 dark:text-gray-200">
                  {estudiante.primer_nombre} {estudiante.segundo_nombre} {estudiante.primer_apellido} {estudiante.segundo_apellido}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Fecha de Nacimiento</p>
                <p className="font-medium text-gray-900 dark:text-gray-200">
                  {new Date(estudiante.fecha_nacimiento).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Género</p>
                <p className="font-medium text-gray-900 dark:text-gray-200">
                  {estudiante.genero === 'M' ? 'Masculino' : 'Femenino'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Estado</p>
                <span className={`inline-block mt-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                  estudiante.estado === 'Activo' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 
                  estudiante.estado === 'Egresado' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                  'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                }`}>
                  {estudiante.estado}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tutores y Matriculas */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Tutores */}
          <div className="bg-white dark:bg-gray-900 shadow rounded-lg border border-gray-200 dark:border-gray-800 p-6">
            <div className="flex justify-between items-center border-b pb-2 mb-4 dark:border-gray-800">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                Tutores y Responsables
              </h2>
              {/* Botón para abrir modal de vincular tutor */}
              <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                + Vincular Tutor
              </button>
            </div>
            
            {estudiante.tutores && estudiante.tutores.length > 0 ? (
              <div className="space-y-4">
                {estudiante.tutores.map(tutor => (
                  <div key={tutor.dui_tutor} className="flex justify-between items-start p-3 bg-gray-50 dark:bg-gray-800/50 rounded-md border border-gray-100 dark:border-gray-800">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-200">
                        {tutor.primer_nombre} {tutor.primer_apellido} 
                        {tutor.pivot.contacto_principal && (
                          <span className="ml-2 bg-yellow-100 text-yellow-800 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">Principal</span>
                        )}
                      </p>
                      <p className="text-sm text-gray-500">DUI: {tutor.dui_tutor} • Parentesco: {tutor.pivot.parentesco}</p>
                      <p className="text-sm text-gray-500">Tel: {tutor.telefono_principal}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">No hay tutores vinculados a este estudiante.</p>
            )}
          </div>

          {/* Historial de Matriculas */}
          <div className="bg-white dark:bg-gray-900 shadow rounded-lg border border-gray-200 dark:border-gray-800 p-6">
            <div className="flex justify-between items-center border-b pb-2 mb-4 dark:border-gray-800">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                Historial de Matrículas
              </h2>
              <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                + Matricular
              </button>
            </div>
            
            {matriculas && matriculas.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b dark:border-gray-800 text-gray-500">
                      <th className="pb-2 font-medium">Ciclo</th>
                      <th className="pb-2 font-medium">Sección</th>
                      <th className="pb-2 font-medium">Grado</th>
                      <th className="pb-2 font-medium">Especialidad</th>
                      <th className="pb-2 font-medium">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matriculas.map(mat => (
                      <tr key={mat.id_matricula} className="border-b dark:border-gray-800/50 last:border-0">
                        <td className="py-3">{mat.ciclo_anio}</td>
                        <td className="py-3">{mat.seccion_nombre}</td>
                        <td className="py-3">{mat.grado}</td>
                        <td className="py-3">{mat.especialidad_nombre}</td>
                        <td className="py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            mat.estado === 'Vigente' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                          }`}>
                            {mat.estado}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">El estudiante no posee matrículas registradas.</p>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
