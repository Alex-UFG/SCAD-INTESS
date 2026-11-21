'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { estudianteTutorSchema, EstudianteTutorFormData } from '@/lib/validations/tutor';
import { matriculaSchema, MatriculaFormData } from '@/lib/validations/matricula';
import { estudianteSchema, EstudianteFormData } from '@/lib/validations/estudiante';
import { getTutorPorDui, vincularEstudianteTutor } from '@/app/actions/tutores';
import { matricularEstudiante, retirarMatricula, trasladarMatricula } from '@/app/actions/matriculas';
import { updateEstudiante } from '@/app/actions/estudiantes';
import { useState, useEffect } from 'react';

interface Props {
  nie: number;
  estudiante: any;
  secciones?: any[];
  ciclos?: any[];
}

export default function EstudianteModals({ nie, estudiante, secciones = [], ciclos = [] }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const modal = searchParams.get('modal');
  const idMatriculaParam = searchParams.get('id_matricula');
  const idSeccionActualParam = searchParams.get('id_seccion');

  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  // States for Retiro & Traslado
  const [motivoRetiro, setMotivoRetiro] = useState('');
  const [tipoTraslado, setTipoTraslado] = useState<'seccion' | 'externo'>('seccion');
  const [seccionDestinoId, setSeccionDestinoId] = useState<number | ''>('');
  const [motivoTraslado, setMotivoTraslado] = useState('');

  const closeModal = () => {
    setServerError(null);
    setMotivoRetiro('');
    setMotivoTraslado('');
    setSeccionDestinoId('');
    router.push(`/dashboard/estudiantes/${nie}`);
  };

  // Form for Vincular Tutor
  const { register: registerTutor, handleSubmit: handleTutorSubmit, watch: watchTutor, formState: { errors: tutorErrors, isSubmitting: isSubmittingTutor } } = useForm<any>({
    resolver: zodResolver(estudianteTutorSchema),
    defaultValues: {
      nie: nie,
      parentesco: 'Padre',
      contacto_principal: false
    }
  });

  const duiTutorValue = watchTutor('dui_tutor');
  const [tutorInfo, setTutorInfo] = useState<any>(null);
  const [tutorError, setTutorError] = useState<string | null>(null);
  const [isSearchingTutor, setIsSearchingTutor] = useState(false);

  useEffect(() => {
    const fetchTutor = async () => {
      if (duiTutorValue && /^\d{8}-\d$/.test(duiTutorValue)) {
        setIsSearchingTutor(true);
        try {
          const tutor = await getTutorPorDui(duiTutorValue);
          if (tutor) {
            setTutorInfo(tutor);
            setTutorError(null);
          } else {
            setTutorInfo(null);
            setTutorError('No se encontró el tutor. Debe registrar al tutor primero.');
          }
        } catch (e) {
          setTutorInfo(null);
          setTutorError('Error al buscar el tutor.');
        } finally {
          setIsSearchingTutor(false);
        }
      } else {
        setTutorInfo(null);
        setTutorError(null);
      }
    };

    fetchTutor();
  }, [duiTutorValue]);

  // Form for Matricular
  const { register: registerMatricula, handleSubmit: handleMatriculaSubmit, formState: { errors: matriculaErrors, isSubmitting: isSubmittingMatricula } } = useForm<any>({
    resolver: zodResolver(matriculaSchema),
    defaultValues: {
      nie: nie,
      id_ciclo: ciclos[0]?.id_ciclo || 1,
      id_seccion: secciones[0]?.id_seccion || 1,
      fecha_matricula: new Date().toISOString().split('T')[0],
      estado: 'Vigente'
    }
  });

  // Form for Editar Estudiante
  const { register: registerEstudiante, handleSubmit: handleEstudianteSubmit, formState: { errors: estudianteErrors, isSubmitting: isSubmittingEstudiante } } = useForm<any>({
    resolver: zodResolver(estudianteSchema),
    defaultValues: {
      nie: estudiante?.nie || nie,
      primer_nombre: estudiante?.primer_nombre || '',
      segundo_nombre: estudiante?.segundo_nombre || '',
      primer_apellido: estudiante?.primer_apellido || '',
      segundo_apellido: estudiante?.segundo_apellido || '',
      fecha_nacimiento: estudiante?.fecha_nacimiento ? new Date(estudiante.fecha_nacimiento).toISOString().split('T')[0] : '',
      genero: estudiante?.genero || 'M',
      direccion: estudiante?.direccion || '',
      foto_url: estudiante?.foto_url || '',
      estado: estudiante?.estado || 'Activo'
    }
  });

  const onVincularTutor = async (data: any) => {
    const result = await vincularEstudianteTutor(data);
    if (result && result.success) {
      closeModal();
      router.refresh();
    } else {
      setServerError(result?.error || 'Error al vincular tutor');
    }
  };

  const onMatricular = async (data: any) => {
    const result = await matricularEstudiante(data);
    if (result && result.success) {
      closeModal();
      router.refresh();
    } else {
      setServerError(result?.error || 'Error al matricular');
    }
  };

  const onEditarEstudiante = async (data: any) => {
    const result = await updateEstudiante(nie, data);
    if (result && result.success) {
      closeModal();
      router.refresh();
    } else {
      setServerError(result?.error || 'Error al actualizar estudiante');
    }
  };

  const handleRetiro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idMatriculaParam) return;
    if (!motivoRetiro.trim()) {
      setServerError('Debe especificar el motivo del retiro.');
      return;
    }

    setIsSubmittingAction(true);
    setServerError(null);

    const result = await retirarMatricula({
      id_matricula: Number(idMatriculaParam),
      motivo: motivoRetiro.trim()
    });

    if (result.success) {
      closeModal();
      router.refresh();
    } else {
      setServerError(result.error || 'Error al registrar el retiro.');
    }
    setIsSubmittingAction(false);
  };

  const handleTraslado = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idMatriculaParam) return;
    if (!motivoTraslado.trim()) {
      setServerError('Debe indicar el motivo del traslado.');
      return;
    }
    if (tipoTraslado === 'seccion' && !seccionDestinoId) {
      setServerError('Seleccione la sección de destino.');
      return;
    }

    setIsSubmittingAction(true);
    setServerError(null);

    const result = await trasladarMatricula({
      id_matricula: Number(idMatriculaParam),
      tipo: tipoTraslado,
      nueva_seccion_id: tipoTraslado === 'seccion' ? Number(seccionDestinoId) : undefined,
      motivo: motivoTraslado.trim()
    });

    if (result.success) {
      closeModal();
      router.refresh();
    } else {
      setServerError(result.error || 'Error al procesar el traslado.');
    }
    setIsSubmittingAction(false);
  };

  if (!modal) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-lg p-6 relative border border-gray-200 dark:border-gray-800">
        <button onClick={closeModal} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
          ✕
        </button>
        
        {serverError && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded text-sm border border-red-200 dark:border-red-800">
            {serverError}
          </div>
        )}

        {/* Modal: Vincular Tutor */}
        {modal === 'vincular_tutor' && (
          <>
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Vincular Tutor al Estudiante</h3>
            <form onSubmit={handleTutorSubmit(onVincularTutor)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">DUI del Tutor</label>
                <input type="text" {...registerTutor('dui_tutor')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white px-3 py-2" placeholder="00000000-0" />
                {tutorErrors.dui_tutor?.message && <p className="text-red-500 text-xs mt-1">{String(tutorErrors.dui_tutor.message)}</p>}
                {isSearchingTutor && <p className="text-sm text-gray-500 mt-1">Buscando...</p>}
                {tutorInfo && <p className="text-sm text-green-600 dark:text-green-400 mt-1">✓ Tutor encontrado: {tutorInfo.primer_nombre} {tutorInfo.primer_apellido}</p>}
                {tutorError && <p className="text-sm text-red-600 dark:text-red-400 mt-1">⚠️ {tutorError}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Parentesco</label>
                <select {...registerTutor('parentesco')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white px-3 py-2">
                  <option value="Padre">Padre</option>
                  <option value="Madre">Madre</option>
                  <option value="Abuelo">Abuelo</option>
                  <option value="Abuela">Abuela</option>
                  <option value="Tio">Tío</option>
                  <option value="Tia">Tía</option>
                  <option value="Hermano">Hermano</option>
                  <option value="Hermana">Hermana</option>
                  <option value="Encargado">Encargado</option>
                </select>
                {tutorErrors.parentesco?.message && <p className="text-red-500 text-xs mt-1">{String(tutorErrors.parentesco.message)}</p>}
              </div>
              <div className="flex items-center">
                <input type="checkbox" {...registerTutor('contacto_principal')} id="contacto_principal" className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
                <label htmlFor="contacto_principal" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">Es el contacto principal</label>
              </div>
              <div className="pt-4 flex justify-end gap-2 border-t dark:border-gray-800">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300">Cancelar</button>
                <button type="submit" disabled={isSubmittingTutor || !tutorInfo} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50">
                  {isSubmittingTutor ? 'Vinculando...' : 'Vincular'}
                </button>
              </div>
            </form>
          </>
        )}

        {/* Modal: Matricular */}
        {modal === 'matricular' && (
          <>
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Matricular Estudiante</h3>
            <form onSubmit={handleMatriculaSubmit(onMatricular)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Ciclo Escolar</label>
                {ciclos.length > 0 ? (
                  <select {...registerMatricula('id_ciclo')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white px-3 py-2">
                    {ciclos.map(c => (
                      <option key={c.id_ciclo} value={c.id_ciclo}>
                        Año {c.anio} ({c.estado})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input type="number" min="1" {...registerMatricula('id_ciclo')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white px-3 py-2" placeholder="ID Ciclo" />
                )}
                {matriculaErrors.id_ciclo?.message && <p className="text-red-500 text-xs mt-1">{String(matriculaErrors.id_ciclo.message)}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Sección y Especialidad</label>
                {secciones.length > 0 ? (
                  <select {...registerMatricula('id_seccion')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white px-3 py-2">
                    {secciones.map(s => (
                      <option key={s.id_seccion} value={s.id_seccion} disabled={s.cupos_disponibles <= 0}>
                        {s.grado}° &quot;{s.nombre}&quot; - {s.especialidad_nombre} (Cupos: {s.cupos_disponibles ?? (s.capacidad_max - (s.total_matriculados || 0))}/{s.capacidad_max})
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">No hay secciones creadas. Registre secciones antes de matricular.</p>
                )}
                {matriculaErrors.id_seccion?.message && <p className="text-red-500 text-xs mt-1">{String(matriculaErrors.id_seccion.message)}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Fecha de Matrícula</label>
                <input type="date" {...registerMatricula('fecha_matricula')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white px-3 py-2" />
                {matriculaErrors.fecha_matricula?.message && <p className="text-red-500 text-xs mt-1">{String(matriculaErrors.fecha_matricula.message)}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Observaciones</label>
                <textarea {...registerMatricula('observaciones')} rows={3} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white px-3 py-2" placeholder="Notas adicionales sobre la matrícula"></textarea>
                {matriculaErrors.observaciones?.message && <p className="text-red-500 text-xs mt-1">{String(matriculaErrors.observaciones.message)}</p>}
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t dark:border-gray-800">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300">Cancelar</button>
                <button type="submit" disabled={isSubmittingMatricula} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50">
                  {isSubmittingMatricula ? 'Matriculando...' : 'Matricular'}
                </button>
              </div>
            </form>
          </>
        )}

        {/* Modal: Editar Estudiante */}
        {modal === 'editar_estudiante' && (
          <>
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Editar Información del Estudiante</h3>
            <form onSubmit={handleEstudianteSubmit(onEditarEstudiante)} className="space-y-4 max-h-[75vh] overflow-y-auto px-1">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">NIE (Solo lectura)</label>
                <input type="number" {...registerEstudiante('nie')} className="mt-1 block w-full rounded-md border-gray-300 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-3 py-2 cursor-not-allowed" disabled />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Primer Nombre *</label>
                  <input type="text" {...registerEstudiante('primer_nombre')} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white px-3 py-2" />
                  {estudianteErrors.primer_nombre?.message && <p className="text-red-500 text-xs mt-1">{String(estudianteErrors.primer_nombre.message)}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Segundo Nombre</label>
                  <input type="text" {...registerEstudiante('segundo_nombre')} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white px-3 py-2" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Primer Apellido *</label>
                  <input type="text" {...registerEstudiante('primer_apellido')} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white px-3 py-2" />
                  {estudianteErrors.primer_apellido?.message && <p className="text-red-500 text-xs mt-1">{String(estudianteErrors.primer_apellido.message)}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Segundo Apellido</label>
                  <input type="text" {...registerEstudiante('segundo_apellido')} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white px-3 py-2" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">URL de Fotografía</label>
                <input type="text" {...registerEstudiante('foto_url')} placeholder="https://... o /uploads/..." className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white px-3 py-2 text-sm" />
                <p className="text-xs text-gray-500 mt-1">También puedes subirla directamente desde la ficha del expediente.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Fecha de Nacimiento *</label>
                <input type="date" {...registerEstudiante('fecha_nacimiento')} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white px-3 py-2" />
                {estudianteErrors.fecha_nacimiento?.message && <p className="text-red-500 text-xs mt-1">{String(estudianteErrors.fecha_nacimiento.message)}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Género *</label>
                  <select {...registerEstudiante('genero')} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white px-3 py-2">
                    <option value="M">Masculino</option>
                    <option value="F">Femenino</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Estado *</label>
                  <select {...registerEstudiante('estado')} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white px-3 py-2">
                    <option value="Activo">Activo</option>
                    <option value="Inactivo">Inactivo</option>
                    <option value="Retirado">Retirado</option>
                    <option value="Egresado">Egresado</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Dirección</label>
                <textarea {...registerEstudiante('direccion')} rows={2} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white px-3 py-2"></textarea>
              </div>
              
              <div className="pt-4 flex justify-end gap-2 sticky bottom-0 bg-white dark:bg-gray-900 pb-2 border-t dark:border-gray-800">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300">Cancelar</button>
                <button type="submit" disabled={isSubmittingEstudiante} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50">
                  {isSubmittingEstudiante ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </>
        )}

        {/* Modal: Retiro de Matrícula */}
        {modal === 'retirar' && (
          <>
            <div className="flex items-center gap-3 mb-4 text-red-600 dark:text-red-400">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center font-bold text-lg">
                ⚠️
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Registrar Retiro del Estudiante</h3>
                <p className="text-xs text-gray-500">Matrícula #{idMatriculaParam}</p>
              </div>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Esta operación cambiará el estado de la matrícula y del estudiante a <strong className="text-red-600">Retirado</strong>. El cupo de la sección quedará liberado.
            </p>

            <form onSubmit={handleRetiro} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Motivo o justificación del retiro *
                </label>
                <textarea
                  value={motivoRetiro}
                  onChange={(e) => setMotivoRetiro(e.target.value)}
                  rows={3}
                  required
                  placeholder="Ej: Cambio de residencia familiar, problemas de salud, etc."
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white px-3 py-2 text-sm focus:ring-red-500 focus:border-red-500"
                ></textarea>
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t dark:border-gray-800">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAction || !motivoRetiro.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  {isSubmittingAction ? 'Procesando...' : 'Confirmar Retiro'}
                </button>
              </div>
            </form>
          </>
        )}

        {/* Modal: Traslado de Matrícula */}
        {modal === 'trasladar' && (
          <>
            <div className="flex items-center gap-3 mb-4 text-blue-600 dark:text-blue-400">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center font-bold text-lg">
                ⇄
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Procesar Traslado</h3>
                <p className="text-xs text-gray-500">Matrícula #{idMatriculaParam}</p>
              </div>
            </div>

            <form onSubmit={handleTraslado} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tipo de Traslado
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTipoTraslado('seccion')}
                    className={`p-3 rounded-lg border text-sm text-left transition-all ${
                      tipoTraslado === 'seccion'
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 font-semibold'
                        : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <div>🏢 Cambio de Sección</div>
                    <div className="text-xs text-gray-500 mt-1 font-normal">Reubicar en otra sección de la institución</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTipoTraslado('externo')}
                    className={`p-3 rounded-lg border text-sm text-left transition-all ${
                      tipoTraslado === 'externo'
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 font-semibold'
                        : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <div>🏛️ Traslado Externo</div>
                    <div className="text-xs text-gray-500 mt-1 font-normal">Salida hacia otro centro educativo</div>
                  </button>
                </div>
              </div>

              {tipoTraslado === 'seccion' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Nueva Sección de Destino *
                  </label>
                  <select
                    value={seccionDestinoId}
                    onChange={(e) => setSeccionDestinoId(Number(e.target.value))}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white px-3 py-2 text-sm"
                  >
                    <option value="">-- Seleccionar sección destino --</option>
                    {secciones
                      .filter(s => s.id_seccion !== Number(idSeccionActualParam))
                      .map(s => {
                        const sinCupo = (s.cupos_disponibles ?? (s.capacidad_max - (s.total_matriculados || 0))) <= 0;
                        return (
                          <option key={s.id_seccion} value={s.id_seccion} disabled={sinCupo}>
                            {s.grado}° &quot;{s.nombre}&quot; - {s.especialidad_nombre} (Cupos: {s.cupos_disponibles ?? (s.capacidad_max - (s.total_matriculados || 0))}/{s.capacidad_max}) {sinCupo ? '— LLENO' : ''}
                          </option>
                        );
                      })}
                  </select>
                </div>
              )}

              {tipoTraslado === 'externo' && (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 text-xs rounded-md border border-amber-200 dark:border-amber-800">
                  El estado de la matrícula pasará a <strong>Trasladado</strong> y el estudiante quedará en estado <strong>Inactivo</strong>.
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Motivo del Traslado *
                </label>
                <textarea
                  value={motivoTraslado}
                  onChange={(e) => setMotivoTraslado(e.target.value)}
                  rows={3}
                  required
                  placeholder={tipoTraslado === 'seccion' ? "Ej: Ajuste de horario, solicitud de cambio de especialidad o grupo" : "Ej: Traslado al Instituto Nacional de Santa Ana"}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white px-3 py-2 text-sm"
                ></textarea>
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t dark:border-gray-800">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAction || !motivoTraslado.trim() || (tipoTraslado === 'seccion' && !seccionDestinoId)}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmittingAction ? 'Procesando...' : 'Confirmar Traslado'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
