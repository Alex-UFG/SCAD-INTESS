'use client';

import { useState } from 'react';
import { submitButtonClass } from '@/components/ui/form-field';
import { useToast } from '@/components/ui/toast';
import type { DocumentoPdfDatos } from './documento-pdf';

interface Props {
  documento: DocumentoPdfDatos;
  fileName: string;
  label: string;
  pendingLabel: string;
  errorLabel: string;
}

export function DescargarPdfBoton({ documento, fileName, label, pendingLabel, errorLabel }: Props) {
  const toast = useToast();
  const [generando, setGenerando] = useState(false);

  const descargar = async () => {
    setGenerando(true);
    try {
      const { generarPdf } = await import('./documento-pdf');
      const url = URL.createObjectURL(await generarPdf(documento));
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generando PDF:', error);
      toast.error(errorLabel);
    } finally {
      setGenerando(false);
    }
  };

  return (
    <button type="button" onClick={descargar} disabled={generando} className={submitButtonClass}>
      {generando ? pendingLabel : label}
    </button>
  );
}
