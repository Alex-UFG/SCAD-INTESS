import { getTranslations } from 'next-intl/server';
import { getNotificaciones } from '@/app/actions/notificaciones';
import { Badge } from '@/components/ui/badge';
import { BotonMarcarLeida, BotonMarcarTodas } from './botones';

export const dynamic = 'force-dynamic';

export default async function NotificacionesPage() {
  const [t, notificaciones] = await Promise.all([getTranslations('notificaciones'), getNotificaciones()]);
  const hayNoLeidas = notificaciones.some((n) => !n.leida);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-intess-dark dark:text-slate-100">{t('title')}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('subtitle')}</p>
        </div>
        {hayNoLeidas && <BotonMarcarTodas />}
      </div>

      {notificaciones.length === 0 ? (
        <p className="mt-6 rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          {t('empty')}
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {notificaciones.map((n) => (
            <li key={n.id_notificacion} className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tono={n.leida ? 'gris' : 'azul'}>{t(n.leida ? 'leida' : 'noLeida')}</Badge>
                <Badge tono="gris">{t(`tipos.${n.tipo}`)}</Badge>
                <span className="text-xs text-slate-500 dark:text-slate-400">{n.creada_en}</span>
              </div>
              <h2 className={`mt-2 text-sm text-intess-dark dark:text-slate-100 ${n.leida ? 'font-medium' : 'font-bold'}`}>{n.titulo}</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{n.mensaje}</p>
              {!n.leida && (
                <div className="mt-3">
                  <BotonMarcarLeida id={n.id_notificacion} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
