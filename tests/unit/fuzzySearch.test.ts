import { describe, it, expect } from 'vitest';
import {
  normalizeText,
  cleanAlphanumeric,
  stripLeadingZeros,
  matchesFuzzySearch,
} from '@/lib/fuzzySearch';

describe('Fuzzy Search — Motor de Búsqueda Inteligente', () => {
  it('debe normalizar texto eliminando tildes y mayúsculas', () => {
    expect(normalizeText('Ángel Ramón PÉREZ')).toBe('angel ramon perez');
  });

  it('debe limpiar caracteres alfanuméricos ignorando guiones y espacios', () => {
    expect(cleanAlphanumeric('WR-0010452 / A1-P2')).toBe('wr0010452a1p2');
  });

  it('debe remover ceros a la izquierda para comparaciones numéricas', () => {
    expect(stripLeadingZeros('WR-000451')).toBe('451');
  });

  it('debe encontrar coincidencias parciales con matchesFuzzySearch', () => {
    const fields = ['WR-000448379', 'CARLOS GONZALEZ', '72345678', '1Z9999999999999999'];

    // Búsqueda por número sin ceros
    expect(matchesFuzzySearch('448379', fields)).toBe(true);

    // Búsqueda por apellido sin tilde
    expect(matchesFuzzySearch('gonzalez', fields)).toBe(true);

    // Búsqueda multi-término
    expect(matchesFuzzySearch('carlos 448379', fields)).toBe(true);

    // Búsqueda por DNI
    expect(matchesFuzzySearch('72345678', fields)).toBe(true);

    // Búsqueda no coincidente
    expect(matchesFuzzySearch('rodriguez', fields)).toBe(false);
  });

  it('debe buscar códigos alfanuméricos como "tce19" respetando letras y evitando falsos positivos', () => {
    const pkg1 = ['WR000486530', 'TTCE19A2', 'AMEX JANIRA AMEX'];
    const pkg2 = ['WR000486286', 'TCE19A6', 'AMEX JANIRA AMEX'];
    const pkg3 = ['WR000190799', 'TBA312433818928', 'OTRO CLIENTE'];
    const pkg4 = ['WR000482073', 'GCE19A3', 'AMEX JANIRA AMEX'];

    // Debe coincidir con paquetes que realmente contengan "tce19" dentro del tracking
    expect(matchesFuzzySearch('tce19', pkg1)).toBe(true);
    expect(matchesFuzzySearch('tce19', pkg2)).toBe(true);

    // NO debe coincidir con paquetes que solo tienen "19" en el WR o en otro tracking como "GCE19"
    expect(matchesFuzzySearch('tce19', pkg3)).toBe(false);
    expect(matchesFuzzySearch('tce19', pkg4)).toBe(false);
  });

  it('debe buscar con prefijo WR "wr486530" omitiendo ceros', () => {
    const pkg = ['WR000486530', 'TTCE19A2', 'AMEX JANIRA AMEX'];
    expect(matchesFuzzySearch('wr486530', pkg)).toBe(true);
  });
});
