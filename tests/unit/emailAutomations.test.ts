import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendUserWelcomeEmail } from '@/lib/email/welcomeUser';
import { sendSecurityAlert } from '@/lib/email/securityAlerts';
import * as resendModule from '@/lib/email/resend';

describe('Email Automations Suite (Puntos 1, 5 y 6)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('generates and sends welcome email for new collaborator (Punto 6)', async () => {
    const sendEmailSpy = vi.spyOn(resendModule, 'sendEmail').mockResolvedValue({
      success: true,
      id: 'mock-welcome-id',
    });

    const result = await sendUserWelcomeEmail({
      email: 'colaborador@amex.com',
      nombreCompleto: 'Carlos Chofer',
      rolNombre: 'Chofer / Despachador',
      activationLink: 'https://sistema-amex.online/login?recovered=true#token=xyz',
    });

    expect(result.success).toBe(true);
    expect(sendEmailSpy).toHaveBeenCalledTimes(1);
    const callArgs = sendEmailSpy.mock.calls[0][0];
    expect(callArgs.to).toBe('colaborador@amex.com');
    expect(callArgs.subject).toContain('Carlos Chofer');
    expect(callArgs.subject).toContain('Chofer / Despachador');
    expect(callArgs.html).toContain('Carlos Chofer');
    expect(callArgs.html).toContain('https://sistema-amex.online/login?recovered=true#token=xyz');
  });

  it('generates and sends security alert for anti-chancado (Punto 5)', async () => {
    const sendEmailSpy = vi.spyOn(resendModule, 'sendEmail').mockResolvedValue({
      success: true,
      id: 'mock-alert-id',
    });

    const result = await sendSecurityAlert({
      type: 'anti_chancado_entregado',
      operador: 'Operador Test',
      detalles: {
        totalPaquetes: 1,
        accion: 'Intento de modificar paquete entregado',
        paquetes: [
          {
            wr: 'WR-9999',
            consignatario: 'CLIENTE TEST',
            estadoPrevio: 'ENTREGADO',
            estadoIntentado: 'EN_ALMACEN',
          },
        ],
      },
    });

    expect(result.success).toBe(true);
    expect(sendEmailSpy).toHaveBeenCalledTimes(1);
    const callArgs = sendEmailSpy.mock.calls[0][0];
    expect(callArgs.to).toEqual(['sistemaamexcourier@gmail.com', 'maldonado4250@gmail.com']);
    expect(callArgs.subject).toContain('Intento de sobreescritura');
    expect(callArgs.html).toContain('WR-9999');
    expect(callArgs.html).toContain('CLIENTE TEST');
    expect(callArgs.html).toContain('ESCUDO ANTI-CHANCADO');
  });

  it('generates and sends security alert for off-hours mass movement (Punto 5)', async () => {
    const sendEmailSpy = vi.spyOn(resendModule, 'sendEmail').mockResolvedValue({
      success: true,
      id: 'mock-alert-id-2',
    });

    const result = await sendSecurityAlert({
      type: 'movimiento_fuera_horario',
      operador: 'Operador Nocturno',
      detalles: {
        totalPaquetes: 25,
        accion: 'Movimiento masivo fuera de hora',
      },
    });

    expect(result.success).toBe(true);
    expect(sendEmailSpy).toHaveBeenCalledTimes(1);
    const callArgs = sendEmailSpy.mock.calls[0][0];
    expect(callArgs.subject).toContain('Movimiento masivo fuera de horario');
    expect(callArgs.html).toContain('25');
  });
});
