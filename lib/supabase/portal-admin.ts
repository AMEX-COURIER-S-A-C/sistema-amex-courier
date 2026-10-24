import { createClient } from '@supabase/supabase-js';

const portalUrl =
  process.env.NEXT_PUBLIC_PORTAL_SUPABASE_URL ||
  process.env.PORTAL_SUPABASE_URL ||
  'https://zftkbolgcnnkkdfzmtix.supabase.co';

const portalServiceRoleKey =
  process.env.PORTAL_SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmdGtib2xnY25ua2tkZnptdGl4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjgwMjIwNSwiZXhwIjoyMTA4Mzc4MjA1fQ.Rd1VBfhFZ0QtSk1NejNyFba-qd4IxlOvGpwxMRbMiWk';

/**
 * Cliente de administración de Supabase para el Portal de Clientes.
 * Capaz de crear usuarios de autenticación, sincronizar paquetes y administrar perfiles.
 */
export function getPortalAdmin() {
  return createClient(portalUrl, portalServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
