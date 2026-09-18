import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getCicloPorId, cambiarEstadoCiclo } from '@/app/actions/ciclos';
import { requirePermiso } from '@/lib/session';
import { Badge, TONO_CICLO } from '@/components/ui/badge';
import { ActionButton } from '@/components/ui/action-button';
import { FormCiclo } from '../form-ciclo';
import { Periodos } from './periodos';

export const dynamic = 'force-dynamic';

export default async function DetalleCicloPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) return notFound();

  const [t, tCommon, detalle, sesionEditor] = await Promise.all([
    getTranslations('ciclos'),
    getTranslations('common'),
    getCicloPorId(Number(id)),
    requirePermiso('config.ciclos'),
  ]);
  if (!detalle) return notFound();
  const { ciclo, periodos } = detalle;
  const editable = Boolean(sesionEditor) && ciclo.estado !== 'Cerrado';

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <Link href="/dashboard/ciclos" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">← {tCommon('back')}</Link>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
          {t('cicloTitulo', { anio: ciclo.anio })} <Badge tono={TONO_CICLO[ciclo.estado]}>{t(`estados.${ciclo.estado}`)}</Badge>
        </h1>
      </div>

      <div className="bg-white dark:bg-gray-900 shadow rounded-lg border border-gray-200 dark:border-gray-800 p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-2 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{t('datosTitulo')}</h2>
          {sesionEditor && (
            <div className="flex gap-2">
              {ciclo.estado === 'Planificado' && (
                <ActionButton
                  action={cambiarEstadoCiclo}
                  fields={{ id_ciclo: ciclo.id_ciclo, estado: 'Activo' }}
                  label={t('activar')}
                  confirm={{ title: t('activar'), text: t('confirmarActivar', { anio: ciclo.anio }) }}
                />
              )}
              {ciclo.estado === 'Activo' && (
                <ActionButton
                  action={cambiarEstadoCiclo}
                  fields={{ id_ciclo: ciclo.id_ciclo, estado: 'Cerrado' }}
                  label={t('cerrar')}
                  danger
                  confirm={{ title: t('cerrar'), text: t('confirmarCerrar', { anio: ciclo.anio }) }}
                />
              )}
            </div>
          )}
        </div>
        {editable ? (
          <FormCiclo ciclo={ciclo} />
        ) : (
          <dl className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
            <div><dt className="text-gray-500">{t('anio')}</dt><dd className="font-medium text-gray-900 dark:text-gray-200">{ciclo.anio}</dd></div>
            <div><dt className="text-gray-500">{t('fechaInicio')}</dt><dd className="font-medium text-gray-900 dark:text-gray-200">{ciclo.fecha_inicio}</dd></div>
            <div><dt className="text-gray-500">{t('fechaFin')}</dt><dd className="font-medium text-gray-900 dark:text-gray-200">{ciclo.fecha_fin}</dd></div>
            <div><dt className="text-gray-500">{t('colSecciones')}</dt><dd className="font-medium text-gray-900 dark:text-gray-200">{ciclo.secciones}</dd></div>
          </dl>
        )}
      </div>

      <div className="bg-white dark:bg-gray-900 shadow rounded-lg border border-gray-200 dark:border-gray-800 p-6 space-y-4">
        <div className="border-b pb-2 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{t('periodosTitulo')}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('periodosTexto')}</p>
        </div>
        <Periodos periodos={periodos} editable={editable} cicloActivo={ciclo.estado === 'Activo'} />
      </div>
    </div>
  );
}
