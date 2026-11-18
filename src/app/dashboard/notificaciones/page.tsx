import { getTranslations } from 'next-intl/server';
import { getNotificaciones, marcarLeida, marcarTodasLeidas } from '@/app/actions/notificaciones';
import { ActionButton } from '@/components/ui/action-button';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

export default async function NotificacionesPage() {
  const [t, tCiclos, notificaciones] = await Promise.all([
    getTranslations('notificaciones'),
    getTranslations('ciclos'),
    getNotificaciones(),
  ]);
  const hayNoLeidas = notificaciones.some((n) => !n.leida);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-intess-dark dark:text-slate-100">{t('title')}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('subtitle')}</p>
        </div>
        {hayNoLeidas && <ActionButton action={marcarTodasLeidas} fields={{}} label={t('marcarTodas')} />}
      </div>

      {notificaciones.length === 0 ? (
        <p className="mt-6 rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          {t('empty')}
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {notificaciones.map((n) => {
            const cierre = n.tipo === 'Cierre_Periodo' && n.periodo !== null ? { numero: n.periodo } : null;
            return (
              <li key={n.id_notificacion} className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tono={n.leida ? 'gris' : 'azul'}>{t(n.leida ? 'leida' : 'noLeida')}</Badge>
                  <Badge tono="gris">{t(`tipos.${n.tipo}`)}</Badge>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{n.creada_en}</span>
                </div>
                <h2 className={`mt-2 text-sm text-intess-dark dark:text-slate-100 ${n.leida ? 'font-medium' : 'font-bold'}`}>
                  {cierre ? tCiclos('notifCierreTitulo', cierre) : n.titulo}
                </h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  {cierre ? tCiclos('notifCierreMensaje', cierre) : n.mensaje}
                </p>
                {!n.leida && (
                  <div className="mt-3">
                    <ActionButton action={marcarLeida} fields={{ id_notificacion: n.id_notificacion }} label={t('marcarLeida')} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
