'use client';

import { useState, useRef } from 'react';
import { uploadFotoEstudiante, removeFotoEstudiante } from '@/app/actions/estudiantes';
import { useRouter } from 'next/navigation';

interface Props {
  nie: number;
  fotoUrl: string | null;
  nombreCompleto: string;
}

export default function FotoEstudianteUploader({ nie, fotoUrl, nombreCompleto }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0].toUpperCase())
      .join('');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen excede el límite de 5MB.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setIsUploading(true);

    const formData = new FormData();
    formData.append('foto', file);

    const result = await uploadFotoEstudiante(nie, formData);

    if (result.success) {
      router.refresh();
    } else {
      setError(result.error || 'Error al subir la imagen.');
    }
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemove = async () => {
    if (!confirm('¿Desea eliminar la fotografía del estudiante?')) return;
    setIsUploading(true);
    const result = await removeFotoEstudiante(nie);
    if (result.success) {
      router.refresh();
    } else {
      setError(result.error || 'Error al eliminar la fotografía.');
    }
    setIsUploading(false);
  };

  return (
    <div className="flex flex-col items-center mb-6">
      <div className="relative group w-28 h-28 rounded-full overflow-hidden border-2 border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 shadow-inner flex items-center justify-center">
        {fotoUrl ? (
          <img
            src={fotoUrl}
            alt={nombreCompleto}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-2xl font-bold text-gray-500 dark:text-gray-400">
            {getInitials(nombreCompleto) || 'ES'}
          </span>
        )}

        <div
          onClick={() => fileInputRef.current?.click()}
          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer text-white text-xs font-medium"
        >
          <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {isUploading ? 'Subiendo...' : 'Cambiar'}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="flex items-center gap-3 mt-3">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
        >
          {fotoUrl ? 'Cambiar Foto' : '+ Subir Foto'}
        </button>
        {fotoUrl && (
          <>
            <span className="text-gray-300 dark:text-gray-700">|</span>
            <button
              type="button"
              onClick={handleRemove}
              disabled={isUploading}
              className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 font-medium"
            >
              Quitar
            </button>
          </>
        )}
      </div>

      {error && <p className="text-red-500 text-xs mt-2 text-center">{error}</p>}
    </div>
  );
}
