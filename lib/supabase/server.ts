import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { SESSION_MAX_AGE_SECONDS } from '@/lib/auth/constants';

export async function createClient() {
  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookieOptions: {
        maxAge: SESSION_MAX_AGE_SECONDS,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, {
                ...options,
                maxAge: options?.maxAge ? Math.min(options.maxAge, SESSION_MAX_AGE_SECONDS) : SESSION_MAX_AGE_SECONDS,
                sameSite: 'lax',
                path: '/',
                secure: process.env.NODE_ENV === 'production',
              })
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}
