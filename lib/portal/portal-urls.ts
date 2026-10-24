/**
 * Obtiene la URL base correcta para el Portal de Clientes, adaptándose dinámicamente
 * entre desarrollo local (localhost:3000) y producción (clientes.sistemaamexcourier.online).
 */
export function getPortalBaseUrl(req?: Request): string {
  // 1. Si la petición trae encabezados de host
  if (req) {
    const forwardedHost = req.headers.get('x-forwarded-host');
    const host = forwardedHost || req.headers.get('host');
    const proto = req.headers.get('x-forwarded-proto') || (host?.includes('localhost') ? 'http' : 'https');

    if (host) {
      // Si estamos en localhost
      if (host.includes('localhost') || host.includes('127.0.0.1')) {
        return `${proto}://${host}`;
      }
      // Si el host ya es el subdominio de clientes o el dominio principal
      return `${proto}://${host}`;
    }
  }

  // 2. Variable de entorno explícita
  if (process.env.NEXT_PUBLIC_PORTAL_URL) {
    return process.env.NEXT_PUBLIC_PORTAL_URL.replace(/\/$/, '');
  }

  // 3. Producción
  if (process.env.NODE_ENV === 'production') {
    return 'https://clientes.sistemaamexcourier.online';
  }

  // 4. Fallback desarrollo
  return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
}
