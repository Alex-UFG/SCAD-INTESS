import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { cambiarEstadoCitacion } from '@/app/actions/citaciones';
import { TRANSICIONES_CITACION, type EstadoCitacion } from '@/lib/disciplina';
import { ActionButton } from '@/components/ui/action-button';

interface Props {
  idCitacion: number;
  estado: EstadoCitacion;
  /**Con `disciplina.citar` se muestran los cambios de estado */
  puedeGestionar: boolean;
}

/**Imprimir y, para quien gestiona citaciones, los estados a los que puede pasar */
export function CitacionAcciones({ idCitacion, estado, puedeGestionar }: Props) {
  const t = useTranslations('citaciones');
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link href={`/dashboard/citaciones/${idCitacion}`} className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800">
        {t('imprimir')}
      </Link>
      {puedeGestionar &&
        TRANSICIONES_CITACION[estado].map((destino) => (
          <ActionButton
            key={destino}
            action={cambiarEstadoCitacion}
            fields={{ id_citacion: idCitacion, estado: destino }}
            label={t(`acciones.${destino}`)}
            danger={destino === 'No_Asistio'}
            confirm={{ title: t(`acciones.${destino}`), text: t(`confirmar.${destino}`) }}
          />
        ))}
    </div>
  );
}
