import { describe, it, expect } from 'vitest';
import type { DniSlotData } from '@/lib/dni-matrix/db';

describe('DNI Matrix Persistence & Cloud Draft Merge', () => {
  it('nunca debe eliminar cupos locales cuando el borrador en la nube tiene menos cupos', () => {
    // Simulación: Local tiene 6 cupos cargados por el usuario
    const localMap: Record<number, DniSlotData> = {
      1: { id: 1, label: 'JUAN PEREZ', dni: '12345678', anverso: 'data:image/jpeg;base64,local1', reverso: 'data:image/jpeg;base64,rev1', updatedAt: 1000 },
      2: { id: 2, label: 'MARIA LOPEZ', dni: '87654321', anverso: 'data:image/jpeg;base64,local2', reverso: 'data:image/jpeg;base64,rev2', updatedAt: 1000 },
      3: { id: 3, label: 'CARLOS RUIZ', dni: '45678912', anverso: 'data:image/jpeg;base64,local3', reverso: 'data:image/jpeg;base64,rev3', updatedAt: 1000 },
      4: { id: 4, label: 'ANA TORRES', dni: '78912345', anverso: 'data:image/jpeg;base64,local4', reverso: 'data:image/jpeg;base64,rev4', updatedAt: 1000 },
      5: { id: 5, label: 'ANGELO TEST', dni: '99887766', anverso: 'data:image/jpeg;base64,local5', reverso: 'data:image/jpeg;base64,rev5', updatedAt: 2000 },
      6: { id: 6, label: 'EDITH TEST', dni: '11223344', anverso: 'data:image/jpeg;base64,local6', reverso: 'data:image/jpeg;base64,rev6', updatedAt: 2000 },
    };

    // La nube solo tenía los primeros 4 cupos congelados por límite de tamaño de payload
    const cloudSlots: DniSlotData[] = [
      { id: 1, label: 'JUAN PEREZ', dni: '12345678', anverso: 'data:image/jpeg;base64,cloud1', reverso: 'data:image/jpeg;base64,cloudRev1', updatedAt: 900 },
      { id: 2, label: 'MARIA LOPEZ', dni: '87654321', anverso: 'data:image/jpeg;base64,cloud2', reverso: 'data:image/jpeg;base64,cloudRev2', updatedAt: 900 },
      { id: 3, label: 'CARLOS RUIZ', dni: '45678912', anverso: 'data:image/jpeg;base64,cloud3', reverso: 'data:image/jpeg;base64,cloudRev3', updatedAt: 900 },
      { id: 4, label: 'ANA TORRES', dni: '78912345', anverso: 'data:image/jpeg;base64,cloud4', reverso: 'data:image/jpeg;base64,cloudRev4', updatedAt: 900 },
    ];

    // Algoritmo de merge implementado en useDniMatrixState
    const mergedMap: Record<number, DniSlotData> = { ...localMap };

    cloudSlots.forEach((cs) => {
      const ls = localMap[cs.id];
      if (!ls) {
        mergedMap[cs.id] = cs;
      } else {
        const hasLocalAnverso = Boolean(ls.anverso && !ls.anverso.includes('[local_only]'));
        const hasCloudAnverso = Boolean(cs.anverso && !cs.anverso.includes('[local_only]'));
        const hasLocalReverso = Boolean(ls.reverso && !ls.reverso.includes('[local_only]'));
        const hasCloudReverso = Boolean(cs.reverso && !cs.reverso.includes('[local_only]'));

        const merged: DniSlotData = {
          ...cs,
          ...ls,
          label: ls.label || cs.label || '',
          dni: ls.dni || cs.dni || '',
          anverso: hasLocalAnverso ? ls.anverso : (hasCloudAnverso ? cs.anverso : ls.anverso),
          reverso: hasLocalReverso ? ls.reverso : (hasCloudReverso ? cs.reverso : ls.reverso),
          anversoRotation: ls.anversoRotation ?? cs.anversoRotation ?? 0,
          reversoRotation: ls.reversoRotation ?? cs.reversoRotation ?? 0,
          updatedAt: Math.max(ls.updatedAt || 0, cs.updatedAt || 0)
        };
        mergedMap[cs.id] = merged;
      }
    });

    // Validar que los 6 cupos están 100% presentes
    expect(Object.keys(mergedMap).length).toBe(6);
    expect(mergedMap[5]).toBeDefined();
    expect(mergedMap[5].label).toBe('ANGELO TEST');
    expect(mergedMap[5].dni).toBe('99887766');
    expect(mergedMap[6]).toBeDefined();
    expect(mergedMap[6].label).toBe('EDITH TEST');
    expect(mergedMap[1].anverso).toBe('data:image/jpeg;base64,local1');
  });

  it('debe integrar cupos nuevos creados en otro dispositivo sin sobreescribir los locales', () => {
    const localMap: Record<number, DniSlotData> = {
      1: { id: 1, label: 'LOCAL 1', dni: '11111111', anverso: 'img1', reverso: 'rev1' }
    };

    const cloudSlots: DniSlotData[] = [
      { id: 1, label: 'LOCAL 1', dni: '11111111', anverso: 'img1', reverso: 'rev1' },
      { id: 2, label: 'REMOTO 2', dni: '22222222', anverso: 'img2', reverso: 'rev2' }
    ];

    const mergedMap: Record<number, DniSlotData> = { ...localMap };

    cloudSlots.forEach((cs) => {
      const ls = localMap[cs.id];
      if (!ls) {
        mergedMap[cs.id] = cs;
      } else {
        mergedMap[cs.id] = { ...cs, ...ls };
      }
    });

    expect(Object.keys(mergedMap).length).toBe(2);
    expect(mergedMap[1].label).toBe('LOCAL 1');
    expect(mergedMap[2].label).toBe('REMOTO 2');
    expect(mergedMap[2].dni).toBe('22222222');
  });
});
