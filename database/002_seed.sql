-- ============================================================================
-- SCAD-INTESS - Datos semilla estructurales
-- Script: 002_seed.sql
-- Motor:  MySQL 8.0+
-- Requiere: 001_schema.sql ejecutado previamente.
-- Autor: Alex Cortez
-- ============================================================================

USE scad_intess;

-- ============================================================================
-- ROLES
-- ============================================================================

INSERT INTO rol (id_rol, nombre, descripcion) VALUES
  (1, 'Admin',       'Administrador del sistema: gestion total, usuarios y auditoria'),
  (2, 'Director',    'Direccion General: aprobaciones, reportes globales, resolucion disciplinaria'),
  (3, 'Coordinador', 'Coordinacion de Disciplina y Orientacion: gestion disciplinaria completa'),
  (4, 'Secretaria',  'Secretaria Academica: matriculas, expedientes, generacion de reportes'),
  (5, 'Docente',     'Cuerpo docente: notas y asistencia de su carga academica, reporte de incidencias');

-- ============================================================================
-- PERMISOS (codigo = modulo.accion)
-- ============================================================================

INSERT INTO permiso (codigo, descripcion, modulo) VALUES
  -- Usuarios y seguridad
  ('usuarios.ver',            'Ver listado y detalle de usuarios',                  'usuarios'),
  ('usuarios.crear',          'Crear usuarios y asignar roles',                     'usuarios'),
  ('usuarios.editar',         'Editar usuarios, cambiar estado y rol',              'usuarios'),
  ('usuarios.desactivar',     'Desactivar o bloquear usuarios',                     'usuarios'),

  -- Matricula y expedientes
  ('matricula.ver',           'Consultar expedientes y matriculas',                 'matricula'),
  ('matricula.crear',         'Procesar nuevas matriculas',                         'matricula'),
  ('matricula.editar',        'Actualizar datos de expediente y matricula',         'matricula'),
  ('matricula.retirar',       'Registrar retiros y traslados',                      'matricula'),

  -- Notas
  ('notas.ver',               'Consultar calificaciones',                           'notas'),
  ('notas.registrar',         'Ingresar y editar notas de su carga academica',      'notas'),
  ('notas.editar_bloqueada',  'Modificar notas bloqueadas (autorizacion especial)', 'notas'),

  -- Asistencia
  ('asistencia.ver',          'Consultar registros de asistencia',                  'asistencia'),
  ('asistencia.registrar',    'Tomar asistencia de su carga academica',             'asistencia'),

  -- Disciplina
  ('disciplina.ver',          'Consultar historial disciplinario',                  'disciplina'),
  ('disciplina.reportar',     'Registrar incidencias',                              'disciplina'),
  ('disciplina.resolver',     'Resolver incidencias graves y aplicar sanciones',    'disciplina'),
  ('disciplina.citar',        'Emitir y gestionar citaciones a tutores',            'disciplina'),

  -- Reportes
  ('reportes.boleta',         'Generar boleta de calificaciones (REP-01)',          'reportes'),
  ('reportes.conductual',     'Generar certificado conductual (REP-02)',            'reportes'),
  ('reportes.constancia',     'Generar constancia de matricula (REP-03)',           'reportes'),
  ('reportes.consolidado',    'Generar reporte gerencial consolidado',              'reportes'),

  -- Configuracion academica
  ('config.catalogos',        'Gestionar especialidades, materias y secciones',     'configuracion'),
  ('config.ciclos',           'Gestionar ciclos escolares y periodos evaluativos',  'configuracion'),
  ('config.carga',            'Asignar carga academica a docentes',                 'configuracion'),

  -- Auditoria
  ('auditoria.ver',           'Consultar bitacora de auditoria',                    'auditoria');

-- ============================================================================
-- ROL_PERMISO
-- ============================================================================

-- Admin: todos los permisos
INSERT INTO rol_permiso (id_rol, id_permiso)
SELECT 1, id_permiso FROM permiso;

-- Director: todo excepto gestion de usuarios (crear/editar/desactivar) y config de catalogos
INSERT INTO rol_permiso (id_rol, id_permiso)
SELECT 2, id_permiso FROM permiso
WHERE codigo IN (
  'usuarios.ver',
  'matricula.ver',
  'notas.ver', 'notas.editar_bloqueada',
  'asistencia.ver',
  'disciplina.ver', 'disciplina.reportar', 'disciplina.resolver', 'disciplina.citar',
  'reportes.boleta', 'reportes.conductual', 'reportes.constancia', 'reportes.consolidado',
  'config.ciclos', 'config.carga',
  'auditoria.ver'
);

-- Coordinador (Disciplina y Orientacion)
INSERT INTO rol_permiso (id_rol, id_permiso)
SELECT 3, id_permiso FROM permiso
WHERE codigo IN (
  'matricula.ver',
  'notas.ver',
  'asistencia.ver',
  'disciplina.ver', 'disciplina.reportar', 'disciplina.resolver', 'disciplina.citar',
  'reportes.conductual'
);

-- Secretaria Academica
INSERT INTO rol_permiso (id_rol, id_permiso)
SELECT 4, id_permiso FROM permiso
WHERE codigo IN (
  'matricula.ver', 'matricula.crear', 'matricula.editar', 'matricula.retirar',
  'notas.ver',
  'asistencia.ver',
  'reportes.boleta', 'reportes.constancia',
  'config.catalogos', 'config.carga'
);

-- Docente
INSERT INTO rol_permiso (id_rol, id_permiso)
SELECT 5, id_permiso FROM permiso
WHERE codigo IN (
  'notas.ver', 'notas.registrar',
  'asistencia.ver', 'asistencia.registrar',
  'disciplina.reportar'
);

-- ============================================================================
-- ESPECIALIDADES
-- ============================================================================

INSERT INTO especialidad (nombre) VALUES
  ('Bachillerato General'),
  ('Desarrollo de Software'),
  ('Administrativo Contable'),
  ('Electronica');

-- ============================================================================
-- CICLO ESCOLAR Y PERIODOS EVALUATIVOS
-- ============================================================================

INSERT INTO ciclo_escolar (anio, fecha_inicio, fecha_fin, estado) VALUES
  (2026, '2026-01-19', '2026-11-06', 'Activo');

INSERT INTO periodo_evaluativo (id_ciclo, numero, fecha_inicio, fecha_cierre, estado) VALUES
  (1, 1, '2026-01-19', '2026-04-24', 'Cerrado'),
  (1, 2, '2026-04-27', '2026-07-31', 'Abierto'),
  (1, 3, '2026-08-03', '2026-11-06', 'Pendiente');

-- ============================================================================
-- USUARIO ADMINISTRADOR INICIAL
-- ============================================================================
-- Password temporal: Admin2026!

INSERT INTO usuario (email, password_hash, id_rol, estado) VALUES
  ('admin@intess.edu.sv', '$2b$10$/mPXcJyZz3Grl84vJEcrAOs8OsNuiJ6PQzplrafvNBQMpnkDhUJK2', 1, 'Activo');
