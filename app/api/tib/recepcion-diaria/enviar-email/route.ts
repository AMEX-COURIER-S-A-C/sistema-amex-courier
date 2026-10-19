import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email/resend';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

const TIB_API_URL = 'https://www.tibcourier.com/global-courier/ajax/readListaWarehouse.php';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const dateParam = typeof body.date === 'string' ? body.date.trim() : '';
    const customRecipients = Array.isArray(body.recipients) && body.recipients.length > 0
      ? body.recipients
      : ['sistemaamexcourier@gmail.com', 'maldonado4250@gmail.com'];

    // 1. Determinar fecha a consultar (por defecto ayer)
    let targetDate = dateParam;
    if (!targetDate) {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      targetDate = d.toISOString().split('T')[0];
    }

    // 2. Consultar paquetes en vivo desde el API de TIBCARGO Miami
    const tibRes = await fetch(TIB_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({}),
      cache: 'no-store',
    });

    if (!tibRes.ok) {
      return NextResponse.json(
        { error: `Error al consultar TIBCARGO Miami (HTTP ${tibRes.status})` },
        { status: 502 }
      );
    }

    const rawList = await tibRes.json();
    if (!Array.isArray(rawList)) {
      return NextResponse.json(
        { error: 'Respuesta inválida de TIBCARGO Miami' },
        { status: 502 }
      );
    }

    // 3. Filtrar paquetes exclusivos de AMEX para la fecha seleccionada
    const amexPackages = rawList.filter((pkg: any) => {
      const client = String(pkg.nclient || '').toUpperCase();
      const isAmex = client.includes('AMEX');
      if (!isAmex) return false;

      const regDate = String(pkg.fecRegister || '').split(' ')[0];
      return regDate === targetDate;
    });

    // Ordenar cronológicamente (más antiguo al más reciente)
    amexPackages.sort((a: any, b: any) =>
      String(a.fecRegister || '').localeCompare(String(b.fecRegister || ''))
    );

    // 4. Calcular KPIs Operativos
    const totalBultos = amexPackages.length;
    let pesoTotalLbs = 0;
    let primeraRecepcion = '--:--';
    let ultimaRecepcion = '--:--';

    if (totalBultos > 0) {
      pesoTotalLbs = amexPackages.reduce((acc: number, p: any) => {
        const w = parseFloat(String(p.weight || '0').replace(/[^0-9.]/g, '')) || 0;
        return acc + w;
      }, 0);

      const getTime = (fec: string) => (fec.includes(' ') ? fec.split(' ')[1].slice(0, 5) : fec);
      primeraRecepcion = getTime(amexPackages[0].fecRegister);
      ultimaRecepcion = getTime(amexPackages[amexPackages.length - 1].fecRegister);
    }

    // 5. Construir Hoja de Cálculo Excel (.xlsx) en memoria
    const excelRows = amexPackages.map((p: any, idx: number) => {
      const parts = String(p.fecRegister || '').split(' ');
      const fecha = parts[0] || '';
      const hora = parts[1] || '';

      return {
        '#': idx + 1,
        'Guía WR': p.wr || '',
        'Consignatario': p.nclient || '',
        'Tracking USA': p.tracking || '',
        'Peso (lbs)': p.weight || '',
        'Rack Miami': p.rack || '',
        'Tipo Empaque': p.container || '',
        'Fecha Registro': fecha,
        'Hora Registro': hora,
        'Operador TIB': p.nuser || '',
        'URL Foto': p.img ? `https://www.tibcourier.com/global-courier/${p.img}` : 'Sin foto',
        'URL Ticket': p.ticket ? `https://www.tibcourier.com/global-courier/${p.ticket}` : 'Sin ticket',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(excelRows);
    worksheet['!cols'] = [
      { wch: 5 },  // #
      { wch: 15 }, // WR
      { wch: 30 }, // Cliente
      { wch: 25 }, // Tracking
      { wch: 12 }, // Peso
      { wch: 15 }, // Rack
      { wch: 15 }, // Empaque
      { wch: 14 }, // Fecha
      { wch: 12 }, // Hora
      { wch: 20 }, // Operador
      { wch: 45 }, // Foto
      { wch: 45 }, // Ticket
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Recepcion_Miami');
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    const fileName = `Recepcion_Miami_AMEX_${targetDate}.xlsx`;
    const horaEnvioLima = new Date().toLocaleString('es-PE', {
      timeZone: 'America/Lima',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });

    // 6. Diseñar Plantilla HTML Ejecutiva
    const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Reporte Miami AMEX Courier</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b1329; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0b1329; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.35); max-width: 600px; width: 100%;">
          
          <!-- Encabezado Hero -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 60%, #065f46 100%); padding: 32px 30px; text-align: center; border-bottom: 3px solid #10b981;">
              <span style="display: inline-block; background: rgba(16, 185, 129, 0.2); border: 1px solid rgba(16, 185, 129, 0.4); color: #6ee7b7; padding: 4px 14px; border-radius: 20px; font-size: 11px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 12px;">
                📡 TIB Radar En Vivo • Almacén Miami
              </span>
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 900; letter-spacing: -0.5px;">
                AMEX COURIER
              </h1>
              <p style="color: #cbd5e1; margin: 6px 0 0 0; font-size: 13.5px;">
                Reporte de Recepción Diaria — Fecha: <strong>${targetDate}</strong>
              </p>
            </td>
          </tr>

          <!-- Resumen de Métricas / KPIs -->
          <tr>
            <td style="padding: 28px 30px 15px 30px;">
              <div style="font-size: 12px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 14px;">
                Indicadores Operativos Miami:
              </div>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 20px;">
                <tr>
                  <td width="50%" style="padding: 6px;">
                    <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 16px; text-align: center;">
                      <div style="font-size: 11px; font-weight: 700; color: #1e40af; text-transform: uppercase;">Total Bultos AMEX</div>
                      <div style="font-size: 28px; font-weight: 900; color: #1d4ed8; margin-top: 4px;">📦 ${totalBultos}</div>
                      <div style="font-size: 11px; color: #60a5fa; margin-top: 2px;">paquetes recepcionados</div>
                    </div>
                  </td>
                  <td width="50%" style="padding: 6px;">
                    <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 16px; text-align: center;">
                      <div style="font-size: 11px; font-weight: 700; color: #065f46; text-transform: uppercase;">Peso Total</div>
                      <div style="font-size: 28px; font-weight: 900; color: #059669; margin-top: 4px;">⚖️ ${pesoTotalLbs.toFixed(1)} <span style="font-size: 16px;">lbs</span></div>
                      <div style="font-size: 11px; color: #34d399; margin-top: 2px;">acumulado del día</div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td width="50%" style="padding: 6px;">
                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; text-align: center;">
                      <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Apertura Miami</div>
                      <div style="font-size: 18px; font-weight: 800; color: #334155; margin-top: 2px;">🌅 ${primeraRecepcion}</div>
                      <div style="font-size: 10.5px; color: #94a3b8;">primer paquete escaneado</div>
                    </div>
                  </td>
                  <td width="50%" style="padding: 6px;">
                    <div style="background-color: #fef3c7; border: 1px solid #fde68a; border-radius: 12px; padding: 14px; text-align: center;">
                      <div style="font-size: 11px; font-weight: 700; color: #92400e; text-transform: uppercase;">Cierre Miami</div>
                      <div style="font-size: 18px; font-weight: 800; color: #b45309; margin-top: 2px;">🌙 ${ultimaRecepcion}</div>
                      <div style="font-size: 10.5px; color: #d97706;">última recepción registrada</div>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Aviso de Archivo Adjunto -->
              <div style="background-color: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 12px; padding: 16px 20px; display: flex; align-items: center; margin-bottom: 20px;">
                <p style="margin: 0; font-size: 13px; color: #334155; line-height: 1.5;">
                  📎 <strong>Archivo Excel Adjunto:</strong> Hemos adjuntado el archivo <strong>${fileName}</strong> con el detalle completo de los ${totalBultos} paquetes (WRs, trackings USA, consignatarios, racks y enlaces directos a fotos y tickets).
                </p>
              </div>

              <!-- Enlace al Sistema Web -->
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto 15px auto;">
                <tr>
                  <td align="center" style="border-radius: 8px; background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
                    <a href="https://sistemaamexcourier.online/manifiestos-tib" target="_blank" style="display: inline-block; padding: 13px 30px; font-size: 13.5px; font-weight: 800; color: #ffffff; text-decoration: none; border-radius: 8px;">
                      📡 Abrir Submódulo 17.2 en Sistema AMEX →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Pie Institucional -->
          <tr>
            <td style="background-color: #f8fafc; padding: 22px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; font-size: 11.5px; color: #64748b; font-weight: 600;">
                AMEX Courier S.A.C. — Reporte Automatizado de Almacén Miami
              </p>
              <p style="margin: 4px 0 0 0; font-size: 11px; color: #94a3b8;">
                Generado el ${horaEnvioLima} (Hora Lima) para Gerencia y Operaciones.
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
AMEX COURIER - REPORTE DE RECEPCIÓN DIARIA MIAMI
Fecha consultada: ${targetDate}

INDICADORES OPERATIVOS:
- Total Bultos AMEX: ${totalBultos} paquetes
- Peso Total: ${pesoTotalLbs.toFixed(1)} lbs
- Apertura Miami: ${primeraRecepcion}
- Cierre de Bodega Miami: ${ultimaRecepcion}

Archivo Adjunto:
Se adjunta el archivo Excel "${fileName}" con el detalle completo de las guías WR y trackings.

AMEX Courier S.A.C.
Generado el ${horaEnvioLima}
    `.trim();

    // 7. Enviar a través de Resend con el archivo Excel adjunto
    const emailResult = await sendEmail({
      to: customRecipients,
      subject: `📊 Reporte Miami AMEX (${targetDate}) — ${totalBultos} bultos (${pesoTotalLbs.toFixed(1)} lbs) [Excel Adjunto]`,
      html: htmlContent,
      text: textContent,
      attachments: [
        {
          filename: fileName,
          content: excelBuffer,
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
      ],
    });

    if (!emailResult.success) {
      return NextResponse.json(
        { error: emailResult.error || 'No se pudo enviar el correo con Resend' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Reporte de Miami enviado con éxito a ${customRecipients.join(', ')}`,
      recipients: customRecipients,
      id: emailResult.id,
      kpis: {
        totalBultos,
        pesoTotalLbs,
        primeraRecepcion,
        ultimaRecepcion,
        fecha: targetDate,
      },
    });
  } catch (err: any) {
    console.error('❌ [Reporte Miami Email] Excepción:', err);
    return NextResponse.json(
      { error: err.message || 'Error interno al generar y enviar reporte de Miami.' },
      { status: 500 }
    );
  }
}
