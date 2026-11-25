import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getPlanillaNotas } from '@/app/actions/notas';
import { getCargas, getCargasDelDocente } from '@/app/actions/cargas';
import { getCicloActivo, getPeriodos } from '@/app/actions/ciclos';
import { requirePermiso, ROL_DOCENTE } from '@/lib/permisos';
import { inputClass, submitButtonClass } from '@/components/ui/form-field';
import { Badge, TONO_PERIODO } from '@/components/ui/badge';
import { Planilla } from './planilla';

export const dynamic = 'force-dynamic';

type Params = Record<string, string | string[] | undefined>;

const primero = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function NotasPage({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const session = await requirePermiso('notas.ver');
  if (!session) redirect('/dashboard');

  const [t, tCiclos, ciclo] = await Promise.all([getTranslations('notas'), getTranslations('ciclos'), getCicloActivo()]);
  const esDocente = session.user.rol === ROL_DOCENTE;
  const [cargas, periodos] = ciclo
    ? await Promise.all([
        esDocente ? getCargasDelDocente(Number(session.user.id), ciclo.id_ciclo) : getCargas({ idCiclo: ciclo.id_ciclo }),
        getPeriodos(ciclo.id_ciclo),
      ])
    : [[], []];

  const carga = cargas.find((c) => c.id_carga === Number(primero(sp.carga)));
  const periodo =
    periodos.find((p) => p.id_periodo === Number(primero(sp.periodo))) ?? periodos.find((p) => p.estado === 'Abierto') ?? periodos[0];
  const planilla = carga && periodo ? await getPlanillaNotas(carga.id_carga, periodo.id_periodo) : null;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-xl font-bold text-intess-dark dark:text-slate-100">{t('title')}</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('subtitle')}</p>

      {cargas.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">{t(ciclo ? 'sinCargas' : 'sinCiclo')}</p>
      ) : (
        <form method="get" className="mt-6 flex flex-wrap items-end gap-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="min-w-64 flex-1 space-y-2">
            <label htmlFor="carga" className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('carga')}</label>
            <select id="carga" name="carga" required defaultValue={carga?.id_carga ?? ''} className={inputClass}>
              <option value="" disabled>{t('seleccioneCarga')}</option>
              {cargas.map((c) => (
                <option key={c.id_carga} value={c.id_carga}>
                  {c.materia} — {c.grado}° {c.seccion}{esDocente ? '' : ` (${c.docente})`}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label htmlFor="periodo" className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('periodo')}</label>
            <select id="periodo" name="periodo" required defaultValue={periodo?.id_periodo ?? ''} className={inputClass}>
              {periodos.map((p) => (
                <option key={p.id_periodo} value={p.id_periodo}>
                  {tCiclos('periodoN', { numero: p.numero })} ({tCiclos(`estadosPeriodo.${p.estado}`)})
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className={submitButtonClass}>{t('ver')}</button>
        </form>
      )}

      {carga && !planilla && (
        <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">{t('errors.cargaNoDisponible')}</p>
      )}
      {planilla && (
        <section className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-intess-dark dark:text-slate-100">
              {planilla.carga.materia} — {planilla.carga.grado}° {planilla.carga.seccion} · {tCiclos('periodoN', { numero: planilla.periodo.numero })}
            </h2>
            <Badge tono={TONO_PERIODO[planilla.periodo.estado]}>{tCiclos(`estadosPeriodo.${planilla.periodo.estado}`)}</Badge>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('ponderacion')}</p>
          <Planilla key={`${planilla.carga.id_carga}-${planilla.periodo.id_periodo}`} planilla={planilla} />
        </section>
      )}
    </div>
  );
}
