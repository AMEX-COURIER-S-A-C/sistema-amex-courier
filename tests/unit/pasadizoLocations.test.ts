import { describe, it, expect } from 'vitest';
import {
  LEVEL_LESS_LOCATIONS,
  isLevelLessLocation,
  normalizeWarehouseLocation,
  parseWarehouseLocation
} from '@/lib/validations/locations';

describe('Zonas de Pasadizo (PAS-Z1 / PAS-Z2) - Normalización y Reglas de Ubicación', () => {
  it('incluye PAS-Z1 y PAS-Z2 en la lista de ubicaciones canónicas sin nivel', () => {
    expect(LEVEL_LESS_LOCATIONS).toContain('PAS-Z1');
    expect(LEVEL_LESS_LOCATIONS).toContain('PAS-Z2');
  });

  it('isLevelLessLocation reconoce correctamente a PAS-Z1 y PAS-Z2', () => {
    expect(isLevelLessLocation('PAS-Z1')).toBe(true);
    expect(isLevelLessLocation('PAS-Z2')).toBe(true);
    expect(isLevelLessLocation('pas-z1')).toBe(true);
    expect(isLevelLessLocation('pas-z2')).toBe(true);
    expect(isLevelLessLocation('A1-P1')).toBe(false);
  });

  it('normalizeWarehouseLocation normaliza PAS-Z1 y PAS-Z2 y elimina sufijos de piso accidentales', () => {
    expect(normalizeWarehouseLocation('PAS-Z1')).toBe('PAS-Z1');
    expect(normalizeWarehouseLocation('PAS-Z2')).toBe('PAS-Z2');
    expect(normalizeWarehouseLocation('pas-z1')).toBe('PAS-Z1');
    expect(normalizeWarehouseLocation('pas-z2')).toBe('PAS-Z2');
    expect(normalizeWarehouseLocation('PAS-Z1-P1')).toBe('PAS-Z1');
    expect(normalizeWarehouseLocation('PAS-Z2-P1')).toBe('PAS-Z2');
    expect(normalizeWarehouseLocation('PAS-Z1-P2')).toBe('PAS-Z1');
  });

  it('parseWarehouseLocation asigna anaquel directo, piso null y bandera isLevelLess', () => {
    const loc1 = parseWarehouseLocation('PAS-Z1');
    expect(loc1.anaquel).toBe('PAS-Z1');
    expect(loc1.piso).toBeNull();
    expect(loc1.posicionEstante).toBe('PAS-Z1');
    expect(loc1.isLevelLess).toBe(true);

    const loc2 = parseWarehouseLocation('PAS-Z2');
    expect(loc2.anaquel).toBe('PAS-Z2');
    expect(loc2.piso).toBeNull();
    expect(loc2.posicionEstante).toBe('PAS-Z2');
    expect(loc2.isLevelLess).toBe(true);

    const locAccidental = parseWarehouseLocation('PAS-Z1-P1');
    expect(locAccidental.anaquel).toBe('PAS-Z1');
    expect(locAccidental.piso).toBeNull();
    expect(locAccidental.posicionEstante).toBe('PAS-Z1');
    expect(locAccidental.isLevelLess).toBe(true);
  });
});
