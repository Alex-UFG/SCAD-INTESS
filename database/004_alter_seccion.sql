-- SCAD-INTESS: Actualización de Estructura (Dev 3)
-- Agrega el estado de activación a las secciones para permitir desactivarlas.
-- Por Osarsik Mejia.


USE scad_intess;

ALTER TABLE seccion 
ADD COLUMN activa BOOLEAN NOT NULL DEFAULT TRUE;