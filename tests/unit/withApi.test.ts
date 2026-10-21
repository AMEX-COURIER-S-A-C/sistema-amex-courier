import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { withApi } from '@/lib/api/withApi';
import { estimateAiCost } from '@/lib/ai/cost-tracker';

describe('withApi universal wrapper', () => {
  it('validates request body against zod schema and blocks invalid payloads', async () => {
    const handler = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true })));
    const wrapped = withApi(
      {
        bodySchema: z.object({
          code: z.string().min(3),
        }),
      },
      handler
    );

    // Invalid body
    const reqInvalid = new NextRequest('http://localhost:3000/api/test', {
      method: 'POST',
      body: JSON.stringify({ code: 'x' }),
    });

    const resInvalid = await wrapped(reqInvalid);
    expect(resInvalid.status).toBe(400);
    const jsonInvalid = await resInvalid.json();
    expect(jsonInvalid.ok).toBe(false);
    expect(jsonInvalid.code).toBe('VALIDATION_ERROR');
    expect(handler).not.toHaveBeenCalled();

    // Valid body
    const reqValid = new NextRequest('http://localhost:3000/api/test', {
      method: 'POST',
      body: JSON.stringify({ code: 'WR12345' }),
    });

    const resValid = await wrapped(reqValid);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(resValid.status).toBe(200);
  });

  it('enforces rate limits per prefix and IP', async () => {
    const handler = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true })));
    const wrapped = withApi(
      {
        rateLimit: {
          limit: 2,
          windowMs: 60_000,
          prefix: 'test-rl-' + Date.now(),
        },
      },
      handler
    );

    const makeReq = () =>
      new NextRequest('http://localhost:3000/api/test-rl', {
        headers: { 'x-forwarded-for': '192.168.1.100' },
      });

    const res1 = await wrapped(makeReq());
    expect(res1.status).toBe(200);

    const res2 = await wrapped(makeReq());
    expect(res2.status).toBe(200);

    const res3 = await wrapped(makeReq());
    expect(res3.status).toBe(429);
    const json3 = await res3.json();
    expect(json3.error).toContain('Demasiadas solicitudes');
  });

  it('catches unhandled exceptions gracefully and returns 500 error envelope', async () => {
    const failingHandler = vi.fn().mockRejectedValue(new Error('Fallo crítico simulado'));
    const wrapped = withApi({}, failingHandler);

    const req = new NextRequest('http://localhost:3000/api/test-error');
    const res = await wrapped(req);

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.code).toBe('INTERNAL_ERROR');
    expect(json.error).toBe('Fallo crítico simulado');
  });
});

describe('AI Cost Tracker', () => {
  it('calculates accurate token costs for gpt-4o-mini', () => {
    // 10,000 prompt tokens ($0.15/1M) = $0.0015
    // 2,000 completion tokens ($0.60/1M) = $0.0012
    // Total = $0.0027
    const cost = estimateAiCost('gpt-4o-mini', 10_000, 2_000);
    expect(cost).toBe(0.0027);
  });

  it('calculates accurate token costs for gpt-4o', () => {
    // 10,000 prompt tokens ($2.50/1M) = $0.025
    // 2,000 completion tokens ($10.00/1M) = $0.020
    // Total = $0.045
    const cost = estimateAiCost('gpt-4o', 10_000, 2_000);
    expect(cost).toBe(0.045);
  });
});
