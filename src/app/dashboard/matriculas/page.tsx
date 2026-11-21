import { getMatriculasDetalladas, getSeccionesDisponibles, getCiclosEscolares } from '@/app/actions/matriculas';
import { getEstudiantes } from '@/app/actions/estudiantes';
import MatriculasManager from './MatriculasManager';

export const dynamic = 'force-dynamic';

export default async function MatriculasDashboardPage() {
  const [matriculas, secciones, ciclos, estudiantes] = await Promise.all([
    getMatriculasDetalladas(),
    getSeccionesDisponibles(),
    getCiclosEscolares(),
    getEstudiantes()
  ]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Control y Gestión de Matrículas
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Administración centralizada de inscripciones, retiros, traslados de sección y estado académico.
          </p>
        </div>
      </div>

      <MatriculasManager
        matriculas={matriculas}
        secciones={secciones}
        ciclos={ciclos}
        estudiantes={estudiantes}
      />
    </div>
  );
}
