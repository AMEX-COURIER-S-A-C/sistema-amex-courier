import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email/resend';

export const dynamic = 'force-dynamic';

// Registro en memoria para evitar flooding/spam de solicitudes por correo (cooldown de 45 segundos)
const requestCooldownMap = new Map<string, number>();

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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawEmail = typeof body.email === 'string' ? body.email.trim() : '';
    const email = rawEmail.toLowerCase();

    // Validación estricta de formato de correo
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
    if (!email || !emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Por favor, ingresa una dirección de correo electrónico corporativo válida.' },
        { status: 400 }
      );
    }

    // Rate Limiting en memoria: Prevenir flooding (1 solicitud cada 45 segundos por correo)
    const now = Date.now();
    const lastRequest = requestCooldownMap.get(email);
    if (lastRequest && now - lastRequest < 45000) {
      const waitSeconds = Math.ceil((45000 - (now - lastRequest)) / 1000);
      return NextResponse.json(
        {
          error: `Ya enviamos un enlace de recuperación recientemente. Por favor, revisa tu correo o espera ${waitSeconds} segundos antes de solicitar otro.`,
          retryAfter: waitSeconds,
        },
        { status: 429 }
      );
    }

    // Determinar la URL canónica de redirección
    const hostHeader = req.headers.get('x-forwarded-host') || req.headers.get('host');
    const protoHeader = req.headers.get('x-forwarded-proto') || 'https';
    let siteUrl = `${protoHeader}://${hostHeader}`;

    if (!hostHeader || hostHeader.includes('localhost')) {
      siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    }

    const redirectTo = `${siteUrl.replace(/\/$/, '')}/login?recovered=true`;

    const supabaseAdmin = getSupabaseAdmin();

    // Consultar nombre del usuario en perfiles_usuarios para personalización (reduce drásticamente clasificación como spam)
    let displayName = 'Usuario';
    try {
      const { data: profile } = await supabaseAdmin
        .from('perfiles_usuarios')
        .select('nombre_completo')
        .ilike('email', email)
        .maybeSingle();

      if (profile?.nombre_completo && profile.nombre_completo.trim().length > 0) {
        displayName = profile.nombre_completo.trim();
      }
    } catch {
      // Si falla la consulta de perfil, continuar con el nombre genérico
    }

    // Generar enlace criptográfico seguro con Supabase Admin SIN enviar correo por Supabase
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo,
      },
    });

    if (error) {
      console.warn('⚠️ [Recuperar Password] Supabase no pudo generar enlace para:', email, error.message);
      // Por seguridad y protección contra enumeración de cuentas, responder con mensaje neutro exitoso
      return NextResponse.json({
        success: true,
        message: 'Si el correo está registrado en el sistema, recibirás un enlace de recuperación en breve.',
      });
    }

    const actionLink = data?.properties?.action_link;
    if (!actionLink) {
      return NextResponse.json(
        { error: 'No se pudo generar el enlace de recuperación seguro.' },
        { status: 500 }
      );
    }

    // Registrar marca de tiempo para rate-limiting
    requestCooldownMap.set(email, now);

    // Obtener información de contexto para el usuario
    const userAgent = req.headers.get('user-agent');
    const deviceSummary = getDeviceSummary(userAgent);
    const fechaLima = new Date().toLocaleString('es-PE', {
      timeZone: 'America/Lima',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    // 2. Plantilla de Correo Corporativo Enterprise V2 (Bulletproof HTML + Plaintext Anti-Spam)
    const htmlContent = `
<!DOCTYPE html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Restablecer Contraseña - AMEX Courier</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #0b1329; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0b1329; padding: 45px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="580" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.35); border: 1px solid #1e293b; max-width: 580px; width: 100%;">
          
          <!-- Encabezado Corporativo Premium -->
          <tr>
            <td style="background: linear-gradient(135deg, #0a192f 0%, #0f172a 60%, #1e3a8a 100%); padding: 36px 32px; text-align: center; border-bottom: 3px solid #3b82f6;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <img src="https://www.sistemaamexcourier.online/images/logo-amex-clean.png" alt="AMEX Courier" width="175" style="display: block; margin: 0 auto 14px auto; max-width: 175px; height: auto;" />
                    <div style="display: inline-block; background: rgba(59, 130, 246, 0.15); border: 1px solid rgba(147, 197, 253, 0.35); color: #93c5fd; padding: 4px 14px; border-radius: 20px; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 12px;">
                      Seguridad de Acceso • Operaciones
                    </div>
                    <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 900; letter-spacing: 0.5px;">
                      AMEX COURIER
                    </h1>
                    <p style="color: #94a3b8; margin: 6px 0 0 0; font-size: 13px; font-weight: 500;">
                      Sistema de Control Logístico & Almacén Internacional
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Cuerpo Principal -->
          <tr>
            <td style="padding: 36px 36px 20px 36px;">
              <h2 style="color: #0f172a; margin: 0 0 14px 0; font-size: 21px; font-weight: 800; letter-spacing: -0.3px;">
                Hola, ${displayName}:
              </h2>
              <p style="color: #475569; margin: 0 0 20px 0; font-size: 14.5px; line-height: 1.65;">
                Hemos recibido una solicitud para restablecer la contraseña asociada a tu cuenta operativa (<strong>${email}</strong>). Para definir una nueva clave segura, haz clic en el siguiente botón:
              </p>

              <!-- Botón Bulletproof Centrado -->
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 28px auto 28px auto;">
                <tr>
                  <td align="center" style="border-radius: 10px; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35);">
                    <a href="${actionLink}" target="_blank" style="display: inline-block; padding: 15px 38px; font-size: 14.5px; font-weight: 800; color: #ffffff; text-decoration: none; border-radius: 10px; letter-spacing: 0.4px;">
                      🔑 Restablecer Mi Contraseña
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Cuadro de Auditoría y Seguridad -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 18px 20px;">
                    <div style="font-size: 11.5px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px;">
                      Detalles de la Solicitud:
                    </div>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size: 13px; color: #334155;">
                      <tr>
                        <td style="padding: 4px 0; color: #64748b; font-weight: 600; width: 38%;">Fecha y Hora:</td>
                        <td style="padding: 4px 0; font-weight: 700;">${fechaLima} (Hora Lima)</td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0; color: #64748b; font-weight: 600;">Dispositivo / Origen:</td>
                        <td style="padding: 4px 0; font-weight: 700;">${deviceSummary}</td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0; color: #64748b; font-weight: 600;">Validez del Enlace:</td>
                        <td style="padding: 4px 0; font-weight: 700; color: #0284c7;">60 minutos (Uso único)</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Advertencia de Seguridad -->
              <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; padding: 14px 18px; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 12.5px; color: #991b1b; line-height: 1.5; font-weight: 500;">
                  🛡️ <strong>¿No solicitaste este cambio?</strong> Puedes ignorar este correo de forma segura. Tu contraseña actual seguirá siendo la misma y nadie podrá acceder a tu cuenta sin tu confirmación.
                </p>
              </div>

              <!-- Enlace Alternativo de Texto -->
              <p style="margin: 0; font-size: 11.5px; color: #94a3b8; line-height: 1.5; word-break: break-all;">
                Si tienes problemas con el botón, copia y pega el siguiente enlace directo en tu navegador web:<br>
                <a href="${actionLink}" style="color: #2563eb; text-decoration: underline;">${actionLink}</a>
              </p>
            </td>
          </tr>

          <!-- Pie de Página Institucional Anti-Spam -->
          <tr>
            <td style="background-color: #f1f5f9; padding: 26px 36px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; font-size: 12px; color: #475569; font-weight: 700;">
                AMEX Courier S.A.C. — Gestión Logística & Envíos USA - Perú
              </p>
              <p style="margin: 5px 0 0 0; font-size: 11px; color: #64748b;">
                Soporte y Seguridad: <a href="mailto:notificaciones@sistemaamexcourier.online" style="color: #2563eb; text-decoration: none;">notificaciones@sistemaamexcourier.online</a>
              </p>
              <p style="margin: 6px 0 0 0; font-size: 11px; color: #94a3b8;">
                Lima, Perú • Mensaje transaccional generado automáticamente por el sistema central.
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
Recuperación de Contraseña

Hola, ${displayName}:
Hemos recibido una solicitud para restablecer la contraseña de tu cuenta operativa (${email}).

Para definir una nueva contraseña, haz clic o copia el siguiente enlace seguro en tu navegador:
${actionLink}

Detalles de la Solicitud:
- Fecha y Hora: ${fechaLima} (Hora Lima)
- Origen: ${deviceSummary}
- Vigencia: 60 minutos (uso único)

¿No solicitaste este cambio?
Puedes ignorar este mensaje de forma segura. Tu contraseña actual no se modificará.

AMEX Courier S.A.C.
Lima, Perú.
    `.trim();

    const emailResult = await sendEmail({
      to: email,
      subject: 'Restablecer contraseña - AMEX Courier',
      html: htmlContent,
      text: textContent,
      replyTo: 'notificaciones@sistemaamexcourier.online',
    });

    if (!emailResult.success) {
      console.error('❌ [Recuperar Password] Error enviando correo por Resend:', emailResult.error);
      return NextResponse.json(
        { error: 'No se pudo enviar el correo de recuperación. Por favor, intenta de nuevo en unos minutos.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Hemos enviado el enlace de recuperación a ${email}. Revisa tu bandeja de entrada.`,
    });
  } catch (err: any) {
    console.error('❌ [Recuperar Password] Excepción:', err);
    return NextResponse.json(
      { error: err.message || 'Error interno al procesar recuperación de contraseña.' },
      { status: 500 }
    );
  }
}
