import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import {
  API_CONTRACT_VERSION,
  applyContractHeaders,
  applyRequestContextHeaders,
  getCorrelationId,
  getRequestId,
} from '@/lib/observability/request-context';

export type ApiHandler = (
  req: NextRequest,
  context?: { params?: Promise<Record<string, string | string[]>> }
) => Promise<NextResponse>;

export function withErrorHandler(handler: ApiHandler, serviceName = 'api-route'): ApiHandler {
  const routeLogger = logger.child(serviceName);

  return async (req: NextRequest, context?: { params?: Promise<Record<string, string | string[]>> }) => {
    const requestId = getRequestId(req);
    const correlationId = getCorrelationId(req);

    try {
      const response = await handler(req, context);
      applyRequestContextHeaders(response, requestId, correlationId);
      applyContractHeaders(response, requestId);
      return response;
    } catch (error: unknown) {
      routeLogger.error(
        `Error no controlado en ${req.method} ${req.nextUrl.pathname}`,
        error,
        {
          requestId,
          url: req.nextUrl.toString(),
          method: req.method,
        }
      );

      const isDev = process.env.NODE_ENV === 'development';
      const errorMessage =
        isDev && error instanceof Error
          ? error.message
          : 'Ocurrió un error inesperado en el servidor.';

      return NextResponse.json(
        {
          ok: false,
          error: errorMessage,
          code: 'INTERNAL_ERROR',
          requestId,
          contractVersion: API_CONTRACT_VERSION,
        },
        {
          status: 500,
          headers: {
            'x-request-id': requestId,
            'x-correlation-id': correlationId,
            'x-contract-version': API_CONTRACT_VERSION,
          },
        }
      );
    }
  };
}
