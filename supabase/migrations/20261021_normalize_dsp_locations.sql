-- ==============================================================================
-- Migración: Normalización Canónica de Ubicaciones de Despacho (DSP-Z1 / DSP-Z2)
-- Sistema AMEX Courier
--
-- REGLAS DE NEGOCIO:
-- 1. No existe la ubicación 'DSP' aislada. El almacén solo cuenta con:
--    - DSP-Z1 (Despacho Zona 1)
--    - DSP-Z2 (Despacho Zona 2)
-- 2. Todo intento de asignar 'DSP', 'DESPACHO' o 'DSP-P%' se normaliza a 'DSP-Z1'.
-- 3. Las zonas DSP-Z1, DSP-Z2 y OFI no tienen niveles/pisos (piso = NULL).
-- ==============================================================================

-- 1. Función Trigger para normalizar automáticamente en la tabla public.paquetes
CREATE OR REPLACE FUNCTION public.trg_normalizar_ubicacion_paquete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Normalización de Despacho
  IF UPPER(TRIM(COALESCE(NEW.posicion_estante, ''))) IN ('DSP', 'DESPACHO')
     OR UPPER(TRIM(COALESCE(NEW.anaquel, ''))) IN ('DSP', 'DESPACHO')
     OR UPPER(TRIM(COALESCE(NEW.posicion_estante, ''))) LIKE 'DSP-P%' THEN
    NEW.anaquel := 'DSP-Z1';
    NEW.posicion_estante := 'DSP-Z1';
    NEW.piso := NULL;
  ELSIF UPPER(TRIM(COALESCE(NEW.posicion_estante, ''))) = 'DSP-Z1'
     OR UPPER(TRIM(COALESCE(NEW.anaquel, ''))) = 'DSP-Z1' THEN
    NEW.anaquel := 'DSP-Z1';
    NEW.posicion_estante := 'DSP-Z1';
    NEW.piso := NULL;
  ELSIF UPPER(TRIM(COALESCE(NEW.posicion_estante, ''))) = 'DSP-Z2'
     OR UPPER(TRIM(COALESCE(NEW.anaquel, ''))) = 'DSP-Z2' THEN
    NEW.anaquel := 'DSP-Z2';
    NEW.posicion_estante := 'DSP-Z2';
    NEW.piso := NULL;
  -- Normalización de Oficina / Recepción obsoleta
  ELSIF UPPER(TRIM(COALESCE(NEW.posicion_estante, ''))) IN ('REC', 'RECEPCION', 'OFI', 'OFI-P1')
     OR UPPER(TRIM(COALESCE(NEW.anaquel, ''))) IN ('REC', 'RECEPCION', 'OFI')
     OR UPPER(TRIM(COALESCE(NEW.posicion_estante, ''))) LIKE 'REC-%' THEN
    NEW.anaquel := 'OFI';
    NEW.posicion_estante := 'OFI';
    NEW.piso := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_paquetes_normalizar_ubicacion ON public.paquetes;
CREATE TRIGGER trg_paquetes_normalizar_ubicacion
BEFORE INSERT OR UPDATE OF anaquel, piso, posicion_estante ON public.paquetes
FOR EACH ROW
EXECUTE FUNCTION public.trg_normalizar_ubicacion_paquete();

-- 2. Función Trigger para normalizar en public.escaneos_log
CREATE OR REPLACE FUNCTION public.trg_normalizar_escaneos_log_ubicacion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF UPPER(TRIM(COALESCE(NEW.ubicacion, ''))) IN ('DSP', 'DESPACHO')
     OR UPPER(TRIM(COALESCE(NEW.ubicacion, ''))) LIKE 'DSP-P%' THEN
    NEW.ubicacion := 'DSP-Z1';
  ELSIF UPPER(TRIM(COALESCE(NEW.ubicacion, ''))) IN ('REC', 'RECEPCION', 'OFI-P1')
     OR UPPER(TRIM(COALESCE(NEW.ubicacion, ''))) LIKE 'REC-%' THEN
    NEW.ubicacion := 'OFI';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_escaneos_log_normalizar_ubicacion ON public.escaneos_log;
CREATE TRIGGER trg_escaneos_log_normalizar_ubicacion
BEFORE INSERT OR UPDATE OF ubicacion ON public.escaneos_log
FOR EACH ROW
EXECUTE FUNCTION public.trg_normalizar_escaneos_log_ubicacion();

-- 3. Actualizar la función RPC public.asignar_ubicacion_paquete
CREATE OR REPLACE FUNCTION public.asignar_ubicacion_paquete(
  p_codigo text,
  p_nueva_ubicacion text,
  p_anaquel text DEFAULT NULL::text,
  p_piso text DEFAULT NULL::text,
  p_operador_nombre text DEFAULT 'Operador Logístico AMEX'::text,
  p_operador_email text DEFAULT NULL::text,
  p_operador_id uuid DEFAULT NULL::uuid,
  p_tipo_movimiento text DEFAULT 'REASIGNACION_WMS'::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_code TEXT;
  v_location TEXT;
  v_anaquel TEXT;
  v_piso TEXT;
  v_dash_pos INT;
  v_pkg_id UUID;
  v_wr TEXT;
  v_tracking TEXT;
  v_consignatario TEXT;
  v_old_loc TEXT;
  v_now TIMESTAMPTZ := now();
BEGIN
  v_code := UPPER(TRIM(COALESCE(p_codigo, '')));
  v_location := UPPER(TRIM(COALESCE(p_nueva_ubicacion, 'OFI')));

  IF v_code = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'El código de paquete no puede estar vacío');
  END IF;

  -- Normalización canónica de ubicación
  IF v_location IN ('DSP', 'DESPACHO') OR v_location LIKE 'DSP-P%' THEN
    v_location := 'DSP-Z1';
  ELSIF v_location IN ('REC', 'RECEPCION', 'OFI-P1') OR v_location LIKE 'REC-%' THEN
    v_location := 'OFI';
  END IF;

  -- Resolver anaquel y piso respetando zonas sin piso
  IF v_location IN ('OFI', 'DSP-Z1', 'DSP-Z2', 'TRANSITO') THEN
    v_anaquel := v_location;
    v_piso := NULL;
  ELSE
    v_anaquel := p_anaquel;
    v_piso := p_piso;
    IF v_anaquel IS NULL OR v_piso IS NULL THEN
      v_dash_pos := POSITION('-' IN v_location);
      IF v_dash_pos > 0 THEN
        v_anaquel := SUBSTRING(v_location FROM 1 FOR v_dash_pos - 1);
        v_piso := SUBSTRING(v_location FROM v_dash_pos + 1);
      ELSE
        v_anaquel := v_location;
        v_piso := 'P1';
      END IF;
    END IF;
  END IF;

  -- Doble verificación de seguridad contra DSP o REC aislados
  IF v_anaquel IN ('DSP', 'DESPACHO') THEN
    v_anaquel := 'DSP-Z1';
    v_location := 'DSP-Z1';
    v_piso := NULL;
  ELSIF v_anaquel = 'REC' THEN
    v_anaquel := 'OFI';
    v_location := 'OFI';
    v_piso := NULL;
  END IF;

  -- Buscar paquete existente
  SELECT id, numero_recibo_bodega, tracking, nombre_consignatario, posicion_estante
  INTO v_pkg_id, v_wr, v_tracking, v_consignatario, v_old_loc
  FROM public.paquetes
  WHERE numero_recibo_bodega = v_code OR tracking = v_code
  ORDER BY creado_en DESC
  LIMIT 1;

  IF v_pkg_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Paquete no encontrado en el sistema con el código ' || v_code
    );
  END IF;

  -- 1. Actualizar paquete
  UPDATE public.paquetes
  SET
    anaquel = v_anaquel,
    piso = v_piso,
    posicion_estante = v_location,
    ubicacion_actual = 'AmexLince',
    estado_amex = 'en_almacen',
    actualizado_en = v_now,
    eliminado_en = NULL
  WHERE id = v_pkg_id;

  -- 2. Registrar en movimientos_ubicacion
  INSERT INTO public.movimientos_ubicacion (
    paquete_id,
    numero_recibo_bodega,
    tracking,
    ubicacion_anterior,
    nueva_ubicacion,
    anaquel,
    piso,
    usuario_id,
    usuario_nombre,
    usuario_email,
    tipo_movimiento,
    creado_en
  ) VALUES (
    v_pkg_id,
    v_wr,
    v_tracking,
    COALESCE(v_old_loc, 'Sin Ubicación'),
    v_location,
    v_anaquel,
    v_piso,
    p_operador_id,
    p_operador_nombre,
    p_operador_email,
    p_tipo_movimiento,
    v_now
  );

  -- 3. Registrar en historial_trazabilidad
  INSERT INTO public.historial_trazabilidad (
    paquete_id,
    ubicacion,
    descripcion_evento,
    usuario_operador,
    fecha_hora
  ) VALUES (
    v_pkg_id,
    v_location,
    'Ubicación reasignada de ' || COALESCE(v_old_loc, 'Sin Asignar') || ' a ' || v_location || ' (' || p_tipo_movimiento || ')',
    p_operador_nombre,
    v_now
  );

  RETURN jsonb_build_object(
    'success', true,
    'paquete_id', v_pkg_id,
    'numero_recibo_bodega', v_wr,
    'ubicacion_anterior', COALESCE(v_old_loc, 'Sin Ubicación'),
    'nueva_ubicacion', v_location,
    'mensaje', 'Ubicación actualizada correctamente'
  );
END;
$function$;

-- 4. Sanitización retroactiva de datos históricos
UPDATE public.paquetes
SET anaquel = 'DSP-Z1', posicion_estante = 'DSP-Z1', piso = NULL
WHERE anaquel = 'DSP' OR posicion_estante = 'DSP' OR posicion_estante LIKE 'DSP-P%';

UPDATE public.escaneos_log
SET ubicacion = 'DSP-Z1'
WHERE ubicacion = 'DSP' OR ubicacion = 'DESPACHO';

UPDATE public.movimientos_ubicacion
SET nueva_ubicacion = 'DSP-Z1', anaquel = 'DSP-Z1', piso = NULL
WHERE nueva_ubicacion = 'DSP' OR anaquel = 'DSP';
