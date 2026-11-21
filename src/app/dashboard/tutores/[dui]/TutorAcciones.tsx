'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { tutorSchema, TutorFormData } from '@/lib/validations/tutor';
import { updateTutor, deleteTutor } from '@/app/actions/tutores';
import { useRouter } from 'next/navigation';
import { Tutor } from '@/types/persona';

interface Props {
  tutor: Tutor;
  totalEstudiantesVinculados: number;
}

export default function TutorAcciones({ tutor, totalEstudiantesVinculados }: Props) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<TutorFormData>({
    resolver: zodResolver(tutorSchema),
    defaultValues: {
      dui_tutor: tutor.dui_tutor,
      primer_nombre: tutor.primer_nombre,
      segundo_nombre: tutor.segundo_nombre || '',
      primer_apellido: tutor.primer_apellido,
      segundo_apellido: tutor.segundo_apellido || '',
      telefono_principal: tutor.telefono_principal,
      telefono_alterno: tutor.telefono_alterno || '',
      email: tutor.email || '',
      ocupacion: tutor.ocupacion || ''
    }
  });

  const onUpdate = async (data: TutorFormData) => {
    setServerError(null);
    const result = await updateTutor(tutor.dui_tutor, data);
    if (result.success) {
      setIsEditing(false);
      router.refresh();
    } else {
      setServerError(result.error || 'Error al actualizar los datos del tutor.');
    }
  };

  const handleDelete = async () => {
    if (totalEstudiantesVinculados > 0) {
      alert(`No se puede eliminar a este tutor porque tiene ${totalEstudiantesVinculados} estudiante(s) vinculado(s). Debe desvincularlos primero.`);
      return;
    }

    if (!confirm(`¿Está seguro de que desea eliminar permanentemente al tutor ${tutor.primer_nombre} ${tutor.primer_apellido} (${tutor.dui_tutor})?`)) {
      return;
    }

    setIsDeleting(true);
    const result = await deleteTutor(tutor.dui_tutor);
    if (result.success) {
      router.push('/dashboard/tutores');
      router.refresh();
    } else {
      alert(result.error || 'Error al eliminar tutor.');
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
        >
          Editar Tutor
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting}
          className="bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/30 dark:hover:bg-red-900/50 dark:text-red-400 border border-red-200 dark:border-red-800 px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
        >
          {isDeleting ? 'Eliminando...' : 'Eliminar Tutor'}
        </button>
      </div>

      {isEditing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-lg p-6 relative border border-gray-200 dark:border-gray-800">
            <button
              onClick={() => setIsEditing(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              ✕
            </button>

            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              Editar Datos del Tutor
            </h3>

            {serverError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded text-sm border border-red-200 dark:border-red-800">
                {serverError}
              </div>
            )}

            <form onSubmit={handleSubmit(onUpdate)} className="space-y-4 max-h-[75vh] overflow-y-auto px-1">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  DUI (Identificador único)
                </label>
                <input
                  type="text"
                  value={tutor.dui_tutor}
                  disabled
                  className="mt-1 block w-full rounded-md border-gray-300 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-3 py-2 cursor-not-allowed text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Primer Nombre *</label>
                  <input
                    type="text"
                    {...register('primer_nombre')}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white px-3 py-2 text-sm"
                  />
                  {errors.primer_nombre && <p className="text-red-500 text-xs mt-1">{errors.primer_nombre.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Segundo Nombre</label>
                  <input
                    type="text"
                    {...register('segundo_nombre')}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Primer Apellido *</label>
                  <input
                    type="text"
                    {...register('primer_apellido')}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white px-3 py-2 text-sm"
                  />
                  {errors.primer_apellido && <p className="text-red-500 text-xs mt-1">{errors.primer_apellido.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Segundo Apellido</label>
                  <input
                    type="text"
                    {...register('segundo_apellido')}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Teléfono Principal *</label>
                  <input
                    type="text"
                    {...register('telefono_principal')}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white px-3 py-2 text-sm"
                  />
                  {errors.telefono_principal && <p className="text-red-500 text-xs mt-1">{errors.telefono_principal.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Teléfono Alterno</label>
                  <input
                    type="text"
                    {...register('telefono_alterno')}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                  <input
                    type="email"
                    {...register('email')}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white px-3 py-2 text-sm"
                  />
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Ocupación</label>
                  <input
                    type="text"
                    {...register('ocupacion')}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
