import { getTranslations } from 'next-intl/server';
import { getSecciones, getCiclosAbiertos } from '@/app/actions/secciones';
import { getEspecialidadesActivas, getDocentes } from '@/app/actions/docentes';
import { requirePermiso } from '@/lib/session';
import { DataTable, type DataTableRow } from '@/components/ui/data-table';
import { Badge, TONO_CICLO } from '@/components/ui/badge';
import { FormSeccion } from './form-seccion';

export const metadata = {
  title: 'Secciones | SCAD-INTESS',
  description: 'Gestión de secciones por ciclo escolar'
};

export const dynamic = 'force-dynamic';

export default async function SeccionesPage() {
  const [t, secciones, especialidades, ciclos, docentes, editor] = await Promise.all([
    getTranslations('secciones'),
    getSecciones(),
    getEspecialidadesActivas(),
    getCiclosAbiertos(),
    getDocentes(true),
    requirePermiso('config.catalogos'),
  ]);
  const puedeEditar = Boolean(editor);

  const rows: DataTableRow[] = secciones.map((s) => ({
    key: String(s.id_seccion),
    cells: [
      <span key="c">{s.ciclo_anio} <Badge tono={TONO_CICLO[s.ciclo_estado]}>{s.ciclo_estado}</Badge></span>,
      `${s.grado}°`,
      <span key="n" className="font-medium">{s.nombre}</span>,
      s.especialidad_nombre,
      s.docente_guia ?? '—',
      `${s.vigentes} / ${s.capacidad_max}`,
      puedeEditar && s.ciclo_estado !== 'Cerrado' ? (
        <FormSeccion
          key="e"
          especialidades={especialidades}
          ciclos={ciclos}
          docentes={docentes}
          seccion={s}
          trigger={t('editar')}
          triggerClassName="text-blue-600 hover:underline dark:text-blue-400 text-sm font-medium bg-transparent p-0"
        />
      ) : null,
    ],
    sort: [s.ciclo_anio, s.grado, s.nombre, s.especialidad_nombre, s.docente_guia, s.vigentes, null],
    search: `${s.ciclo_anio} ${s.grado} ${s.nombre} ${s.especialidad_nombre} ${s.docente_guia ?? ''}`,
  }));

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{t('title')}</h1>
        {puedeEditar && <FormSeccion especialidades={especialidades} ciclos={ciclos} docentes={docentes} trigger={t('nueva')} />}
      </div>

      <DataTable
        columns={[
          { header: t('colCiclo'), sortable: true },
          { header: t('colGrado'), sortable: true },
          { header: t('colSeccion'), sortable: true },
          { header: t('colEspecialidad'), sortable: true },
          { header: t('colDocenteGuia'), sortable: true },
          { header: t('colOcupacion'), sortable: true },
          { header: t('colAcciones') },
        ]}
        rows={rows}
        emptyText={t('empty')}
        defaultSort={{ column: 0, dir: 'desc' }}
      />
    </div>
  );
}
