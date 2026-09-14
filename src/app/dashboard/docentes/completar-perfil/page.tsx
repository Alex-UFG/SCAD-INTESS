import { db } from '@/lib/db';
import { FormCompletarPerfilDocente } from './form-docente';

export const metadata = {
  title: 'Completar Perfil Docente | SCAD-INTESS',
  description: 'Completar perfil docente para habilitar funciones académicas'
};

export default async function CompletarPerfilPage() {
  // Obtenemos las especialidades activas desde la base de datos para llenar el select
  let especialidades: Array<{ id_especialidad: number; nombre: string }> = [];

  try {
    const [rows]: any = await db.query(
      'SELECT id_especialidad, nombre FROM especialidad WHERE activa = TRUE ORDER BY nombre ASC'
    );
    especialidades = rows || [];
  } catch (error) {
    // Si la tabla aún no tiene datos o no hay conexión inmediata, proveemos valores por defecto para previsualizar
    especialidades = [
      { id_especialidad: 1, nombre: 'Desarrollo de Software' },
      { id_especialidad: 2, nombre: 'Administrativo Contable' },
      { id_especialidad: 3, nombre: 'Atención Primaria en Salud' },
      { id_especialidad: 4, nombre: 'Educación Media General' }
    ];
  }

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8">
      <FormCompletarPerfilDocente especialidades={especialidades} />
    </div>
  );
}
