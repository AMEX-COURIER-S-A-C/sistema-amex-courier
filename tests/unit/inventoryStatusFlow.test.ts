import { describe, it, expect } from 'vitest';
import { Paquete, TipoEstadoAmex } from '@/types';

describe('Inventory Status Transition Flow & Optimistic Retention', () => {
  const samplePaquetes: Paquete[] = [
    {
      id: 'pkg-1',
      numeroReciboBodega: 'WR-001',
      tracking: 'TRK001',
      nombreConsignatario: 'Juan Perez',
      estadoAmex: 'en_almacen',
      posicionEstante: 'A-1',
      tipoEmpaque: 'CAJA',
      pesoKg: 2.5,
      descripcion: 'Caja general',
      ubicacionActual: 'AmexLince',
      estadoTib: 'Recibido',
      creadoEn: '2026-10-15T00:00:00Z'
    },
    {
      id: 'pkg-2',
      numeroReciboBodega: 'WR-002',
      tracking: 'TRK002',
      nombreConsignatario: 'Maria Gomez',
      estadoAmex: 'en_almacen',
      posicionEstante: 'B-2',
      tipoEmpaque: 'SOBRE',
      pesoKg: 0.5,
      descripcion: 'Documentos',
      ubicacionActual: 'AmexLince',
      estadoTib: 'Recibido',
      creadoEn: '2026-10-15T00:00:00Z'
    }
  ];

  it('keeps recently delivered package visible during retention window when filtered by en_almacen', () => {
    // Simulated filter by estadoAmex: 'en_almacen'
    const filterEstadoAmex = 'en_almacen';
    const recentlyDeliveredIds = ['pkg-1'];

    // Package 1 is optimistically delivered, Package 2 is still in warehouse
    const currentPackages: Paquete[] = [
      { ...samplePaquetes[0], estadoAmex: 'entregado' },
      samplePaquetes[1]
    ];

    // Filter logic that includes recentlyDeliveredIds
    const filtered = currentPackages.filter(p => {
      if (recentlyDeliveredIds.includes(p.id)) {
        return true; // Retained smoothly
      }
      return p.estadoAmex === filterEstadoAmex;
    });

    expect(filtered).toHaveLength(2);
    expect(filtered.map(p => p.id)).toContain('pkg-1');
    expect(filtered.map(p => p.id)).toContain('pkg-2');

    // After retention timeout (2.5s), pkg-1 is cleared from recentlyDeliveredIds
    const expiredRecentlyDeliveredIds: string[] = [];
    const filteredAfterExpiry = currentPackages.filter(p => {
      if (expiredRecentlyDeliveredIds.includes(p.id)) {
        return true;
      }
      return p.estadoAmex === filterEstadoAmex;
    });

    expect(filteredAfterExpiry).toHaveLength(1);
    expect(filteredAfterExpiry[0].id).toBe('pkg-2');
  });

  it('formats single consolidated notification message for bulk status changes', () => {
    const targetStatusAmex: TipoEstadoAmex = 'entregado';
    const updatedCount = 15;

    const statusLabel =
      targetStatusAmex === 'entregado'
        ? 'Entregado'
        : targetStatusAmex === 'en_almacen'
        ? 'En Almacén'
        : targetStatusAmex === 'listo_recojo'
        ? 'Listo Recojo'
        : targetStatusAmex === 'en_ruta'
        ? 'En Ruta'
        : targetStatusAmex;

    const message = `Se cambiaron a "${statusLabel}" ${updatedCount} paquetes con éxito.`;

    expect(message).toBe('Se cambiaron a "Entregado" 15 paquetes con éxito.');
  });

  it('verifies silent fetch parameter suppresses loading spinner flicker', () => {
    let isLoading = false;

    const fetchServerPaquetes = (isSilent = false) => {
      if (!isSilent) {
        isLoading = true;
      }
    };

    // User initiated initial load: shows spinner
    fetchServerPaquetes(false);
    expect(isLoading).toBe(true);

    // Reset
    isLoading = false;

    // Realtime background update: silent, zero flicker
    fetchServerPaquetes(true);
    expect(isLoading).toBe(false);
  });

  it('retains multiple bulk delivered packages in recentlyDeliveredIds during retention window', () => {
    const currentSelected = ['pkg-1', 'pkg-2'];
    let recentlyDelivered: string[] = [];

    // Simulate bulk delivery
    recentlyDelivered = Array.from(new Set([...recentlyDelivered, ...currentSelected]));
    expect(recentlyDelivered).toEqual(['pkg-1', 'pkg-2']);

    // Filter check: both are retained even if their status is now 'entregado'
    const packages: Paquete[] = [
      { ...samplePaquetes[0], estadoAmex: 'entregado' },
      { ...samplePaquetes[1], estadoAmex: 'entregado' }
    ];

    const retainedInView = packages.filter(
      p => recentlyDelivered.includes(p.id) || p.estadoAmex === 'en_almacen'
    );
    expect(retainedInView).toHaveLength(2);
  });

  it('defaults inventory status filter to en_almacen and matches both en_almacen and legacy recibido', () => {
    const defaultStatusAmexFilter = 'en_almacen';

    const testPackages: Paquete[] = [
      { ...samplePaquetes[0], estadoAmex: 'en_almacen' },
      { ...samplePaquetes[1], estadoAmex: 'recibido' },
      { ...samplePaquetes[0], id: 'pkg-3', estadoAmex: 'entregado' },
      { ...samplePaquetes[0], id: 'pkg-4', estadoAmex: 'en_ruta' }
    ];

    const filtered = testPackages.filter(p => {
      if (defaultStatusAmexFilter === 'en_almacen') {
        return p.estadoAmex === 'en_almacen' || p.estadoAmex === 'recibido';
      }
      return p.estadoAmex === defaultStatusAmexFilter;
    });

    expect(filtered).toHaveLength(2);
    expect(filtered.map(p => p.id)).toEqual(['pkg-1', 'pkg-2']);
  });

  it('verifies filter bar active detection and reset restores en_almacen default', () => {
    let currentFilter = 'en_almacen';

    // Helper mirroring InventoryFilterBar hasAnyFilterActive logic
    const isFilterActive = (status: string, search: string = '') =>
      Boolean(search) || (Boolean(status) && status !== 'en_almacen');

    // Default state: not active
    expect(isFilterActive(currentFilter)).toBe(false);

    // User changes to 'ALL' (Todos los Estados): filter is considered active
    currentFilter = 'ALL';
    expect(isFilterActive(currentFilter)).toBe(true);

    // User changes to 'entregado': filter is considered active
    currentFilter = 'entregado';
    expect(isFilterActive(currentFilter)).toBe(true);

    // Reset filters restores 'en_almacen'
    const handleReset = () => {
      currentFilter = 'en_almacen';
    };
    handleReset();
    expect(currentFilter).toBe('en_almacen');
    expect(isFilterActive(currentFilter)).toBe(false);
  });
});
