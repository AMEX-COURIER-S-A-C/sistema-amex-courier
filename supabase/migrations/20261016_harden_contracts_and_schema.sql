-- Backward-compatible schema and access hardening.
-- This migration intentionally preserves authenticated application behavior.

ALTER TABLE IF EXISTS public.manifiestos_tib
  ADD COLUMN IF NOT EXISTS archivo_url text;

ALTER TABLE IF EXISTS public.despacho_paradas
  ADD COLUMN IF NOT EXISTS fotos text[] DEFAULT '{}'::text[];

ALTER TABLE IF EXISTS public.manifiestos_tib ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.manifiestos_tib_detalles ENABLE ROW LEVEL SECURITY;

-- These resources are accessed by the authenticated dashboard. Anonymous access
-- was broader than the application requires and allowed unrestricted reads/writes.
DROP POLICY IF EXISTS "despachos_rutas_anon_select" ON public.despachos_rutas;
DROP POLICY IF EXISTS "despacho_paradas_anon_select" ON public.despacho_paradas;
DROP POLICY IF EXISTS "despacho_paradas_anon_update" ON public.despacho_paradas;

DROP POLICY IF EXISTS "Permitir todo a usuarios para dni_matrix_borradores" ON public.dni_matrix_borradores;
CREATE POLICY "dni_matrix_borradores_authenticated_owner"
  ON public.dni_matrix_borradores FOR ALL TO authenticated
  USING (lower(usuario_email) = lower(coalesce((select auth.jwt() ->> 'email'), '')))
  WITH CHECK (lower(usuario_email) = lower(coalesce((select auth.jwt() ->> 'email'), '')));

DROP POLICY IF EXISTS "Permitir todo a usuarios para actas_entrega_borradores" ON public.actas_entrega_borradores;
CREATE POLICY "actas_entrega_borradores_authenticated_owner"
  ON public.actas_entrega_borradores FOR ALL TO authenticated
  USING (lower(usuario_email) = lower(coalesce((select auth.jwt() ->> 'email'), '')))
  WITH CHECK (lower(usuario_email) = lower(coalesce((select auth.jwt() ->> 'email'), '')));

DROP POLICY IF EXISTS "Permitir todo a usuarios para invoices_borradores" ON public.invoices_borradores;
CREATE POLICY "invoices_borradores_authenticated_owner"
  ON public.invoices_borradores FOR ALL TO authenticated
  USING (lower(usuario_email) = lower(coalesce((select auth.jwt() ->> 'email'), '')))
  WITH CHECK (lower(usuario_email) = lower(coalesce((select auth.jwt() ->> 'email'), '')));

DROP POLICY IF EXISTS "Permitir todo a usuarios para scanner_staging_queue" ON public.scanner_staging_queue;
CREATE POLICY "scanner_staging_queue_authenticated_owner"
  ON public.scanner_staging_queue FOR ALL TO authenticated
  USING (lower(usuario_email) = lower(coalesce((select auth.jwt() ->> 'email'), '')))
  WITH CHECK (lower(usuario_email) = lower(coalesce((select auth.jwt() ->> 'email'), '')));

DROP POLICY IF EXISTS "Permitir todo a usuarios autenticados y anon para borradores" ON public.rotulos_borradores;
CREATE POLICY "rotulos_borradores_authenticated_owner"
  ON public.rotulos_borradores FOR ALL TO authenticated
  USING (lower(usuario_email) = lower(coalesce((select auth.jwt() ->> 'email'), '')))
  WITH CHECK (lower(usuario_email) = lower(coalesce((select auth.jwt() ->> 'email'), '')));

DROP POLICY IF EXISTS "Permitir todo a usuarios autenticados y anon para historial" ON public.rotulos_historial;
CREATE POLICY "rotulos_historial_authenticated"
  ON public.rotulos_historial FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir todo a usuarios para actas_entrega_historial" ON public.actas_entrega_historial;
CREATE POLICY "actas_entrega_historial_authenticated"
  ON public.actas_entrega_historial FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir todo a usuarios para invoices_historial" ON public.invoices_historial;
CREATE POLICY "invoices_historial_authenticated"
  ON public.invoices_historial FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

REVOKE EXECUTE ON FUNCTION public.sync_scanner_batch_v2(JSONB, TEXT, TEXT, UUID) FROM anon;
