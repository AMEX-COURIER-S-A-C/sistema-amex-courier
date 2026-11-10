ALTER TABLE private.inventario_tib_diario_history
  ADD COLUMN IF NOT EXISTS r2_deleted_at timestamptz;

GRANT SELECT, INSERT, UPDATE ON TABLE private.inventario_tib_diario_history TO service_role;

-- The initial same-day objects were already checked and removed from R2.
UPDATE private.inventario_tib_diario_history
SET r2_deleted_at = COALESCE(r2_deleted_at, now())
WHERE r2_key IN (
  'FOLDER AMEX/inventario-tib/diario/2026-11-05/delivered.xlsx',
  'FOLDER AMEX/inventario-tib/diario/2026-11-05/sent.xlsx',
  'FOLDER AMEX/inventario-tib/diario/2026-11-05/received.xlsx'
);

CREATE OR REPLACE FUNCTION public.get_tib_report_history_cleanup_keys()
RETURNS TABLE(r2_key text)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = pg_catalog, public, private, pg_temp
AS $function$
  SELECT history.r2_key
  FROM private.inventario_tib_diario_history AS history
  WHERE history.r2_deleted_at IS NULL;
$function$;

CREATE OR REPLACE FUNCTION public.mark_tib_report_history_r2_keys_deleted(p_keys text[])
RETURNS integer
LANGUAGE sql
SECURITY INVOKER
SET search_path = pg_catalog, public, private, pg_temp
AS $function$
  WITH changed AS (
    UPDATE private.inventario_tib_diario_history AS history
    SET r2_deleted_at = now()
    WHERE history.r2_key = ANY(COALESCE(p_keys, ARRAY[]::text[]))
      AND history.r2_deleted_at IS NULL
    RETURNING 1
  )
  SELECT count(*)::integer FROM changed;
$function$;

COMMENT ON FUNCTION public.get_tib_report_history_cleanup_keys()
IS 'Devuelve claves de versiones TIB archivadas cuyos objetos R2 todavía deben limpiarse.';

COMMENT ON FUNCTION public.mark_tib_report_history_r2_keys_deleted(text[])
IS 'Marca como eliminadas de R2 las claves históricas TIB cuya limpieza confirmó el Worker.';

REVOKE ALL ON FUNCTION public.get_tib_report_history_cleanup_keys() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mark_tib_report_history_r2_keys_deleted(text[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_tib_report_history_cleanup_keys() TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_tib_report_history_r2_keys_deleted(text[]) TO service_role;
