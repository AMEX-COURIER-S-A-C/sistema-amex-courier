/**
 * Utilidades de Normalización Telefónica, Enlaces de Contacto y Pegado Rápido de Rutas
 */

import { CrearParadaInput } from '@/types/despacho';

export interface PhoneNormalizationResult {
  raw: string;
  normalized: string; // Formato E.164 sin signo más (ej: 51997370290 para wa.me)
  telUri: string;     // Formato tel:+51997370290 para llamadas nativas
  display: string;    // Formato amigable para el chofer
  isValid: boolean;
  isInternational: boolean;
}

/**
 * Normaliza cualquier formato de número telefónico (Perú o internacional)
 */
export function normalizePhoneNumber(rawInput: string | null | undefined): PhoneNormalizationResult {
  const raw = String(rawInput || '').trim();
  if (!raw) {
    return {
      raw: '',
      normalized: '',
      telUri: '',
      display: 'Sin teléfono',
      isValid: false,
      isInternational: false
    };
  }

  // Detectar si tiene signo más internacional
  const hasPlus = raw.startsWith('+');
  
  // Extraer solo dígitos
  const digits = raw.replace(/\D/g, '');

  if (!digits || digits.length < 7) {
    return {
      raw,
      normalized: '',
      telUri: '',
      display: raw,
      isValid: false,
      isInternational: false
    };
  }

  // Caso 1: Celular estándar de Perú (9 dígitos empezando con 9)
  if (digits.length === 9 && digits.startsWith('9')) {
    const normalized = `51${digits}`;
    return {
      raw,
      normalized,
      telUri: `tel:${digits}`,
      display: `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`,
      isValid: true,
      isInternational: false
    };
  }

  // Caso 2: Celular Perú ya con código 51 (11 dígitos empezando con 519)
  if (digits.length === 11 && digits.startsWith('519')) {
    const celPart = digits.slice(2);
    return {
      raw,
      normalized: digits,
      telUri: `tel:${celPart}`,
      display: `${celPart.slice(0, 3)} ${celPart.slice(3, 6)} ${celPart.slice(6)}`,
      isValid: true,
      isInternational: false
    };
  }

  // Caso 2b: Celular con 0 adelante (ej: 0987654321)
  if (digits.length === 10 && digits.startsWith('09')) {
    const celPart = digits.slice(1);
    return {
      raw,
      normalized: `51${celPart}`,
      telUri: `tel:${celPart}`,
      display: `${celPart.slice(0, 3)} ${celPart.slice(3, 6)} ${celPart.slice(6)}`,
      isValid: true,
      isInternational: false
    };
  }

  // Caso 3: Número internacional (ej: Ecuador 593...)
  if (hasPlus || digits.length > 9) {
    return {
      raw,
      normalized: digits,
      telUri: `tel:+${digits}`,
      display: `+${digits}`,
      isValid: true,
      isInternational: true
    };
  }

  // Fallback con los dígitos que tenga
  return {
    raw,
    normalized: digits,
    telUri: `tel:${digits}`,
    display: raw,
    isValid: digits.length >= 7,
    isInternational: false
  };
}

/**
 * Genera el enlace directo a WhatsApp al chat del cliente sin mensaje predeterminado
 */
export function getWhatsAppUrl(
  phone: string | null | undefined,
  _destinatario?: string,
  _wrBultos?: string,
  _direccion?: string
): string {
  const { normalized, isValid } = normalizePhoneNumber(phone);
  if (!isValid || !normalized) return '';

  return `https://wa.me/${normalized}`;
}

/**
 * Genera el enlace de navegación para Google Maps o Waze
 */
export function getGoogleMapsUrl(direccion: string, distrito?: string): string {
  const dir = String(direccion || '').trim();
  const dist = String(distrito || '').trim();
  const query = [dir, dist, 'Lima', 'Perú'].filter(Boolean).join(', ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
export interface DistritoOption {
  value: string;
  label: string;
}

export interface ZonaDistritos {
  zona: string;
  distritos: DistritoOption[];
}

/**
 * Lista completa de los 43 distritos de Lima Metropolitana organizados por zonas tradicionales + Callao
 */
export const ZONAS_LIMA_DISTRITOS: ZonaDistritos[] = [
  {
    zona: '1. Lima Norte (8 distritos)',
    distritos: [
      { value: 'ANCON', label: 'Ancón' },
      { value: 'CARABAYLLO', label: 'Carabayllo' },
      { value: 'COMAS', label: 'Comas' },
      { value: 'INDEPENDENCIA', label: 'Independencia' },
      { value: 'LOS OLIVOS', label: 'Los Olivos' },
      { value: 'PUENTE PIEDRA', label: 'Puente Piedra' },
      { value: 'SAN MARTIN DE PORRES', label: 'San Martín de Porres' },
      { value: 'SANTA ROSA', label: 'Santa Rosa' }
    ]
  },
  {
    zona: '2. Lima Centro (16 distritos)',
    distritos: [
      { value: 'BARRANCO', label: 'Barranco' },
      { value: 'BREÑA', label: 'Breña' },
      { value: 'CERCADO DE LIMA', label: 'Cercado de Lima (Lima)' },
      { value: 'JESUS MARIA', label: 'Jesús María' },
      { value: 'LA VICTORIA', label: 'La Victoria' },
      { value: 'LINCE', label: 'Lince' },
      { value: 'MAGDALENA DEL MAR', label: 'Magdalena del Mar' },
      { value: 'MIRAFLORES', label: 'Miraflores' },
      { value: 'PUEBLO LIBRE', label: 'Pueblo Libre' },
      { value: 'RIMAC', label: 'Rímac' },
      { value: 'SAN BORJA', label: 'San Borja' },
      { value: 'SAN ISIDRO', label: 'San Isidro' },
      { value: 'SAN LUIS', label: 'San Luis' },
      { value: 'SAN MIGUEL', label: 'San Miguel' },
      { value: 'SANTIAGO DE SURCO', label: 'Santiago de Surco' },
      { value: 'SURQUILLO', label: 'Surquillo' }
    ]
  },
  {
    zona: '3. Lima Este (8 distritos)',
    distritos: [
      { value: 'ATE', label: 'Ate' },
      { value: 'CHACLACAYO', label: 'Chaclacayo' },
      { value: 'CIENEGUILLA', label: 'Cieneguilla' },
      { value: 'EL AGUSTINO', label: 'El Agustino' },
      { value: 'LA MOLINA', label: 'La Molina' },
      { value: 'LURIGANCHO-CHOSICA', label: 'Lurigancho-Chosica' },
      { value: 'SAN JUAN DE LURIGANCHO', label: 'San Juan de Lurigancho' },
      { value: 'SANTA ANITA', label: 'Santa Anita' }
    ]
  },
  {
    zona: '4. Lima Sur (11 distritos)',
    distritos: [
      { value: 'CHORRILLOS', label: 'Chorrillos' },
      { value: 'LURIN', label: 'Lurín' },
      { value: 'PACHACAMAC', label: 'Pachacámac' },
      { value: 'PUCUSANA', label: 'Pucusana' },
      { value: 'PUNTA HERMOSA', label: 'Punta Hermosa' },
      { value: 'PUNTA NEGRA', label: 'Punta Negra' },
      { value: 'SAN BARTOLO', label: 'San Bartolo' },
      { value: 'SAN JUAN DE MIRAFLORES', label: 'San Juan de Miraflores' },
      { value: 'SANTA MARIA DEL MAR', label: 'Santa María del Mar' },
      { value: 'VILLA EL SALVADOR', label: 'Villa El Salvador' },
      { value: 'VILLA MARIA DEL TRIUNFO', label: 'Villa María del Triunfo' }
    ]
  },
  {
    zona: '5. Callao (Prov. Constitucional)',
    distritos: [
      { value: 'CALLAO', label: 'Callao' },
      { value: 'BELLAVISTA', label: 'Bellavista' },
      { value: 'CARMEN DE LA LEGUA', label: 'Carmen de la Legua' },
      { value: 'LA PERLA', label: 'La Perla' },
      { value: 'LA PUNTA', label: 'La Punta' },
      { value: 'MI PERU', label: 'Mi Perú' },
      { value: 'VENTANILLA', label: 'Ventanilla' }
    ]
  }
];

export const LIMA_DISTRITOS: string[] = ZONAS_LIMA_DISTRITOS.flatMap(z => z.distritos.map(d => d.value));

/**
 * Normaliza nombres de distritos comunes del Excel o entradas de usuario
 */
export function normalizeDistrito(input: string): string {
  if (!input) return 'MIRAFLORES';
  const raw = String(input).trim().toUpperCase();
  const unaccented = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  if (unaccented === 'SURCO' || unaccented === 'SANTIAGO DE SURCO') return 'SANTIAGO DE SURCO';
  if (unaccented === 'MOLINA' || unaccented === 'LA MOLINA') return 'LA MOLINA';
  if (unaccented === 'SJL' || unaccented === 'SAN JUAN DE LURIGANCHO') return 'SAN JUAN DE LURIGANCHO';
  if (unaccented === 'SJM' || unaccented === 'SAN JUAN DE MIRAFLORES') return 'SAN JUAN DE MIRAFLORES';
  if (unaccented === 'SMP' || unaccented === 'SAN MARTIN' || unaccented === 'SAN MARTIN DE PORRES') return 'SAN MARTIN DE PORRES';
  if (unaccented === 'VMT' || unaccented === 'VILLA MARIA' || unaccented === 'VILLA MARIA DEL TRIUNFO') return 'VILLA MARIA DEL TRIUNFO';
  if (unaccented === 'VES' || unaccented === 'VILLA EL SALVADOR') return 'VILLA EL SALVADOR';
  if (unaccented === 'CHOSICA' || unaccented === 'LURIGANCHO' || unaccented === 'LURIGANCHO-CHOSICA') return 'LURIGANCHO-CHOSICA';
  if (unaccented === 'LIMA' || unaccented === 'CERCADO' || unaccented === 'LIMA CERCADO' || unaccented.includes('CERCADO DE LIMA')) return 'CERCADO DE LIMA';
  if (unaccented === 'MAGDALENA' || unaccented === 'MAGDALENA DEL MAR') return 'MAGDALENA DEL MAR';
  if (unaccented === 'JESUS MARIA') return 'JESUS MARIA';
  if (unaccented === 'RIMAC') return 'RIMAC';
  if (unaccented === 'ANCON') return 'ANCON';
  if (unaccented === 'LURIN') return 'LURIN';
  if (unaccented === 'PACHACAMAC') return 'PACHACAMAC';
  if (unaccented === 'BRENA') return 'BREÑA';

  // Buscar coincidencia directa en los valores o etiquetas
  for (const zona of ZONAS_LIMA_DISTRITOS) {
    for (const d of zona.distritos) {
      const dUnacc = d.value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const labelUnacc = d.label.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (dUnacc === unaccented || labelUnacc === unaccented) {
        return d.value;
      }
    }
  }

  return unaccented;
}

/**
 * Verifica si una cadena corresponde a un distrito conocido de Lima/Callao
 */
export function isKnownDistrito(val: string | null | undefined): boolean {
  if (!val) return false;
  const raw = String(val).trim().toUpperCase();
  const unaccented = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (['SURCO', 'MOLINA', 'SJL', 'SJM', 'SMP', 'VMT', 'VES', 'LIMA', 'CERCADO', 'MAGDALENA', 'BRENA'].includes(unaccented)) {
    return true;
  }
  return ZONAS_LIMA_DISTRITOS.some(z =>
    z.distritos.some(d => {
      const dVal = d.value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const dLab = d.label.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return dVal === unaccented || dLab === unaccented;
    })
  );
}

/**
 * Extrae y normaliza códigos WR de un texto, soportando separadores por guion (-), slash (/), comas, etc.
 */
export function parseWrCodes(raw: string | null | undefined): string[] {
  if (!raw || !String(raw).trim()) return [];
  let str = String(raw).trim();

  // Preservar prefijo WR- evitando que el guion sea interpretado como separador
  const placeholder = '__WR_HYPHEN__';
  str = str.replace(/\b(WR)-/gi, (_match, p1) => `${p1}${placeholder}`);

  // Separadores: slashes /, \, comas ,, punto y coma ;, saltos de línea, tabulaciones, o guiones -
  const tokens = str.split(/[\/,;\\\n\r\t]+|\s*-\s*/);
  const wrs: string[] = [];

  for (const token of tokens) {
    const clean = token.replace(new RegExp(placeholder, 'g'), '-').trim().toUpperCase();
    if (!clean) continue;

    // Descartar tokens que claramente sean sólo palabras de bultos/notas
    const isBultoTextOnly = /^(MAS|MÁS|\+)?\s*\d*\s*(CJ|CJS|CAJA|CAJAS|BULTO|BULTOS|PAQ|PAQUETE|PAQUETES|SOBRE|SOBRES|UND|PZA|PZAS)$/i.test(clean) ||
      /^(MAS|MÁS|CJ|CJS|CAJA|CAJAS|SOBRE|SOBRES)$/i.test(clean);
    
    if (isBultoTextOnly) continue;

    wrs.push(clean);
  }

  return wrs;
}

/**
 * Formatea una lista de WRs con separador estandarizado limpio ' / '
 */
export function formatNormalizedWrs(wrs: string[]): string {
  return wrs.filter(Boolean).join(' / ');
}

export interface WrAndBultosParsed {
  wrs: string[];
  normalizedWrs: string;
  bultos: string;
  count: number;
}

/**
 * Parsea una celda que contiene códigos WR y/o descripción de bultos.
 * Detecta WRs separados por guion o slash y autocalcula la cantidad de bultos
 * (1 WR -> '1 CJ', 2+ WRs -> 'N CJS').
 */
export function parseWrAndBultos(raw: string | null | undefined): WrAndBultosParsed {
  if (!raw || !String(raw).trim()) {
    return { wrs: [], normalizedWrs: '', bultos: '', count: 0 };
  }

  let str = String(raw).trim();
  const placeholder = '__WR_HYPHEN__';
  str = str.replace(/\b(WR)-/gi, (_match, p1) => `${p1}${placeholder}`);

  const tokens = str.split(/[\/,;\\\n\r\t]+|\s*-\s*/);
  const wrs: string[] = [];
  const bultoTokens: string[] = [];

  for (const token of tokens) {
    const clean = token.replace(new RegExp(placeholder, 'g'), '-').trim();
    if (!clean) continue;

    const isBultoOrNote = /\b(cj|cjs|caja|cajas|bulto|bultos|paq|paquete|paquetes|sobre|sobres|mas|más)\b/i.test(clean);
    if (isBultoOrNote) {
      bultoTokens.push(clean);
    } else {
      wrs.push(clean.toUpperCase());
    }
  }

  let bultos = '';
  if (bultoTokens.length > 0) {
    bultos = bultoTokens.join(' ').replace(/^MAS\s+/i, '').replace(/^MÁS\s+/i, '').trim();
  } else if (wrs.length > 0) {
    bultos = wrs.length === 1 ? '1 CJ' : `${wrs.length} CJS`;
  }

  return {
    wrs,
    normalizedWrs: wrs.join(' / '),
    bultos,
    count: wrs.length
  };
}

/**
 * Parser de filas pegadas desde Excel (Quick Paste)
 * Convierte texto tabulado (\t) copiado del portapapeles a paradas estructuradas.
 * Detección inteligente flexible:
 * - Detecta automáticamente si la celda de WRs contiene múltiples códigos separados por guion (-) o slash (/).
 * - Autocalcula bultos según cantidad de WRs (1 WR -> '1 CJ', N WRs -> 'N CJS').
 * - Soporta tanto formato de 5 columnas como de 6 columnas (con columna explícita de Bultos).
 */
export function parseQuickPasteRows(clipboardText: string): CrearParadaInput[] {
  if (!clipboardText || !clipboardText.trim()) return [];

  const lines = clipboardText.split(/\r?\n/);
  const paradas: CrearParadaInput[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Detectar separador (tabulación de Excel o punto y coma)
    const cols = trimmed.includes('\t') ? trimmed.split('\t') : trimmed.split(';');
    const col0 = String(cols[0] || '').trim();

    // Ignorar cabeceras repetidas del Excel de entregas
    if (!col0 || col0.toUpperCase() === 'NOMBRE' || col0.toUpperCase().startsWith('CLIENTE:')) {
      continue;
    }

    const destinatario = col0;
    const col1 = String(cols[1] || '').trim();
    const col2 = String(cols[2] || '').trim();
    const col3 = String(cols[3] || '').trim();
    const col4 = String(cols[4] || '').trim();
    const col5 = String(cols[5] || '').trim();
    const col6 = String(cols[6] || '').trim();

    // Determinar si cols tiene columna de bultos separada (6+ columnas)
    const isCol3Dist = isKnownDistrito(col3);
    const isCol4Dist = isKnownDistrito(col4);
    const col2LooksLikeBultos = /^\d+\s*(cj|cjs|caja|cajas|paq|bulto|bultos|sobre|sobres|pza|und)?$/i.test(col2);

    let wrCodes = '';
    let bultos = '';
    let wrBultos = '';
    let direccion = '';
    let distrito = 'MIRAFLORES';
    let telefono = '';
    let montoCobro = 0;

    if ((isCol4Dist && !isCol3Dist) || (col2LooksLikeBultos && cols.length >= 6)) {
      // 6 columnas: Destinatario | WRs | Bultos | Dirección | Distrito | Teléfono | Cobro
      const parsedWr = parseWrAndBultos(col1);
      wrCodes = parsedWr.normalizedWrs || col1;
      bultos = col2 || parsedWr.bultos || '1 CJ';
      wrBultos = wrCodes ? (bultos ? `${wrCodes} · ${bultos}` : wrCodes) : bultos;
      direccion = col3 || 'Dirección pendiente';
      distrito = normalizeDistrito(col4 || 'LIMA');
      telefono = col5;

      if (col6) {
        const rawNum = String(col6).replace(/[^0-9.]/g, '');
        const num = parseFloat(rawNum);
        if (!isNaN(num) && num > 0) montoCobro = num;
      }
    } else {
      // 5 columnas estándar: Destinatario | WRs (o WR/Bultos) | Dirección | Distrito | Teléfono | Cobro
      const parsedWr = parseWrAndBultos(col1);
      wrCodes = parsedWr.normalizedWrs;
      bultos = parsedWr.bultos || '1 CJ';

      // Preservar col1 o normalizar si tiene múltiples WRs
      wrBultos = col1 || '1 CJ';
      if (parsedWr.wrs.length > 1) {
        wrBultos = parsedWr.normalizedWrs;
      }

      direccion = col2 || 'Dirección pendiente';
      distrito = normalizeDistrito(col3 || 'LIMA');
      telefono = col4;

      if (col5) {
        const rawNum = String(col5).replace(/[^0-9.]/g, '');
        const num = parseFloat(rawNum);
        if (!isNaN(num) && num > 0) montoCobro = num;
      }
    }

    paradas.push({
      destinatario,
      wrBultos,
      wrCodes,
      bultos,
      direccion,
      distrito,
      telefono,
      montoCobro,
      monedaCobro: 'USD'
    });
  }

  return paradas;
}
