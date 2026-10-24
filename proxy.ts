import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { apiError } from '@/lib/contracts/api';
import {
  API_CONTRACT_VERSION,
  CONTRACT_VERSION_HEADER,
  CORRELATION_ID_HEADER,
  REQUEST_ID_HEADER,
} from '@/lib/observability/request-context';
import {
  SESSION_MAX_AGE_SECONDS,
  SESSION_MAX_AGE_MS,
  SESSION_START_COOKIE,
  isSessionExpired,
  isSessionRevoked,
} from '@/lib/auth/constants';

export async function proxy(request: NextRequest) {
  // Obtener x-request-id existente o generar un identificador único para trazabilidad distribuida
  const existingRequestId = request.headers.get('x-request-id');
  const requestId = existingRequestId || crypto.randomUUID();
  const correlationId = request.headers.get(CORRELATION_ID_HEADER) || requestId;

  // Inyectar x-request-id en los encabezados de la petición para endpoints internos
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(REQUEST_ID_HEADER, requestId);
  requestHeaders.set(CORRELATION_ID_HEADER, correlationId);

  const setRequestIdHeader = (res: NextResponse) => {
    res.headers.set(REQUEST_ID_HEADER, requestId);
    res.headers.set(CORRELATION_ID_HEADER, correlationId);
    res.headers.set(CONTRACT_VERSION_HEADER, API_CONTRACT_VERSION);
    return res;
  };

  let response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  setRequestIdHeader(response);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  const pathname = request.nextUrl.pathname;

  // Permitir t�nel de monitoreo de Sentry sin interferencia de auth
  if (pathname.startsWith('/monitoring') || pathname === '/sentry-example-page' || pathname === '/api/sentry-test') {
    return response;
  }

  const hostname = request.headers.get('host') || '';
  const isClientsSubdomain = hostname.startsWith('clientes.') || request.nextUrl.searchParams.get('portal') === 'clientes';
  const isClientPortal = pathname.startsWith('/clientes');
  const isClientPublicRoute = pathname.startsWith('/clientes/login') || pathname.startsWith('/clientes/registro');
  const isLoginPage = pathname.startsWith('/login') && !isClientPortal;
  const isApiRoute = pathname.startsWith('/api');
  const isPublicAuthRoute =
    pathname.startsWith('/api/auth/login') ||
    pathname.startsWith('/api/auth/logout') ||
    pathname.startsWith('/api/auth/recuperar-password') ||
    pathname.startsWith('/api/auth/cambiar-password') ||
    pathname.startsWith('/api/clientes/');

  if (!supabaseUrl || !supabaseAnonKey) {
    if (isLoginPage || isPublicAuthRoute) return response;
    if (isApiRoute) {
      return setRequestIdHeader(apiError('AUTH_NOT_CONFIGURED', 'Autenticación no configurada.', requestId, 503));
    }
    return setRequestIdHeader(
      NextResponse.redirect(new URL('/login?error=auth-config', request.url))
    );
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookieOptions: {
      maxAge: SESSION_MAX_AGE_SECONDS,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({
          request: {
            headers: requestHeaders,
          },
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, {
            ...options,
            maxAge: options?.maxAge ? Math.min(options.maxAge, SESSION_MAX_AGE_SECONDS) : SESSION_MAX_AGE_SECONDS,
            path: '/',
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
          })
        );
        setRequestIdHeader(response);
      },
    },
  });

  // Refrescar sesión de Supabase si existe cookie o encabezado Bearer
  let user = null;
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const { data: tokenData } = await supabase.auth.getUser(token);
    user = tokenData?.user || null;
  } else {
    const { data: cookieData } = await supabase.auth.getUser();
    user = cookieData?.user || null;
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const isServiceRole = Boolean(
    serviceKey &&
    (request.headers.get('x-amex-service-role') === serviceKey ||
     request.headers.get('apikey') === serviceKey)
  );

  // Verificación estricta de tiempo límite (8 horas) y de revocación por actualización de permisos
  const sessionStartStr = request.cookies.get(SESSION_START_COOKIE)?.value;
  const expired = user ? isSessionExpired(sessionStartStr) : false;
  const userRevokedAt =
    (user?.user_metadata?.session_revoked_at as string | undefined) ||
    (user?.app_metadata?.session_revoked_at as string | undefined);
  const revoked = user && userRevokedAt ? isSessionRevoked(sessionStartStr, userRevokedAt) : false;

  if (expired || revoked) {
    try {
      await supabase.auth.signOut();
    } catch {}

    const errorCode = revoked ? 'permissions-updated' : 'session-expired';
    const expiredUrl = new URL(`/login?error=${errorCode}`, request.url);
    if (pathname !== '/' && !isLoginPage) {
      expiredUrl.searchParams.set('next', `${pathname}${request.nextUrl.search}`);
    }

    const errorMsg = revoked
      ? 'Tus permisos y accesos han sido actualizados por el Administrador. Por favor, inicia sesión nuevamente.'
      : 'Tu sesión ha caducado tras 8 horas de uso. Por favor, inicia sesión nuevamente.';

    const expiredRes = isApiRoute
      ? setRequestIdHeader(apiError(revoked ? 'SESSION_REVOKED' : 'SESSION_EXPIRED', errorMsg, requestId, 401))
      : setRequestIdHeader(NextResponse.redirect(expiredUrl));

    // Limpiar cookies de sesión para forzar re-autenticación
    expiredRes.cookies.delete(SESSION_START_COOKIE);
    request.cookies.getAll().forEach((c) => {
      if (c.name.startsWith('sb-') || c.name === SESSION_START_COOKIE) {
        expiredRes.cookies.delete(c.name);
      }
    });

    return expiredRes;
  }

  // Inicializar cookie amex_session_start si el usuario ya está autenticado pero no la tiene
  if (user && !sessionStartStr && !isLoginPage) {
    response.cookies.set(SESSION_START_COOKIE, Date.now().toString(), {
      maxAge: SESSION_MAX_AGE_SECONDS,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: false,
    });
  }

  // Si está en login y ya está autenticado con sesión vigente, redirigir al panel
  // Subdominio de clientes: aislar totalmente del ERP interno
  if (isClientsSubdomain) {
    if (!pathname.startsWith('/clientes') && !pathname.startsWith('/api')) {
      if (pathname === '/login') {
        return setRequestIdHeader(NextResponse.redirect(new URL('/clientes/login', request.url)));
      }
      if (pathname === '/registro') {
        return setRequestIdHeader(NextResponse.redirect(new URL('/clientes/registro', request.url)));
      }
      // Cualquier otra ruta en clientes.sistemaamexcourier.online se reescribe al portal
      return setRequestIdHeader(NextResponse.rewrite(new URL('/clientes', request.url)));
    }
  }

  // Comportamiento del portal de clientes (aislado de la sesión interna de ERP)
  if (isClientPortal) {
    // La sesión del portal se valida directamente con supabasePortal
    return response;
  }

  // Si está en login interno y ya está autenticado con sesión vigente, redirigir al panel
  if (isLoginPage && user) {
    return setRequestIdHeader(NextResponse.redirect(new URL('/dashboard', request.url)));
  }

  if (!user && !isServiceRole && !isLoginPage && !isPublicAuthRoute) {
    if (isApiRoute) {
      return setRequestIdHeader(apiError('UNAUTHENTICATED', 'No autenticado.', requestId, 401));
    }

    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', `${pathname}${request.nextUrl.search}`);
    return setRequestIdHeader(NextResponse.redirect(loginUrl));
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
