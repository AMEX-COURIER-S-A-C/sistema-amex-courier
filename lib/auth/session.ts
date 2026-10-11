import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { SESSION_START_COOKIE, isSessionExpired } from '@/lib/auth/constants';

export interface SessionUser {
  nombre: string;
  rol: string;
  email: string;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const sessionStart = cookieStore.get(SESSION_START_COOKIE)?.value;
    if (isSessionExpired(sessionStart)) {
      return null;
    }
  } catch {}

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  const user = data.user;
  return {
    nombre: (user.user_metadata?.nombre_completo as string) || (user.user_metadata?.usuario as string) || user.email || 'Usuario',
    rol: (user.app_metadata?.rol as string) || 'Operador Logístico',
    email: user.email || '',
  };
}
