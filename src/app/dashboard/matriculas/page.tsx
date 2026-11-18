import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { getMatriculas, getSecciones } from '@/app/actions/matriculas';
import { getCiclos } from '@/app/actions/ciclos';
import { nombreCompleto, formatFecha } from '@/lib/format';
import type { EstadoMatricula } from '@/types/academico';
import { inputClass } from '@/components/ui/form-field';
import { RowsTable, type RowsTableRow } from '@/components/ui/rows-table';
import { Badge, TONO_MATRICULA } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

type Params = Record<string, string | string[] | undefined>;
const ESTADOS: EstadoMatricula[] = ['Vigente', 'Retirado', 'Trasladado'];

function uno(v: string | string[] | undefined) {
  return (Array.isArray(v) ? v[0] : v) || '';
}

export default async function MatriculasPage({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const [t, locale, ciclos, secciones] = await Promise.all([
    getTranslations('matriculas'),
    getLocale(),
    getCiclos(),
    getSecciones(),
  ]);

  const cicloParam = Number(uno(sp.ciclo));
  const ciclo = ciclos.find((c) => c.id_ciclo === cicloParam) ?? ciclos.find((c) => c.estado === 'Activo') ?? ciclos[0];
  const idSeccion = Number(uno(sp.seccion)) || undefined;
  const estadoParam = uno(sp.estado) as EstadoMatricula | '';
  const estado = ESTADOS.includes(estadoParam as EstadoMatricula) ? (estadoParam as EstadoMatricula) : undefined;

  const matriculas = ciclo ? await getMatriculas({ idCiclo: ciclo.id_ciclo, idSeccion, estado }) : [];
  const seccionesDelCiclo = secciones.filter((s) => s.id_ciclo === ciclo?.id_ciclo);
  const seccionSel = seccionesDelCiclo.find((s) => s.id_seccion === idSeccion);
  const vigentes = matriculas.filter((m) => m.estado === 'Vigente').length;

  const rows: RowsTableRow[] = matriculas.map((m) => ({
    key: String(m.id_matricula),
    cells: [
      m.nie,
      <Link key="n" href={`/dashboard/estudiantes/${m.nie}`} className="font-medium text-intess hover:underline dark:text-intess-accent">{nombreCompleto(m)}</Link>,
      `${m.grado}° ${m.seccion_nombre} — ${m.especialidad_nombre}`,
      formatFecha(m.fecha_matricula, locale),
      <Badge key="e" tono={TONO_MATRICULA[m.estado]}>{t(`estados.${m.estado}`)}</Badge>,
    ],
    sort: [m.nie, nombreCompleto(m), `${m.grado}${m.seccion_nombre}`, String(m.fecha_matricula), m.estado],
    search: `${m.nie} ${nombreCompleto(m)} ${m.grado} ${m.seccion_nombre} ${m.especialidad_nombre} ${m.estado}`,
  }));

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-intess-dark dark:text-slate-100">{t('title')}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">{t('listadoTexto')}</p>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
          {t('cicloEscolar')}
          <select name="ciclo" defaultValue={ciclo?.id_ciclo ?? ''} className={`${inputClass} mt-1`}>
            {ciclos.map((c) => (
              <option key={c.id_ciclo} value={c.id_ciclo}>{c.anio} ({t(`estadosCiclo.${c.estado}`)})</option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
          {t('seccion')}
          <select name="seccion" defaultValue={idSeccion ?? ''} className={`${inputClass} mt-1`}>
            <option value="">{t('todasSecciones')}</option>
            {seccionesDelCiclo.map((s) => (
              <option key={s.id_seccion} value={s.id_seccion}>{s.grado}° {s.nombre} — {s.especialidad_nombre}</option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
          {t('colEstado')}
          <select name="estado" defaultValue={estado ?? ''} className={`${inputClass} mt-1`}>
            <option value="">{t('todosEstados')}</option>
            {ESTADOS.map((e) => (
              <option key={e} value={e}>{t(`estados.${e}`)}</option>
            ))}
          </select>
        </label>
        <button type="submit" className="rounded-md border border-intess px-4 py-2 text-sm font-medium text-intess hover:bg-intess-light dark:border-intess-accent dark:text-intess-accent dark:hover:bg-intess-accent/10">
          {t('filtrar')}
        </button>
      </form>

      <p className="text-sm text-slate-600 dark:text-slate-300">
        {seccionSel
          ? t('resumenSeccion', { vigentes, capacidad: seccionSel.capacidad_max, total: matriculas.length })
          : t('resumenCiclo', { vigentes, total: matriculas.length })}
      </p>

      <RowsTable
        columns={[
          { header: t('colNie'), sortable: true },
          { header: t('colEstudiante'), sortable: true },
          { header: t('colSeccion'), sortable: true },
          { header: t('colFecha'), sortable: true },
          { header: t('colEstado'), sortable: true },
        ]}
        rows={rows}
        emptyText={t('listadoEmpty')}
        defaultSort={{ column: 2, dir: 'asc' }}
      />
    </div>
  );
}
