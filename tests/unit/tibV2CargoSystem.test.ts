import { describe, expect, it, beforeEach } from 'vitest';
import {
  buildCargoTicketReference,
  cleanNullableText,
  extractNumericWrId,
  formatCargoCanonicalWr,
  mapCargoStatusToTibStatus,
  normalizeCargoPhotoUrls,
  parseTibV2TicketId,
  resolveDisplayTicketUrl,
  splitPhotoUrls,
} from '@/lib/tib/cargoSystemHelpers';
import {
  CargoSystemClient,
  clearCargoSystemSessionCache,
} from '@/lib/tib/cargoSystemClient';
import {
  mergeTibItemsV2First,
  normalizeCargoWarehouseItem,
  normalizeTibWarehouseItem,
} from '@/lib/tib/apiClient';

describe('TIB v2 (Cargo System - api.tibgrupo.com) — Helpers, Merge y Cliente JWT', () => {
  beforeEach(() => {
    clearCargoSystemSessionCache();
  });

  it('normaliza IDs numéricos y WRs canónicos ida y vuelta sin NaN', () => {
    expect(formatCargoCanonicalWr(506639)).toEqual({
      numericId: 506639,
      canonicalWr: 'WR000506639',
    });
    expect(formatCargoCanonicalWr('000506558')).toEqual({
      numericId: 506558,
      canonicalWr: 'WR000506558',
    });
    expect(formatCargoCanonicalWr('invalid')).toBeNull();
    expect(formatCargoCanonicalWr(0)).toBeNull();

    expect(extractNumericWrId('WR000506639')).toBe(506639);
    expect(extractNumericWrId('506639')).toBe(506639);
    expect(extractNumericWrId('WR')).toBeNull();
  });

  it('limpia literales "null"/"undefined" y traduce estados Cargo System a RECIBIDO/ENVIADO/ENTREGADO', () => {
    expect(cleanNullableText('null')).toBeNull();
    expect(cleanNullableText(' NULL ')).toBeNull();
    expect(cleanNullableText('undefined')).toBeNull();
    expect(cleanNullableText('  E08LOURDES  ')).toBe('E08LOURDES');

    expect(mapCargoStatusToTibStatus('RECEIVED')).toBe('RECIBIDO');
    expect(mapCargoStatusToTibStatus('IN_TRANSIT')).toBe('ENVIADO');
    expect(mapCargoStatusToTibStatus('TEMP_ASSIGNED')).toBe('ENVIADO');
    expect(mapCargoStatusToTibStatus('ASSIGNED')).toBe('ENVIADO');
    expect(mapCargoStatusToTibStatus('DELIVERED')).toBe('ENTREGADO');
  });

  it('soporta múltiples fotos válidas en tibgrupo.com/tibcourier.com y bloquea SSRF o sin_imagen', () => {
    const f1 = 'https://www.tibgrupo.com/cargo_system/data/img/warehouse/foto1.webp';
    const f2 = 'https://www.tibgrupo.com/cargo_system/data/img/warehouse/foto2.webp';
    const legacy = 'https://www.tibcourier.com/global-courier/ajax/files/packageimg/f3.jpg';

    expect(splitPhotoUrls(`${f1}, ${f2}, https://evil.example/ssrf.png, https://www.tibgrupo.com/sin_imagen.jpg`)).toEqual([
      f1,
      f2,
    ]);
    expect(normalizeCargoPhotoUrls(`${f1}, ${legacy}`)).toBe(`${f1},${legacy}`);
    expect(normalizeCargoPhotoUrls('http://www.tibgrupo.com/insecure.webp')).toBeNull();
    expect(normalizeCargoPhotoUrls('null')).toBeNull();
  });

  it('resuelve referencias tibv2://receipt/{id} al proxy autenticado del ERP y preserva tickets v1 autorizados', () => {
    const ref = buildCargoTicketReference(506639);
    expect(ref).toBe('tibv2://receipt/506639');
    expect(parseTibV2TicketId(ref)).toBe(506639);

    expect(resolveDisplayTicketUrl(ref, 'WR000506639')).toBe('/api/paquetes/tib-ticket/WR000506639');
    expect(
      resolveDisplayTicketUrl('https://www.tibcourier.com/global-courier/ajax/files/ticket.pdf', 'WR000450001')
    ).toBe('https://www.tibcourier.com/global-courier/ajax/files/ticket.pdf');
    expect(resolveDisplayTicketUrl('https://evil.example.com/fake.pdf', 'WR000450001')).toBeNull();
  });

  it('fusiona TIB v2 (prioridad) + TIB v1 (historial) sin perder paquetes históricos ni fotos', () => {
    const v2Shared = normalizeCargoWarehouseItem({
      id: 506639,
      tracking: 'TRK-V2-NUEVO',
      nameClient: 'AMEX CLIENTE V2',
      container: 'CAJA',
      weight: '2.55',
      status: 'RECEIVED',
      photoUrl: null,
      dateRegister: '2026-11-20T19:35:13.983Z',
    })!;

    const v1Shared = normalizeTibWarehouseItem(
      {
        wr: '000506639',
        seqwr: '506639',
        tracking: 'TRK-V1-VIEJO',
        nclient: 'AMEX CLIENTE V1',
        container: 'BOLSA',
        weight: '2.50',
        status: 'RECIBIDO',
        img: 'files/packageimg/old_photo.jpg',
        fecRegister: '2026-11-19 10:00:00',
      },
      'RECIBIDO'
    )!;

    const v1Historical = normalizeTibWarehouseItem(
      {
        wr: '000480001',
        seqwr: '480001',
        tracking: 'TRK-HIST-1',
        nclient: 'AMEX HISTORICO',
        container: 'CAJA',
        weight: '4.10',
        status: 'ENVIADO',
        fecRegister: '2026-10-10 10:00:00',
      },
      'ENVIADO'
    )!;

    const merged = mergeTibItemsV2First([v2Shared], [v1Shared, v1Historical]);
    expect(merged).toHaveLength(2);

    const shared = merged.find((i) => i.wr === 'WR000506639')!;
    expect(shared.source).toBe('tib_v2');
    expect(shared.cliente).toBe('AMEX CLIENTE V2');
    expect(shared.tracking).toBe('TRK-V2-NUEVO');
    expect(shared.peso).toBe(2.55);
    // Conserva la foto histórica de v1 cuando v2 no trajo foto
    expect(shared.fotoUrl).toBe('https://www.tibcourier.com/global-courier/ajax/files/packageimg/old_photo.jpg');
    expect(shared.ticketUrl).toBe('tibv2://receipt/506639');

    const hist = merged.find((i) => i.wr === 'WR000480001')!;
    expect(hist.source).toBe('tib_v1');
    expect(hist.cliente).toBe('AMEX HISTORICO');
  });

  it('CargoSystemClient autentica con JWT y renueva automáticamente ante HTTP 401 vía /user/refresh', async () => {
    const calls: string[] = [];
    let warehouseAttempts = 0;

    const mockFetch: typeof fetch = async (input, init) => {
      const url = String(input);
      calls.push(`${init?.method || 'GET'} ${url}`);

      if (url.endsWith('/user/login')) {
        return new Response(JSON.stringify({ token: 'tok-1', refresh: 'ref-1' }), { status: 200 });
      }
      if (url.endsWith('/user/refresh')) {
        return new Response(JSON.stringify({ token: 'tok-2', refresh: 'ref-2' }), { status: 200 });
      }
      if (url.includes('/warehouse/warehouse/find-all-warehouse')) {
        warehouseAttempts++;
        const authHeader = (init?.headers as Record<string, string>)?.Authorization;
        if (warehouseAttempts === 1) {
          expect(authHeader).toBe('Bearer tok-1');
          return new Response(JSON.stringify({ message: 'expired' }), { status: 401 });
        }
        expect(authHeader).toBe('Bearer tok-2');
        return new Response(
          JSON.stringify({ data: [{ id: 506639, status: 'RECEIVED', nameClient: 'AMEX TEST', weight: '1.20' }] }),
          { status: 200 }
        );
      }

      return new Response('Not found', { status: 404 });
    };

    const client = new CargoSystemClient({
      credentials: {
        baseUrl: 'https://api.tibgrupo.com',
        email: 'test@example.com',
        password: 'placeholder-password',
      },
      fetchImpl: mockFetch,
      maxRetries: 2,
    });

    const rows = await client.fetchWarehouses({ status: 'RECEIVED' });
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(506639);
    expect(calls).toContain('POST https://api.tibgrupo.com/user/login');
    expect(calls).toContain('POST https://api.tibgrupo.com/user/refresh');
  });
});
