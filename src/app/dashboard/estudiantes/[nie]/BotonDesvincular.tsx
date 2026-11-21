'use client';

import { desvincularEstudianteTutor } from '@/app/actions/tutores';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function BotonDesvincular({ nie, duiTutor }: { nie: number, duiTutor: string }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDesvincular = async () => {
    if (!window.confirm('¿Está seguro de que desea desvincular este tutor del estudiante?')) return;
    
    setIsDeleting(true);
    const result = await desvincularEstudianteTutor(nie, duiTutor);
    if (result && result.success) {
      router.refresh();
    } else {
      alert(result?.error || 'Error al desvincular tutor');
      setIsDeleting(false);
    }
  };

  return (
    <button 
      onClick={handleDesvincular} 
      disabled={isDeleting}
      className="text-xs text-red-500 hover:text-red-700 font-medium ml-4 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 px-2 py-1 rounded"
    >
      {isDeleting ? 'Desvinculando...' : 'Desvincular'}
    </button>
  );
}
