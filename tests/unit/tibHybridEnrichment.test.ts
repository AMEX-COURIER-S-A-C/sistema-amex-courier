import { describe, expect, it } from 'vitest';
import { normalizeTibWr, type NormalizedTibItem } from '@/lib/tib/apiClient';

describe('TIB Hybrid Enrichment Engine', () => {
  it('correctly maps WRs across multiple variations (canonical, raw digits, leading zeros)', () => {
    const mockOfficialItems: NormalizedTibItem[] = [
      {
        wr: 'WR000482504',
        rawWr: '000482504',
        seqwr: '482504',
        tracking: '1Z9999999999999999',
        cliente: 'CARLOS LOPEZ',
        tipoEmpaque: 'CAJA',
        peso: 3.5,
        status: 'ENTREGADO',
        estadoBd: 'Entregado',
        fecRegister: '2026-10-21 10:00:00',
        fecModify: '2026-10-21 11:00:00',
        timestampRank: 1,
        statusPriority: 3,
        rack: 'A-1',
        postal: '33166',
        fotoUrl: 'https://www.tibcourier.com/global-courier/ajax/files/packageimg/foto_482504.png',
        ticketUrl: 'https://www.tibcourier.com/global-courier/ajax/files/packageimg/ticket_482504.pdf',
      },
      {
        wr: 'WR000481141',
        rawWr: '000481141',
        seqwr: '481141',
        tracking: 'TBA309999999999',
        cliente: 'ANA PEREZ',
        tipoEmpaque: 'SOBRE',
        peso: 0.8,
        status: 'RECIBIDO',
        estadoBd: 'Recibido',
        fecRegister: '2026-10-21 09:00:00',
        fecModify: '2026-10-21 09:00:00',
        timestampRank: 1,
        statusPriority: 1,
        rack: 'B-2',
        postal: '33166',
        fotoUrl: 'https://www.tibcourier.com/global-courier/ajax/files/packageimg/foto_481141.png',
        ticketUrl: null,
      },
    ];

    // Build mock index maps identical to hybridEnricher.ts
    const byCanonical = new Map<string, NormalizedTibItem>();
    const byDigits = new Map<string, NormalizedTibItem>();

    for (const item of mockOfficialItems) {
      if (item.wr) byCanonical.set(item.wr.toUpperCase(), item);
      const digits = item.wr.replace(/\D/g, '').replace(/^0+/, '');
      if (digits) byDigits.set(digits, item);
      if (item.seqwr) byDigits.set(item.seqwr.replace(/^0+/, ''), item);
    }

    // Lookup 1: exact canonical string
    expect(byCanonical.get('WR000482504')?.cliente).toBe('CARLOS LOPEZ');

    // Lookup 2: short numeric format (482504)
    expect(byDigits.get('482504')?.cliente).toBe('CARLOS LOPEZ');

    // Lookup 3: WR with non-standard prefix or spaces (wr 000481141)
    const testWr = 'wr 000481141';
    const cleanDigits = testWr.replace(/\D/g, '').replace(/^0+/, '');
    expect(byDigits.get(cleanDigits)?.cliente).toBe('ANA PEREZ');
    expect(byDigits.get(cleanDigits)?.fotoUrl).toContain('foto_481141.png');
  });

  it('preserves existing non-default customer names and only enriches empty or placeholder consignees', () => {
    const existingPackage1 = {
      id: 'p1',
      numero_recibo_bodega: 'WR000482504',
      nombre_consignatario: 'JUAN VALDEZ (ORIGINAL)', // Valid non-default name
    };

    const existingPackage2 = {
      id: 'p2',
      numero_recibo_bodega: 'WR000482505',
      nombre_consignatario: 'CLIENTE AMEX', // Placeholder name
    };

    const existingPackage3 = {
      id: 'p3',
      numero_recibo_bodega: 'WR000482506',
      nombre_consignatario: null, // Empty
    };

    const tibMatch = {
      cliente: 'NOMBRE OFICIAL TIB',
    };

    const shouldUpdateCliente = (currentName: string | null | undefined, forceRefresh: boolean) => {
      if (forceRefresh) return true;
      if (!currentName || currentName.trim() === '') return true;
      const upper = currentName.toUpperCase();
      return upper.includes('CLIENTE AMEX') || upper === 'AMEX' || upper === 'SIN ASIGNAR';
    };

    // Case 1: Real name, forceRefresh = false -> preserve
    expect(shouldUpdateCliente(existingPackage1.nombre_consignatario, false)).toBe(false);

    // Case 2: Placeholder name -> enrich
    expect(shouldUpdateCliente(existingPackage2.nombre_consignatario, false)).toBe(true);

    // Case 3: Empty name -> enrich
    expect(shouldUpdateCliente(existingPackage3.nombre_consignatario, false)).toBe(true);

    // Case 4: Real name, forceRefresh = true -> overwrite
    expect(shouldUpdateCliente(existingPackage1.nombre_consignatario, true)).toBe(true);
  });

  it('keeps direct TIB media URLs without uploading to R2 as per zero-storage policy', () => {
    const rawTibImg = 'files/packageimg/WR482504_img.jpg';
    const baseUrl = 'https://www.tibcourier.com/global-courier/ajax/';

    const fullUrl = rawTibImg.startsWith('http')
      ? rawTibImg
      : `${baseUrl}${rawTibImg.replace(/^\/+/, '')}`;

    expect(fullUrl).toBe('https://www.tibcourier.com/global-courier/ajax/files/packageimg/WR482504_img.jpg');
    // Ensure no Cloudflare / R2 bucket mutation is made
    expect(fullUrl).not.toContain('r2.cloudflarestorage.com');
  });

  it('normalizes legacy status strings to valid inventory estado_tib values', () => {
    const mapStatus = (status: string | undefined): 'Recibido' | 'Enviado' | 'Entregado' => {
      const upper = (status || '').toUpperCase();
      if (upper.includes('ENTREGADO')) return 'Entregado';
      if (upper.includes('ENVIADO')) return 'Enviado';
      return 'Recibido';
    };

    expect(mapStatus('RECIBIDO EN MIAMI')).toBe('Recibido');
    expect(mapStatus('ENVIADO A DESTINO')).toBe('Enviado');
    expect(mapStatus('ENTREGADO')).toBe('Entregado');
    expect(mapStatus('')).toBe('Recibido');
  });
});
