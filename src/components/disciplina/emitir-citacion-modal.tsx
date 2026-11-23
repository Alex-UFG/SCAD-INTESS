'use client';

import { useState, useTransition, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { emitirCitacion } from '@/app/actions/citaciones';
import type { ActionState } from '@/types/actions';
import type { Parentesco } from '@/types/persona';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { FormField, ServerErrorBanner, inputClass, submitButtonClass } from '@/components/ui/form-field';

interface Props {
  idIncidencia: number;
  nie: number;
  /**Tutores vinculados al estudiante, con el contacto principal primero */
  tutores: { dui: string; nombre: string; parentesco: Parentesco; principal: boolean }[];
  /**YYYY-MM-DDTHH:mm en El Salvador: la reunion no puede ser anterior */
  ahora: string;
}

export function EmitirCitacionModal({ idIncidencia, nie, tutores, ahora }: Props) {
  const t = useTranslations('citaciones');
  const tTutores = useTranslations('tutores');
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<ActionState>({});
  const [pending, start] = useTransition();

  const cerrar = () => {
    setOpen(false);
    setState({});
  };

  const enviar = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const datos = new FormData(e.currentTarget);
    start(async () => {
      const r = await emitirCitacion({}, datos);
      if (r.success) {
        toast.success(r.message ?? t('emitida'));
        cerrar();
        router.refresh();
      } else {
        setState(r);
      }
    });
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="rounded-md bg-intess px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-intess/85">
        {t('emitir')}
      </button>

      <Modal title={t('emitirTitle')} open={open} onClose={pending ? () => {} : cerrar}>
        {tutores.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t('sinTutores')}{' '}
            <Link href={`/dashboard/estudiantes/${nie}`} className="font-medium text-intess hover:underline dark:text-intess-accent">
              {t('irAlExpediente')}
            </Link>
          </p>
        ) : (
          <form onSubmit={enviar} className="space-y-5">
            <ServerErrorBanner message={state.success === false ? (state.message ?? null) : null} />
            <input type="hidden" name="id_incidencia" value={idIncidencia} />

            <FormField label={t('tutor')} required error={state.errors?.dui_tutor?.[0]}>
              <select name="dui_tutor" required defaultValue={tutores[0].dui} className={inputClass}>
                {tutores.map((tutor) => (
                  <option key={tutor.dui} value={tutor.dui}>
                    {tutor.nombre} — {tTutores(`parentescos.${tutor.parentesco}`)}{tutor.principal ? ` (${t('contactoPrincipal')})` : ''}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label={t('fechaReunion')} required error={state.errors?.fecha_citacion?.[0]}>
              <input type="datetime-local" name="fecha_citacion" required min={ahora} className={inputClass} />
            </FormField>

            <FormField label={t('observaciones')} error={state.errors?.observaciones?.[0]}>
              <textarea name="observaciones" rows={3} maxLength={500} placeholder={t('observacionesPlaceholder')} className={inputClass} />
            </FormField>

            <div className="flex justify-end border-t border-slate-200 pt-4 dark:border-slate-800">
              <button type="submit" disabled={pending} className={submitButtonClass}>
                {pending ? t('guardando') : t('emitir')}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
