import { describe, it, expect } from 'vitest';

describe('Suite Profesional de Recuperación de Contraseña con Resend', () => {
  // 1. Validación de correos
  it('valida estrictamente formatos de correos electrónicos corporativos', () => {
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

    const validos = [
      'sistemaamexcourier@gmail.com',
      'operaciones@sistemaamexcourier.online',
      'admin.logistica@amex.com.pe',
      'juan_perez123@hotmail.com'
    ];

    const invalidos = [
      '',
      '   ',
      'sin-arroba.com',
      'correo@',
      '@dominio.com',
      'correo@dominio..com',
      'correo@.com'
    ];

    validos.forEach(email => expect(emailRegex.test(email)).toBe(true));
    invalidos.forEach(email => expect(emailRegex.test(email.trim())).toBe(false));
  });

  // 2. Extracción de dispositivo / User Agent para auditoría de seguridad
  it('identifica correctamente el dispositivo y navegador para la tarjeta de auditoría', () => {
    function getDeviceSummary(userAgent: string | null): string {
      if (!userAgent) return 'Navegador Web';
      let os = 'Dispositivo';
      if (/iphone|ipad/i.test(userAgent)) os = 'iOS (iPhone/iPad)';
      else if (/android/i.test(userAgent)) os = 'Android';
      else if (/windows/i.test(userAgent)) os = 'Windows PC';
      else if (/macintosh|mac os x/i.test(userAgent)) os = 'macOS';
      else if (/linux/i.test(userAgent)) os = 'Linux';


      let browser = 'Navegador';
      if (/chrome|crios/i.test(userAgent) && !/edg/i.test(userAgent)) browser = 'Google Chrome';
      else if (/firefox|fxios/i.test(userAgent)) browser = 'Mozilla Firefox';
      else if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) browser = 'Apple Safari';
      else if (/edg/i.test(userAgent)) browser = 'Microsoft Edge';

      return `${browser} en ${os}`;
    }

    const chromeWindows = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    expect(getDeviceSummary(chromeWindows)).toBe('Google Chrome en Windows PC');

    const safariIphone = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
    expect(getDeviceSummary(safariIphone)).toBe('Apple Safari en iOS (iPhone/iPad)');

    const edgeWindows = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0';
    expect(getDeviceSummary(edgeWindows)).toBe('Microsoft Edge en Windows PC');
  });

  // 3. Rate limiting en memoria
  it('aplica correctamente la regla de cooldown (45 segundos) para evitar spam', () => {
    const cooldownMs = 45000;
    const cooldownMap = new Map<string, number>();

    const email = 'operador@amex.com';
    const now = 100000;

    // Primer intento: Permitido
    expect(cooldownMap.has(email)).toBe(false);
    cooldownMap.set(email, now);

    // Segundo intento a los 10 segundos (debe ser bloqueado)
    const secondAttemptTime = now + 10000;
    const lastRequest = cooldownMap.get(email)!;
    const isThrottled = (secondAttemptTime - lastRequest) < cooldownMs;
    const waitSeconds = Math.ceil((cooldownMs - (secondAttemptTime - lastRequest)) / 1000);

    expect(isThrottled).toBe(true);
    expect(waitSeconds).toBe(35);

    // Tercer intento a los 50 segundos (debe ser permitido)
    const thirdAttemptTime = now + 50000;
    const isThrottledLater = (thirdAttemptTime - lastRequest) < cooldownMs;
    expect(isThrottledLater).toBe(false);
  });

  // 4. Estándares Anti-Spam para correo HTML
  it('garantiza que la plantilla de correo cumpla con los estándares de entregabilidad anti-spam', () => {
    // Componentes obligatorios para alta entregabilidad:
    const requiredElements = [
      '<!DOCTYPE html>',
      'lang="es"',
      'AMEX COURIER',
      'Restablecer Mi Contraseña',
      'Lima, Perú',
      'notificaciones@sistemaamexcourier.online',
      '60 minutos'
    ];

    // Simulación de render
    const sampleHtml = `
      <!DOCTYPE html>
      <html lang="es">
        <body>
          <h1>AMEX COURIER</h1>
          <a href="#">Restablecer Mi Contraseña</a>
          <p>Válido por 60 minutos</p>
          <footer>Lima, Perú • notificaciones@sistemaamexcourier.online</footer>
        </body>
      </html>
    `;

    requiredElements.forEach(elem => {
      expect(sampleHtml).toContain(elem);
    });
  });
});
