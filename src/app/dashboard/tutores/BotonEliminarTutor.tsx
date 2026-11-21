'use client';

import { useState } from 'react';
import { deleteTutor } from '@/app/actions/tutores';
import { useRouter } from 'next/navigation';

export default function BotonEliminarTutor({ dui, nombre }: { dui: string; nombre: string }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`¿Está seguro de que desea eliminar al tutor ${nombre} (${dui})?`)) return;

    setIsDeleting(true);
    const result = await deleteTutor(dui);
    if (result.success) {
      router.refresh();
    } else {
      alert(result.error || 'Error al eliminar tutor.');
      setIsDeleting(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isDeleting}
      className="text-red-500 hover:text-red-700 dark:text-red-400 font-medium hover:underline text-sm disabled:opacity-50"
    >
      {isDeleting ? 'Eliminando...' : 'Eliminar'}
    </button>
  );
}
