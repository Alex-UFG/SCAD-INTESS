export type EstadoMatricula = 'Vigente' | 'Retirado' | 'Trasladado';
export type EstadoCiclo = 'Planificado' | 'Activo' | 'Cerrado';

export interface CicloEscolar {
  id_ciclo: number;
  anio: number;
  fecha_inicio: Date;
  fecha_fin: Date;
  estado: EstadoCiclo;
}

export interface Especialidad {
  id_especialidad: number;
  nombre: string;
  activa: boolean;
}

export interface Seccion {
  id_seccion: number;
  nombre: string;
  grado: number;
  id_especialidad: number;
  id_ciclo: number;
  dui_docente_guia: string | null;
  capacidad_max: number;
}

export interface SeccionConEspecialidad extends Seccion {
  especialidad_nombre: string;
}

export interface Matricula {
  id_matricula: number;
  nie: number;
  id_seccion: number;
  id_ciclo: number;
  fecha_matricula: Date;
  estado: EstadoMatricula;
  observaciones: string | null;
  registrada_por: number;
}

export interface MatriculaDetalle extends Matricula {
  seccion_nombre: string;
  grado: number;
  especialidad_nombre: string;
  ciclo_anio: number;
  registrada_por_email?: string;
}
