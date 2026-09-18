import { getTranslations } from 'next-intl/server';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getTutorPorDui } from '@/app/actions/tutores';
import { requirePermiso } from '@/lib/session';
import { DUI_REGEX } from '@/lib/validations/shared';
import { TutorForm } from '@/components/tutores/tutor-form';

export const dynamic = 'force-dynamic';

export default async function EditarTutorPage({ params }: { params: Promise<{ dui: string }> }) {
  const { dui } = await params;
  if (!DUI_REGEX.test(dui)) return notFound();
  if (!(await requirePermiso('matricula.editar'))) redirect(`/dashboard/tutores/${dui}`);

  const [t, tCommon, tutor] = await Promise.all([
    getTranslations('tutores'),
    getTranslations('common'),
    getTutorPorDui(dui),
  ]);
  if (!tutor) return notFound();

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-6">
        <Link href={`/dashboard/tutores/${dui}`} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
          ← {tCommon('back')}
        </Link>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{t('editarTitle')}</h1>
      </div>

      <TutorForm
        dui={dui}
        defaultValues={{
          dui_tutor: tutor.dui_tutor,
          primer_nombre: tutor.primer_nombre,
          segundo_nombre: tutor.segundo_nombre ?? '',
          primer_apellido: tutor.primer_apellido,
          segundo_apellido: tutor.segundo_apellido ?? '',
          telefono_principal: tutor.telefono_principal,
          telefono_alterno: tutor.telefono_alterno ?? '',
          email: tutor.email ?? '',
          ocupacion: tutor.ocupacion ?? '',
        }}
      />
    </div>
  );
}
