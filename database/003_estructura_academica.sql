=============================================================================
-- SCAD-INTESS: Script DDL Módulo Estructura Académica (Dev 3)
-- Motor: MySQL 8.0 / TiDB Cloud
=============================================================================

USE scad_intess;

-- 1. Tabla: especialidad
CREATE TABLE IF NOT EXISTS especialidad (
    id_especialidad TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    activa BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Tabla: ciclo_escolar
CREATE TABLE IF NOT EXISTS ciclo_escolar (
    id_ciclo SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    anio YEAR NOT NULL UNIQUE,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    estado ENUM('Planificado', 'Activo', 'Cerrado') NOT NULL DEFAULT 'Planificado'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Tabla: periodo_evaluativo
CREATE TABLE IF NOT EXISTS periodo_evaluativo (
    id_periodo SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_ciclo SMALLINT UNSIGNED NOT NULL,
    numero TINYINT UNSIGNED NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_cierre DATE NOT NULL,
    estado ENUM('Pendiente', 'Abierto', 'Cerrado') NOT NULL DEFAULT 'Pendiente',
    CONSTRAINT fk_periodo_ciclo FOREIGN KEY (id_ciclo) 
        REFERENCES ciclo_escolar (id_ciclo) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT uq_ciclo_periodo UNIQUE (id_ciclo, numero)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- 4. Tabla: materia
CREATE TABLE IF NOT EXISTS materia (
    cod_materia VARCHAR(8) PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    unidades_valorativas TINYINT UNSIGNED NOT NULL DEFAULT 1,
    id_especialidad TINYINT UNSIGNED NOT NULL,
    grado TINYINT UNSIGNED NOT NULL,
    activa BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_materia_especialidad FOREIGN KEY (id_especialidad)
        REFERENCES especialidad (id_especialidad) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Tabla: docente (Cierra Gap 1 al enlazar 1:1 con tabla usuario)
CREATE TABLE IF NOT EXISTS docente (
    dui_docente CHAR(10) PRIMARY KEY,
    id_usuario INT UNSIGNED NOT NULL UNIQUE,
    primer_nombre VARCHAR(50) NOT NULL,
    segundo_nombre VARCHAR(50) NULL,
    primer_apellido VARCHAR(50) NOT NULL,
    segundo_apellido VARCHAR(50) NULL,
    id_especialidad TINYINT UNSIGNED NULL,
    telefono VARCHAR(15) NULL,
    estado ENUM('Activo', 'Inactivo', 'Licencia') NOT NULL DEFAULT 'Activo',
    fecha_ingreso DATE NOT NULL,
    CONSTRAINT fk_docente_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuario (id_usuario) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_docente_especialidad FOREIGN KEY (id_especialidad)
        REFERENCES especialidad (id_especialidad) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Tabla: seccion
CREATE TABLE IF NOT EXISTS seccion (
    id_seccion INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(10) NOT NULL,
    grado TINYINT UNSIGNED NOT NULL,
    id_especialidad TINYINT UNSIGNED NOT NULL,
    id_ciclo SMALLINT UNSIGNED NOT NULL,
    dui_docente_guia CHAR(10) NULL,
    capacidad_max TINYINT UNSIGNED NOT NULL DEFAULT 40,
    CONSTRAINT fk_seccion_especialidad FOREIGN KEY (id_especialidad)
        REFERENCES especialidad (id_especialidad) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_seccion_ciclo FOREIGN KEY (id_ciclo)
        REFERENCES ciclo_escolar (id_ciclo) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_seccion_guia FOREIGN KEY (dui_docente_guia)
        REFERENCES docente (dui_docente) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT uq_seccion_ciclo_grado UNIQUE (nombre, grado, id_especialidad, id_ciclo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Tabla: carga_academica
CREATE TABLE IF NOT EXISTS carga_academica (
    id_carga INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    dui_docente CHAR(10) NOT NULL,
    cod_materia VARCHAR(8) NOT NULL,
    id_seccion INT UNSIGNED NOT NULL,
    id_ciclo SMALLINT UNSIGNED NOT NULL,
    CONSTRAINT fk_carga_docente FOREIGN KEY (dui_docente)
        REFERENCES docente (dui_docente) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_carga_materia FOREIGN KEY (cod_materia)
        REFERENCES materia (cod_materia) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_carga_seccion FOREIGN KEY (id_seccion)
        REFERENCES seccion (id_seccion) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_carga_ciclo FOREIGN KEY (id_ciclo)
        REFERENCES ciclo_escolar (id_ciclo) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT uq_carga_asignacion UNIQUE (dui_docente, cod_materia, id_seccion, id_ciclo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
