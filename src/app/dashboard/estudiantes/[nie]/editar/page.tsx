import { getTranslations } from 'next-intl/server';
import { getEstudiantePorNie } from '@/app/actions/estudiantes';
import { EstudianteForm } from '@/components/estudiantes/estudiante-form';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function EditarEstudiantePage({ params }: { params: Promise<{ nie: string }> }) {
  const resolvedParams = await params;
  if (!/^\d+$/.test(resolvedParams.nie)) return notFound();
  const nie = parseInt(resolvedParams.nie);

  const [t, tCommon, estudiante] = await Promise.all([
    getTranslations('estudiantes'),
    getTranslations('common'),
    getEstudiantePorNie(nie),
  ]);
  if (!estudiante) return notFound();

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-6">
        <Link href={`/dashboard/estudiantes/${nie}`} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
          ← {tCommon('back')}
        </Link>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{t('editarTitle')}</h1>
      </div>

      <EstudianteForm
        nie={nie}
        defaultValues={{
          nie: estudiante.nie,
          primer_nombre: estudiante.primer_nombre,
          segundo_nombre: estudiante.segundo_nombre ?? '',
          primer_apellido: estudiante.primer_apellido,
          segundo_apellido: estudiante.segundo_apellido ?? '',
          fecha_nacimiento: new Date(estudiante.fecha_nacimiento).toISOString().slice(0, 10),
          genero: estudiante.genero,
          direccion: estudiante.direccion ?? '',
        }}
      />
    </div>
  );
}
