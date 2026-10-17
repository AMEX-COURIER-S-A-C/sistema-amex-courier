import { sendEmail } from './resend';

export type SecurityAlertType =
  | 'anti_chancado_entregado'
  | 'movimiento_fuera_horario'
  | 'fallo_sincronizacion_worker';

export interface SecurityAlertPayload {
  type: SecurityAlertType;
  title?: string;
  operador?: string;
  ip?: string;
  detalles: {
    paquetes?: Array<{
      wr?: string;
      consignatario?: string;
      estadoPrevio?: string;
      estadoIntentado?: string;
    }>;
    totalPaquetes?: number;
    accion?: string;
    horaIncidente?: string;
    mensajeError?: string;
    loteId?: string;
    extraInfo?: Record<string, any>;
  };
}

export const SECURITY_ALERT_RECIPIENTS = [
  'sistemaamexcourier@gmail.com',
  'maldonado4250@gmail.com',
];

export async function sendSecurityAlert(payload: SecurityAlertPayload) {
  const { type, operador, ip, detalles } = payload;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://sistema-amex.online';

  const horaLima = new Date().toLocaleString('es-PE', {
    timeZone: 'America/Lima',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  let badgeColor = '#ef4444'; // Red
  let badgeText = '🚨 ALERTA CRÍTICA';
  let headerSubject = '';
  let descriptionText = '';
  let actionRecommendation = '';

  if (type === 'anti_chancado_entregado') {
    badgeColor = '#dc2626';
    badgeText = '🛡️ ESCUDO ANTI-CHANCADO';
    headerSubject = `🛡️ [ALERTA DE SEGURIDAD] Intento de sobreescritura en paquetes Entregados (${detalles.totalPaquetes || detalles.paquetes?.length || 1} paquete/s)`;
    descriptionText = `Se detectó un intento de modificar o sobreescribir paquetes que ya figuraban con estado <strong>ENTREGADO</strong>. El escudo de seguridad del sistema intervino para proteger la trazabilidad física.`;
    actionRecommendation = `Revisar con el operador ${operador || 'desconocido'} si se trató de un error operativo o un intento involuntario de sobreescritura masiva.`;
  } else if (type === 'movimiento_fuera_horario') {
    badgeColor = '#f59e0b';
    badgeText = '🌙 AUDITORÍA NOCTURNA';
    headerSubject = `⚠️ [AUDITORÍA OPERATIVA] Movimiento masivo fuera de horario (${detalles.totalPaquetes || 0} paquetes)`;
    descriptionText = `Se ejecutó una acción o movimiento masivo de paquetes en horario no habitual de operaciones (madrugada / medianoche).`;
    actionRecommendation = `Verificar si el movimiento de ${detalles.totalPaquetes || 0} paquetes corresponde a un turno extraordinario programado.`;
  } else if (type === 'fallo_sincronizacion_worker') {
    badgeColor = '#991b1b';
    badgeText = '🚨 FALLO DE SINCRONIZACIÓN';
    headerSubject = `🚨 [INCIDENCIA DEL SISTEMA] Fallo en sincronización de lote / Worker`;
    descriptionText = `El proceso de sincronización automática de lotes o base de datos reportó una interrupción o error crítico.`;
    actionRecommendation = `Verificar la conectividad de la base de datos y la cola de tareas del worker para reprocesar el lote.`;
  }

  // Filas de paquetes si aplica
  let paquetesHtml = '';
  if (Array.isArray(detalles.paquetes) && detalles.paquetes.length > 0) {
    paquetesHtml = `
      <div style="margin-top: 16px; margin-bottom: 20px;">
        <div style="font-size: 11.5px; font-weight: 800; color: #475569; text-transform: uppercase; margin-bottom: 8px;">
          Paquetes Involucrados (${detalles.paquetes.length}):
        </div>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size: 12px; border-collapse: collapse; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
          <thead>
            <tr style="background-color: #f1f5f9; text-align: left; color: #334155;">
              <th style="padding: 8px 12px; border-bottom: 1px solid #cbd5e1;">Guía WR</th>
              <th style="padding: 8px 12px; border-bottom: 1px solid #cbd5e1;">Consignatario</th>
              <th style="padding: 8px 12px; border-bottom: 1px solid #cbd5e1;">Estado Previo</th>
              <th style="padding: 8px 12px; border-bottom: 1px solid #cbd5e1;">Estado Intentado</th>
            </tr>
          </thead>
          <tbody>
            ${detalles.paquetes.slice(0, 15).map(p => `
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 7px 12px; font-weight: 800; color: #0f172a;">${p.wr || 'N/A'}</td>
                <td style="padding: 7px 12px; color: #475569;">${p.consignatario || 'N/A'}</td>
                <td style="padding: 7px 12px; font-weight: 700; color: #059669;">${p.estadoPrevio || 'ENTREGADO'}</td>
                <td style="padding: 7px 12px; font-weight: 700; color: #dc2626;">${p.estadoIntentado || 'MODIFICADO'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        ${detalles.paquetes.length > 15 ? `<p style="font-size: 11px; color: #64748b; margin-top: 4px;">... y ${detalles.paquetes.length - 15} paquetes más.</p>` : ''}
      </div>
    `;
  }

  const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Alerta de Seguridad AMEX</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b1329; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0b1329; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.35); max-width: 600px; width: 100%;">
          
          <!-- Encabezado Alerta -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #450a0a 100%); padding: 32px 30px; text-align: center; border-bottom: 3px solid ${badgeColor};">
              <span style="display: inline-block; background: rgba(220, 38, 38, 0.2); border: 1px solid ${badgeColor}; color: #fca5a5; padding: 4px 14px; border-radius: 20px; font-size: 11px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 12px;">
                ${badgeText}
              </span>
              <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 900; letter-spacing: -0.5px;">
                ALERTA EN TIEMPO REAL
              </h1>
              <p style="color: #cbd5e1; margin: 6px 0 0 0; font-size: 13.5px;">
                Sistema AMEX Courier • Centro de Seguridad y Auditoría
              </p>
            </td>
          </tr>

          <!-- Cuerpo del Reporte -->
          <tr>
            <td style="padding: 28px 30px 20px 30px;">
              <p style="margin: 0 0 16px 0; font-size: 14.5px; line-height: 1.6; color: #334155;">
                ${descriptionText}
              </p>

              <!-- Tabla de Metadatos -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-size: 12.5px; color: #64748b; width: 35%;">Fecha y Hora:</td>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-size: 13px; font-weight: 800; color: #0f172a;">${horaLima}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-size: 12.5px; color: #64748b;">Operador Responsable:</td>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-size: 13px; font-weight: 800; color: #1e40af;">${operador || 'Operador en Sesión'}</td>
                </tr>
                ${ip ? `
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-size: 12.5px; color: #64748b;">Dirección IP:</td>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-size: 13px; font-weight: 700; color: #475569;">${ip}</td>
                </tr>
                ` : ''}
                ${detalles.accion ? `
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-size: 12.5px; color: #64748b;">Acción Intentada:</td>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-size: 13px; font-weight: 800; color: #b91c1c;">${detalles.accion}</td>
                </tr>
                ` : ''}
                ${detalles.mensajeError ? `
                <tr>
                  <td style="padding: 12px 16px; font-size: 12.5px; color: #64748b;">Detalle Técnico / Error:</td>
                  <td style="padding: 12px 16px; font-size: 12px; font-family: monospace; color: #991b1b; background-color: #fef2f2;">${detalles.mensajeError}</td>
                </tr>
                ` : ''}
              </table>

              ${paquetesHtml}

              <!-- Recomendación de Seguridad -->
              <div style="background-color: #fff7ed; border-left: 4px solid #f97316; border-radius: 0 8px 8px 0; padding: 14px 18px; margin-bottom: 24px;">
                <div style="font-size: 11.5px; font-weight: 800; color: #c2410c; text-transform: uppercase;">Acción Sugerida para Gerencia:</div>
                <div style="font-size: 13px; color: #9a3412; margin-top: 4px; line-height: 1.5;">${actionRecommendation}</div>
              </div>

              <!-- Botón a la Consola de Auditoría -->
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto 10px auto;">
                <tr>
                  <td align="center" style="border-radius: 8px; background: #0f172a;">
                    <a href="${appUrl}/historial" target="_blank" style="display: inline-block; padding: 12px 28px; font-size: 13.5px; font-weight: 800; color: #ffffff; text-decoration: none; border-radius: 8px;">
                      🔍 Abrir Registro de Auditoría en Sistema AMEX →
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Pie Institucional -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; font-size: 11.5px; color: #64748b; font-weight: 700;">
                AMEX Courier S.A.C. — Notificaciones Automáticas de Seguridad
              </p>
              <p style="margin: 4px 0 0 0; font-size: 11px; color: #94a3b8;">
                Generado para el Administrador (${SECURITY_ALERT_RECIPIENTS.join(', ')}).
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
ALERTA DE SEGURIDAD OPERATIVA - AMEX COURIER
Tipo: ${type}
Fecha/Hora: ${horaLima}
Operador: ${operador || 'No especificado'}
${detalles.accion ? `Acción: ${detalles.accion}` : ''}
${detalles.mensajeError ? `Error: ${detalles.mensajeError}` : ''}

Recomendación:
${actionRecommendation}

Plataforma: ${appUrl}
  `.trim();

  return await sendEmail({
    to: SECURITY_ALERT_RECIPIENTS,
    subject: headerSubject,
    html: htmlContent,
    text: textContent,
  });
}
