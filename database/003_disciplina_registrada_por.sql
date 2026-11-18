-- ============================================================================
-- SCAD-INTESS - Modulo de Disciplina
-- Script: 003_disciplina_registrada_por.sql
-- Motor:  MySQL 8.0+ / TiDB
-- Nota:   incidencia.dui_reportante exigia una fila en `docente`, pero el
--         perfil docente solo existe para el rol Docente: Coordinacion,
--         Direccion y Admin no podian registrar ni figurar como resolutores.
--         Se guarda el usuario (registrada_por / resuelta_por) y el DUI queda
--         como dato opcional, presente cuando el usuario tiene perfil docente.
-- ============================================================================

USE scad_intess;

ALTER TABLE incidencia MODIFY dui_reportante CHAR(10) NULL;

ALTER TABLE incidencia ADD COLUMN registrada_por INT UNSIGNED NULL AFTER dui_reportante;
ALTER TABLE incidencia ADD COLUMN resuelta_por INT UNSIGNED NULL AFTER dui_resolutor;

ALTER TABLE incidencia
  ADD CONSTRAINT fk_incidencia_registrada_por
    FOREIGN KEY (registrada_por) REFERENCES usuario (id_usuario)
    ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE incidencia
  ADD CONSTRAINT fk_incidencia_resuelta_por
    FOREIGN KEY (resuelta_por) REFERENCES usuario (id_usuario)
    ON UPDATE CASCADE ON DELETE RESTRICT;
