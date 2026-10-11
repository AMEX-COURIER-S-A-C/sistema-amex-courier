-- The function was historically granted to anon by older migrations.
-- PostgreSQL's PUBLIC role also inherits EXECUTE unless it is revoked explicitly.
REVOKE EXECUTE ON FUNCTION public.sync_scanner_batch_v2(JSONB, TEXT, TEXT, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_scanner_batch_v2(JSONB, TEXT, TEXT, UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.sync_scanner_batch_v2(JSONB, TEXT, TEXT, UUID) TO authenticated, service_role;
