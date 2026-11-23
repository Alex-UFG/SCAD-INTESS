'use client';

import { useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { eliminarEvidencia, subirEvidencia, type EvidenciaRow } from '@/app/actions/incidencias';
import { MAX_EVIDENCIAS } from '@/lib/disciplina';
import { ActionButton } from '@/components/ui/action-button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';

interface Props {
  idIncidencia: number;
  archivos: EvidenciaRow[];
  puedeAdjuntar: boolean;
  /**Quien resuelve quita cualquier evidencia; el resto, solo las propias */
  puedeQuitarTodas: boolean;
  idUsuario: number;
}

/**Evidencias de una incidencia: lista, carga a Vercel Blob y eliminacion */
export function Evidencias({ idIncidencia, archivos, puedeAdjuntar, puedeQuitarTodas, idUsuario }: Props) {
  const t = useTranslations('incidencias');
  const router = useRouter();
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const hayCupo = archivos.length < MAX_EVIDENCIAS;

  const subir = (archivo: File | undefined) => {
    if (!archivo) return;
    const fd = new FormData();
    fd.set('id_incidencia', String(idIncidencia));
    fd.set('archivo', archivo);
    start(async () => {
      const r = await subirEvidencia({}, fd);
      if (input.current) input.current.value = '';
      if (r.success) {
        toast.success(r.message ?? t('evidenciaSubida'));
        router.refresh();
      } else {
        toast.error(r.message ?? t('errors.evidenciaError'));
      }
    });
  };

  return (
    <div className="space-y-4">
      {archivos.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">{t('sinEvidencias')}</p>
      ) : (
        <ul className="divide-y divide-slate-200 dark:divide-slate-800">
          {archivos.map((a) => (
            <li key={a.id_evidencia} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <a href={a.url} target="_blank" rel="noopener noreferrer" className="block truncate text-sm font-medium text-intess hover:underline dark:text-intess-accent">
                  {a.nombre}
                </a>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <Badge tono="gris">{a.mime_type === 'application/pdf' ? 'PDF' : t('imagen')}</Badge>
                  {t('subidaPor', { usuario: a.subida_por_email, fecha: a.subida_en })}
                </p>
              </div>
              {puedeAdjuntar && (puedeQuitarTodas || a.subida_por === idUsuario) && (
                <ActionButton
                  action={eliminarEvidencia}
                  fields={{ id_evidencia: a.id_evidencia }}
                  label={t('quitarEvidencia')}
                  danger
                  confirm={{ title: t('quitarEvidencia'), text: t('confirmarQuitarEvidencia', { nombre: a.nombre }) }}
                />
              )}
            </li>
          ))}
        </ul>
      )}

      {puedeAdjuntar && (
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="hidden"
            onChange={(e) => subir(e.target.files?.[0])}
          />
          <button
            type="button"
            disabled={pending || !hayCupo}
            onClick={() => input.current?.click()}
            className="rounded-md border border-intess px-4 py-2 text-sm font-medium text-intess transition-colors hover:bg-intess-light disabled:cursor-not-allowed disabled:opacity-50 dark:border-intess-accent dark:text-intess-accent dark:hover:bg-intess-accent/10"
          >
            {pending ? t('subiendo') : t('adjuntar')}
          </button>
          <span className="text-xs text-slate-500 dark:text-slate-400">{t('ayudaEvidencias', { max: MAX_EVIDENCIAS })}</span>
        </div>
      )}
    </div>
  );
}
