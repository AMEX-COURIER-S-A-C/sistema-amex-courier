import { createClient } from '@supabase/supabase-js';

const portalUrl =
  process.env.NEXT_PUBLIC_PORTAL_SUPABASE_URL ||
  'https://zftkbolgcnnkkdfzmtix.supabase.co';

const portalAnonKey =
  process.env.NEXT_PUBLIC_PORTAL_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmdGtib2xnY25ua2tkZnptdGl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4MDIyMDUsImV4cCI6MjEwODM3ODIwNX0.aywGB_4VCyu-1VvhvjrGkyWQf2bAPGomIl08FxFh6uM';

/**
 * Cliente de Supabase EXCLUSIVO para el Portal de Clientes (us-west-2 Oregon).
 * 100% aislado del ERP interno.
 */
export const supabasePortal = createClient(portalUrl, portalAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'amex-portal-cliente-token',
  },
});
