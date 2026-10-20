-- Migración: Índice Parcial Optimizado para Inventario Activo (En Almacén / Custodia)
-- Soporta escalabilidad hasta 100,000+ registros históricos ignorando paquetes entregados

CREATE INDEX IF NOT EXISTS idx_paquetes_activos_almacen
ON public.paquetes (estado_amex, creado_en DESC)
WHERE eliminado_en IS NULL AND estado_amex != 'entregado' AND ubicacion_actual != 'Entregado';

CREATE INDEX IF NOT EXISTS idx_paquetes_en_almacen_recibido
ON public.paquetes (creado_en DESC)
WHERE eliminado_en IS NULL AND (estado_amex = 'en_almacen' OR estado_amex = 'recibido');
