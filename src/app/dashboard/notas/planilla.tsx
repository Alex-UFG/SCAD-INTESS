'use client';

import { startTransition, useActionState, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { guardarNotas, type FilaNota, type PlanillaNotas } from '@/app/actions/notas';
import { CAMPOS_NOTA, NOTA_MAXIMA, enRiesgo, promedioNota, redondear2, type CampoNota, type Notas } from '@/lib/notas';
import type { ActionState } from '@/types/actions';
import { useToast } from '@/components/ui/toast';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { inputClass, submitButtonClass } from '@/components/ui/form-field';

type Captura = Record<CampoNota, string>;

const aTexto = (n: number | null) => (n === null ? '' : String(n));
const aNota = (v: string) => (v === '' ? null : redondear2(Number(v)));
const leer = (c: Captura): Notas => ({ act1: aNota(c.act1), act2: aNota(c.act2), examen: aNota(c.examen) });

const rowKey = (f: FilaNota) => f.nie;
const searchText = (f: FilaNota) => `${f.nie} ${f.nombre}`;

export function Planilla({ planilla }: { planilla: PlanillaNotas }) {
  const t = useTranslations('notas');
  const toast = useToast();
  const { carga, periodo, filas, editable, autorizacionEspecial, motivo } = planilla;
  const [captura, setCaptura] = useState<Record<number, Captura>>(() =>
    Object.fromEntries(filas.map((f) => [f.nie, { act1: aTexto(f.act1), act2: aTexto(f.act2), examen: aTexto(f.examen) }]))
  );
  const [state, formAction, pending] = useActionState(guardarNotas, {} as ActionState);

  useEffect(() => {
    if (!state.message) return;
    if (state.success) toast.success(state.message);
    else toast.error(state.message);
  }, [state, toast]);

  const notas = (f: FilaNota) => leer(captura[f.nie]);
  // Tras guardar, la pagina llega con las notas nuevas y la fila deja de contar como modificada
  const modificadas = filas.filter((f) => {
    const n = notas(f);
    return CAMPOS_NOTA.some((c) => n[c] !== f[c]);
  });

  const promedios = filas.map((f) => promedioNota(notas(f))).filter((p) => p !== null);
  const resumen = [
    { label: t('totalEstudiantes'), value: filas.length },
    { label: t('notasCompletas'), value: promedios.length },
    { label: t('enRiesgo'), value: promedios.filter(enRiesgo).length },
    {
      label: t('promedioGeneral'),
      value: promedios.length ? (promedios.reduce((a, b) => a + b, 0) / promedios.length).toFixed(2) : '—',
    },
  ];

  const cambiar = (nie: number, campo: CampoNota, valor: string) => {
    const n = Number(valor);
    if (valor !== '' && (!Number.isFinite(n) || n < 0 || n > NOTA_MAXIMA)) return;
    setCaptura((prev) => ({ ...prev, [nie]: { ...prev[nie], [campo]: valor } }));
  };

  // Envio manual: solo viajan los estudiantes modificados
  const guardar = () => {
    const datos = new FormData();
    datos.set('id_carga', String(carga.id_carga));
    datos.set('id_periodo', String(periodo.id_periodo));
    for (const f of modificadas) {
      for (const c of CAMPOS_NOTA) datos.set(`${c}[${f.nie}]`, captura[f.nie][c]);
    }
    startTransition(() => formAction(datos));
  };

  const columns: Column<FilaNota>[] = [
    { key: 'nie', header: t('nie'), sortable: true, className: 'font-mono' },
    { key: 'nombre', header: t('estudiante'), sortable: true },
    ...CAMPOS_NOTA.map(
      (campo): Column<FilaNota> => ({
        key: campo,
        header: t(campo),
        render: (f) => (
          <div className="w-24">
            <input
              type="number"
              min={0}
              max={NOTA_MAXIMA}
              step={0.01}
              value={captura[f.nie][campo]}
              disabled={!editable || pending || (f.bloqueada && !autorizacionEspecial)}
              onChange={(e) => cambiar(f.nie, campo, e.target.value)}
              aria-label={`${t(campo)} - ${f.nombre}`}
              className={`${inputClass} text-center tabular-nums disabled:opacity-60`}
            />
          </div>
        ),
      })
    ),
    {
      key: 'promedio',
      header: t('promedio'),
      sortable: true,
      className: 'font-semibold tabular-nums',
      sortValue: (f) => promedioNota(notas(f)),
      render: (f) => promedioNota(notas(f))?.toFixed(2) ?? '—',
    },
    {
      key: 'estado',
      header: t('estado'),
      render: (f) => {
        const promedio = promedioNota(notas(f));
        if (promedio === null) return <Badge tono="gris">{t('pendiente')}</Badge>;
        return enRiesgo(promedio) ? <Badge tono="rojo">{t('riesgo')}</Badge> : <Badge tono="verde">{t('aprobado')}</Badge>;
      },
    },
  ];

  return (
    <div className="mt-4 space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {resumen.map((item) => (
          <div key={item.label} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{item.label}</p>
            <p className="mt-2 text-2xl font-bold tabular-nums text-intess-dark dark:text-slate-100">{item.value}</p>
          </div>
        ))}
      </div>

      {(motivo || autorizacionEspecial) && (
        <p className="rounded-md border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800 dark:border-yellow-800/30 dark:bg-yellow-900/20 dark:text-yellow-400">
          {t(`avisos.${motivo ?? 'especial'}`)}
        </p>
      )}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white pt-4 dark:border-slate-700 dark:bg-slate-900">
        <DataTable
          columns={columns}
          rows={filas}
          rowKey={rowKey}
          pageSize={0}
          searchText={searchText}
          emptyMessage={t('sinEstudiantes')}
          toolbar={
            editable && (
              <button type="button" onClick={guardar} disabled={pending || modificadas.length === 0} className={submitButtonClass}>
                {pending ? t('guardando') : t('guardar')}
              </button>
            )
          }
        />
        <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">{t('notaPie')}</p>
      </section>
    </div>
  );
}
