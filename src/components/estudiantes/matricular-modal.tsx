'use client';

import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { matriculaSchema, MatriculaFormData } from '@/lib/validations/matricula';
import { matricularEstudiante } from '@/app/actions/matriculas';
import { CicloEscolar, SeccionConEspecialidad } from '@/types/academico';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { FormField, ServerErrorBanner, inputClass, submitButtonClass } from '@/components/ui/form-field';

type MatriculaInput = z.input<typeof matriculaSchema>;

interface MatricularModalProps {
  nie: number;
  ciclos: CicloEscolar[];
  secciones: SeccionConEspecialidad[];
}

export function MatricularModal({ nie, ciclos, secciones }: MatricularModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const hoy = new Date().toISOString().slice(0, 10);
  const valoresIniciales: Partial<MatriculaInput> = { nie, estado: 'Vigente', fecha_matricula: hoy };

  const { register, handleSubmit, control, reset, formState: { errors, isSubmitting } } = useForm<MatriculaInput, unknown, MatriculaFormData>({
    resolver: zodResolver(matriculaSchema),
    defaultValues: valoresIniciales,
  });

  const idCicloSeleccionado = Number(useWatch({ control, name: 'id_ciclo' }));
  const seccionesDelCiclo = secciones.filter((seccion) => seccion.id_ciclo === idCicloSeleccionado);

  const cerrar = () => {
    setOpen(false);
    setServerError(null);
    reset(valoresIniciales);
  };

  const onSubmit = async (data: MatriculaFormData) => {
    setServerError(null);
    const result = await matricularEstudiante(data);

    if (result.success) {
      cerrar();
      router.refresh();
    } else {
      setServerError(result.error || 'Revisa los campos del formulario.');
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
      >
        + Matricular
      </button>

      <Modal title="Nueva Matrícula" open={open} onClose={cerrar}>
        <ServerErrorBanner message={serverError} />

        {ciclos.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No hay ciclos escolares abiertos para matricular.
          </p>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <input type="hidden" {...register('nie')} />
            <input type="hidden" {...register('estado')} />

            <FormField label="Ciclo Escolar *" error={errors.id_ciclo?.message}>
              <select {...register('id_ciclo')} defaultValue="" className={inputClass}>
                <option value="" disabled>Seleccione un ciclo</option>
                {ciclos.map((ciclo) => (
                  <option key={ciclo.id_ciclo} value={ciclo.id_ciclo}>
                    {ciclo.anio} ({ciclo.estado})
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Sección *" error={errors.id_seccion?.message}>
              <select {...register('id_seccion')} defaultValue="" className={inputClass} disabled={seccionesDelCiclo.length === 0}>
                <option value="" disabled>
                  {seccionesDelCiclo.length === 0 ? 'Seleccione primero un ciclo' : 'Seleccione una sección'}
                </option>
                {seccionesDelCiclo.map((seccion) => (
                  <option key={seccion.id_seccion} value={seccion.id_seccion}>
                    {seccion.grado}° {seccion.nombre} — {seccion.especialidad_nombre}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Fecha de Matrícula *" error={errors.fecha_matricula?.message}>
              <input type="date" {...register('fecha_matricula')} className={inputClass} />
            </FormField>

            <FormField label="Observaciones" error={errors.observaciones?.message}>
              <textarea {...register('observaciones')} rows={3} className={inputClass} />
            </FormField>

            <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-800">
              <button type="submit" disabled={isSubmitting} className={submitButtonClass}>
                {isSubmitting ? 'Guardando...' : 'Matricular'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
