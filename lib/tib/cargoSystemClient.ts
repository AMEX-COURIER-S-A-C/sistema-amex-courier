import {
  CARGO_SYNC_STATUSES,
  type CargoSystemStatus,
  type RawCargoWarehouseItem,
} from '@/lib/tib/cargoSystemHelpers';

export const DEFAULT_TIB_V2_API_URL = 'https://api.tibgrupo.com';

export interface CargoSystemCredentials {
  baseUrl: string;
  email: string;
  password: string;
}

export interface CargoSystemSession {
  token: string;
  refresh: string | null;
  obtainedAt: number;
}

export interface CargoSystemClientOptions {
  credentials?: CargoSystemCredentials;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  maxRetries?: number;
}

export interface FetchWarehousesQuery {
  status?: CargoSystemStatus;
  startDate?: string;
  endDate?: string;
  warehouseId?: number;
  tracking?: string;
  clientId?: number;
}

export function isTibV2Configured(): boolean {
  const email = (process.env.TIB_V2_EMAIL || '').trim();
  const password = (process.env.TIB_V2_PASSWORD || '').trim();
  return Boolean(email && password);
}

export function getTibV2Credentials(): CargoSystemCredentials {
  const baseUrl = (process.env.TIB_V2_API_URL || DEFAULT_TIB_V2_API_URL)
    .trim()
    .replace(/\/+$/, '');
  const email = (process.env.TIB_V2_EMAIL || '').trim();
  const password = (process.env.TIB_V2_PASSWORD || '').trim();

  if (!email || !password) {
    throw new Error(
      'Faltan las credenciales TIB_V2_EMAIL o TIB_V2_PASSWORD en las variables de entorno.'
    );
  }

  return { baseUrl, email, password };
}

const sessionCacheByKey = new Map<string, CargoSystemSession>();

function getCacheKey(creds: CargoSystemCredentials): string {
  return `${creds.baseUrl}::${creds.email.toLowerCase()}`;
}

function isRetryableNetworkError(err: unknown): boolean {
  const msg = String(err instanceof Error ? err.message : err || '').toLowerCase();
  return (
    msg.includes('http 5') ||
    msg.includes('http 429') ||
    msg.includes('timeout') ||
    msg.includes('aborted') ||
    msg.includes('fetch failed') ||
    msg.includes('econnreset') ||
    msg.includes('etimedout') ||
    msg.includes('terminated')
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function clearCargoSystemSessionCache(): void {
  sessionCacheByKey.clear();
}

/**
 * Cliente HTTP autenticado para la API TIB v2 (Cargo System - api.tibgrupo.com).
 * Maneja login JWT, renovación automática ante HTTP 401 vía /user/refresh y re-login de respaldo.
 */
export class CargoSystemClient {
  private readonly creds: CargoSystemCredentials;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly cacheKey: string;

  constructor(options?: CargoSystemClientOptions) {
    this.creds = options?.credentials ?? getTibV2Credentials();
    this.fetchImpl = options?.fetchImpl ?? fetch;
    this.timeoutMs = options?.timeoutMs ?? 30000;
    this.maxRetries = options?.maxRetries ?? 3;
    this.cacheKey = getCacheKey(this.creds);
  }

  private getSession(): CargoSystemSession | null {
    return sessionCacheByKey.get(this.cacheKey) ?? null;
  }

  private setSession(session: CargoSystemSession): void {
    sessionCacheByKey.set(this.cacheKey, session);
  }

  private clearSession(): void {
    sessionCacheByKey.delete(this.cacheKey);
  }

  async login(): Promise<CargoSystemSession> {
    const res = await this.fetchImpl(`${this.creds.baseUrl}/user/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: this.creds.email,
        password: this.creds.password,
      }),
      signal: AbortSignal.timeout(this.timeoutMs),
      cache: 'no-store',
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} al autenticar en TIB v2 (/user/login)`);
    }

    const json = (await res.json().catch(() => null)) as { token?: string; refresh?: string } | null;
    if (!json?.token) {
      throw new Error('La respuesta de /user/login en TIB v2 no devolvió token JWT.');
    }

    const session: CargoSystemSession = {
      token: json.token,
      refresh: json.refresh || null,
      obtainedAt: Date.now(),
    };
    this.setSession(session);
    return session;
  }

  async refreshOrRelogin(): Promise<CargoSystemSession> {
    const current = this.getSession();
    if (current?.refresh) {
      try {
        const res = await this.fetchImpl(`${this.creds.baseUrl}/user/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: current.refresh }),
          signal: AbortSignal.timeout(this.timeoutMs),
          cache: 'no-store',
        });

        if (res.ok) {
          const json = (await res.json().catch(() => null)) as {
            token?: string;
            refresh?: string;
          } | null;
          if (json?.token) {
            const refreshed: CargoSystemSession = {
              token: json.token,
              refresh: json.refresh || current.refresh,
              obtainedAt: Date.now(),
            };
            this.setSession(refreshed);
            return refreshed;
          }
        }
      } catch {
        // Fallback inmediato a re-login completo
      }
    }

    this.clearSession();
    return this.login();
  }

  async getValidToken(): Promise<string> {
    const cached = this.getSession();
    if (cached?.token) {
      return cached.token;
    }
    const fresh = await this.login();
    return fresh.token;
  }

  async authorizedFetch(pathWithQuery: string, init?: RequestInit): Promise<Response> {
    const url = `${this.creds.baseUrl}${pathWithQuery.startsWith('/') ? '' : '/'}${pathWithQuery}`;
    let lastError: unknown = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        let token = await this.getValidToken();
        let res = await this.fetchImpl(url, {
          ...init,
          headers: {
            ...(init?.headers || {}),
            Authorization: `Bearer ${token}`,
          },
          signal: init?.signal ?? AbortSignal.timeout(this.timeoutMs),
          cache: 'no-store',
        });

        if (res.status === 401) {
          const refreshed = await this.refreshOrRelogin();
          token = refreshed.token;
          res = await this.fetchImpl(url, {
            ...init,
            headers: {
              ...(init?.headers || {}),
              Authorization: `Bearer ${token}`,
            },
            signal: init?.signal ?? AbortSignal.timeout(this.timeoutMs),
            cache: 'no-store',
          });
        }

        if (res.status >= 500 || res.status === 429) {
          throw new Error(`HTTP ${res.status} en TIB v2 (${pathWithQuery})`);
        }

        return res;
      } catch (err) {
        lastError = err;
        if (attempt < this.maxRetries && isRetryableNetworkError(err)) {
          await sleep(1000 * attempt);
          continue;
        }
        throw err;
      }
    }

    throw lastError instanceof Error ? lastError : new Error('Error consultando TIB v2');
  }

  async fetchWarehouses(query?: FetchWarehousesQuery): Promise<RawCargoWarehouseItem[]> {
    const params = new URLSearchParams();
    if (query?.status) params.set('status', query.status);
    if (query?.startDate) params.set('startDate', query.startDate);
    if (query?.endDate) params.set('endDate', query.endDate);
    if (query?.warehouseId && Number.isSafeInteger(query.warehouseId) && query.warehouseId > 0) {
      params.set('warehouseId', String(query.warehouseId));
    }
    if (query?.tracking) params.set('tracking', query.tracking);
    if (query?.clientId && Number.isSafeInteger(query.clientId) && query.clientId > 0) {
      params.set('clientId', String(query.clientId));
    }

    const qs = params.toString();
    const path = `/warehouse/warehouse/find-all-warehouse${qs ? `?${qs}` : ''}`;
    const res = await this.authorizedFetch(path, { method: 'GET' });

    if (!res.ok) {
      throw new Error(
        `HTTP ${res.status} al consultar warehouses en TIB v2 (${query?.status || 'ALL'})`
      );
    }

    const json = (await res.json()) as { data?: RawCargoWarehouseItem[] };
    const rows = Array.isArray(json?.data) ? json.data : [];
    return rows.map((row) => ({
      ...row,
      _fetchedStatus: query?.status || row.status || 'RECEIVED',
    }));
  }

  /**
   * Consulta un paquete individual en Cargo System por ID numérico de warehouse.
   */
  async fetchWarehouseByNumericId(numericId: number): Promise<RawCargoWarehouseItem | null> {
    if (!Number.isSafeInteger(numericId) || numericId <= 0) return null;
    const rows = await this.fetchWarehouses({ warehouseId: numericId });
    if (rows.length === 0) return null;
    const exact = rows.find((r) => Number(r.id) === numericId);
    return exact || rows[0];
  }

  /**
   * Consulta múltiples estados en paralelo en Cargo System (por defecto los 5 estados activos).
   */
  async fetchMultipleStatuses(
    statuses: readonly CargoSystemStatus[] = CARGO_SYNC_STATUSES,
    options?: { startDate?: string; endDate?: string }
  ): Promise<RawCargoWarehouseItem[]> {
    const groups = await Promise.all(
      statuses.map((st) =>
        this.fetchWarehouses({
          status: st,
          startDate: options?.startDate,
          endDate: options?.endDate,
        })
      )
    );
    return groups.flat();
  }

  /**
   * Descarga el Ticket PDF de un Warehouse desde Cargo System usando Bearer JWT.
   */
  async fetchWarehousePdf(numericId: number): Promise<{
    buffer: ArrayBuffer;
    contentType: string;
    endpoint: string;
  } | null> {
    if (!Number.isSafeInteger(numericId) || numericId <= 0) return null;

    const candidateEndpoints = [
      `/warehouse/warehouse/pdf/${numericId}/preview`,
      `/warehouse/warehouse/receipt/pdf/${numericId}/preview`,
    ];

    for (const endpoint of candidateEndpoints) {
      try {
        const res = await this.authorizedFetch(endpoint, { method: 'GET' });
        const contentType = (res.headers.get('content-type') || '').toLowerCase();
        if (res.ok && contentType.includes('application/pdf')) {
          const buffer = await res.arrayBuffer();
          if (buffer.byteLength > 0) {
            return {
              buffer,
              contentType: 'application/pdf',
              endpoint,
            };
          }
        }
      } catch {
        // Intentar siguiente endpoint candidato
      }
    }

    return null;
  }
}

export function createCargoSystemClient(options?: CargoSystemClientOptions): CargoSystemClient {
  return new CargoSystemClient(options);
}
