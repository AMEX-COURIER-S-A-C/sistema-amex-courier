import { sendEmail } from './resend';

export interface SendWelcomeEmailOptions {
  email: string;
  nombreCompleto: string;
  rolNombre: string;
  activationLink: string;
}

export async function sendUserWelcomeEmail(options: SendWelcomeEmailOptions) {
  const { email, nombreCompleto, rolNombre, activationLink } = options;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://sistemaamexcourier.online';

  const fechaLima = new Date().toLocaleString('es-PE', {
    timeZone: 'America/Lima',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const subject = `👤 Bienvenido a AMEX Courier, ${nombreCompleto} — Activa tu cuenta (${rolNombre})`;

  const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Bienvenida a AMEX Courier</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b1329; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0b1329; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.35); max-width: 600px; width: 100%;">
          
          <!-- Encabezado Institucional -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 60%, #065f46 100%); padding: 36px 30px; text-align: center; border-bottom: 3px solid #10b981;">
              <span style="display: inline-block; background: rgba(16, 185, 129, 0.2); border: 1px solid rgba(16, 185, 129, 0.4); color: #6ee7b7; padding: 4px 14px; border-radius: 20px; font-size: 11px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 12px;">
                👤 Módulo de Usuarios & Seguridad • AMEX Courier
              </span>
              <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 900; letter-spacing: -0.5px;">
                ¡Bienvenido al Equipo!
              </h1>
              <p style="color: #cbd5e1; margin: 8px 0 0 0; font-size: 14px;">
                Tu cuenta de acceso institucional ha sido habilitada exitosamente.
              </p>
            </td>
          </tr>

          <!-- Saludo y Detalles de Cuenta -->
          <tr>
            <td style="padding: 32px 30px 20px 30px;">
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #334155;">
                Hola <strong>${nombreCompleto}</strong>,
              </p>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                La Administración de <strong>AMEX Courier S.A.C.</strong> te ha registrado como colaborador en la plataforma operativa. A continuación, encontrarás los detalles de tu perfil de usuario:
              </p>

              <!-- Tarjeta de Datos -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 26px;">
                <tr>
                  <td style="padding: 16px 20px; border-bottom: 1px solid #e2e8f0;">
                    <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Nombre Completo:</div>
                    <div style="font-size: 15px; font-weight: 800; color: #0f172a; margin-top: 3px;">${nombreCompleto}</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 16px 20px; border-bottom: 1px solid #e2e8f0;">
                    <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Correo de Acceso:</div>
                    <div style="font-size: 15px; font-weight: 800; color: #1d4ed8; margin-top: 3px;">${email}</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 16px 20px;">
                    <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Rol Asignado:</div>
                    <div style="font-size: 14px; font-weight: 800; color: #065f46; margin-top: 3px; display: inline-block; background-color: #ecfdf5; border: 1px solid #a7f3d0; padding: 3px 10px; border-radius: 6px;">
                      🏷️ ${rolNombre}
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Botón CTA para Definir Contraseña -->
              <div style="text-align: center; margin: 30px 0;">
                <p style="margin: 0 0 14px 0; font-size: 13.5px; color: #334155; font-weight: 600;">
                  Para comenzar, haz clic en el botón siguiente y define tu contraseña personal de acceso:
                </p>
                <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                  <tr>
                    <td align="center" style="border-radius: 10px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4);">
                      <a href="${activationLink}" target="_blank" style="display: inline-block; padding: 15px 36px; font-size: 15px; font-weight: 800; color: #ffffff; text-decoration: none; border-radius: 10px;">
                        🔑 Activar Mi Cuenta y Definir Contraseña →
                      </a>
                    </td>
                  </tr>
                </table>
                <p style="margin: 12px 0 0 0; font-size: 11.5px; color: #94a3b8;">
                  Este enlace de seguridad es único y válido para la configuración inicial de tu cuenta.
                </p>
              </div>

              <!-- Recomendaciones de Seguridad -->
              <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 0 8px 8px 0; padding: 14px 18px; margin-bottom: 20px;">
                <p style="margin: 0; font-size: 12.5px; color: #1e40af; line-height: 1.5;">
                  🔒 <strong>Recomendación de Seguridad:</strong> Utiliza una contraseña segura de al menos 8 caracteres que combine letras y números. Nunca compartas tus credenciales de acceso con terceros.
                </p>
              </div>

              <!-- Enlace alternativo si el botón no abre -->
              <div style="font-size: 11px; color: #94a3b8; word-break: break-all; margin-top: 24px; padding-top: 16px; border-top: 1px dashed #e2e8f0;">
                Si el botón no funciona, copia y pega el siguiente enlace directo en tu navegador web:<br>
                <a href="${activationLink}" style="color: #3b82f6; text-decoration: underline;">${activationLink}</a>
              </div>

            </td>
          </tr>

          <!-- Pie Institucional -->
          <tr>
            <td style="background-color: #f8fafc; padding: 22px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; font-size: 12px; color: #64748b; font-weight: 700;">
                AMEX Courier S.A.C. — Gestión y Operaciones Logísticas
              </p>
              <p style="margin: 4px 0 0 0; font-size: 11px; color: #94a3b8;">
                Plataforma oficial: <a href="${appUrl}" style="color: #64748b; text-decoration: none;">sistemaamexcourier.online</a> • Emitido el ${fechaLima}
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
¡Bienvenido/a al equipo de AMEX Courier, ${nombreCompleto}!

Tu cuenta de acceso institucional ha sido creada:
- Correo: ${email}
- Rol Asignado: ${rolNombre}

Haz clic en el siguiente enlace seguro para activar tu cuenta y definir tu contraseña por primera vez:
${activationLink}

Plataforma Web: ${appUrl}
Emitido el ${fechaLima}
AMEX Courier S.A.C.
  `.trim();

  return await sendEmail({
    to: email,
    subject,
    html: htmlContent,
    text: textContent,
  });
}
