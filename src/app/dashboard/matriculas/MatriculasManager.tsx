'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { matricularEstudiante, retirarMatricula, trasladarMatricula } from '@/app/actions/matriculas';

interface Props {
  matriculas: any[];
  secciones: any[];
  ciclos: any[];
  estudiantes: any[];
}

export default function MatriculasManager({ matriculas, secciones, ciclos, estudiantes }: Props) {
  const router = useRouter();

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('Todos');
  const [filtroCiclo, setFiltroCiclo] = useState<string>('Todos');

  // Modals state
  const [modalActivo, setModalActivo] = useState<'nueva' | 'retirar' | 'trasladar' | null>(null);
  const [matriculaSeleccionada, setMatriculaSeleccionada] = useState<any>(null);

  // Form states for Nueva Matrícula
  const [nuevaNie, setNuevaNie] = useState<number | ''>('');
  const [nuevaCicloId, setNuevaCicloId] = useState<number | ''>(ciclos[0]?.id_ciclo || '');
  const seccionesDelCiclo = secciones.filter(s => Number(s.id_ciclo) === Number(nuevaCicloId));
  const [nuevaSeccionId, setNuevaSeccionId] = useState<number | ''>(seccionesDelCiclo[0]?.id_seccion || '');
  const [nuevaFecha, setNuevaFecha] = useState(new Date().toISOString().split('T')[0]);
  const [nuevaObs, setNuevaObs] = useState('');

  // Form states for Retiro & Traslado
  const [motivoRetiro, setMotivoRetiro] = useState('');
  const [tipoTraslado, setTipoTraslado] = useState<'seccion' | 'externo'>('seccion');
  const [seccionDestinoId, setSeccionDestinoId] = useState<number | ''>('');
  const [motivoTraslado, setMotivoTraslado] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMensaje, setErrorMensaje] = useState<string | null>(null);

  // Filtered matriculas
  const matriculasFiltradas = useMemo(() => {
    return matriculas.filter(m => {
      const matchSearch =
        m.nie.toString().includes(searchTerm) ||
        `${m.primer_nombre} ${m.primer_apellido}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.seccion_nombre && m.seccion_nombre.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchEstado = filtroEstado === 'Todos' || m.estado === filtroEstado;
      const matchCiclo = filtroCiclo === 'Todos' || m.ciclo_anio?.toString() === filtroCiclo;

      return matchSearch && matchEstado && matchCiclo;
    });
  }, [matriculas, searchTerm, filtroEstado, filtroCiclo]);

  // Summary counts
  const totalMatriculas = matriculas.length;
  const totalVigentes = matriculas.filter(m => m.estado === 'Vigente').length;
  const totalRetirados = matriculas.filter(m => m.estado === 'Retirado').length;
  const totalTrasladados = matriculas.filter(m => m.estado === 'Trasladado').length;

  const cerrarModal = () => {
    setModalActivo(null);
    setMatriculaSeleccionada(null);
    setErrorMensaje(null);
    setMotivoRetiro('');
    setMotivoTraslado('');
    setSeccionDestinoId('');
  };

  const handleCrearMatricula = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaNie || !nuevaSeccionId || !nuevaCicloId) {
      setErrorMensaje('Complete todos los campos obligatorios.');
      return;
    }

    setIsSubmitting(true);
    setErrorMensaje(null);

    const result = await matricularEstudiante({
      nie: Number(nuevaNie),
      id_seccion: Number(nuevaSeccionId),
      id_ciclo: Number(nuevaCicloId),
      fecha_matricula: nuevaFecha,
      estado: 'Vigente',
      observaciones: nuevaObs.trim() || undefined
    });

    if (result.success) {
      cerrarModal();
      router.refresh();
    } else {
      setErrorMensaje(result.error || 'Error al procesar la matrícula.');
    }
    setIsSubmitting(false);
  };

  const handleEjecutarRetiro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matriculaSeleccionada) return;
    if (!motivoRetiro.trim()) {
      setErrorMensaje('Debe especificar el motivo del retiro.');
      return;
    }

    setIsSubmitting(true);
    setErrorMensaje(null);

    const result = await retirarMatricula({
      id_matricula: matriculaSeleccionada.id_matricula,
      motivo: motivoRetiro.trim()
    });

    if (result.success) {
      cerrarModal();
      router.refresh();
    } else {
      setErrorMensaje(result.error || 'Error al registrar el retiro.');
    }
    setIsSubmitting(false);
  };

  const handleEjecutarTraslado = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matriculaSeleccionada) return;
    if (!motivoTraslado.trim()) {
      setErrorMensaje('El motivo del traslado es requerido.');
      return;
    }
    if (tipoTraslado === 'seccion' && !seccionDestinoId) {
      setErrorMensaje('Debe seleccionar la sección de destino.');
      return;
    }

    setIsSubmitting(true);
    setErrorMensaje(null);

    const result = await trasladarMatricula({
      id_matricula: matriculaSeleccionada.id_matricula,
      tipo: tipoTraslado,
      nueva_seccion_id: tipoTraslado === 'seccion' ? Number(seccionDestinoId) : undefined,
      motivo: motivoTraslado.trim()
    });

    if (result.success) {
      cerrarModal();
      router.refresh();
    } else {
      setErrorMensaje(result.error || 'Error al procesar el traslado.');
    }
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-6">
      {/* Tarjetas resumen */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-5 shadow-sm">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Matrículas</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{totalMatriculas}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-5 shadow-sm">
          <p className="text-xs font-medium text-green-600 dark:text-green-400 uppercase tracking-wider">Vigentes (Activos)</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{totalVigentes}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-5 shadow-sm">
          <p className="text-xs font-medium text-red-600 dark:text-red-400 uppercase tracking-wider">Retirados</p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">{totalRetirados}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-5 shadow-sm">
          <p className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider">Trasladados</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{totalTrasladados}</p>
        </div>
      </div>

      {/* Barra de acciones y filtros */}
      <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative min-w-[240px] flex-1">
            <input
              type="text"
              placeholder="Buscar por NIE, estudiante o sección..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <svg className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-medium">Estado:</span>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2"
            >
              <option value="Todos">Todos</option>
              <option value="Vigente">Vigente</option>
              <option value="Retirado">Retirado</option>
              <option value="Trasladado">Trasladado</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-medium">Ciclo:</span>
            <select
              value={filtroCiclo}
              onChange={(e) => setFiltroCiclo(e.target.value)}
              className="text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2"
            >
              <option value="Todos">Todos</option>
              {ciclos.map(c => (
                <option key={c.id_ciclo} value={c.anio.toString()}>
                  {c.anio}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setModalActivo('nueva')}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 self-start md:self-auto"
        >
          <span>+</span> Nueva Matrícula
        </button>
      </div>

      {/* Tabla de Matrículas */}
      <div className="bg-white dark:bg-gray-900 shadow rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 dark:bg-gray-800/60 text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="px-6 py-3 font-semibold">NIE</th>
                <th className="px-6 py-3 font-semibold">Estudiante</th>
                <th className="px-6 py-3 font-semibold">Ciclo</th>
                <th className="px-6 py-3 font-semibold">Sección</th>
                <th className="px-6 py-3 font-semibold">Grado</th>
                <th className="px-6 py-3 font-semibold">Especialidad</th>
                <th className="px-6 py-3 font-semibold">Estado</th>
                <th className="px-6 py-3 font-semibold">Observaciones</th>
                <th className="px-6 py-3 font-semibold text-right">Operaciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {matriculasFiltradas.map((mat) => (
                <tr key={mat.id_matricula} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-6 py-4 font-mono font-medium text-gray-900 dark:text-gray-200">{mat.nie}</td>
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                    <Link href={`/dashboard/estudiantes/${mat.nie}`} className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline">
                      {mat.primer_nombre} {mat.primer_apellido}
                    </Link>
                  </td>
                  <td className="px-6 py-4">{mat.ciclo_anio}</td>
                  <td className="px-6 py-4 font-semibold text-gray-800 dark:text-gray-200">{mat.seccion_nombre}</td>
                  <td className="px-6 py-4">{mat.grado}°</td>
                  <td className="px-6 py-4">{mat.especialidad_nombre}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      mat.estado === 'Vigente' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                      mat.estado === 'Trasladado' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                      'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {mat.estado}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-500 max-w-[200px] truncate" title={mat.observaciones || ''}>
                    {mat.observaciones || '-'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 text-xs">
                      <Link
                        href={`/dashboard/estudiantes/${mat.nie}`}
                        className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white font-medium hover:underline"
                      >
                        Expediente
                      </Link>

                      {mat.estado === 'Vigente' && (
                        <>
                          <span className="text-gray-300 dark:text-gray-700">|</span>
                          <button
                            type="button"
                            onClick={() => {
                              setMatriculaSeleccionada(mat);
                              setModalActivo('trasladar');
                            }}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 font-medium"
                          >
                            Trasladar
                          </button>
                          <span className="text-gray-300 dark:text-gray-700">|</span>
                          <button
                            type="button"
                            onClick={() => {
                              setMatriculaSeleccionada(mat);
                              setModalActivo('retirar');
                            }}
                            className="text-red-500 hover:text-red-700 dark:text-red-400 font-medium"
                          >
                            Retirar
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {matriculasFiltradas.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                    No se encontraron matrículas con los filtros aplicados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: NUEVA MATRÍCULA */}
      {modalActivo === 'nueva' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-lg p-6 relative border border-gray-200 dark:border-gray-800">
            <button onClick={cerrarModal} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
              ✕
            </button>

            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              Registrar Nueva Matrícula
            </h3>

            {errorMensaje && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded text-sm border border-red-200 dark:border-red-800">
                {errorMensaje}
              </div>
            )}

            <form onSubmit={handleCrearMatricula} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Estudiante *
                </label>
                <select
                  value={nuevaNie}
                  onChange={(e) => setNuevaNie(Number(e.target.value))}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white px-3 py-2 text-sm"
                >
                  <option value="">-- Seleccione un estudiante --</option>
                  {estudiantes.map(e => (
                    <option key={e.nie} value={e.nie}>
                      NIE: {e.nie} - {e.primer_nombre} {e.primer_apellido} ({e.estado})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Ciclo Escolar *
                </label>
                <select
                  value={nuevaCicloId}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    setNuevaCicloId(id);
                    const primera = secciones.find(s => Number(s.id_ciclo) === id);
                    setNuevaSeccionId(primera?.id_seccion || '');
                  }}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white px-3 py-2 text-sm"
                >
                  {ciclos.map(c => (
                    <option key={c.id_ciclo} value={c.id_ciclo}>
                      Año {c.anio} - {c.estado}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Sección y Cupo *
                </label>
                <select
                  value={nuevaSeccionId}
                  onChange={(e) => setNuevaSeccionId(Number(e.target.value))}
                  required
                  disabled={seccionesDelCiclo.length === 0}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white px-3 py-2 text-sm"
                >
                  {seccionesDelCiclo.length === 0 && (
                    <option value="">No hay secciones creadas para este ciclo</option>
                  )}
                  {seccionesDelCiclo.map(s => {
                    const cupos = s.cupos_disponibles ?? (s.capacidad_max - (s.total_matriculados || 0));
                    const lleno = cupos <= 0;
                    return (
                      <option key={s.id_seccion} value={s.id_seccion} disabled={lleno}>
                        {s.grado}° &quot;{s.nombre}&quot; - {s.especialidad_nombre} (Cupos: {cupos}/{s.capacidad_max}) {lleno ? '— LLENO' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Fecha de Matrícula *
                </label>
                <input
                  type="date"
                  value={nuevaFecha}
                  onChange={(e) => setNuevaFecha(e.target.value)}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Observaciones
                </label>
                <textarea
                  value={nuevaObs}
                  onChange={(e) => setNuevaObs(e.target.value)}
                  rows={2}
                  placeholder="Comentarios adicionales"
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white px-3 py-2 text-sm"
                ></textarea>
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t dark:border-gray-800">
                <button
                  type="button"
                  onClick={cerrarModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Procesando...' : 'Matricular'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RETIRAR */}
      {modalActivo === 'retirar' && matriculaSeleccionada && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md p-6 relative border border-gray-200 dark:border-gray-800">
            <button onClick={cerrarModal} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
              ✕
            </button>

            <div className="flex items-center gap-3 mb-4 text-red-600 dark:text-red-400">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center font-bold text-lg">
                ⚠️
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Retirar Estudiante</h3>
                <p className="text-xs text-gray-500">
                  {matriculaSeleccionada.primer_nombre} {matriculaSeleccionada.primer_apellido} (NIE: {matriculaSeleccionada.nie})
                </p>
              </div>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Esta acción marcará la matrícula como <strong className="text-red-600">Retirado</strong> y liberará el cupo de la sección ({matriculaSeleccionada.seccion_nombre}).
            </p>

            {errorMensaje && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded text-sm border border-red-200 dark:border-red-800">
                {errorMensaje}
              </div>
            )}

            <form onSubmit={handleEjecutarRetiro} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Motivo de Retiro *
                </label>
                <textarea
                  value={motivoRetiro}
                  onChange={(e) => setMotivoRetiro(e.target.value)}
                  rows={3}
                  required
                  placeholder="Describa la razón del retiro del estudiante"
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white px-3 py-2 text-sm focus:ring-red-500 focus:border-red-500"
                ></textarea>
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t dark:border-gray-800">
                <button
                  type="button"
                  onClick={cerrarModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !motivoRetiro.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Procesando...' : 'Confirmar Retiro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TRASLADAR */}
      {modalActivo === 'trasladar' && matriculaSeleccionada && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-lg p-6 relative border border-gray-200 dark:border-gray-800">
            <button onClick={cerrarModal} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
              ✕
            </button>

            <div className="flex items-center gap-3 mb-4 text-blue-600 dark:text-blue-400">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center font-bold text-lg">
                ⇄
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Procesar Traslado</h3>
                <p className="text-xs text-gray-500">
                  {matriculaSeleccionada.primer_nombre} {matriculaSeleccionada.primer_apellido} • Sección actual: {matriculaSeleccionada.seccion_nombre}
                </p>
              </div>
            </div>

            {errorMensaje && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded text-sm border border-red-200 dark:border-red-800">
                {errorMensaje}
              </div>
            )}

            <form onSubmit={handleEjecutarTraslado} className="space-y-4">
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
                    <div className="text-xs text-gray-500 mt-1 font-normal">Reubicar dentro del mismo ciclo</div>
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
                    <div className="text-xs text-gray-500 mt-1 font-normal">Salida hacia otra institución</div>
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
                      .filter(s => s.id_seccion !== matriculaSeleccionada.id_seccion && Number(s.id_ciclo) === Number(matriculaSeleccionada.id_ciclo))
                      .map(s => {
                        const cupos = s.cupos_disponibles ?? (s.capacidad_max - (s.total_matriculados || 0));
                        const lleno = cupos <= 0;
                        return (
                          <option key={s.id_seccion} value={s.id_seccion} disabled={lleno}>
                            {s.grado}° &quot;{s.nombre}&quot; - {s.especialidad_nombre} (Cupos: {cupos}/{s.capacidad_max}) {lleno ? '— LLENO' : ''}
                          </option>
                        );
                      })}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Motivo o justificación del traslado *
                </label>
                <textarea
                  value={motivoTraslado}
                  onChange={(e) => setMotivoTraslado(e.target.value)}
                  rows={3}
                  required
                  placeholder="Detalle el motivo del traslado"
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white px-3 py-2 text-sm"
                ></textarea>
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t dark:border-gray-800">
                <button
                  type="button"
                  onClick={cerrarModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !motivoTraslado.trim() || (tipoTraslado === 'seccion' && !seccionDestinoId)}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Procesando...' : 'Confirmar Traslado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
