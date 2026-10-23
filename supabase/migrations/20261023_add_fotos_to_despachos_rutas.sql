-- Migración: Agregar columna fotos a despachos_rutas para permitir evidencias fotográficas de la ruta completa
-- Fecha: 2026-10-23

ALTER TABLE public.despachos_rutas
ADD COLUMN IF NOT EXISTS fotos TEXT[] DEFAULT '{}';

COMMENT ON COLUMN public.despachos_rutas.fotos IS 'URLs de fotografías o evidencias de la ruta completa (ej. carga del vehículo, odómetro, etc.)';
