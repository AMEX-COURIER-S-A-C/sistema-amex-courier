-- Migración: Hacer que la columna 'tracking' sea NULLABLE con DEFAULT NULL
-- Solución: Permite registrar paquetes manuales (Inventario) o ingresados por pistola/escáner
-- cuando aún no se dispone de un número de tracking o solo se tiene la guía WR.

ALTER TABLE public.paquetes ALTER COLUMN tracking DROP NOT NULL;
ALTER TABLE public.paquetes ALTER COLUMN tracking SET DEFAULT NULL;
