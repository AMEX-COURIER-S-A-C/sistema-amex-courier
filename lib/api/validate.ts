import { NextRequest, NextResponse } from 'next/server';
import { ZodSchema, ZodError } from 'zod';
import { apiError } from '@/lib/contracts/api';
import { getRequestId } from '@/lib/observability/request-context';

export function formatZodError(error: ZodError) {
  return error.issues.map((issue) => ({
    field: issue.path.join('.'),
    message: issue.message,
  }));
}

export async function validateBody<T>(
  schema: ZodSchema<T>,
  req: NextRequest
): Promise<{ ok: true; data: T } | { ok: false; response: NextResponse }> {
  try {
    const raw = await req.json().catch(() => ({}));
    const result = schema.safeParse(raw);
    if (!result.success) {
      const details = formatZodError(result.error);
      return {
        ok: false,
        response: apiError('VALIDATION_ERROR', 'Datos de entrada inválidos.', getRequestId(req), 400, details),
      };
    }
    return { ok: true, data: result.data };
  } catch {
    return {
      ok: false,
      response: apiError(
        'INVALID_JSON',
        'El cuerpo de la solicitud no es un JSON válido.',
        getRequestId(req),
        400
      ),
    };
  }
}

export function validateQuery<T>(
  schema: ZodSchema<T>,
  searchParams: URLSearchParams
): { ok: true; data: T } | { ok: false; response: NextResponse } {
  const raw: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    raw[key] = value;
  });

  const result = schema.safeParse(raw);
  if (!result.success) {
    const details = formatZodError(result.error);
    return {
      ok: false,
      response: apiError(
        'INVALID_QUERY',
        'Parámetros de consulta inválidos.',
        getRequestId({ headers: new Headers() }),
        400,
        details
      ),
    };
  }
  return { ok: true, data: result.data };
}
