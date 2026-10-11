export const REQUEST_ID_HEADER = 'x-request-id';
export const CORRELATION_ID_HEADER = 'x-correlation-id';
export const CONTRACT_VERSION_HEADER = 'x-contract-version';
export const API_CONTRACT_VERSION = 'v1';

function createId(): string {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function getRequestId(request: Pick<Request, 'headers'>): string {
  return request.headers.get(REQUEST_ID_HEADER)?.trim() || createId();
}

export function getCorrelationId(request: Pick<Request, 'headers'>): string {
  return request.headers.get(CORRELATION_ID_HEADER)?.trim() || getRequestId(request);
}

export function applyRequestContextHeaders(
  response: Response,
  requestId: string,
  correlationId = requestId
): Response {
  response.headers.set(REQUEST_ID_HEADER, requestId);
  response.headers.set(CORRELATION_ID_HEADER, correlationId);
  return response;
}

export function applyContractHeaders(response: Response, requestId?: string): Response {
  response.headers.set(CONTRACT_VERSION_HEADER, API_CONTRACT_VERSION);
  if (requestId) response.headers.set(REQUEST_ID_HEADER, requestId);
  return response;
}
