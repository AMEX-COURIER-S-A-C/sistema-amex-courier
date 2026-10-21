/**
 * Reglas de Validación y Normalización Canónica de Guías WR
 * Sistema AMEX Courier
 *
 * REGLAS DE NEGOCIO:
 * 1. Longitud obligatoria: exactamente 11 caracteres.
 * 2. Prefijo obligatorio: debe comenzar por 'WR', 'wr' o 'Wr'.
 * 3. Seguido de 9 caracteres alfanuméricos (típicamente dígitos correlativos, ej. WR000474478).
 * 4. Normalización estándar: siempre en mayúsculas sin espacios internos.
 */

export const WR_LENGTH = 11;
export const WR_PREFIX = 'WR';
export const WR_REGEX = /^WR[A-Z0-9]{9}$/i;

/**
 * Limpia y normaliza un texto a formato WR (mayúsculas, sin espacios).
 */
export function cleanWr(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/\s+/g, '').toUpperCase();
}

/**
 * Valida si un valor cumple estrictamente la regla:
 * - Comienza con WR (insensible a mayúsculas)
 * - Tiene exactamente 11 caracteres
 * - Los últimos 9 son alfanuméricos
 */
export function isValidWr(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const clean = cleanWr(value);
  return clean.length === WR_LENGTH && WR_REGEX.test(clean);
}

/**
 * Retorna un mensaje explicativo si el código WR no cumple la regla de negocio,
 * o null si es válido.
 */
export function getWrValidationError(value: unknown): string | null {
  if (!value || typeof value !== 'string' || !value.trim()) {
    return 'El código de Guía WR es obligatorio.';
  }

  const clean = cleanWr(value);

  if (!clean.startsWith(WR_PREFIX)) {
    return `El código WR debe comenzar obligatoriamente con "${WR_PREFIX}" (ej. WR000474478).`;
  }

  if (clean.length !== WR_LENGTH) {
    return `El código WR debe tener exactamente ${WR_LENGTH} caracteres (actualmente tiene ${clean.length}). Ejemplo: WR000474478.`;
  }

  if (!WR_REGEX.test(clean)) {
    return `El código WR solo puede contener letras y números después de "WR" (ej. WR000474478).`;
  }

  return null;
}

/**
 * Helper inteligente para autocompletar el prefijo WR y normalizar la cantidad de ceros
 * si el usuario o pistola ingresa solo los dígitos numéricos o códigos con ceros faltantes.
 * Ejemplos:
 *  - '000474478' -> 'WR000474478'
 *  - '482504'    -> 'WR000482504'
 *  - 'WR00482504' -> 'WR000482504' (rellena los ceros faltantes a 11 caracteres)
 */
export function normalizeWr(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value).trim().replace(/\s+/g, '').toUpperCase();
  if (!str) return '';

  // Si ya es un WR canónico válido de 11 caracteres (WR + 9 dígitos alfanuméricos)
  if (WR_REGEX.test(str)) {
    return str;
  }

  // Extraer sólo los dígitos numéricos
  const digits = str.replace(/\D/g, '');
  if (digits.length > 0 && digits.length <= 9) {
    return `WR${digits.padStart(9, '0')}`;
  }

  if (str.startsWith(WR_PREFIX)) {
    const after = str.slice(2);
    if (after.length > 0 && after.length < 9 && /^\d+$/.test(after)) {
      return `WR${after.padStart(9, '0')}`;
    }
  }

  return str;
}

export function smartFormatWr(input: string): string {
  return normalizeWr(input);
}
