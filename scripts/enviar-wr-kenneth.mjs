import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Cargar variables de entorno desde .env.local
const envConfig = dotenv.parse(fs.readFileSync('.env.local', 'utf-8'));
const resendApiKey = envConfig.RESEND_API_KEY || envConfig.API_KEY_RESEND || '';
const fromEmail = envConfig.RESEND_FROM_EMAIL || 'AMEX Courier <notificaciones@sistemaamexcourier.online>';
const tibApiUrl = envConfig.TIB_API_URL || 'https://www.tibcourier.com/api/list-warehouse';
const tibEmail = envConfig.TIB_API_EMAIL || '';
const tibPassword = envConfig.TIB_API_PASSWORD || '';
const recipientEmail = 'ianmaldo05@gmail.com';

const TIB_MEDIA_BASE_URL = 'https://www.tibcourier.com/global-courier/ajax/';

async function main() {
  console.log('🚀 [1/4] Consultando la API oficial de TIB Courier...');
  
  // Consultar en TIB en los estados disponibles
  const statuses = ['ENVIADO', 'RECIBIDO', 'ENTREGADO'];
  let matchedPackage = null;
  let currentStatus = '';

  for (const st of statuses) {
    const res = await fetch(tibApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: tibEmail, password: tibPassword, status: st }),
    });

    if (!res.ok) {
      console.warn(`⚠️ Error al consultar estado ${st} en TIB: HTTP ${res.status}`);
      continue;
    }

    const payload = await res.json();
    const items = Array.isArray(payload) ? payload : (payload.data || []);
    
    // Buscar paquete perteneciente a Kenneth Maldonado
    const found = items.find((item) => {
      const name = (item.nclient || '').toUpperCase();
      return name.includes('KENNETH') && name.includes('MALDONADO');
    });

    if (found) {
      matchedPackage = found;
      currentStatus = st;
      break;
    }
  }

  if (!matchedPackage) {
    throw new Error('❌ No se encontró ningún Warehouse Receipt (WR) para Kenneth Maldonado en la API de TIB.');
  }

  console.log(`✅ Paquete encontrado en TIB (Estado: ${currentStatus}):`);
  console.log(`   - WR: ${matchedPackage.wr}`);
  console.log(`   - Cliente: ${matchedPackage.nclient}`);
  console.log(`   - Tracking: ${matchedPackage.tracking}`);
  console.log(`   - Peso: ${matchedPackage.weight} lbs`);
  console.log(`   - Contenedor: ${matchedPackage.container}`);
  console.log(`   - Rack Almacén: ${matchedPackage.rack}`);
  console.log(`   - Registro: ${matchedPackage.fecRegister}`);
  console.log(`   - Modificación: ${matchedPackage.fecModify}`);

  const photoUrl = matchedPackage.img ? `${TIB_MEDIA_BASE_URL}${matchedPackage.img.replace(/^\/+/, '')}` : null;
  const ticketUrl = matchedPackage.ticket ? `${TIB_MEDIA_BASE_URL}${matchedPackage.ticket.replace(/^\/+/, '')}` : null;

  console.log('📥 [2/4] Descargando comprobantes adjuntos desde TIB...');
  const attachments = [];

  // Descargar PDF del Ticket oficial si existe
  if (ticketUrl) {
    try {
      console.log(`   Descargando ticket: ${ticketUrl}`);
      const tRes = await fetch(ticketUrl);
      if (tRes.ok) {
        const ticketBuffer = Buffer.from(await tRes.arrayBuffer());
        attachments.push({
          filename: `Ticket_WR_${matchedPackage.wr}.pdf`,
          content: ticketBuffer.toString('base64'),
        });
        console.log(`   ✅ Ticket PDF descargado (${ticketBuffer.byteLength} bytes)`);
      }
    } catch (e) {
      console.warn('   ⚠️ No se pudo descargar el ticket PDF:', e.message);
    }
  }

  // Descargar Foto oficial del paquete si existe
  if (photoUrl) {
    try {
      console.log(`   Descargando foto: ${photoUrl}`);
      const pRes = await fetch(photoUrl);
      if (pRes.ok) {
        const photoBuffer = Buffer.from(await pRes.arrayBuffer());
        attachments.push({
          filename: `Foto_Paquete_WR_${matchedPackage.wr}.png`,
          content: photoBuffer.toString('base64'),
        });
        console.log(`   ✅ Foto de paquete descargada (${photoBuffer.byteLength} bytes)`);
      }
    } catch (e) {
      console.warn('   ⚠️ No se pudo descargar la foto:', e.message);
    }
  }

  console.log('✉️ [3/4] Preparando plantilla de correo con diseño oficial AMEX Courier...');
  const canonicalWr = matchedPackage.wr.startsWith('WR') ? matchedPackage.wr : `WR${matchedPackage.wr}`;
  const nowLima = new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' });

  const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Notificación de Warehouse Receipt (WR) - AMEX Courier</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0f172a; padding: 35px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="620" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.3); border: 1px solid #e2e8f0; max-width: 620px; width: 100%;">
          
          <!-- Encabezado Corporativo Premium -->
          <tr>
            <td style="background: linear-gradient(135deg, #091e42 0%, #0052cc 60%, #0065ff 100%); padding: 36px 32px; text-align: center;">
              <span style="display: inline-block; background: rgba(255, 255, 255, 0.18); border: 1px solid rgba(255, 255, 255, 0.35); color: #ffffff; padding: 5px 16px; border-radius: 20px; font-size: 11px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; margin-bottom: 14px;">
                AMEX COURIER LOGISTICS
              </span>
              <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">
                Detalle de Warehouse Receipt
              </h1>
              <p style="color: #e0e7ff; margin: 8px 0 0 0; font-size: 14px;">
                Información oficial del paquete registrada vía TIB Courier API
              </p>
            </td>
          </tr>

          <!-- Tarjeta de Estado del WR -->
          <tr>
            <td style="padding: 26px 32px 12px 32px; text-align: center;">
              <div style="display: inline-block; background-color: #eff6ff; border: 2px solid #bfdbfe; border-radius: 12px; padding: 12px 24px; margin-bottom: 12px;">
                <span style="font-size: 12px; color: #1d4ed8; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Warehouse Receipt (WR)</span>
                <div style="font-size: 24px; font-weight: 800; color: #1e3a8a; letter-spacing: 1px; margin-top: 4px;">
                  ${canonicalWr}
                </div>
              </div>
              <div>
                <span style="display: inline-block; background-color: #dbeafe; color: #1e40af; border: 1px solid #93c5fd; padding: 4px 14px; border-radius: 16px; font-size: 12px; font-weight: 700; text-transform: uppercase;">
                  Estado: ${matchedPackage.status || currentStatus}
                </span>
              </div>
            </td>
          </tr>

          <!-- Tabla de Datos Técnicos y Operativos -->
          <tr>
            <td style="padding: 16px 32px 24px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                <tr>
                  <td style="padding: 12px 16px; font-size: 13px; color: #64748b; font-weight: 600; width: 42%; border-bottom: 1px solid #e2e8f0;">
                    Destinatario / Cliente:
                  </td>
                  <td style="padding: 12px 16px; font-size: 14px; color: #0f172a; font-weight: 700; border-bottom: 1px solid #e2e8f0;">
                    ${matchedPackage.nclient}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; font-size: 13px; color: #64748b; font-weight: 600; border-bottom: 1px solid #e2e8f0;">
                    Número de Tracking:
                  </td>
                  <td style="padding: 12px 16px; font-size: 13px; color: #0f172a; font-family: monospace; font-weight: 700; border-bottom: 1px solid #e2e8f0;">
                    ${matchedPackage.tracking}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; font-size: 13px; color: #64748b; font-weight: 600; border-bottom: 1px solid #e2e8f0;">
                    Transportista / Courier:
                  </td>
                  <td style="padding: 12px 16px; font-size: 13px; color: #0f172a; font-weight: 600; border-bottom: 1px solid #e2e8f0;">
                    ${matchedPackage.postal || 'OTRO'} (Amazon Logistics TBA)
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; font-size: 13px; color: #64748b; font-weight: 600; border-bottom: 1px solid #e2e8f0;">
                    Tipo de Empaque:
                  </td>
                  <td style="padding: 12px 16px; font-size: 13px; color: #0f172a; font-weight: 600; border-bottom: 1px solid #e2e8f0;">
                    ${matchedPackage.container || 'CAJA'}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; font-size: 13px; color: #64748b; font-weight: 600; border-bottom: 1px solid #e2e8f0;">
                    Peso Registrado:
                  </td>
                  <td style="padding: 12px 16px; font-size: 14px; color: #0284c7; font-weight: 700; border-bottom: 1px solid #e2e8f0;">
                    ${matchedPackage.weight} lbs (${(parseFloat(matchedPackage.weight) * 0.453592).toFixed(2)} kg)
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; font-size: 13px; color: #64748b; font-weight: 600; border-bottom: 1px solid #e2e8f0;">
                    Ubicación Almacén (Rack):
                  </td>
                  <td style="padding: 12px 16px; font-size: 13px; color: #0f172a; font-weight: 600; border-bottom: 1px solid #e2e8f0;">
                    ${matchedPackage.rack || 'A2P21'}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; font-size: 13px; color: #64748b; font-weight: 600; border-bottom: 1px solid #e2e8f0;">
                    Fecha de Ingreso a Almacén:
                  </td>
                  <td style="padding: 12px 16px; font-size: 13px; color: #0f172a; font-weight: 600; border-bottom: 1px solid #e2e8f0;">
                    ${matchedPackage.fecRegister || 'No especificada'}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; font-size: 13px; color: #64748b; font-weight: 600;">
                    Última Modificación en TIB:
                  </td>
                  <td style="padding: 12px 16px; font-size: 13px; color: #0f172a; font-weight: 600;">
                    ${matchedPackage.fecModify || 'No especificada'}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Enlaces / Acciones -->
          <tr>
            <td style="padding: 0 32px 28px 32px; text-align: center;">
              <p style="font-size: 13px; color: #475569; margin: 0 0 16px 0; line-height: 1.5;">
                Hemos adjuntado el <strong>Ticket oficial en PDF</strong> y la <strong>Foto del paquete</strong> directamente a este correo para tu respaldo y control logístico.
              </p>
              ${ticketUrl ? `
                <a href="${ticketUrl}" target="_blank" style="display: inline-block; background-color: #0052cc; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 700; font-size: 13px; margin: 4px;">
                  📄 Ver Ticket Original en TIB
                </a>
              ` : ''}
              ${photoUrl ? `
                <a href="${photoUrl}" target="_blank" style="display: inline-block; background-color: #0f172a; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 700; font-size: 13px; margin: 4px;">
                  📸 Ver Foto del Paquete
                </a>
              ` : ''}
            </td>
          </tr>

          <!-- Pie de Página Formal -->
          <tr>
            <td style="background-color: #f1f5f9; padding: 22px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; font-size: 12px; color: #64748b; font-weight: 600;">
                AMEX Courier S.A.C. — Integración Operativa TIB API & Resend
              </p>
              <p style="margin: 4px 0 0 0; font-size: 11px; color: #94a3b8;">
                Fecha de emisión: ${nowLima} (Hora de Lima, Perú).
              </p>
              <p style="margin: 4px 0 0 0; font-size: 11px; color: #94a3b8;">
                Sistema logístico automatizado. Todos los derechos reservados © 2026.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const textContent = `
AMEX COURIER - DETALLE DE WAREHOUSE RECEIPT (WR)
================================================
Notificación enviada a: ${recipientEmail}
Fecha de emisión: ${nowLima}

Detalles del Paquete (Vía API oficial TIB Courier):
- WR Oficial: ${canonicalWr} (seqwr: ${matchedPackage.seqwr})
- Cliente: ${matchedPackage.nclient} (ID: ${matchedPackage.iclient})
- Número de Tracking: ${matchedPackage.tracking}
- Transportista: ${matchedPackage.postal || 'OTRO'} (Amazon Logistics TBA)
- Estado: ${matchedPackage.status || currentStatus}
- Tipo de Contenedor: ${matchedPackage.container || 'CAJA'}
- Peso Registrado: ${matchedPackage.weight} lbs
- Ubicación / Rack Almacén: ${matchedPackage.rack}
- Fecha de Registro: ${matchedPackage.fecRegister}
- Fecha de Modificación: ${matchedPackage.fecModify}

Enlaces de Verificación en TIB:
- Ticket PDF: ${ticketUrl || 'No disponible'}
- Foto del Paquete: ${photoUrl || 'No disponible'}

Se adjuntan los comprobantes oficiales (Ticket PDF y Foto) en este correo.
AMEX Courier S.A.C.
Lima, Perú.
  `.trim();

  console.log(`📡 [4/4] Conectando a la API de Resend y enviando correo a ${recipientEmail}...`);

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [recipientEmail],
      reply_to: 'notificaciones@sistemaamexcourier.online',
      subject: `AMEX Courier - Warehouse Receipt ${canonicalWr}: ${matchedPackage.nclient}`,
      html: htmlContent,
      text: textContent,
      attachments: attachments.length > 0 ? attachments : undefined,
    }),
  });

  const resData = await response.json();

  if (!response.ok) {
    console.error('❌ Error devuelto por Resend API:', resData);
    process.exit(1);
  }

  console.log('\n=============================================');
  console.log('🎉 ¡CORREO ENVIADO CON ÉXITO A TRAVÉS DE RESEND!');
  console.log('=============================================');
  console.log(`📧 Destinatario: ${recipientEmail}`);
  console.log(`🆔 ID de Mensaje en Resend: ${resData.id}`);
  console.log(`📦 WR Enviado: ${canonicalWr}`);
  console.log(`📎 Adjuntos incluidos: ${attachments.length} (${attachments.map(a => a.filename).join(', ')})`);
  console.log('=============================================\n');
}

main().catch((err) => {
  console.error('❌ Error fatal en el proceso:', err);
  process.exit(1);
});
