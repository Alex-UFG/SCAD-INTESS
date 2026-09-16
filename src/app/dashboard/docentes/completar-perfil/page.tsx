import { getTranslations } from 'next-intl/server';
import { getEspecialidadesActivas } from '@/app/actions/docentes';
import { FormCompletarPerfilDocente } from './form-docente';

export const metadata = {
  title: 'Completar Perfil Docente | SCAD-INTESS',
  description: 'Completar perfil docente para habilitar funciones académicas'
};

export const dynamic = 'force-dynamic';

export default async function CompletarPerfilPage() {
  const [t, especialidades] = await Promise.all([
    getTranslations('docentes'),
    getEspecialidadesActivas(),
  ]);

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{t('formTitle')}</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{t('formSubtitle')}</p>
      </div>

      <FormCompletarPerfilDocente especialidades={especialidades} />
    </div>
  );
}
