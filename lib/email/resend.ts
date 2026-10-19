import { Resend } from 'resend';

// Inicializar cliente Resend con API Key del entorno
const apiKey = process.env.RESEND_API_KEY || process.env.API_KEY_RESEND || '';
export const resend = apiKey ? new Resend(apiKey) : null;

export const DEFAULT_FROM_EMAIL = 
  process.env.RESEND_FROM_EMAIL || 
  'AMEX Courier <notificaciones@sistemaamexcourier.online>';

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

/**
 * Servicio unificado para envío de correos transaccionales en AMEX Courier.
 */
export async function sendEmail(options: SendEmailOptions) {
  if (!resend) {
    console.warn('⚠️ [Resend Service] RESEND_API_KEY no está configurada en las variables de entorno.');
    return { success: false, error: 'RESEND_API_KEY no configurada' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: DEFAULT_FROM_EMAIL,
      to: Array.isArray(options.to) ? options.to : [options.to],
      replyTo: options.replyTo || 'notificaciones@sistemaamexcourier.online',
      subject: options.subject,
      html: options.html,
      text: options.text,
      attachments: options.attachments,
    });

    if (error) {
      console.error('❌ [Resend Service] Error al enviar email:', error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (err: any) {
    console.error('❌ [Resend Service] Excepción en envío:', err);
    return { success: false, error: err.message || 'Error desconocido al enviar email' };
  }
}
