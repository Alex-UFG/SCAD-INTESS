-- ============================================================================
-- SCAD-INTESS - Esquema de Base de Datos
-- Script: 001_schema.sql
-- Motor:  MySQL 8.0+
-- Nota:   Solo estructura (tablas, FKs, indices)
-- Autor: Alex Cortez
-- ============================================================================

CREATE DATABASE IF NOT EXISTS scad_intess
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE scad_intess;

-- ============================================================================
-- MODULO: SEGURIDAD Y USUARIOS
-- ============================================================================

CREATE TABLE rol (
  id_rol        TINYINT UNSIGNED  NOT NULL AUTO_INCREMENT,
  nombre        VARCHAR(50)       NOT NULL,
  descripcion   VARCHAR(200)      NULL,
  activo        BOOLEAN           NOT NULL DEFAULT TRUE,
  PRIMARY KEY (id_rol),
  UNIQUE KEY uq_rol_nombre (nombre)
) ENGINE=InnoDB;

CREATE TABLE permiso (
  id_permiso    SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  codigo        VARCHAR(60)       NOT NULL,   -- ej: notas.editar, reportes.generar
  descripcion   VARCHAR(200)      NULL,
  modulo        VARCHAR(50)       NOT NULL,   -- ej: matricula, notas, disciplina
  PRIMARY KEY (id_permiso),
  UNIQUE KEY uq_permiso_codigo (codigo),
  KEY idx_permiso_modulo (modulo)
) ENGINE=InnoDB;

CREATE TABLE rol_permiso (
  id_rol        TINYINT UNSIGNED  NOT NULL,
  id_permiso    SMALLINT UNSIGNED NOT NULL,
  PRIMARY KEY (id_rol, id_permiso),
  CONSTRAINT fk_rolpermiso_rol
    FOREIGN KEY (id_rol) REFERENCES rol (id_rol)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_rolpermiso_permiso
    FOREIGN KEY (id_permiso) REFERENCES permiso (id_permiso)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE usuario (
  id_usuario        INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  email             VARCHAR(100)    NOT NULL,   -- correo institucional (login)
  password_hash     VARCHAR(255)    NOT NULL,   -- bcrypt
  id_rol            TINYINT UNSIGNED NOT NULL,
  estado            ENUM('Activo','Inactivo','Bloqueado') NOT NULL DEFAULT 'Activo',
  ultimo_acceso     DATETIME        NULL,
  creado_en         DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP
                                    ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_usuario),
  UNIQUE KEY uq_usuario_email (email),
  KEY idx_usuario_rol (id_rol),
  KEY idx_usuario_estado (estado),
  CONSTRAINT fk_usuario_rol
    FOREIGN KEY (id_rol) REFERENCES rol (id_rol)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;


CREATE TABLE usuario_preferencia (
  id_usuario    INT UNSIGNED  NOT NULL,
  clave         VARCHAR(50)   NOT NULL,   -- ej: tema, idioma, notif_email
  valor         VARCHAR(255)  NOT NULL,
  PRIMARY KEY (id_usuario, clave),
  CONSTRAINT fk_pref_usuario
    FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;


CREATE TABLE sesion (
  id_sesion     CHAR(36)      NOT NULL,   -- UUID
  id_usuario    INT UNSIGNED  NOT NULL,
  ip_origen     VARCHAR(45)   NOT NULL,   -- IPv4/IPv6
  user_agent    VARCHAR(255)  NULL,
  iniciada_en   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expira_en     DATETIME      NOT NULL,
  cerrada_en    DATETIME      NULL,
  PRIMARY KEY (id_sesion),
  KEY idx_sesion_usuario (id_usuario),
  KEY idx_sesion_expira (expira_en),
  CONSTRAINT fk_sesion_usuario
    FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================================
-- MODULO: CATALOGOS Y ESTRUCTURA ACADEMICA
-- ============================================================================

CREATE TABLE especialidad (
  id_especialidad TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre          VARCHAR(100)     NOT NULL,  -- Software, Contable, Electronica, General
  activa          BOOLEAN          NOT NULL DEFAULT TRUE,
  PRIMARY KEY (id_especialidad),
  UNIQUE KEY uq_especialidad_nombre (nombre)
) ENGINE=InnoDB;

CREATE TABLE ciclo_escolar (
  id_ciclo      SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  anio          YEAR              NOT NULL,
  fecha_inicio  DATE              NOT NULL,
  fecha_fin     DATE              NOT NULL,
  estado        ENUM('Planificado','Activo','Cerrado') NOT NULL DEFAULT 'Planificado',
  PRIMARY KEY (id_ciclo),
  UNIQUE KEY uq_ciclo_anio (anio),
  KEY idx_ciclo_estado (estado)
) ENGINE=InnoDB;

CREATE TABLE periodo_evaluativo (
  id_periodo    SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_ciclo      SMALLINT UNSIGNED NOT NULL,
  numero        TINYINT UNSIGNED  NOT NULL,  -- 1, 2, 3 (trimestre)
  fecha_inicio  DATE              NOT NULL,
  fecha_cierre  DATE              NOT NULL,
  estado        ENUM('Pendiente','Abierto','Cerrado') NOT NULL DEFAULT 'Pendiente',
  PRIMARY KEY (id_periodo),
  UNIQUE KEY uq_periodo_ciclo_numero (id_ciclo, numero),
  KEY idx_periodo_estado (estado),
  CONSTRAINT fk_periodo_ciclo
    FOREIGN KEY (id_ciclo) REFERENCES ciclo_escolar (id_ciclo)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ============================================================================
-- MODULO: PERSONAS
-- ============================================================================

CREATE TABLE docente (
  dui_docente       CHAR(10)      NOT NULL,   -- formato 00000000-0
  id_usuario        INT UNSIGNED  NOT NULL,   -- 1:1 con usuario
  primer_nombre     VARCHAR(50)   NOT NULL,
  segundo_nombre    VARCHAR(50)   NULL,
  primer_apellido   VARCHAR(50)   NOT NULL,
  segundo_apellido  VARCHAR(50)   NULL,
  id_especialidad   TINYINT UNSIGNED NULL,
  telefono          VARCHAR(15)   NULL,
  estado            ENUM('Activo','Inactivo','Licencia') NOT NULL DEFAULT 'Activo',
  fecha_ingreso     DATE          NOT NULL,
  PRIMARY KEY (dui_docente),
  UNIQUE KEY uq_docente_usuario (id_usuario),
  KEY idx_docente_apellido (primer_apellido, primer_nombre),
  KEY idx_docente_estado (estado),
  KEY idx_docente_especialidad (id_especialidad),
  CONSTRAINT fk_docente_usuario
    FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_docente_especialidad
    FOREIGN KEY (id_especialidad) REFERENCES especialidad (id_especialidad)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE estudiante (
  nie               INT UNSIGNED  NOT NULL,   -- Numero de Identificacion Escolar (MINED)
  primer_nombre     VARCHAR(50)   NOT NULL,
  segundo_nombre    VARCHAR(50)   NULL,
  primer_apellido   VARCHAR(50)   NOT NULL,
  segundo_apellido  VARCHAR(50)   NULL,
  fecha_nacimiento  DATE          NOT NULL,
  genero            ENUM('M','F') NOT NULL,
  direccion         VARCHAR(200)  NULL,
  foto_url          VARCHAR(255)  NULL,
  estado            ENUM('Activo','Inactivo','Retirado','Egresado') NOT NULL DEFAULT 'Activo',
  creado_en         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (nie),
  KEY idx_estudiante_apellido (primer_apellido, primer_nombre),
  KEY idx_estudiante_estado (estado)
) ENGINE=InnoDB;

CREATE TABLE tutor (
  dui_tutor         CHAR(10)      NOT NULL,   -- formato 00000000-0
  primer_nombre     VARCHAR(50)   NOT NULL,
  segundo_nombre    VARCHAR(50)   NULL,
  primer_apellido   VARCHAR(50)   NOT NULL,
  segundo_apellido  VARCHAR(50)   NULL,
  telefono_principal VARCHAR(15)  NOT NULL,
  telefono_alterno  VARCHAR(15)   NULL,
  email             VARCHAR(100)  NULL,
  ocupacion         VARCHAR(100)  NULL,
  PRIMARY KEY (dui_tutor),
  KEY idx_tutor_apellido (primer_apellido, primer_nombre)
) ENGINE=InnoDB;

CREATE TABLE estudiante_tutor (
  nie                 INT UNSIGNED  NOT NULL,
  dui_tutor           CHAR(10)      NOT NULL,
  parentesco          ENUM('Padre','Madre','Abuelo','Abuela','Tio','Tia','Hermano','Hermana','Encargado') NOT NULL,
  contacto_principal  BOOLEAN       NOT NULL DEFAULT FALSE,
  PRIMARY KEY (nie, dui_tutor),
  KEY idx_esttutor_tutor (dui_tutor),
  CONSTRAINT fk_esttutor_estudiante
    FOREIGN KEY (nie) REFERENCES estudiante (nie)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_esttutor_tutor
    FOREIGN KEY (dui_tutor) REFERENCES tutor (dui_tutor)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ============================================================================
-- MODULO: ESTRUCTURA ACADEMICA (dependiente de personas/catalogos)
-- ============================================================================

CREATE TABLE materia (
  cod_materia       VARCHAR(8)        NOT NULL,   -- ej: SW-003, MAT-001
  nombre            VARCHAR(100)      NOT NULL,
  unidades_valorativas TINYINT UNSIGNED NOT NULL DEFAULT 1,
  id_especialidad   TINYINT UNSIGNED  NOT NULL,
  grado             TINYINT UNSIGNED  NOT NULL,   -- 1, 2, 3
  activa            BOOLEAN           NOT NULL DEFAULT TRUE,
  PRIMARY KEY (cod_materia),
  KEY idx_materia_especialidad_grado (id_especialidad, grado),
  KEY idx_materia_nombre (nombre),
  CONSTRAINT fk_materia_especialidad
    FOREIGN KEY (id_especialidad) REFERENCES especialidad (id_especialidad)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE seccion (
  id_seccion        INT UNSIGNED      NOT NULL AUTO_INCREMENT,
  nombre            VARCHAR(10)       NOT NULL,   -- ej: A, B, C
  grado             TINYINT UNSIGNED  NOT NULL,   -- 1, 2, 3
  id_especialidad   TINYINT UNSIGNED  NOT NULL,
  id_ciclo          SMALLINT UNSIGNED NOT NULL,
  dui_docente_guia  CHAR(10)          NULL,
  capacidad_max     TINYINT UNSIGNED  NOT NULL DEFAULT 40,
  PRIMARY KEY (id_seccion),
  UNIQUE KEY uq_seccion (id_ciclo, grado, id_especialidad, nombre),
  KEY idx_seccion_docente_guia (dui_docente_guia),
  CONSTRAINT fk_seccion_especialidad
    FOREIGN KEY (id_especialidad) REFERENCES especialidad (id_especialidad)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_seccion_ciclo
    FOREIGN KEY (id_ciclo) REFERENCES ciclo_escolar (id_ciclo)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_seccion_docente_guia
    FOREIGN KEY (dui_docente_guia) REFERENCES docente (dui_docente)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE carga_academica (
  id_carga      INT UNSIGNED      NOT NULL AUTO_INCREMENT,
  dui_docente   CHAR(10)          NOT NULL,
  cod_materia   VARCHAR(8)        NOT NULL,
  id_seccion    INT UNSIGNED      NOT NULL,
  id_ciclo      SMALLINT UNSIGNED NOT NULL,
  PRIMARY KEY (id_carga),
  UNIQUE KEY uq_carga (dui_docente, cod_materia, id_seccion, id_ciclo),
  KEY idx_carga_docente_ciclo (dui_docente, id_ciclo),
  KEY idx_carga_seccion (id_seccion),
  KEY idx_carga_materia (cod_materia),
  CONSTRAINT fk_carga_docente
    FOREIGN KEY (dui_docente) REFERENCES docente (dui_docente)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_carga_materia
    FOREIGN KEY (cod_materia) REFERENCES materia (cod_materia)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_carga_seccion
    FOREIGN KEY (id_seccion) REFERENCES seccion (id_seccion)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_carga_ciclo
    FOREIGN KEY (id_ciclo) REFERENCES ciclo_escolar (id_ciclo)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ============================================================================
-- MODULO: OPERACION ACADEMICA
-- ============================================================================

CREATE TABLE matricula (
  id_matricula    INT UNSIGNED      NOT NULL AUTO_INCREMENT,
  nie             INT UNSIGNED      NOT NULL,
  id_seccion      INT UNSIGNED      NOT NULL,
  id_ciclo        SMALLINT UNSIGNED NOT NULL,
  fecha_matricula DATE              NOT NULL,
  estado          ENUM('Vigente','Retirado','Trasladado') NOT NULL DEFAULT 'Vigente',
  observaciones   VARCHAR(500)      NULL,
  registrada_por  INT UNSIGNED      NOT NULL,   -- usuario que proceso
  PRIMARY KEY (id_matricula),
  UNIQUE KEY uq_matricula_estudiante_ciclo (nie, id_ciclo),
  KEY idx_matricula_seccion (id_seccion),
  KEY idx_matricula_ciclo_estado (id_ciclo, estado),
  CONSTRAINT fk_matricula_estudiante
    FOREIGN KEY (nie) REFERENCES estudiante (nie)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_matricula_seccion
    FOREIGN KEY (id_seccion) REFERENCES seccion (id_seccion)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_matricula_ciclo
    FOREIGN KEY (id_ciclo) REFERENCES ciclo_escolar (id_ciclo)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_matricula_usuario
    FOREIGN KEY (registrada_por) REFERENCES usuario (id_usuario)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE nota (
  id_nota           BIGINT UNSIGNED   NOT NULL AUTO_INCREMENT,
  nie               INT UNSIGNED      NOT NULL,
  cod_materia       VARCHAR(8)        NOT NULL,
  id_periodo        SMALLINT UNSIGNED NOT NULL,
  nota_act1         DECIMAL(4,2)      NULL,      -- 0.00-10.00 (valida app)
  nota_act2         DECIMAL(4,2)      NULL,
  nota_examen       DECIMAL(4,2)      NULL,
  promedio          DECIMAL(4,2)      NULL,      -- calculado, no editable
  riesgo_academico  BOOLEAN           NOT NULL DEFAULT FALSE,  -- promedio < 6.00
  dui_docente       CHAR(10)          NOT NULL,  -- quien registro
  bloqueada         BOOLEAN           NOT NULL DEFAULT FALSE,  -- 72h post-cierre
  registrada_en     DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizada_en    DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP
                                      ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_nota),
  UNIQUE KEY uq_nota (nie, cod_materia, id_periodo),
  KEY idx_nota_materia_periodo (cod_materia, id_periodo),
  KEY idx_nota_riesgo (id_periodo, riesgo_academico),
  KEY idx_nota_docente (dui_docente),
  CONSTRAINT fk_nota_estudiante
    FOREIGN KEY (nie) REFERENCES estudiante (nie)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_nota_materia
    FOREIGN KEY (cod_materia) REFERENCES materia (cod_materia)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_nota_periodo
    FOREIGN KEY (id_periodo) REFERENCES periodo_evaluativo (id_periodo)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_nota_docente
    FOREIGN KEY (dui_docente) REFERENCES docente (dui_docente)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE asistencia (
  id_asistencia BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nie           INT UNSIGNED    NOT NULL,
  cod_materia   VARCHAR(8)      NOT NULL,
  fecha         DATE            NOT NULL,
  estado        ENUM('Presente','Ausente','Tardanza','Justificado') NOT NULL,
  observacion   VARCHAR(200)    NULL,
  dui_docente   CHAR(10)        NOT NULL,
  PRIMARY KEY (id_asistencia),
  UNIQUE KEY uq_asistencia (nie, cod_materia, fecha),
  KEY idx_asistencia_fecha (fecha),
  KEY idx_asistencia_materia_fecha (cod_materia, fecha),
  KEY idx_asistencia_estado (estado),
  CONSTRAINT fk_asistencia_estudiante
    FOREIGN KEY (nie) REFERENCES estudiante (nie)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_asistencia_materia
    FOREIGN KEY (cod_materia) REFERENCES materia (cod_materia)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_asistencia_docente
    FOREIGN KEY (dui_docente) REFERENCES docente (dui_docente)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ============================================================================
-- MODULO: DISCIPLINARIO
-- ============================================================================

CREATE TABLE incidencia (
  id_incidencia     BIGINT UNSIGNED   NOT NULL AUTO_INCREMENT,
  nie               INT UNSIGNED      NOT NULL,
  id_periodo        SMALLINT UNSIGNED NOT NULL,  -- para escalamiento por trimestre
  fecha_incidencia  DATE              NOT NULL,
  hora_incidencia   TIME              NULL,
  tipo_falta        ENUM('Leve','Grave','Muy Grave') NOT NULL,
  escalada_auto     BOOLEAN           NOT NULL DEFAULT FALSE,  -- 3ra leve -> Grave
  descripcion       TEXT              NOT NULL,
  resolucion        TEXT              NULL,      -- correctivos/acuerdos/compromisos
  dui_reportante    CHAR(10)          NOT NULL,
  dui_resolutor     CHAR(10)          NULL,      -- directivo (Grave/Muy Grave)
  estado            ENUM('Abierta','En_Proceso','Resuelta','Apelada') NOT NULL DEFAULT 'Abierta',
  registrada_en     DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_incidencia),
  KEY idx_incidencia_estudiante_periodo (nie, id_periodo, tipo_falta),
  KEY idx_incidencia_fecha (fecha_incidencia),
  KEY idx_incidencia_estado (estado),
  KEY idx_incidencia_reportante (dui_reportante),
  KEY idx_incidencia_resolutor (dui_resolutor),
  CONSTRAINT fk_incidencia_estudiante
    FOREIGN KEY (nie) REFERENCES estudiante (nie)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_incidencia_periodo
    FOREIGN KEY (id_periodo) REFERENCES periodo_evaluativo (id_periodo)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_incidencia_reportante
    FOREIGN KEY (dui_reportante) REFERENCES docente (dui_docente)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_incidencia_resolutor
    FOREIGN KEY (dui_resolutor) REFERENCES docente (dui_docente)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE evidencia_incidencia (
  id_evidencia    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_incidencia   BIGINT UNSIGNED NOT NULL,
  archivo_ruta    VARCHAR(255)    NOT NULL,  -- ruta interna en /uploads
  archivo_nombre  VARCHAR(150)    NOT NULL,  -- nombre original
  mime_type       VARCHAR(80)     NOT NULL,  -- application/pdf, image/jpeg...
  subida_por      INT UNSIGNED    NOT NULL,  -- usuario
  subida_en       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_evidencia),
  KEY idx_evidencia_incidencia (id_incidencia),
  CONSTRAINT fk_evidencia_incidencia
    FOREIGN KEY (id_incidencia) REFERENCES incidencia (id_incidencia)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_evidencia_usuario
    FOREIGN KEY (subida_por) REFERENCES usuario (id_usuario)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE citacion (
  id_citacion     BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_incidencia   BIGINT UNSIGNED NOT NULL,
  dui_tutor       CHAR(10)        NOT NULL,
  fecha_emision   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_citacion  DATETIME        NOT NULL,  -- fecha/hora de la reunion
  estado          ENUM('Emitida','Entregada','Atendida','No_Asistio') NOT NULL DEFAULT 'Emitida',
  observaciones   VARCHAR(500)    NULL,
  PRIMARY KEY (id_citacion),
  KEY idx_citacion_incidencia (id_incidencia),
  KEY idx_citacion_tutor (dui_tutor),
  KEY idx_citacion_estado (estado),
  CONSTRAINT fk_citacion_incidencia
    FOREIGN KEY (id_incidencia) REFERENCES incidencia (id_incidencia)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_citacion_tutor
    FOREIGN KEY (dui_tutor) REFERENCES tutor (dui_tutor)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ============================================================================
-- MODULO: SISTEMA
-- ============================================================================

CREATE TABLE notificacion (
  id_notificacion BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_usuario      INT UNSIGNED    NOT NULL,  -- destinatario
  tipo            ENUM('Riesgo_Academico','Reincidencia','Citacion','Cierre_Periodo','Sistema') NOT NULL,
  titulo          VARCHAR(150)    NOT NULL,
  mensaje         VARCHAR(500)    NOT NULL,
  referencia_tipo VARCHAR(50)     NULL,      -- ej: incidencia, nota
  referencia_id   VARCHAR(50)     NULL,      -- id del registro relacionado
  leida           BOOLEAN         NOT NULL DEFAULT FALSE,
  creada_en       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_notificacion),
  KEY idx_notif_usuario_leida (id_usuario, leida, creada_en),
  KEY idx_notif_tipo (tipo),
  CONSTRAINT fk_notif_usuario
    FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE log_auditoria (
  id_log            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_usuario        INT UNSIGNED    NOT NULL,
  tabla_afectada    VARCHAR(50)     NOT NULL,
  id_registro       VARCHAR(50)     NOT NULL,
  tipo_accion       ENUM('INSERT','UPDATE','DELETE','LOGIN','LOGOUT') NOT NULL,
  datos_anteriores  JSON            NULL,
  datos_nuevos      JSON            NULL,
  ip_origen         VARCHAR(45)     NOT NULL,
  fecha_hora        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_log),
  KEY idx_log_usuario_fecha (id_usuario, fecha_hora),
  KEY idx_log_tabla_registro (tabla_afectada, id_registro),
  KEY idx_log_accion (tipo_accion),
  KEY idx_log_fecha (fecha_hora),
  CONSTRAINT fk_log_usuario
    FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ============================================================================
-- FIN DEL ESQUEMA - 24 tablas
-- ============================================================================