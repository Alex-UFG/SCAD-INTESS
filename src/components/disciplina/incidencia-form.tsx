'use client';

import { useMemo, useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { registrarIncidencia } from '@/app/actions/incidencias';
import { LEVES_PARA_ESCALAR, TIPOS_FALTA } from '@/lib/disciplina';
import type { ActionState } from '@/types/actions';
import { useToast } from '@/components/ui/toast';
import { FormField, ServerErrorBanner, inputClass, submitButtonClass } from '@/components/ui/form-field';

interface Props {
  estudiantes: { nie: number; nombre: string }[];
  nieInicial?: number;
  /**YYYY-MM-DD en El Salvador: valor por defecto y maximo de la fecha */
  hoy: string;
}

export function IncidenciaForm({ estudiantes, nieInicial, hoy }: Props) {
  const t = useTranslations('incidencias');
  const router = useRouter();
  const toast = useToast();
  const [busqueda, setBusqueda] = useState('');
  const [nie, setNie] = useState(nieInicial ? String(nieInicial) : '');
  const [state, setState] = useState<ActionState>({});
  const [pending, start] = useTransition();

  // El elegido se conserva aunque la busqueda ya no lo incluya
  const visibles = useMemo(() => {
    const q = busqueda.trim().toLocaleLowerCase();
    if (!q) return estudiantes;
    return estudiantes.filter((e) => String(e.nie) === nie || `${e.nie} ${e.nombre}`.toLocaleLowerCase().includes(q));
  }, [busqueda, estudiantes, nie]);

  // Envio manual: con <form action> React reinicia el formulario y un error borraria la descripcion
  const enviar = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const datos = new FormData(e.currentTarget);
    start(async () => {
      const r = await registrarIncidencia({}, datos);
      if (r.success && r.id) {
        toast.success(r.message ?? t('registrada'));
        router.push(`/dashboard/incidencias/${r.id}`);
      } else {
        setState(r);
      }
    });
  };

  return (
    <form onSubmit={enviar} className="space-y-5">
      <ServerErrorBanner message={state.success === false ? (state.message ?? null) : null} />

      <FormField label={t('estudiante')} required error={state.errors?.nie?.[0]}>
        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder={t('buscarEstudiante')}
          aria-label={t('buscarEstudiante')}
          className={inputClass}
        />
        <select name="nie" required value={nie} onChange={(e) => setNie(e.target.value)} className={inputClass}>
          <option value="" disabled>{t('seleccioneEstudiante')}</option>
          {visibles.map((e) => (
            <option key={e.nie} value={e.nie}>{e.nombre} — {e.nie}</option>
          ))}
        </select>
      </FormField>

      <div className="grid gap-5 sm:grid-cols-3">
        <FormField label={t('fecha')} required error={state.errors?.fecha?.[0]}>
          <input type="date" name="fecha" required defaultValue={hoy} max={hoy} className={inputClass} />
        </FormField>
        <FormField label={t('hora')} error={state.errors?.hora?.[0]}>
          <input type="time" name="hora" className={inputClass} />
        </FormField>
        <FormField label={t('tipoFalta')} required error={state.errors?.tipo_falta?.[0]}>
          <select name="tipo_falta" required defaultValue="Leve" className={inputClass}>
            {TIPOS_FALTA.map((tipo) => (
              <option key={tipo} value={tipo}>{t(`tipos.${tipo}`)}</option>
            ))}
          </select>
        </FormField>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">{t('ayudaEscalamiento', { n: LEVES_PARA_ESCALAR })}</p>

      <FormField label={t('descripcion')} required error={state.errors?.descripcion?.[0]}>
        <textarea name="descripcion" required minLength={10} maxLength={2000} rows={5} placeholder={t('descripcionPlaceholder')} className={inputClass} />
      </FormField>

      <div className="flex justify-end border-t border-slate-200 pt-4 dark:border-slate-800">
        <button type="submit" disabled={pending} className={submitButtonClass}>
          {pending ? t('guardando') : t('registrar')}
        </button>
      </div>
    </form>
  );
}
