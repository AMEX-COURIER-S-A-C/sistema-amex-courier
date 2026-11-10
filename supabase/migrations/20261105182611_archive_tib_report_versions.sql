-- Preserve same-day report metadata before the public daily row is replaced.
-- The public table intentionally has one row per date and report type.
CREATE TABLE IF NOT EXISTS private.inventario_tib_diario_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_id uuid,
  fecha date NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('delivered', 'sent', 'received')),
  r2_key text NOT NULL UNIQUE,
  nombre_archivo text NOT NULL,
  peso_bytes bigint NOT NULL DEFAULT 0 CHECK (peso_bytes >= 0),
  subido_por_nombre text,
  subido_en timestamptz,
  es_activo boolean NOT NULL DEFAULT false CHECK (es_activo = false),
  archivado_en timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE private.inventario_tib_diario_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.inventario_tib_diario_history FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON TABLE private.inventario_tib_diario_history TO service_role;

COMMENT ON TABLE private.inventario_tib_diario_history
IS 'Historial interno de versiones TIB reemplazadas el mismo día; sus objetos R2 se limpian tras publicar la versión nueva.';

-- The initial production refresh replaced three same-day rows due to the
-- existing UNIQUE(fecha, tipo) constraint. Restore their known metadata here.
INSERT INTO private.inventario_tib_diario_history (
  fecha, tipo, r2_key, nombre_archivo, peso_bytes, subido_por_nombre, es_activo
)
VALUES
  ('2026-11-05', 'delivered', 'FOLDER AMEX/inventario-tib/diario/2026-11-05/delivered.xlsx', 'ENTREGADO TIB (API Oficial).xlsx', 13150701, 'Superadmin AMEX (API TIB)', false),
  ('2026-11-05', 'sent', 'FOLDER AMEX/inventario-tib/diario/2026-11-05/sent.xlsx', 'ENVIADO TIB (API Oficial).xlsx', 6704450, 'Superadmin AMEX (API TIB)', false),
  ('2026-11-05', 'received', 'FOLDER AMEX/inventario-tib/diario/2026-11-05/received.xlsx', 'RECIBIDO TIB (API Oficial).xlsx', 319610, 'Superadmin AMEX (API TIB)', false)
ON CONFLICT (r2_key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.publish_daily_tib_reports(
  p_fecha date,
  p_files jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public, private, pg_temp
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

  -- Same-day upserts replace the single public row; archive its prior version first.
  INSERT INTO private.inventario_tib_diario_history (
    original_id,
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
    existing.id,
    existing.fecha,
    existing.tipo,
    existing.r2_key,
    existing.nombre_archivo,
    existing.peso_bytes,
    existing.subido_por_nombre,
    existing.subido_en,
    false
  FROM public.inventario_tib_diario AS existing
  WHERE existing.fecha = p_fecha
    AND existing.tipo = ANY(v_types)
    AND existing.es_activo = true
    AND NOT (existing.r2_key = ANY(v_new_keys))
  ON CONFLICT (r2_key) DO NOTHING;

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
IS 'Activa transaccionalmente los tres reportes TIB, archiva versiones reemplazadas el mismo día y devuelve claves R2 antiguas para su limpieza por el Worker.';

REVOKE ALL ON FUNCTION public.publish_daily_tib_reports(date, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.publish_daily_tib_reports(date, jsonb) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.publish_daily_tib_reports(date, jsonb) TO service_role;
