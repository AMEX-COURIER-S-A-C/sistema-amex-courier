export const OFFICIAL_APP_ORIGIN = 'https://www.sistemaamexcourier.online';

const OFFICIAL_APP_HOSTNAMES = new Set([
  'sistemaamexcourier.online',
  'www.sistemaamexcourier.online',
]);

function isLocalHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  return normalized === 'localhost' || normalized === '127.0.0.1';
}

function parseCandidateUrl(raw: string, defaultProtocol: 'http' | 'https' = 'https'): URL | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const withProtocol = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(trimmed)
    ? trimmed
    : `${defaultProtocol}://${trimmed}`;

  try {
    const parsed = new URL(withProtocol);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Normaliza una URL o host candidato hacia el origen oficial canónico del sistema.
 * Devuelve null para dominios obsoletos (ej. sistema-amex.online) o no autorizados.
 */
export function normalizeAppOrigin(
  rawUrl: string | null | undefined,
  options?: { allowLocalhost?: boolean; defaultProtocol?: 'http' | 'https' }
): string | null {
  if (!rawUrl) return null;

  const parsed = parseCandidateUrl(rawUrl, options?.defaultProtocol ?? 'https');
  if (!parsed) return null;

  const hostname = parsed.hostname.toLowerCase();
  if (OFFICIAL_APP_HOSTNAMES.has(hostname)) {
    return OFFICIAL_APP_ORIGIN;
  }

  if (options?.allowLocalhost && isLocalHostname(hostname)) {
    return `${parsed.protocol}//${parsed.host}`;
  }

  return null;
}

export interface GetAppBaseUrlOptions {
  /** Permite conservar localhost/127.0.0.1 fuera de producción (ej. pruebas locales). */
  allowLocalhostInDev?: boolean;
}

/**
 * Resuelve la URL base oficial de la plataforma ERP AMEX Courier para enlaces en correos
 * y redirecciones de autenticación (`redirectTo`).
 * Garantiza que dominios antiguos o variables de entorno desactualizadas nunca se filtren.
 */
export function getAppBaseUrl(req?: Request, options?: GetAppBaseUrlOptions): string {
  if (process.env.FORCE_LOCAL_APP_URL === 'true') {
    return 'http://localhost:3000';
  }

  const allowLocalhost = Boolean(
    options?.allowLocalhostInDev && process.env.NODE_ENV !== 'production'
  );

  if (req) {
    const rawHost = req.headers.get('x-forwarded-host') || req.headers.get('host');
    const firstHost = rawHost?.split(',')[0]?.trim();
    if (firstHost) {
      const rawProto = req.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
      const defaultProto =
        firstHost.includes('localhost') || firstHost.includes('127.0.0.1') ? 'http' : 'https';
      const proto = rawProto === 'http' || rawProto === 'https' ? rawProto : defaultProto;

      const fromRequest = normalizeAppOrigin(`${proto}://${firstHost}`, {
        allowLocalhost,
        defaultProtocol: proto,
      });
      if (fromRequest) return fromRequest;
    }
  }

  const fromSiteEnv = normalizeAppOrigin(process.env.NEXT_PUBLIC_SITE_URL, { allowLocalhost });
  if (fromSiteEnv) return fromSiteEnv;

  const fromAppEnv = normalizeAppOrigin(process.env.NEXT_PUBLIC_APP_URL, { allowLocalhost });
  if (fromAppEnv) return fromAppEnv;

  return OFFICIAL_APP_ORIGIN;
}
