import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { getCargas, quitarCarga } from '@/app/actions/cargas';
import { getCiclos } from '@/app/actions/ciclos';
import { getDocentes } from '@/app/actions/docentes';
import { getMaterias } from '@/app/actions/materias';
import { getSecciones } from '@/app/actions/secciones';
import { requirePermiso } from '@/lib/permisos';
import { inputClass } from '@/components/ui/form-field';
import { RowsTable, type RowsTableRow } from '@/components/ui/rows-table';
import { ActionButton } from '@/components/ui/action-button';
import { FormCarga } from './form-carga';

export const dynamic = 'force-dynamic';

type Params = Record<string, string | string[] | undefined>;

export default async function CargasPage({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const [t, ciclos, editor] = await Promise.all([getTranslations('cargas'), getCiclos(), requirePermiso('config.carga')]);

  const cicloParam = Number(Array.isArray(sp.ciclo) ? sp.ciclo[0] : sp.ciclo);
  const ciclo = ciclos.find((c) => c.id_ciclo === cicloParam) ?? ciclos.find((c) => c.estado === 'Activo') ?? ciclos[0];
  const duiDocente = (Array.isArray(sp.docente) ? sp.docente[0] : sp.docente) || undefined;
  const puedeEditar = Boolean(editor) && ciclo?.estado !== 'Cerrado';

  const [cargas, docentes, materias, secciones] = ciclo
    ? await Promise.all([
        getCargas({ idCiclo: ciclo.id_ciclo, duiDocente }),
        getDocentes(true),
        puedeEditar ? getMaterias({ soloActivas: true }) : [],
        puedeEditar ? getSecciones(ciclo.id_ciclo) : [],
      ])
    : [[], [], [], []];

  const rows: RowsTableRow[] = cargas.map((c) => ({
    key: String(c.id_carga),
    cells: [
      <Link key="d" href={`/dashboard/docentes/${c.dui_docente}`} className="font-medium text-intess hover:underline dark:text-intess-accent">{c.docente}</Link>,
      `${c.grado}° ${c.seccion} — ${c.especialidad}`,
      <span key="m"><span className="font-mono">{c.cod_materia}</span> {c.materia}</span>,
      c.estudiantes,
      puedeEditar ? (
        <ActionButton
          key="q"
          action={quitarCarga}
          fields={{ id_carga: c.id_carga }}
          label={t('quitar')}
          danger
          confirm={{ title: t('quitar'), text: t('confirmarQuitar', { docente: c.docente, materia: c.materia, seccion: `${c.grado}° ${c.seccion}` }) }}
        />
      ) : null,
    ],
    sort: [c.docente, `${c.grado}${c.seccion}`, c.materia, c.estudiantes, null],
    search: `${c.docente} ${c.dui_docente} ${c.grado} ${c.seccion} ${c.especialidad} ${c.cod_materia} ${c.materia}`,
  }));

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-intess-dark dark:text-slate-100">{t('title')}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('subtitle')}</p>
        </div>
        {puedeEditar && ciclo && (
          <FormCarga idCiclo={ciclo.id_ciclo} anio={ciclo.anio} docentes={docentes} materias={materias} secciones={secciones} />
        )}
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
          {t('colCiclo')}
          <select name="ciclo" defaultValue={ciclo?.id_ciclo ?? ''} className={`${inputClass} mt-1`}>
            {ciclos.map((c) => (
              <option key={c.id_ciclo} value={c.id_ciclo}>{c.anio} ({c.estado})</option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
          {t('docente')}
          <select name="docente" defaultValue={duiDocente ?? ''} className={`${inputClass} mt-1`}>
            <option value="">{t('todosDocentes')}</option>
            {docentes.map((d) => (
              <option key={d.dui_docente} value={d.dui_docente}>{d.primer_nombre} {d.primer_apellido}</option>
            ))}
          </select>
        </label>
        <button type="submit" className="rounded-md border border-intess px-4 py-2 text-sm font-medium text-intess hover:bg-intess-light dark:border-intess-accent dark:text-intess-accent dark:hover:bg-intess-accent/10">
          {t('filtrar')}
        </button>
      </form>

      <RowsTable
        columns={[
          { header: t('colDocente'), sortable: true },
          { header: t('colSeccion'), sortable: true },
          { header: t('colMateria'), sortable: true },
          { header: t('colEstudiantes'), sortable: true, align: 'right' },
          { header: t('colAcciones') },
        ]}
        rows={rows}
        emptyText={t('empty')}
        defaultSort={{ column: 0, dir: 'asc' }}
      />
    </div>
  );
}
