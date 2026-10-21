import { NextRequest, NextResponse } from 'next/server';
import { ZodSchema, ZodError } from 'zod';
import * as Sentry from '@sentry/nextjs';
import type { User } from '@supabase/supabase-js';
import { apiError } from '@/lib/contracts/api';
import { getRequestId } from '@/lib/observability/request-context';
import { checkRateLimit, rateLimitExceededResponse, RateLimitOptions } from '@/lib/security/rateLimit';
import { authorizeUser, authorizeAdmin } from '@/lib/auth/guards';
import { formatZodError } from '@/lib/api/validate';

export interface WithApiOptions<TBody = unknown, TQuery = unknown> {
  auth?: boolean | 'admin';
  bodySchema?: ZodSchema<TBody>;
  querySchema?: ZodSchema<TQuery>;
  rateLimit?: RateLimitOptions;
}

export interface ApiHandlerContext<TBody = unknown, TQuery = unknown> {
  req: NextRequest;
  user: User | null;
  body: TBody;
  query: TQuery;
  requestId: string;
}

export type ApiHandler<TBody = unknown, TQuery = unknown, TResult = unknown> = (
  ctx: ApiHandlerContext<TBody, TQuery>
) => Promise<NextResponse<TResult> | Response>;

/**
 * Wrapper universal para rutas API de Next.js:
 * - Aplica Rate Limiting para evitar bucles o abusos.
 * - Verifica Autenticación y Autorización por roles sin confiar en el cliente.
 * - Valida cuerpos JSON y query params con esquemas estrictos de Zod.
 * - Captura y reporta excepciones no controladas automáticamente a Sentry.
 */
export function withApi<TBody = unknown, TQuery = unknown, TResult = unknown>(
  options: WithApiOptions<TBody, TQuery>,
  handler: ApiHandler<TBody, TQuery, TResult>
) {
  return async function wrappedRoute(req: NextRequest): Promise<NextResponse | Response> {
    const requestId = getRequestId(req);

    // 1. Rate Limiting
    if (options.rateLimit) {
      const rlResult = checkRateLimit(req, options.rateLimit);
      if (!rlResult.allowed) {
        return rateLimitExceededResponse(rlResult.resetAt);
      }
    }

    // 2. Autenticación y Autorización
    let user: User | null = null;
    if (options.auth === 'admin') {
      const auth = await authorizeAdmin();
      if (!auth.ok) {
        return apiError(
          auth.status === 403 ? 'FORBIDDEN' : 'UNAUTHENTICATED',
          auth.error,
          requestId,
          auth.status
        );
      }
      user = auth.user;
    } else if (options.auth === true) {
      const auth = await authorizeUser();
      if (!auth.ok) {
        return apiError('UNAUTHENTICATED', auth.error, requestId, auth.status);
      }
      user = auth.user;
    }

    // 3. Validación de Query Parameters
    let validatedQuery = {} as TQuery;
    if (options.querySchema) {
      const rawQuery: Record<string, string> = {};
      req.nextUrl.searchParams.forEach((val, key) => {
        rawQuery[key] = val;
      });
      const parsed = options.querySchema.safeParse(rawQuery);
      if (!parsed.success) {
        const details = formatZodError(parsed.error);
        return apiError('VALIDATION_ERROR', 'Parámetros de consulta inválidos.', requestId, 400, details);
      }
      validatedQuery = parsed.data;
    }

    // 4. Validación de Body JSON
    let validatedBody = {} as TBody;
    if (options.bodySchema) {
      try {
        const rawBody = await req.json().catch(() => ({}));
        const parsed = options.bodySchema.safeParse(rawBody);
        if (!parsed.success) {
          const details = formatZodError(parsed.error);
          return apiError('VALIDATION_ERROR', 'Datos de entrada inválidos.', requestId, 400, details);
        }
        validatedBody = parsed.data;
      } catch (jsonErr) {
        return apiError('INVALID_JSON', 'El cuerpo de la solicitud no es un JSON válido.', requestId, 400);
      }
    }

    // 5. Ejecución del Handler con Trazabilidad y Sentry
    try {
      if (user) {
        Sentry.setUser({ id: user.id, email: user.email });
      }

      return await handler({
        req,
        user,
        body: validatedBody,
        query: validatedQuery,
        requestId,
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Error interno del servidor';
      
      // Enviar excepción completa a Sentry con contexto de la petición
      Sentry.captureException(err, {
        extra: {
          requestId,
          url: req.nextUrl.pathname,
          userId: user?.id,
          userEmail: user?.email,
        },
      });

      console.error(`[API Error] [${req.nextUrl.pathname}] [${requestId}]:`, err);
      return apiError('INTERNAL_ERROR', errorMsg, requestId, 500);
    }
  };
}
