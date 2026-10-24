import type { User } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { SESSION_START_COOKIE, isSessionExpired } from '@/lib/auth/constants';

const ADMIN_ROLES = new Set(['admin', 'administrador', 'gerente general', 'gerente_general']);
export const MASTER_SUPERADMIN_EMAILS = new Set(['sistemaamexcourier@gmail.com']);

function normalizeRole(value: unknown): string {
  return String(value || '').trim().toLowerCase();
}

/** Obtiene el usuario de la sesión SSR sin confiar en datos enviados por el cliente. */
export async function getAuthenticatedUser(): Promise<User | null> {
  try {
    try {
      const cookieStore = await cookies();
      const sessionStart = cookieStore.get(SESSION_START_COOKIE)?.value;
      if (isSessionExpired(sessionStart)) {
        return null;
      }
    } catch {
      // Ignorar si se invoca fuera del contexto de solicitud (ej. tests)
    }

    const supabase = await createServerClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;
    return data.user;
  } catch {
    return null;
  }
}

/**
 * Comprueba el rol administrativo usando app_metadata o el rol persistido.
 * user_metadata no se utiliza para decisiones de autorización porque es editable por el usuario.
 */
export async function hasAdminRole(user: User): Promise<boolean> {
  const userEmail = (user.email || '').trim().toLowerCase();
  if (MASTER_SUPERADMIN_EMAILS.has(userEmail)) return true;

  const appRole = normalizeRole(user.app_metadata?.rol);
  if (ADMIN_ROLES.has(appRole)) return true;

  try {
    const admin = getSupabaseAdmin();
    const { data: profile, error: profileError } = await admin
      .from('perfiles_usuarios')
      .select('rol_id')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError || !profile?.rol_id) return false;

    const { data: role, error: roleError } = await admin
      .from('roles_sistema')
      .select('nombre')
      .eq('id', profile.rol_id)
      .maybeSingle();

    return !roleError && ADMIN_ROLES.has(normalizeRole(role?.nombre));
  } catch {
    return false;
  }
}

export async function authorizeUser(): Promise<
  | { ok: true; user: User }
  | { ok: false; status: 401; error: 'No autenticado.' }
> {
  const user = await getAuthenticatedUser();
  return user ? { ok: true, user } : { ok: false, status: 401, error: 'No autenticado.' };
}

export async function authorizeAdmin(): Promise<
  | { ok: true; user: User }
  | { ok: false; status: 401 | 403; error: 'No autenticado.' | 'Se requiere rol administrador.' }
> {
  try {
    const { headers } = await import('next/headers');
    const h = await headers();
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (serviceKey && h.get('x-amex-service-role') === serviceKey) {
      return {
        ok: true,
        user: {
          id: 'service-role-admin',
          email: 'admin@sistemaamexcourier.online',
          app_metadata: { rol: 'administrador' },
          user_metadata: { nombre_completo: 'Administrador AMEX (Servicio)' },
        } as unknown as User,
      };
    }
  } catch {}

  const auth = await authorizeUser();
  if (!auth.ok) return auth;
  return (await hasAdminRole(auth.user))
    ? auth
    : { ok: false, status: 403, error: 'Se requiere rol administrador.' };
}

export function getUserDisplayName(user: User): string {
  return (
    (user.user_metadata?.nombre_completo as string) ||
    (user.user_metadata?.usuario as string) ||
    user.email ||
    'Usuario AMEX'
  );
}
