CREATE POLICY "tib_report_history_service_role_only"
  ON private.inventario_tib_diario_history
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
