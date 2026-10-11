-- Evaluate the JWT claim once per statement instead of once per row.
-- This keeps the ownership boundary while avoiding an RLS init-plan warning.
DO $migration$
BEGIN
  IF to_regclass('public.dni_matrix_borradores') IS NOT NULL THEN
    DROP POLICY IF EXISTS "dni_matrix_borradores_authenticated_owner" ON public.dni_matrix_borradores;
    CREATE POLICY "dni_matrix_borradores_authenticated_owner"
      ON public.dni_matrix_borradores FOR ALL TO authenticated
      USING (lower(usuario_email) = (select lower(coalesce(auth.jwt() ->> 'email', ''))))
      WITH CHECK (lower(usuario_email) = (select lower(coalesce(auth.jwt() ->> 'email', ''))));
  END IF;

  IF to_regclass('public.actas_entrega_borradores') IS NOT NULL THEN
    DROP POLICY IF EXISTS "actas_entrega_borradores_authenticated_owner" ON public.actas_entrega_borradores;
    CREATE POLICY "actas_entrega_borradores_authenticated_owner"
      ON public.actas_entrega_borradores FOR ALL TO authenticated
      USING (lower(usuario_email) = (select lower(coalesce(auth.jwt() ->> 'email', ''))))
      WITH CHECK (lower(usuario_email) = (select lower(coalesce(auth.jwt() ->> 'email', ''))));
  END IF;

  IF to_regclass('public.invoices_borradores') IS NOT NULL THEN
    DROP POLICY IF EXISTS "invoices_borradores_authenticated_owner" ON public.invoices_borradores;
    CREATE POLICY "invoices_borradores_authenticated_owner"
      ON public.invoices_borradores FOR ALL TO authenticated
      USING (lower(usuario_email) = (select lower(coalesce(auth.jwt() ->> 'email', ''))))
      WITH CHECK (lower(usuario_email) = (select lower(coalesce(auth.jwt() ->> 'email', ''))));
  END IF;

  IF to_regclass('public.scanner_staging_queue') IS NOT NULL THEN
    DROP POLICY IF EXISTS "scanner_staging_queue_authenticated_owner" ON public.scanner_staging_queue;
    CREATE POLICY "scanner_staging_queue_authenticated_owner"
      ON public.scanner_staging_queue FOR ALL TO authenticated
      USING (lower(usuario_email) = (select lower(coalesce(auth.jwt() ->> 'email', ''))))
      WITH CHECK (lower(usuario_email) = (select lower(coalesce(auth.jwt() ->> 'email', ''))));
  END IF;

  IF to_regclass('public.rotulos_borradores') IS NOT NULL THEN
    DROP POLICY IF EXISTS "rotulos_borradores_authenticated_owner" ON public.rotulos_borradores;
    CREATE POLICY "rotulos_borradores_authenticated_owner"
      ON public.rotulos_borradores FOR ALL TO authenticated
      USING (lower(usuario_email) = (select lower(coalesce(auth.jwt() ->> 'email', ''))))
      WITH CHECK (lower(usuario_email) = (select lower(coalesce(auth.jwt() ->> 'email', ''))));
  END IF;
END
$migration$;
