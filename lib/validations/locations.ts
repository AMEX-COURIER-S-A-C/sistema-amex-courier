/**
 * Constantes y utilidades para normalización canónica de ubicaciones de almacén
 * Sistema AMEX Courier
 *
 * REGLAS DE NEGOCIO:
 * 1. Despacho solo tiene 2 zonas físicas: DSP-Z1 y DSP-Z2.
 * 2. Pasadizo cuenta con 2 zonas físicas: PAS-Z1 y PAS-Z2.
 * 3. NO existe la ubicación 'DSP' aislada. Si el sistema o el usuario introduce 'DSP' o 'DESPACHO',
 *    debe normalizarse automáticamente a 'DSP-Z1' (Zona de Despacho 1).
 * 4. Zonas sin pisos/niveles (level-less): 'OFI', 'DSP-Z1', 'DSP-Z2', 'PAS-Z1', 'PAS-Z2', 'TRANSITO'.
 *    En estas zonas, anaquel = ubicación y piso = null.
 * 5. La ubicación obsoleta 'REC' se normaliza a 'OFI'.
 */

export const LEVEL_LESS_LOCATIONS = ['OFI', 'DSP-Z1', 'DSP-Z2', 'PAS-Z1', 'PAS-Z2', 'TRANSITO'] as const;
export type LevelLessLocation = (typeof LEVEL_LESS_LOCATIONS)[number];

export function isLevelLessLocation(loc: string | null | undefined): boolean {
  if (!loc) return false;
  const upper = loc.trim().toUpperCase();
  return (
    upper === 'OFI' ||
    upper === 'DSP-Z1' ||
    upper === 'DSP-Z2' ||
    upper === 'PAS-Z1' ||
    upper === 'PAS-Z2' ||
    upper === 'TRANSITO' ||
    upper === 'REC' ||
    upper === 'DSP' ||
    upper === 'DESPACHO'
  );
}

/**
 * Normaliza cualquier variante de ubicación a su forma canónica de almacén.
 * 'DSP' o 'DESPACHO' -> 'DSP-Z1'
 * 'DSP-P1', 'DSP-P2' -> 'DSP-Z1'
 * 'REC' o 'REC-P1' -> 'OFI'
 * 'OFI-P1' -> 'OFI'
 */
export function normalizeWarehouseLocation(rawLoc: string | null | undefined): string {
  if (!rawLoc) return 'OFI';
  const trimmed = rawLoc.trim().toUpperCase();

  // Despacho: solo existen DSP-Z1 y DSP-Z2
  if (
    trimmed === 'DSP' ||
    trimmed === 'DESPACHO' ||
    trimmed.startsWith('DSP-P') ||
    trimmed === 'DSP-P1' ||
    trimmed === 'DSP-P2'
  ) {
    return 'DSP-Z1';
  }

  // Pasadizo: zonas canónicas PAS-Z1 y PAS-Z2 (limpiar sufijos accidentales como -P1)
  if (trimmed === 'PAS-Z1-P1' || trimmed.startsWith('PAS-Z1-')) {
    return 'PAS-Z1';
  }
  if (trimmed === 'PAS-Z2-P1' || trimmed.startsWith('PAS-Z2-')) {
    return 'PAS-Z2';
  }

  // Oficina: normalizar REC o variantes
  if (trimmed === 'REC' || trimmed.startsWith('REC-') || trimmed === 'OFI-P1' || trimmed.startsWith('OFI-')) {
    return 'OFI';
  }

  return trimmed;
}

export interface ParsedWarehouseLocation {
  anaquel: string;
  piso: string | null;
  posicionEstante: string;
  isLevelLess: boolean;
}

/**
 * Parsea y separa de forma segura una ubicación en anaquel, piso y posición estante.
 * Garantiza que 'DSP-Z1', 'DSP-Z2', 'PAS-Z1' y 'PAS-Z2' nunca sean separados erróneamente en anaquel='DSP'/'PAS' y piso='Z1'/'Z2'.
 */
export function parseWarehouseLocation(rawLoc: string | null | undefined): ParsedWarehouseLocation {
  const norm = normalizeWarehouseLocation(rawLoc);

  // Zonas especiales nivel único
  if (
    norm === 'OFI' ||
    norm === 'DSP-Z1' ||
    norm === 'DSP-Z2' ||
    norm === 'PAS-Z1' ||
    norm === 'PAS-Z2' ||
    norm === 'TRANSITO'
  ) {
    return {
      anaquel: norm,
      piso: null,
      posicionEstante: norm,
      isLevelLess: true,
    };
  }

  // Estantes tradicionales con niveles (ej: A1-P2, A2-P1)
  if (norm.includes('-')) {
    const [ana, ...rest] = norm.split('-');
    const pis = rest.join('-');
    return {
      anaquel: ana,
      piso: pis || 'P1',
      posicionEstante: `${ana}-${pis || 'P1'}`,
      isLevelLess: false,
    };
  }

  return {
    anaquel: norm,
    piso: 'P1',
    posicionEstante: `${norm}-P1`,
    isLevelLess: false,
  };
}
