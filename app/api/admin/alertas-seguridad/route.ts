import { NextRequest, NextResponse } from 'next/server';
import { sendSecurityAlert, SecurityAlertPayload } from '@/lib/email/securityAlerts';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { type, operador, detalles } = body;

    if (!type || !detalles) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos (type, detalles)' },
        { status: 400 }
      );
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('x-real-ip') || undefined;

    const payload: SecurityAlertPayload = {
      type,
      operador: operador || 'Operador en Sistema',
      ip,
      detalles,
    };

    const result = await sendSecurityAlert(payload);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'No se pudo enviar la alerta de seguridad' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Alerta de seguridad procesada y enviada a los administradores.',
      id: result.id,
    });
  } catch (err: any) {
    console.error('❌ [API Alertas Seguridad] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Error interno al procesar alerta' },
      { status: 500 }
    );
  }
}
