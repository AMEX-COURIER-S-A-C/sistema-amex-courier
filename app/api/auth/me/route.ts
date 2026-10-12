import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { withErrorHandler } from '@/lib/api/handler';
import { SESSION_START_COOKIE, isSessionExpired, getRemainingSessionMs, isSessionRevoked } from '@/lib/auth/constants';

async function handleGet() {
  try {
    const cookieStore = await cookies();
    const sessionStart = cookieStore.get(SESSION_START_COOKIE)?.value;

    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    if (isSessionExpired(sessionStart)) {
      try {
        await supabase.auth.signOut();
      } catch {}
      const res = NextResponse.json(
        { user: null, error: 'Sesión expirada tras 8 horas.' },
        { status: 401 }
      );
      res.cookies.delete(SESSION_START_COOKIE);
      return res;
    }

    const authUser = data.user;
    const admin = getSupabaseAdmin();

    // 1. Consultar perfil persistido del usuario
    const { data: profile } = await admin
      .from('perfiles_usuarios')
      .select('id, nombre_completo, email, rol_id, activo, permisos, session_revoked_at')
      .eq('id', authUser.id)
      .maybeSingle();

    if (profile && profile.activo === false) {
      try {
        await supabase.auth.signOut();
      } catch {}
      const res = NextResponse.json(
        { user: null, code: 'ACCOUNT_DISABLED', error: 'Cuenta de usuario desactivada por el administrador.' },
        { status: 403 }
      );
      res.cookies.delete(SESSION_START_COOKIE);
      return res;
    }

    // 1.1 Comprobar si la sesión fue revocada tras actualización de módulos o permisos por el Administrador
    if (profile?.session_revoked_at && isSessionRevoked(sessionStart, profile.session_revoked_at)) {
      try {
        await supabase.auth.signOut();
      } catch {}
      const res = NextResponse.json(
        {
          user: null,
          code: 'SESSION_REVOKED',
          error: 'Tus permisos han sido actualizados por el Administrador. Inicia sesión nuevamente para ingresar con tus nuevos accesos.',
        },
        { status: 401 }
      );
      res.cookies.delete(SESSION_START_COOKIE);
      return res;
    }

    let rolNombre =
      (authUser.app_metadata?.rol as string) ||
      (authUser.user_metadata?.rol as string) ||
      'Operador Logístico';
    let permisos: Record<string, unknown> = {};

    // 2. Consultar rol y matriz de permisos por defecto
    if (profile?.rol_id) {
      const { data: roleData } = await admin
        .from('roles_sistema')
        .select('id, nombre, permisos')
        .eq('id', profile.rol_id)
        .maybeSingle();

      if (roleData) {
        if (roleData.nombre) rolNombre = roleData.nombre;
        if (roleData.permisos) permisos = roleData.permisos as Record<string, unknown>;
      }
    }

    // 3. Si el usuario tiene permisos personalizados individuales en su perfil, tienen prioridad
    if (profile?.permisos && typeof profile.permisos === 'object' && Object.keys(profile.permisos).length > 0) {
      permisos = profile.permisos as Record<string, unknown>;
    }

    const normRole = rolNombre.trim().toLowerCase();
    const isAdmin =
      ['admin', 'administrador'].includes(normRole) ||
      ['admin', 'administrador'].includes(
        String(authUser.app_metadata?.rol || '').trim().toLowerCase()
      );

    return NextResponse.json({
      user: {
        id: authUser.id,
        nombre:
          profile?.nombre_completo ||
          (authUser.user_metadata?.nombre_completo as string) ||
          authUser.email?.split('@')[0] ||
          'Usuario AMEX',
        email: authUser.email || '',
        rol: rolNombre,
        rol_id: profile?.rol_id || null,
        permisos,
        isAdmin,
      },
    });
  } catch (err: unknown) {
    console.error('[API /api/auth/me Error]:', err);
    return NextResponse.json({ error: 'Error obteniendo perfil de sesión' }, { status: 500 });
  }
}

export const GET = withErrorHandler(handleGet, 'api-auth-me');
