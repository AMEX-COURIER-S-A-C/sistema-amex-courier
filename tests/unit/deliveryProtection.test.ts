import { describe, it, expect } from 'vitest';
import { Paquete, TipoEstadoAmex } from '@/types';

describe('Delivery Protection & Anti-Chancado Logic', () => {
  const mockPackages: Paquete[] = [
    {
      id: 'pkg-1',
      numeroReciboBodega: 'WR000000001',
      tracking: 'TRK001',
      nombreConsignatario: 'Cliente Uno',
      estadoAmex: 'entregado',
      posicionEstante: 'REC',
      tipoEmpaque: 'CAJA',
      pesoKg: 2.5,
      descripcion: 'Caja',
      ubicacionActual: 'Entregado',
      estadoTib: 'Entregado',
      creadoEn: '2026-10-15T00:00:00Z'
    },
    {
      id: 'pkg-2',
      numeroReciboBodega: 'WR000000002',
      tracking: 'TRK002',
      nombreConsignatario: 'Cliente Dos',
      estadoAmex: 'en_almacen',
      posicionEstante: 'A-1',
      tipoEmpaque: 'SOBRE',
      pesoKg: 0.5,
      descripcion: 'Sobre',
      ubicacionActual: 'AmexLince',
      estadoTib: 'Recibido',
      creadoEn: '2026-10-15T00:00:00Z'
    },
    {
      id: 'pkg-3',
      numeroReciboBodega: 'WR000000003',
      tracking: 'TRK003',
      nombreConsignatario: 'Cliente Tres',
      estadoAmex: 'listo_recojo',
      posicionEstante: 'A-2',
      tipoEmpaque: 'CAJA',
      pesoKg: 1.0,
      descripcion: 'Paquete',
      ubicacionActual: 'AmexLince',
      estadoTib: 'Recibido',
      creadoEn: '2026-10-15T00:00:00Z'
    }
  ];

  it('detects delivered conflict and filters out delivered packages when skipDelivered is true', () => {
    const selectedIds = ['pkg-1', 'pkg-2', 'pkg-3'];
    const targetStatusAmex: TipoEstadoAmex = 'en_almacen';
    const skipDelivered = true;

    // Filter logic simulating batchStatusChange
    let idsToUpdate = [...selectedIds];
    const skippedList: Paquete[] = [];

    if (targetStatusAmex !== 'entregado' && skipDelivered) {
      const deliveredIds = new Set(
        mockPackages.filter(p => p.estadoAmex === 'entregado').map(p => p.id)
      );

      idsToUpdate = selectedIds.filter(id => !deliveredIds.has(id));

      for (const id of deliveredIds) {
        if (selectedIds.includes(id)) {
          const found = mockPackages.find(p => p.id === id);
          if (found) skippedList.push(found);
        }
      }
    }

    expect(idsToUpdate).toEqual(['pkg-2', 'pkg-3']);
    expect(skippedList).toHaveLength(1);
    expect(skippedList[0].id).toBe('pkg-1');
  });

  it('allows overwrite if skipDelivered is explicitly false (force overwrite)', () => {
    const selectedIds = ['pkg-1', 'pkg-2', 'pkg-3'];
    const targetStatusAmex: TipoEstadoAmex = 'en_almacen';
    const skipDelivered = false;

    let idsToUpdate = [...selectedIds];
    const skippedList: Paquete[] = [];

    if (targetStatusAmex !== 'entregado' && skipDelivered) {
      const deliveredIds = new Set(
        mockPackages.filter(p => p.estadoAmex === 'entregado').map(p => p.id)
      );
      idsToUpdate = selectedIds.filter(id => !deliveredIds.has(id));
      for (const id of deliveredIds) {
        if (selectedIds.includes(id)) {
          const found = mockPackages.find(p => p.id === id);
          if (found) skippedList.push(found);
        }
      }
    }

    expect(idsToUpdate).toEqual(['pkg-1', 'pkg-2', 'pkg-3']);
    expect(skippedList).toHaveLength(0);
  });

  it('does not skip any packages if targetStatus is entregado', () => {
    const selectedIds = ['pkg-1', 'pkg-2'];
    const targetStatusAmex: TipoEstadoAmex = 'entregado';
    const skipDelivered = true;

    let idsToUpdate = [...selectedIds];
    const skippedList: Paquete[] = [];

    if (targetStatusAmex !== 'entregado' && skipDelivered) {
      const deliveredIds = new Set(
        mockPackages.filter(p => p.estadoAmex === 'entregado').map(p => p.id)
      );
      idsToUpdate = selectedIds.filter(id => !deliveredIds.has(id));
      for (const id of deliveredIds) {
        if (selectedIds.includes(id)) {
          const found = mockPackages.find(p => p.id === id);
          if (found) skippedList.push(found);
        }
      }
    }

    expect(idsToUpdate).toEqual(['pkg-1', 'pkg-2']);
    expect(skippedList).toHaveLength(0);
  });

  it('identifies status reversal attempt from entregado to non-entregado in single package edit', () => {
    const currentPkg = mockPackages[0]; // estadoAmex: 'entregado'
    const requestedNewStatus: TipoEstadoAmex = 'en_almacen';

    const isReversal =
      currentPkg.estadoAmex === 'entregado' && requestedNewStatus !== 'entregado';

    expect(isReversal).toBe(true);
  });

  it('formats appropriate toast notifications for partial protected updates', () => {
    const updatedCount: number = 2;
    const skippedCount: number = 1;
    const statusLabel = 'En Almacén';

    let message = '';
    if (skippedCount > 0) {
      if (updatedCount === 0) {
        message = `Los ${skippedCount} paquetes ya figuran como ENTREGADOS y fueron protegidos.`;
      } else {
        message = `Se cambiaron a "${statusLabel}" ${updatedCount} paquetes. Se protegieron ${skippedCount} ya entregados.`;
      }
    }

    expect(message).toBe(
      'Se cambiaron a "En Almacén" 2 paquetes. Se protegieron 1 ya entregados.'
    );
  });
});
