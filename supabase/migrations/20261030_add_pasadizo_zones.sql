-- ==============================================================================
-- Migración: Incorporación de Zonas de Pasadizo (PAS-Z1 / PAS-Z2)
-- Sistema AMEX Courier
--
-- REGLAS DE NEGOCIO:
-- 1. Pasadizo cuenta con 2 zonas físicas canónicas:
--    - PAS-Z1 (Pasadizo Zona 1)
--    - PAS-Z2 (Pasadizo Zona 2)
-- 2. Ambas zonas son de nivel único (piso = NULL / nivel_piso = 'N/A').
-- 3. Exigencia estricta: PAS-Z1 y PAS-Z2 son independientes; cualquier sufijo
--    accidental (ej: PAS-Z1-P1) se normaliza a la zona correspondiente.
-- 4. Capacidad por defecto: 100 paquetes y 500 kg en estanterias_posiciones.
-- ==============================================================================

-- 1. Insertar PAS-Z1 y PAS-Z2 en estanterias_posiciones
INSERT INTO public.estanterias_posiciones (
  codigo_estante,
  nivel_piso,
  codigo_posicion,
  zona_tipo,
  capacidad_max_paquetes,
  peso_max_kg,
  descripcion
) VALUES 
  ('PAS-Z1', 'N/A', 'PAS-Z1', 'PASADIZO', 100, 500.00, 'Pasadizo Zona 1 (PAS-Z1)'),
  ('PAS-Z2', 'N/A', 'PAS-Z2', 'PASADIZO', 100, 500.00, 'Pasadizo Zona 2 (PAS-Z2)');

-- 2. Actualizar trg_normalizar_ubicacion_paquete
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
  -- Normalización de Pasadizo (PAS-Z1 y PAS-Z2)
  ELSIF UPPER(TRIM(COALESCE(NEW.posicion_estante, ''))) IN ('PAS-Z1', 'PAS-Z1-P1')
     OR UPPER(TRIM(COALESCE(NEW.anaquel, ''))) = 'PAS-Z1'
     OR UPPER(TRIM(COALESCE(NEW.posicion_estante, ''))) LIKE 'PAS-Z1-%' THEN
    NEW.anaquel := 'PAS-Z1';
    NEW.posicion_estante := 'PAS-Z1';
    NEW.piso := NULL;
  ELSIF UPPER(TRIM(COALESCE(NEW.posicion_estante, ''))) IN ('PAS-Z2', 'PAS-Z2-P1')
     OR UPPER(TRIM(COALESCE(NEW.anaquel, ''))) = 'PAS-Z2'
     OR UPPER(TRIM(COALESCE(NEW.posicion_estante, ''))) LIKE 'PAS-Z2-%' THEN
    NEW.anaquel := 'PAS-Z2';
    NEW.posicion_estante := 'PAS-Z2';
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

-- 3. Actualizar trg_normalizar_escaneos_log_ubicacion
CREATE OR REPLACE FUNCTION public.trg_normalizar_escaneos_log_ubicacion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF UPPER(TRIM(COALESCE(NEW.ubicacion, ''))) IN ('DSP', 'DESPACHO')
     OR UPPER(TRIM(COALESCE(NEW.ubicacion, ''))) LIKE 'DSP-P%' THEN
    NEW.ubicacion := 'DSP-Z1';
  ELSIF UPPER(TRIM(COALESCE(NEW.ubicacion, ''))) LIKE 'PAS-Z1-%' THEN
    NEW.ubicacion := 'PAS-Z1';
  ELSIF UPPER(TRIM(COALESCE(NEW.ubicacion, ''))) LIKE 'PAS-Z2-%' THEN
    NEW.ubicacion := 'PAS-Z2';
  ELSIF UPPER(TRIM(COALESCE(NEW.ubicacion, ''))) IN ('REC', 'RECEPCION', 'OFI-P1')
     OR UPPER(TRIM(COALESCE(NEW.ubicacion, ''))) LIKE 'REC-%' THEN
    NEW.ubicacion := 'OFI';
  END IF;
  RETURN NEW;
END;
$$;

-- 4. Actualizar función RPC asignar_ubicacion_paquete
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
  ELSIF v_location IN ('PAS-Z1-P1') OR v_location LIKE 'PAS-Z1-%' THEN
    v_location := 'PAS-Z1';
  ELSIF v_location IN ('PAS-Z2-P1') OR v_location LIKE 'PAS-Z2-%' THEN
    v_location := 'PAS-Z2';
  ELSIF v_location IN ('REC', 'RECEPCION', 'OFI-P1') OR v_location LIKE 'REC-%' THEN
    v_location := 'OFI';
  END IF;

  -- Resolver anaquel y piso respetando zonas sin piso
  IF v_location IN ('OFI', 'DSP-Z1', 'DSP-Z2', 'PAS-Z1', 'PAS-Z2', 'TRANSITO') THEN
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
  ELSIF v_anaquel IN ('PAS-Z1', 'PAS-Z2') THEN
    v_piso := NULL;
    v_location := v_anaquel;
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
