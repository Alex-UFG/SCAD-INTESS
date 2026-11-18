import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getEstudiantes } from '@/app/actions/estudiantes';
import { requirePermiso } from '@/lib/permisos';
import { hoyISO } from '@/lib/asistencia';
import { nombreCompleto } from '@/lib/format';
import { IncidenciaForm } from '@/components/disciplina/incidencia-form';

export const dynamic = 'force-dynamic';

export default async function NuevaIncidenciaPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  if (!(await requirePermiso('disciplina.reportar'))) redirect('/dashboard');

  const [t, estudiantes] = await Promise.all([getTranslations('incidencias'), getEstudiantes({ estado: 'Activo' })]);
  const nieParam = Array.isArray(sp.nie) ? sp.nie[0] : sp.nie;
  const nieInicial = estudiantes.find((e) => String(e.nie) === nieParam)?.nie;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <Link href="/dashboard/incidencias" className="text-sm text-intess hover:underline dark:text-intess-accent">
        ← {t('volver')}
      </Link>
      <h1 className="mt-2 text-xl font-bold text-intess-dark dark:text-slate-100">{t('nuevaTitle')}</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('nuevaSubtitle')}</p>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <IncidenciaForm
          estudiantes={estudiantes.map((e) => ({ nie: e.nie, nombre: nombreCompleto(e) }))}
          nieInicial={nieInicial}
          hoy={hoyISO()}
        />
      </section>
    </div>
  );
}
