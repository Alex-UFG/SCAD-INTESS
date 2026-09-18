import { redirect } from 'next/navigation';
import { getCicloActivo } from '@/app/actions/ciclos';

/**
 * "Periodos evaluativos: vista de apertura/cierre para direccion" vive en el
 * detalle del ciclo Activo; este alias del menu solo redirige.
 */
export const dynamic = 'force-dynamic';

export default async function PeriodosPage() {
  const activo = await getCicloActivo();
  redirect(activo ? `/dashboard/ciclos/${activo.id_ciclo}` : '/dashboard/ciclos');
}
