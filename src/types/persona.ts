export type Genero = 'M' | 'F';
export type EstadoEstudiante = 'Activo' | 'Inactivo' | 'Retirado' | 'Egresado';
export type Parentesco = 'Padre' | 'Madre' | 'Abuelo' | 'Abuela' | 'Tio' | 'Tia' | 'Hermano' | 'Hermana' | 'Encargado';

export interface Estudiante {
  nie: number;
  primer_nombre: string;
  segundo_nombre: string | null;
  primer_apellido: string;
  segundo_apellido: string | null;
  fecha_nacimiento: Date;
  genero: Genero;
  direccion: string | null;
  foto_url: string | null;
  estado: EstadoEstudiante;
  creado_en: Date;
}

export interface Tutor {
  dui_tutor: string;
  primer_nombre: string;
  segundo_nombre: string | null;
  primer_apellido: string;
  segundo_apellido: string | null;
  telefono_principal: string;
  telefono_alterno: string | null;
  email: string | null;
  ocupacion: string | null;
}

export interface EstudianteTutor {
  nie: number;
  dui_tutor: string;
  parentesco: Parentesco;
  contacto_principal: boolean;
}

export interface EstudianteConTutores extends Estudiante {
  tutores: (Tutor & { pivot: { parentesco: Parentesco; contacto_principal: boolean } })[];
}
