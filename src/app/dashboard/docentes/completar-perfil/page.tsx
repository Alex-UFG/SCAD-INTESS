import { getEspecialidadesActivas } from '@/app/actions/docentes';
import { FormCompletarPerfilDocente } from './form-docente';

export const metadata = {
  title: 'Completar Perfil Docente | SCAD-INTESS',
  description: 'Completar perfil docente para habilitar funciones académicas'
};

export const dynamic = 'force-dynamic';

export default async function CompletarPerfilPage() {
  // Sin fallback inventado: si la consulta falla, el error sube al error
  // boundary en vez de mostrar especialidades falsas con IDs incorrectos.
  const especialidades = await getEspecialidadesActivas();

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8">
      <FormCompletarPerfilDocente especialidades={especialidades} />
    </div>
  );
}
