const base = 'inline-block px-2.5 py-1 rounded-full text-xs font-semibold';

export const TONOS = {
  verde: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  amarillo: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  rojo: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  azul: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  gris: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
} as const;

export type Tono = keyof typeof TONOS;

/**Etiqueta de estado; el tono lo decide el caller segun el enum de su tabla */
export function Badge({ tono, children }: { tono: Tono; children: React.ReactNode }) {
  return <span className={`${base} ${TONOS[tono]}`}>{children}</span>;
}

export const TONO_CICLO: Record<string, Tono> = { Planificado: 'gris', Activo: 'verde', Cerrado: 'azul' };
export const TONO_PERIODO: Record<string, Tono> = { Pendiente: 'gris', Abierto: 'verde', Cerrado: 'azul' };
export const TONO_DOCENTE: Record<string, Tono> = { Activo: 'verde', Inactivo: 'gris', Licencia: 'amarillo' };
export const TONO_MATRICULA: Record<string, Tono> = { Vigente: 'verde', Retirado: 'rojo', Trasladado: 'amarillo' };
