'use client';

import Image from 'next/image';
import { useRef, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { actualizarFotoEstudiante } from '@/app/actions/estudiantes';
import { useToast } from '@/components/ui/toast';

interface Props {
  nie: number;
  fotoUrl: string | null;
  nombre: string;
  puedeEditar: boolean;
}

/**Foto del expediente con carga/reemplazo/eliminacion (Vercel Blob) */
export function FotoEstudiante({ nie, fotoUrl, nombre, puedeEditar }: Props) {
  const t = useTranslations('estudiantes');
  const router = useRouter();
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [preview, setPreview] = useState<string | null>(null);

  const enviar = (fd: FormData) => {
    start(async () => {
      const r = await actualizarFotoEstudiante(nie, fd);
      if (r.success) {
        toast.success(t('fotoActualizada'));
        setPreview(null);
        router.refresh();
      } else {
        toast.error(t(`errors.${r.error}`));
      }
    });
  };

  const onFile = (file: File | undefined) => {
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    const fd = new FormData();
    fd.set('foto', file);
    enviar(fd);
  };

  const src = preview ?? fotoUrl;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="h-32 w-32 overflow-hidden rounded-full border-2 border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800">
        {src ? (
          // Blob URLs no estan en next.config images: se usa <img> via unoptimized
          <Image src={src} alt={nombre} width={128} height={128} unoptimized className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-gray-400">
            {nombre.slice(0, 1).toUpperCase()}
          </div>
        )}
      </div>
      {puedeEditar && (
        <div className="flex gap-3 text-xs">
          <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
          <button type="button" disabled={pending} onClick={() => input.current?.click()} className="font-medium text-blue-600 hover:underline disabled:opacity-50 dark:text-blue-400">
            {pending ? t('fotoSubiendo') : fotoUrl ? t('fotoCambiar') : t('fotoSubir')}
          </button>
          {fotoUrl && (
            <button
              type="button"
              disabled={pending}
              onClick={() => { const fd = new FormData(); fd.set('quitar', '1'); enviar(fd); }}
              className="font-medium text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
            >
              {t('fotoQuitar')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
