'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { necesitaCompletarPerfil, RUTA_COMPLETAR_PERFIL } from '@/lib/docente-guard';

export function PerfilDocenteGuard({ pendiente }: { pendiente: boolean }) {
  const t = useTranslations('docentes.guard');
  const pathname = usePathname();
  const router = useRouter();
  const redirigir = pendiente && necesitaCompletarPerfil(5, false, pathname);

  useEffect(() => {
    if (redirigir) router.replace(RUTA_COMPLETAR_PERFIL);
  }, [redirigir, router]);

  if (!pendiente) return null;
  return (
    <div className="border-b border-yellow-300 bg-yellow-50 px-4 py-2 text-sm text-yellow-900 dark:border-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-200">
      {t('texto')}{' '}
      <Link href={RUTA_COMPLETAR_PERFIL} className="font-semibold underline">{t('enlace')}</Link>
    </div>
  );
}
