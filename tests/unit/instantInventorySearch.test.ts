import { describe, it, expect } from 'vitest';
import { matchesFuzzySearch } from '@/lib/fuzzySearch';
import { Paquete } from '@/types';

describe('Instant Inventory In-Memory Search Engine', () => {
  const mockPaquetes: Paquete[] = [
    {
      id: 'pkg-1',
      numeroReciboBodega: 'WR000463962',
      tracking: '1Z123456789',
      nombreConsignatario: 'AMEX JANIRA AMEX',
      descripcion: 'Ropa variada',
      posicionEstante: 'A1-P2',
      anaquel: 'A1',
      piso: 'P2',
      estadoAmex: 'en_almacen',
      estadoTib: 'EnAlmacen',
      estadoEntrega: 'EnAlmacen',
      ubicacionActual: 'AmexLince',
      tipoEmpaque: 'CAJA',
      pesoKg: 3.5,
      creadoEn: '2026-10-20T10:00:00Z',
      actualizadoEn: '2026-10-20T10:00:00Z'
    },
    {
      id: 'pkg-2',
      numeroReciboBodega: 'WR000482022',
      tracking: 'TBA987654321',
      nombreConsignatario: 'AMEX JANIRA AMEX',
      descripcion: 'Zapatos',
      posicionEstante: 'A2-P1',
      anaquel: 'A2',
      piso: 'P1',
      estadoAmex: 'en_almacen',
      estadoTib: 'EnAlmacen',
      estadoEntrega: 'EnAlmacen',
      ubicacionActual: 'AmexLince',
      tipoEmpaque: 'CAJA',
      pesoKg: 1.8,
      creadoEn: '2026-10-21T11:00:00Z',
      actualizadoEn: '2026-10-21T11:00:00Z'
    },
    {
      id: 'pkg-3',
      numeroReciboBodega: 'WR000499999',
      tracking: '9400100000000000',
      nombreConsignatario: 'CARLOS CE138 BODEGA',
      descripcion: 'Accesorios ce138',
      posicionEstante: 'DSP-Z1',
      anaquel: 'DSP-Z1',
      piso: '',
      estadoAmex: 'listo_recojo',
      estadoTib: 'ListoParaRecojo',
      estadoEntrega: 'ListoParaRecojo',
      ubicacionActual: 'AmexLince',
      tipoEmpaque: 'SOBRE',
      pesoKg: 0.5,
      creadoEn: '2026-10-22T12:00:00Z',
      actualizadoEn: '2026-10-22T12:00:00Z'
    },
    {
      id: 'pkg-4',
      numeroReciboBodega: 'WR000455555',
      tracking: '1Z999888777',
      nombreConsignatario: 'CLIENTE ENTREGADO',
      descripcion: 'Entregado previo',
      posicionEstante: 'OFI',
      anaquel: 'OFI',
      piso: '',
      estadoAmex: 'entregado',
      estadoTib: 'Entregado',
      estadoEntrega: 'Entregado',
      ubicacionActual: 'Entregado',
      tipoEntrega: 'Presencial',
      tipoEmpaque: 'BOLSA',
      pesoKg: 2.0,
      creadoEn: '2026-10-15T09:00:00Z',
      actualizadoEn: '2026-10-23T15:00:00Z'
    }
  ];

  it('filters instantly by consignee "janira" matching both Janira packages', () => {
    const query = 'janira';
    const filtered = mockPaquetes.filter(p => {
      if (p.eliminadoEn) return false;
      return matchesFuzzySearch(query, [
        p.numeroReciboBodega,
        p.tracking,
        p.nombreConsignatario,
        p.descripcion,
        p.posicionEstante,
        p.anaquel,
        p.piso,
        p.tipoEmpaque,
        p.tipoEntrega
      ]);
    });

    expect(filtered.length).toBe(2);
    expect(filtered[0].numeroReciboBodega).toBe('WR000463962');
    expect(filtered[1].numeroReciboBodega).toBe('WR000482022');
  });

  it('filters instantly by "ce138" isolating only the ce138 package', () => {
    const query = 'ce138';
    const filtered = mockPaquetes.filter(p => {
      if (p.eliminadoEn) return false;
      return matchesFuzzySearch(query, [
        p.numeroReciboBodega,
        p.tracking,
        p.nombreConsignatario,
        p.descripcion,
        p.posicionEstante,
        p.anaquel,
        p.piso,
        p.tipoEmpaque,
        p.tipoEntrega
      ]);
    });

    expect(filtered.length).toBe(1);
    expect(filtered[0].numeroReciboBodega).toBe('WR000499999');
    expect(filtered[0].nombreConsignatario).toContain('CE138');
  });

  it('filters by WR number ignoring zeros (e.g. "463962" matches "WR000463962")', () => {
    const query = '463962';
    const filtered = mockPaquetes.filter(p => {
      if (p.eliminadoEn) return false;
      return matchesFuzzySearch(query, [
        p.numeroReciboBodega,
        p.tracking,
        p.nombreConsignatario,
        p.descripcion,
        p.posicionEstante
      ]);
    });

    expect(filtered.length).toBe(1);
    expect(filtered[0].numeroReciboBodega).toBe('WR000463962');
  });

  it('filters combined criteria: status "en_almacen" + search "janira"', () => {
    const query = 'janira';
    const statusFilter = 'en_almacen';

    const filtered = mockPaquetes.filter(p => {
      if (p.eliminadoEn) return false;
      if (p.estadoAmex !== statusFilter && p.estadoAmex !== 'recibido') return false;
      return matchesFuzzySearch(query, [
        p.numeroReciboBodega,
        p.tracking,
        p.nombreConsignatario,
        p.descripcion
      ]);
    });

    expect(filtered.length).toBe(2);
  });
});
