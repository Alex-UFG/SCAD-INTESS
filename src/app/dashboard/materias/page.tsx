import { getTranslations } from 'next-intl/server';
import { getMaterias, toggleMateriaActiva } from '@/app/actions/materias';
import { getEspecialidadesActivas } from '@/app/actions/docentes';
import { requirePermiso } from '@/lib/permisos';
import { RowsTable, type RowsTableRow } from '@/components/ui/rows-table';
import { Badge } from '@/components/ui/badge';
import { ActionButton } from '@/components/ui/action-button';
import { FormMateria } from './form-materia';

export const dynamic = 'force-dynamic';

export default async function MateriasPage() {
  const [t, materias, especialidades, editor] = await Promise.all([
    getTranslations('materias'),
    getMaterias(),
    getEspecialidadesActivas(),
    requirePermiso('config.catalogos'),
  ]);
  const puedeEditar = Boolean(editor);
  const linkClass = 'text-intess hover:underline dark:text-intess-accent text-sm font-medium bg-transparent p-0';

  const rows: RowsTableRow[] = materias.map((m) => ({
    key: m.cod_materia,
    cells: [
      <span key="c" className="font-mono">{m.cod_materia}</span>,
      m.nombre,
      m.especialidad_nombre,
      `${m.grado}°`,
      m.unidades_valorativas,
      <Badge key="a" tono={m.activa ? 'verde' : 'gris'}>{t(m.activa ? 'activa' : 'inactiva')}</Badge>,
      m.cargas,
      puedeEditar ? (
        <span key="x" className="flex flex-wrap gap-2">
          <FormMateria especialidades={especialidades} materia={m} trigger={t('editar')} triggerClassName={linkClass} />
          <ActionButton
            action={toggleMateriaActiva}
            fields={{ cod_materia: m.cod_materia, activa: m.activa ? '0' : '1' }}
            label={t(m.activa ? 'desactivar' : 'activar')}
            danger={m.activa}
            confirm={m.activa ? { title: t('desactivar'), text: t('confirmarDesactivar', { nombre: m.nombre }) } : undefined}
          />
        </span>
      ) : null,
    ],
    sort: [m.cod_materia, m.nombre, m.especialidad_nombre, m.grado, m.unidades_valorativas, m.activa ? 1 : 0, m.cargas, null],
    search: `${m.cod_materia} ${m.nombre} ${m.especialidad_nombre} ${m.grado}`,
  }));

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-intess-dark dark:text-slate-100">{t('title')}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('subtitle')}</p>
        </div>
        {puedeEditar && <FormMateria especialidades={especialidades} trigger={t('nueva')} />}
      </div>

      <RowsTable
        columns={[
          { header: t('colCodigo'), sortable: true },
          { header: t('colNombre'), sortable: true },
          { header: t('colEspecialidad'), sortable: true },
          { header: t('colGrado'), sortable: true },
          { header: t('colUnidades'), sortable: true, align: 'right' },
          { header: t('colEstado'), sortable: true },
          { header: t('colCargas'), sortable: true, align: 'right' },
          { header: t('colAcciones') },
        ]}
        rows={rows}
        emptyText={t('empty')}
        defaultSort={{ column: 3, dir: 'asc' }}
      />
    </div>
  );
}
