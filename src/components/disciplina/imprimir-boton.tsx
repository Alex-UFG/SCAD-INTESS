'use client';

import { submitButtonClass } from '@/components/ui/form-field';

export function ImprimirBoton({ label }: { label: string }) {
  return (
    <button type="button" onClick={() => window.print()} className={submitButtonClass}>
      {label}
    </button>
  );
}
