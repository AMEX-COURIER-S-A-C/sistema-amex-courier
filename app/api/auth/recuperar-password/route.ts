import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email/resend';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Por favor, ingresa un correo electrónico válido.' },
        { status: 400 }
      );
    }

    // Determinar la URL base de redirección
    const hostHeader = req.headers.get('x-forwarded-host') || req.headers.get('host');
    const protoHeader = req.headers.get('x-forwarded-proto') || 'https';
    let siteUrl = `${protoHeader}://${hostHeader}`;

    if (!hostHeader || hostHeader.includes('localhost')) {
      siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    }

    const redirectTo = `${siteUrl.replace(/\/$/, '')}/login?recovered=true`;

    // 1. Generar enlace criptográfico seguro con Supabase Admin SIN enviar correo por Supabase
    // Esto evita el estricto límite de 3 correos por día de Supabase Auth
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo,
      },
    });

    if (error) {
      console.warn('⚠️ [Recuperar Password] Supabase no pudo generar enlace para:', email, error.message);
      // Para seguridad y privacidad, responder con éxito genérico para no filtrar cuentas existentes
      return NextResponse.json({
        success: true,
        message: 'Si el correo está registrado en el sistema, recibirás un enlace de recuperación en los próximos minutos.',
      });
    }

    const actionLink = data?.properties?.action_link;

    if (!actionLink) {
      return NextResponse.json(
        { error: 'No se pudo generar el enlace de recuperación seguro.' },
        { status: 500 }
      );
    }

    // 2. Enviar el correo a través de Resend con dominio verificado sistema-amex.online
    const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Restablecer Contraseña - AMEX Courier</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; max-width: 560px; width: 100%;">
          
          <!-- Encabezado Corporativo -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">
                AMEX COURIER
              </h1>
              <p style="color: #cbd5e1; margin: 6px 0 0 0; font-size: 13px;">
                Seguridad & Acceso al Sistema
              </p>
            </td>
          </tr>

          <!-- Contenido Principal -->
          <tr>
            <td style="padding: 32px 30px 20px 30px; text-align: center;">
              <h2 style="color: #0f172a; margin: 0 0 12px 0; font-size: 20px; font-weight: 700;">
                Recuperación de Contraseña
              </h2>
              <p style="color: #475569; margin: 0 0 24px 0; font-size: 14px; line-height: 1.6;">
                Hemos recibido una solicitud para restablecer la contraseña de acceso a tu cuenta operativa de AMEX Courier (<strong>${email}</strong>).
              </p>

              <!-- Botón de Acción -->
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto 28px auto;">
                <tr>
                  <td align="center" style="border-radius: 8px; background-color: #2563eb;">
                    <a href="${actionLink}" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 14px; font-weight: 700; color: #ffffff; text-decoration: none; border-radius: 8px; background-color: #2563eb; letter-spacing: 0.3px;">
                      Restablecer Mi Contraseña →
                    </a>
                  </td>
                </tr>
              </table>

              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; text-align: left; margin-bottom: 20px;">
                <p style="margin: 0; font-size: 12px; color: #64748b; line-height: 1.5;">
                  🔒 <strong>Aviso de Seguridad:</strong> Este enlace es de un solo uso y caduca automáticamente en 1 hora. Si tú no solicitaste este cambio, puedes ignorar este correo de forma segura; tu contraseña actual no cambiará.
                </p>
              </div>

              <p style="margin: 0; font-size: 11px; color: #94a3b8; line-height: 1.4; word-break: break-all;">
                Si el botón no funciona, copia y pega el siguiente enlace en tu navegador:<br>
                <a href="${actionLink}" style="color: #3b82f6;">${actionLink}</a>
              </p>
            </td>
          </tr>

          <!-- Pie de Página Anti-Spam -->
          <tr>
            <td style="background-color: #f1f5f9; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; font-size: 11px; color: #64748b; font-weight: 600;">
                AMEX Courier S.A.C. — Plataforma Operativa
              </p>
              <p style="margin: 4px 0 0 0; font-size: 11px; color: #94a3b8;">
                Lima, Perú • © 2026 AMEX Courier.
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
AMEX COURIER - RECUPERACIÓN DE CONTRASEÑA

Hola,
Hemos recibido una solicitud para restablecer tu contraseña en el Sistema AMEX Courier (${email}).

Para crear una nueva contraseña, ingresa al siguiente enlace seguro:
${actionLink}

Este enlace es válido por 1 hora. Si no realizaste esta solicitud, puedes ignorar este mensaje.

AMEX Courier S.A.C.
Lima, Perú.
    `.trim();

    const emailResult = await sendEmail({
      to: email,
      subject: 'Restablecer contraseña - AMEX Courier',
      html: htmlContent,
      text: textContent,
    });

    if (!emailResult.success) {
      console.error('❌ [Recuperar Password] Falló envío con Resend:', emailResult.error);
      return NextResponse.json(
        { error: 'No se pudo enviar el correo de recuperación. Inténtalo nuevamente.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Enlace de recuperación enviado exitosamente a tu correo.',
    });
  } catch (err: any) {
    console.error('❌ [Recuperar Password] Error inesperado:', err);
    return NextResponse.json(
      { error: err.message || 'Error interno del servidor al procesar recuperación.' },
      { status: 500 }
    );
  }
}
