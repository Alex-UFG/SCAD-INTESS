import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getResumenAsistencia } from '@/app/actions/asistencia';
import { getCargasDelDocente } from '@/app/actions/cargas';
import { getCiclos } from '@/app/actions/ciclos';
import { getSecciones } from '@/app/actions/secciones';
import { requirePermiso, ROL_DOCENTE } from '@/lib/permisos';
import { UMBRAL_INASISTENCIA } from '@/lib/asistencia';
import { FECHA_ISO_REGEX } from '@/lib/validations/shared';
import { inputClass, submitButtonClass } from '@/components/ui/form-field';
import { Badge } from '@/components/ui/badge';
import { RowsTable, type RowsTableRow } from '@/components/ui/rows-table';

export const dynamic = 'force-dynamic';

type Params = Record<string, string | string[] | undefined>;

const primero = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const fechaValida = (v: string | undefined) => (v && FECHA_ISO_REGEX.test(v) ? v : undefined);

export default async function AsistenciaPage({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const session = await requirePermiso('asistencia.ver');
  if (!session) redirect('/dashboard');

  const [t, tEstadosCiclo, ciclos] = await Promise.all([getTranslations('asistencia'), getTranslations('ciclos.estados'), getCiclos()]);
  const cicloParam = Number(primero(sp.ciclo));
  const ciclo = ciclos.find((c) => c.id_ciclo === cicloParam) ?? ciclos.find((c) => c.estado === 'Activo') ?? ciclos[0];
  let secciones = ciclo ? await getSecciones(ciclo.id_ciclo) : [];
  if (ciclo && session.user.rol === ROL_DOCENTE) {
    const propias = new Set((await getCargasDelDocente(Number(session.user.id), ciclo.id_ciclo)).map((c) => c.id_seccion));
    secciones = secciones.filter((s) => propias.has(s.id_seccion));
  }
  const seccion = secciones.find((s) => s.id_seccion === Number(primero(sp.seccion)));
  const desde = fechaValida(primero(sp.desde));
  const hasta = fechaValida(primero(sp.hasta));

  const resumen = ciclo ? await getResumenAsistencia({ idCiclo: ciclo.id_ciclo, idSeccion: seccion?.id_seccion, desde, hasta }) : [];

  const rows: RowsTableRow[] = resumen.map((r) => ({
    key: String(r.nie),
    cells: [
      <Link key="n" href={`/dashboard/asistencia/${r.nie}?ciclo=${ciclo.id_ciclo}`} className="font-medium text-blue-600 hover:underline dark:text-blue-400">{r.nombre}</Link>,
      r.seccion,
      r.total,
      r.presentes,
      r.ausentes,
      r.tardanzas,
      r.justificados,
      r.porcentaje === null ? '—' : (
        <Badge key="p" tono={r.porcentaje < UMBRAL_INASISTENCIA ? 'rojo' : 'verde'}>{r.porcentaje}%</Badge>
      ),
    ],
    sort: [r.nombre, r.seccion, r.total, r.presentes, r.ausentes, r.tardanzas, r.justificados, r.porcentaje],
    search: `${r.nie} ${r.nombre} ${r.seccion}`,
  }));

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-xl font-bold text-intess-dark dark:text-slate-100">{t('title')}</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('subtitle', { umbral: UMBRAL_INASISTENCIA })}</p>

      <form method="get" className="mt-6 flex flex-wrap items-end gap-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="space-y-2">
          <label htmlFor="ciclo" className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('ciclo')}</label>
          <select id="ciclo" name="ciclo" defaultValue={ciclo?.id_ciclo ?? ''} className={inputClass}>
            {ciclos.map((c) => (
              <option key={c.id_ciclo} value={c.id_ciclo}>{c.anio} ({tEstadosCiclo(c.estado)})</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label htmlFor="seccion" className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('seccion')}</label>
          <select id="seccion" name="seccion" defaultValue={seccion?.id_seccion ?? ''} className={inputClass}>
            <option value="">{t('todasSecciones')}</option>
            {secciones.map((s) => (
              <option key={s.id_seccion} value={s.id_seccion}>{s.grado}° {s.nombre} — {s.especialidad_nombre}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label htmlFor="desde" className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('desde')}</label>
          <input id="desde" type="date" name="desde" defaultValue={desde ?? ''} className={inputClass} />
        </div>
        <div className="space-y-2">
          <label htmlFor="hasta" className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('hasta')}</label>
          <input id="hasta" type="date" name="hasta" defaultValue={hasta ?? ''} className={inputClass} />
        </div>
        <button type="submit" className={submitButtonClass}>{t('filtrar')}</button>
      </form>

      <div className="mt-6">
        <RowsTable
          columns={[
            { header: t('colEstudiante'), sortable: true },
            { header: t('colSeccion'), sortable: true },
            { header: t('colTotal'), sortable: true, align: 'right' },
            { header: t('colPresentes'), sortable: true, align: 'right' },
            { header: t('colAusentes'), sortable: true, align: 'right' },
            { header: t('colTardanzas'), sortable: true, align: 'right' },
            { header: t('colJustificados'), sortable: true, align: 'right' },
            { header: t('colPorcentaje'), sortable: true, align: 'right' },
          ]}
          rows={rows}
          emptyText={t('empty')}
          defaultSort={{ column: 7, dir: 'asc' }}
        />
      </div>
    </div>
  );
}
