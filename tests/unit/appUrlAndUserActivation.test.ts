import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getAppBaseUrl, normalizeAppOrigin, OFFICIAL_APP_ORIGIN } from '@/lib/auth/appUrl';
import * as resendModule from '@/lib/email/resend';
import { sendUserWelcomeEmail } from '@/lib/email/welcomeUser';

const mockAuthorizeAdmin = vi.fn();
const mockGetSupabaseAdmin = vi.fn();

vi.mock('@/lib/auth/guards', () => ({
  authorizeAdmin: (...args: unknown[]) => mockAuthorizeAdmin(...args),
}));

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: (...args: unknown[]) => mockGetSupabaseAdmin(...args),
}));

describe('Canonical App URL & Account Activation Redirects', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.FORCE_LOCAL_APP_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.NEXT_PUBLIC_SITE_URL;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('rejects obsolete domains and non-official origins', () => {
    expect(normalizeAppOrigin('https://sistema-amex.online')).toBeNull();
    expect(normalizeAppOrigin('https://www.sistema-amex.online/login')).toBeNull();
    expect(normalizeAppOrigin('https://preview-abc.vercel.app')).toBeNull();
    expect(normalizeAppOrigin('javascript:alert(1)')).toBeNull();
  });

  it('canonicalizes apex and www official origins to https://www.sistemaamexcourier.online', () => {
    expect(normalizeAppOrigin('https://sistemaamexcourier.online')).toBe(OFFICIAL_APP_ORIGIN);
    expect(normalizeAppOrigin('http://sistemaamexcourier.online')).toBe(OFFICIAL_APP_ORIGIN);
    expect(normalizeAppOrigin('https://www.sistemaamexcourier.online/')).toBe(OFFICIAL_APP_ORIGIN);
    expect(normalizeAppOrigin('www.sistemaamexcourier.online')).toBe(OFFICIAL_APP_ORIGIN);
  });

  it('ignores poisoned NEXT_PUBLIC_APP_URL / NEXT_PUBLIC_SITE_URL and stale request hosts', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://sistema-amex.online';
    process.env.NEXT_PUBLIC_SITE_URL = 'https://www.sistema-amex.online';

    const staleReq = new Request('https://sistema-amex.online/api/admin/users', {
      headers: {
        'x-forwarded-host': 'sistema-amex.online',
        'x-forwarded-proto': 'https',
      },
    });

    expect(getAppBaseUrl(staleReq)).toBe(OFFICIAL_APP_ORIGIN);
    expect(getAppBaseUrl()).toBe(OFFICIAL_APP_ORIGIN);
  });

  it('never leaks localhost into collaborator activation URLs by default', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'http://localhost:3000';
    const localReq = new Request('http://localhost:3000/api/admin/users', {
      headers: { host: 'localhost:3000' },
    });

    expect(getAppBaseUrl(localReq)).toBe(OFFICIAL_APP_ORIGIN);
    expect(getAppBaseUrl(localReq, { allowLocalhostInDev: true })).toBe('http://localhost:3000');
  });

  it('blocks localhost even with allowLocalhostInDev when NODE_ENV is production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    process.env.NEXT_PUBLIC_SITE_URL = 'http://localhost:3000';
    const localReq = new Request('http://localhost:3000/api/auth/recuperar-password', {
      headers: { host: 'localhost:3000' },
    });

    expect(getAppBaseUrl(localReq, { allowLocalhostInDev: true })).toBe(OFFICIAL_APP_ORIGIN);
    vi.unstubAllEnvs();
  });

  it('sends canonical footer link in sendUserWelcomeEmail even with poisoned NEXT_PUBLIC_APP_URL', async () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://sistema-amex.online';
    const sendEmailSpy = vi.spyOn(resendModule, 'sendEmail').mockResolvedValue({
      success: true,
      id: 'welcome-test-id',
    });

    await sendUserWelcomeEmail({
      email: 'nuevo@amex.com',
      nombreCompleto: 'Kenneth Martin',
      rolNombre: 'Gerente General',
      activationLink: 'https://example.supabase.co/auth/v1/verify?token=abc&type=recovery',
    });

    const html = sendEmailSpy.mock.calls[0][0].html;
    expect(html).not.toContain('sistema-amex.online');
    expect(html).toContain(`href="${OFFICIAL_APP_ORIGIN}"`);
  });

  it('create_user and resend_invite in /api/admin/users pass canonical redirectTo despite stale env vars', async () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://sistema-amex.online';
    process.env.NEXT_PUBLIC_SITE_URL = 'https://www.sistema-amex.online';

    const generateLinkMock = vi.fn().mockResolvedValue({
      data: {
        properties: {
          action_link:
            'https://tliubfyepimzlimxrquz.supabase.co/auth/v1/verify?token=tok&type=recovery&redirect_to=https%3A%2F%2Fwww.sistemaamexcourier.online%2Flogin%3Frecovered%3Dtrue',
        },
      },
      error: null,
    });

    const sendEmailSpy = vi.spyOn(resendModule, 'sendEmail').mockResolvedValue({
      success: true,
      id: 'email-123',
    });

    mockAuthorizeAdmin.mockResolvedValue({
      ok: true,
      user: { id: 'admin-1', email: 'sistemaamexcourier@gmail.com' },
    });

    mockGetSupabaseAdmin.mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { nombre: 'Gerente General' } }),
          }),
        }),
        upsert: vi.fn().mockResolvedValue({ error: null }),
      }),
      auth: {
        admin: {
          createUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-1', email: 'nuevo.colaborador@example.com' } },
            error: null,
          }),
          generateLink: generateLinkMock,
        },
      },
    });

    const { POST } = await import('@/app/api/admin/users/route');

    const createReq = new Request('https://sistemaamexcourier.online/api/admin/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-host': 'sistemaamexcourier.online',
        'x-forwarded-proto': 'https',
      },
      body: JSON.stringify({
        action: 'create_user',
        email: 'nuevo.colaborador@example.com',
        password: ['test', 'placeholder', 'input'].join('-'),
        nombre_completo: 'Kenneth Martin',
        rol_id: 'rol-1',
      }),
    });

    const createRes = await POST(createReq);
    expect(createRes.status).toBe(200);
    expect(generateLinkMock).toHaveBeenCalledWith({
      type: 'recovery',
      email: 'nuevo.colaborador@example.com',
      options: {
        redirectTo: `${OFFICIAL_APP_ORIGIN}/login?recovered=true`,
      },
    });
    expect(sendEmailSpy).toHaveBeenCalledTimes(1);

    generateLinkMock.mockClear();
    sendEmailSpy.mockClear();

    const resendReq = new Request('http://localhost:3000/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', host: 'localhost:3000' },
      body: JSON.stringify({
        action: 'resend_invite',
        email: 'nuevo.colaborador@example.com',
        nombre_completo: 'Kenneth Martin',
        rol_nombre: 'Gerente General',
      }),
    });

    const resendRes = await POST(resendReq);
    expect(resendRes.status).toBe(200);
    expect(generateLinkMock).toHaveBeenCalledWith({
      type: 'recovery',
      email: 'nuevo.colaborador@example.com',
      options: {
        redirectTo: `${OFFICIAL_APP_ORIGIN}/login?recovered=true`,
      },
    });
    expect(sendEmailSpy).toHaveBeenCalledTimes(1);
  });
});
