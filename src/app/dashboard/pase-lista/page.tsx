import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getPaseLista } from '@/app/actions/asistencia';
import { getCargas, getCargasDelDocente } from '@/app/actions/cargas';
import { getCicloActivo } from '@/app/actions/ciclos';
import { requirePermiso, ROL_DOCENTE } from '@/lib/permisos';
import { hoyISO } from '@/lib/asistencia';
import { FECHA_ISO_REGEX } from '@/lib/validations/shared';
import { inputClass, submitButtonClass } from '@/components/ui/form-field';
import { Lista } from './lista';

export const dynamic = 'force-dynamic';

type Params = Record<string, string | string[] | undefined>;

const primero = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function PaseListaPage({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const session = await requirePermiso('asistencia.registrar');
  if (!session) redirect('/dashboard');

  const t = await getTranslations('paseLista');
  const idUsuario = Number(session.user.id);

  const esDocente = session.user.rol === ROL_DOCENTE;
  let cargas;
  if (esDocente) {
    cargas = await getCargasDelDocente(idUsuario);
  } else {
    const ciclo = await getCicloActivo();
    cargas = ciclo ? await getCargas({ idCiclo: ciclo.id_ciclo }) : [];
  }

  const fechaParam = primero(sp.fecha);
  const fecha = fechaParam && FECHA_ISO_REGEX.test(fechaParam) ? fechaParam : hoyISO();
  const idCarga = Number(primero(sp.carga));
  const carga = cargas.find((c) => c.id_carga === idCarga);
  const paseLista = carga ? await getPaseLista(carga.id_carga, fecha) : null;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="text-xl font-bold text-intess-dark dark:text-slate-100">{t('title')}</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('subtitle')}</p>

      {cargas.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">{t('sinCargas')}</p>
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
            <label htmlFor="fecha" className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('fecha')}</label>
            <input id="fecha" type="date" name="fecha" required defaultValue={fecha} max={hoyISO()} className={inputClass} />
          </div>
          <button type="submit" className={submitButtonClass}>{t('ver')}</button>
        </form>
      )}

      {carga && !paseLista && (
        <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">{t('errors.cargaNoDisponible')}</p>
      )}
      {paseLista && (
        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-semibold text-intess-dark dark:text-slate-100">
            {paseLista.carga.materia} — {paseLista.carga.grado}° {paseLista.carga.seccion} · {paseLista.fecha}
          </h2>
          <Lista key={`${paseLista.carga.id_carga}-${paseLista.fecha}`} paseLista={paseLista} />
        </section>
      )}
    </div>
  );
}
