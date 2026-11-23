import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/auth';
import { getEspecialidadesActivas, getDocentePorUsuario } from '@/app/actions/docentes';
import { FormCompletarPerfilDocente } from './form-docente';

export async function generateMetadata() {
  const t = await getTranslations('docentes');
  return { title: `${t('formTitle')} | SCAD-INTESS` };
}

export const dynamic = 'force-dynamic';

export default async function CompletarPerfilPage() {
  const session = await auth();
  if (!session) redirect('/auth');

  const [t, especialidades, docente] = await Promise.all([
    getTranslations('docentes'),
    getEspecialidadesActivas(),
    getDocentePorUsuario(Number(session.user.id)),
  ]);

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-intess-dark dark:text-slate-100">{docente ? t('editarTitle') : t('formTitle')}</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{docente ? t('editarSubtitle') : t('formSubtitle')}</p>
      </div>

      <FormCompletarPerfilDocente especialidades={especialidades} docente={docente ?? undefined} />
    </div>
  );
}
