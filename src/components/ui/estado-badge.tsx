import { EstadoEstudiante } from '@/types/persona';

const badgeBase = 'px-2.5 py-1 rounded-full text-xs font-semibold';

const clasesEstadoEstudiante: Record<EstadoEstudiante, string> = {
  Activo: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  Inactivo: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  Retirado: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  Egresado: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
};

export function EstadoEstudianteBadge({ estado }: { estado: EstadoEstudiante }) {
  return <span className={`${badgeBase} ${clasesEstadoEstudiante[estado]}`}>{estado}</span>;
}
