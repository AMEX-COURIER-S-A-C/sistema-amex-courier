import fs from 'fs';

// Read .env.local
const envContent = fs.readFileSync('.env.local', 'utf-8');
const matchKey = envContent.match(/RESEND_API_KEY=([^\r\n]+)/);
const apiKey = matchKey ? matchKey[1].trim() : '';

async function sendTest() {
  const recipient = 'sistemaamexcourier@gmail.com';
  const fromEmail = 'AMEX Courier <notificaciones@sistemaamexcourier.online>';
  const sentDate = new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' });

  console.log(`Enviando correo de prueba a ${recipient} desde ${fromEmail}...`);

  const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verificación de Sistema AMEX Courier</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; max-width: 600px; width: 100%;">
          
          <!-- Encabezado Corporativo -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); padding: 32px 30px; text-align: center;">
              <span style="display: inline-block; background: rgba(59, 130, 246, 0.2); border: 1px solid rgba(147, 197, 253, 0.3); color: #93c5fd; padding: 4px 14px; border-radius: 20px; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 12px;">
                Infraestructura Transaccional
              </span>
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">
                AMEX COURIER
              </h1>
              <p style="color: #cbd5e1; margin: 6px 0 0 0; font-size: 13px;">
                Sistema de Gestión Logística & Envíos Internacionales
              </p>
            </td>
          </tr>

          <!-- Insignia de Éxito -->
          <tr>
            <td style="padding: 24px 30px 10px 30px; text-align: center;">
              <div style="display: inline-flex; align-items: center; justify-content: center; width: 56px; height: 56px; background-color: #ecfdf5; border-radius: 50%; border: 2px solid #a7f3d0; margin-bottom: 12px;">
                <span style="font-size: 28px; line-height: 1; color: #059669;">✓</span>
              </div>
              <h2 style="color: #0f172a; margin: 0; font-size: 20px; font-weight: 700;">
                Conexión con Resend Exitosa
              </h2>
              <p style="color: #64748b; margin: 8px 0 0 0; font-size: 14px; line-height: 1.5;">
                Las credenciales de acceso total han sido verificadas y vinculadas correctamente con tu dominio corporativo.
              </p>
            </td>
          </tr>

          <!-- Cuadro de Parámetros Verificados -->
          <tr>
            <td style="padding: 15px 30px 25px 30px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px;">
                <tr>
                  <td style="padding: 8px 12px; font-size: 13px; color: #64748b; font-weight: 600; width: 40%;">Dominio Verificado:</td>
                  <td style="padding: 8px 12px; font-size: 13px; color: #0f172a; font-weight: 700;">sistemaamexcourier.online</td>
                </tr>
                <tr>
                  <td style="padding: 8px 12px; font-size: 13px; color: #64748b; font-weight: 600; border-top: 1px solid #f1f5f9;">Estado Autenticación:</td>
                  <td style="padding: 8px 12px; font-size: 13px; color: #15803d; font-weight: 700; border-top: 1px solid #f1f5f9;">SPF & DKIM Activos (Alta Entregabilidad)</td>
                </tr>
                <tr>
                  <td style="padding: 8px 12px; font-size: 13px; color: #64748b; font-weight: 600; border-top: 1px solid #f1f5f9;">Proyecto en Vercel:</td>
                  <td style="padding: 8px 12px; font-size: 13px; color: #0f172a; font-weight: 700;">sistema-amex-courier</td>
                </tr>
                <tr>
                  <td style="padding: 8px 12px; font-size: 13px; color: #64748b; font-weight: 600; border-top: 1px solid #f1f5f9;">Fecha y Hora (Lima):</td>
                  <td style="padding: 8px 12px; font-size: 13px; color: #0f172a; font-weight: 700;">${sentDate}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 12px; font-size: 13px; color: #64748b; font-weight: 600; border-top: 1px solid #f1f5f9;">Destinatario Autorizado:</td>
                  <td style="padding: 8px 12px; font-size: 13px; color: #2563eb; font-weight: 700; border-top: 1px solid #f1f5f9;">${recipient}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Funcionalidades Listas -->
          <tr>
            <td style="padding: 0 30px 25px 30px;">
              <p style="font-size: 13px; font-weight: 700; color: #334155; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 0.5px;">
                Módulos Habilitados para Envíos Automáticos:
              </p>
              <ul style="margin: 0; padding-left: 20px; color: #475569; font-size: 13px; line-height: 1.8;">
                <li><strong>Reporte Miami 7:30 AM:</strong> Envío diario consolidado de paquetes AMEX recibidos.</li>
                <li><strong>Avisos de Almacén:</strong> Notificación automática al cliente cuando su paquete está en Lima.</li>
                <li><strong>Comprobantes de Pago:</strong> Envío de liquidaciones y confirmaciones de cobro.</li>
                <li><strong>Auditoría & Despacho:</strong> Alertas operativas y actas de entrega con chofer.</li>
              </ul>
            </td>
          </tr>

          <!-- Pie de Página Formal Anti-Spam -->
          <tr>
            <td style="background-color: #f1f5f9; padding: 22px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; font-size: 12px; color: #64748b; font-weight: 600;">
                AMEX Courier S.A.C. — Sistema Operativo Interno
              </p>
              <p style="margin: 4px 0 0 0; font-size: 11px; color: #94a3b8;">
                Este es un correo transaccional generado automáticamente por el sistema logístico de AMEX Courier.
              </p>
              <p style="margin: 4px 0 0 0; font-size: 11px; color: #94a3b8;">
                Lima, Perú • © 2026 AMEX Courier. Todos los derechos reservados.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const textContent = `
AMEX COURIER - SISTEMA OPERATIVO
Verificación de Conexión con Resend

Hola,
Este es un correo de prueba oficial generado para confirmar la vinculación exitosa entre el Sistema AMEX Courier y la plataforma de envíos Resend.

Parámetros Verificados:
- Dominio: sistemaamexcourier.online (SPF y DKIM verificados)
- Proyecto Vercel: sistema-amex-courier
- Fecha y Hora (Lima): ${sentDate}
- Destinatario: ${recipient}

Módulos Habilitados:
1. Reporte Diario Miami 7:30 AM (Submódulo 17.2)
2. Notificaciones de Paquetes en Almacén Lince (Módulo 3 / 6)
3. Comprobantes de Cobro y Liquidación (Módulo 4)
4. Despacho y Actas de Entrega (Módulo 16)

AMEX Courier S.A.C.
Lima, Perú.
  `.trim();

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [recipient],
      reply_to: 'notificaciones@sistemaamexcourier.online',
      subject: 'Verificación Exitosa: Sistema AMEX Courier conectado con Resend',
      html: htmlContent,
      text: textContent,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    console.error('Error al enviar correo:', data);
  } else {
    console.log('¡Correo enviado con éxito!');
    console.log('ID del Mensaje en Resend:', data.id);
  }
}

sendTest().catch(console.error);
