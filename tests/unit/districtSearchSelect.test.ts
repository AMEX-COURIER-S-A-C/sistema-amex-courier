import { describe, it, expect } from 'vitest';
import {
  ZONAS_LIMA_DISTRITOS,
  normalizeDistrito,
  isKnownDistrito
} from '@/lib/utils/phoneUtils';

describe('DistrictSearchSelect & Búsqueda de Distritos', () => {
  it('contiene los distritos de Lima y Callao con sus zonas', () => {
    const allDistritos = ZONAS_LIMA_DISTRITOS.flatMap(z => z.distritos);
    expect(allDistritos.length).toBeGreaterThanOrEqual(43);

    const lince = allDistritos.find(d => d.value === 'LINCE');
    expect(lince).toBeDefined();
    expect(lince?.label).toBe('Lince');

    const miraflores = allDistritos.find(d => d.value === 'MIRAFLORES');
    expect(miraflores).toBeDefined();
    expect(miraflores?.label).toBe('Miraflores');

    const puentePiedra = allDistritos.find(d => d.value === 'PUENTE PIEDRA');
    expect(puentePiedra).toBeDefined();
    expect(puentePiedra?.label).toBe('Puente Piedra');
  });

  it('normaliza distritos con tildes y mayúsculas/minúsculas', () => {
    expect(normalizeDistrito('breña')).toBe('BREÑA');
    expect(normalizeDistrito('brena')).toBe('BREÑA');
    expect(normalizeDistrito('Jesús María')).toBe('JESUS MARIA');
    expect(normalizeDistrito('jesus maria')).toBe('JESUS MARIA');
    expect(normalizeDistrito('San Martín de Porres')).toBe('SAN MARTIN DE PORRES');
    expect(normalizeDistrito('san martin de porres')).toBe('SAN MARTIN DE PORRES');
    expect(normalizeDistrito('Lurín')).toBe('LURIN');
    expect(normalizeDistrito('lurin')).toBe('LURIN');
    expect(normalizeDistrito('Rímac')).toBe('RIMAC');
    expect(normalizeDistrito('rimac')).toBe('RIMAC');
  });

  it('reconoce abreviaturas comunes en búsqueda de distritos', () => {
    expect(normalizeDistrito('SMP')).toBe('SAN MARTIN DE PORRES');
    expect(normalizeDistrito('SJL')).toBe('SAN JUAN DE LURIGANCHO');
    expect(normalizeDistrito('SJM')).toBe('SAN JUAN DE MIRAFLORES');
    expect(normalizeDistrito('VES')).toBe('VILLA EL SALVADOR');
    expect(normalizeDistrito('VMT')).toBe('VILLA MARIA DEL TRIUNFO');
    expect(normalizeDistrito('SURCO')).toBe('SANTIAGO DE SURCO');
    expect(normalizeDistrito('MOLINA')).toBe('LA MOLINA');
    expect(normalizeDistrito('CHOSICA')).toBe('LURIGANCHO-CHOSICA');
    expect(normalizeDistrito('LIMA')).toBe('CERCADO DE LIMA');
  });

  it('valida que isKnownDistrito identifique distritos válidos', () => {
    expect(isKnownDistrito('Lince')).toBe(true);
    expect(isKnownDistrito('LINCE')).toBe(true);
    expect(isKnownDistrito('Miraflores')).toBe(true);
    expect(isKnownDistrito('Puente Piedra')).toBe(true);
    expect(isKnownDistrito('Surco')).toBe(true);
    expect(isKnownDistrito('SJL')).toBe(true);
    expect(isKnownDistrito('DistritoInventado')).toBe(false);
  });
});
