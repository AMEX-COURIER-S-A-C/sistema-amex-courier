import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  API_CONTRACT_VERSION,
  applyContractHeaders,
  applyRequestContextHeaders,
} from '@/lib/observability/request-context';

export const ApiErrorSchema = z.object({
  ok: z.literal(false),
  error: z.string().min(1),
  code: z.string().min(1),
  details: z.unknown().optional(),
  requestId: z.string().min(1),
  contractVersion: z.string().min(1),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;

export interface ApiSuccess<T> {
  ok: true;
  data: T;
  requestId: string;
  contractVersion: typeof API_CONTRACT_VERSION;
}

export function apiSuccess<T>(data: T, requestId: string, init?: ResponseInit) {
  const response = NextResponse.json<ApiSuccess<T>>(
    {
      ok: true,
      data,
      requestId,
      contractVersion: API_CONTRACT_VERSION,
    },
    init
  );
  applyRequestContextHeaders(response, requestId);
  applyContractHeaders(response, requestId);
  return response;
}

export function apiError(
  code: string,
  message: string,
  requestId: string,
  status: number,
  details?: unknown
) {
  const response = NextResponse.json(
    {
      ok: false,
      error: message,
      code,
      ...(details === undefined ? {} : { details }),
      requestId,
      contractVersion: API_CONTRACT_VERSION,
    },
    { status }
  );
  applyRequestContextHeaders(response, requestId);
  applyContractHeaders(response, requestId);
  return response;
}
