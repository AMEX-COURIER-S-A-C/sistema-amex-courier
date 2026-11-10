-- Atomically activate a complete daily set of TIB reports for the Hostinger worker.
-- The function is SECURITY INVOKER and executable only by service_role.
CREATE OR REPLACE FUNCTION public.publish_daily_tib_reports(
  p_fecha date,
  p_files jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
  v_file_count integer;
  v_distinct_types integer;
  v_distinct_keys integer;
  v_invalid_count integer;
  v_new_keys text[];
  v_old_keys text[];
  v_types text[] := ARRAY['delivered', 'sent', 'received'];
BEGIN
  IF p_fecha IS NULL THEN
    RAISE EXCEPTION 'p_fecha es obligatorio.' USING ERRCODE = '22023';
  END IF;

  IF jsonb_typeof(p_files) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'p_files debe ser un arreglo JSON.' USING ERRCODE = '22023';
  END IF;

  IF jsonb_array_length(p_files) <> 3 THEN
    RAISE EXCEPTION 'Se requieren exactamente tres reportes TIB.' USING ERRCODE = '22023';
  END IF;

  SELECT
    count(*),
    count(DISTINCT f.tipo),
    count(DISTINCT f.r2_key),
    count(*) FILTER (
      WHERE f.tipo IS NULL
        OR f.tipo <> ALL(v_types)
        OR f.r2_key IS NULL
        OR right(f.r2_key, 5) <> '.xlsx'
        OR strpos(
          f.r2_key,
          '/inventario-tib/diario/' || p_fecha::text || '/' || f.tipo || '-'
        ) = 0
        OR f.nombre_archivo IS NULL
        OR btrim(f.nombre_archivo) = ''
        OR f.peso_bytes IS NULL
        OR f.peso_bytes < 0
        OR f.subido_por_nombre IS DISTINCT FROM 'Worker Hostinger (API TIB)'
        OR f.subido_en IS NULL
    )
  INTO v_file_count, v_distinct_types, v_distinct_keys, v_invalid_count
  FROM jsonb_to_recordset(p_files) AS f(
    tipo text,
    r2_key text,
    nombre_archivo text,
    peso_bytes bigint,
    subido_por_nombre text,
    subido_en timestamptz
  );

  IF v_file_count <> 3 OR v_distinct_types <> 3 OR v_distinct_keys <> 3 OR v_invalid_count <> 0 THEN
    RAISE EXCEPTION 'El conjunto de reportes TIB es incompleto o inválido.' USING ERRCODE = '22023';
  END IF;

  SELECT array_agg(f.r2_key)
  INTO v_new_keys
  FROM jsonb_to_recordset(p_files) AS f(tipo text, r2_key text);

  SELECT COALESCE(array_agg(DISTINCT existing.r2_key), ARRAY[]::text[])
  INTO v_old_keys
  FROM public.inventario_tib_diario AS existing
  WHERE existing.tipo = ANY(v_types)
    AND NOT (existing.r2_key = ANY(v_new_keys));

  UPDATE public.inventario_tib_diario
  SET es_activo = false
  WHERE tipo = ANY(v_types)
    AND es_activo = true;

  INSERT INTO public.inventario_tib_diario (
    fecha,
    tipo,
    r2_key,
    nombre_archivo,
    peso_bytes,
    subido_por_nombre,
    subido_en,
    es_activo
  )
  SELECT
    p_fecha,
    f.tipo,
    f.r2_key,
    f.nombre_archivo,
    f.peso_bytes,
    f.subido_por_nombre,
    f.subido_en,
    true
  FROM jsonb_to_recordset(p_files) AS f(
    tipo text,
    r2_key text,
    nombre_archivo text,
    peso_bytes bigint,
    subido_por_nombre text,
    subido_en timestamptz
  )
  ON CONFLICT (fecha, tipo) DO UPDATE
  SET r2_key = EXCLUDED.r2_key,
      nombre_archivo = EXCLUDED.nombre_archivo,
      peso_bytes = EXCLUDED.peso_bytes,
      subido_por_nombre = EXCLUDED.subido_por_nombre,
      subido_en = EXCLUDED.subido_en,
      es_activo = true;

  RETURN jsonb_build_object(
    'fecha', p_fecha,
    'files_published', v_file_count,
    'old_r2_keys', to_jsonb(v_old_keys)
  );
END;
$function$;

COMMENT ON FUNCTION public.publish_daily_tib_reports(date, jsonb)
IS 'Activa de forma transaccional los tres reportes TIB diarios y devuelve claves R2 anteriores para su limpieza por el Worker.';

REVOKE ALL ON FUNCTION public.publish_daily_tib_reports(date, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.publish_daily_tib_reports(date, jsonb) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.publish_daily_tib_reports(date, jsonb) TO service_role;
