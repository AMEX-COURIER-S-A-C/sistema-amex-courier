import { InvoiceData, InvoiceItem } from '../types';

export const INVOICE_COLUMN_WIDTHS = {
  itemNumber: 7,
  itemName: 45,
  quantity: 12,
  unitPrice: 18,
  total: 18,
} as const;

export const INVOICE_PRINTABLE_DXA = 11240; // 12240 (8.5in) - 450 (left) - 550 (right)

export const INVOICE_DOCX_COLUMN_DXA = [787, 5058, 1349, 2023, 2023] as const;

/**
 * Normaliza texto de factura para renderizado seguro en PDF, conservando saltos de línea explícitos.
 */
export function normalizeInvoiceText(text: string | undefined | null): string {
  if (!text) return '';
  return text
    .replace(/\r\n/g, '\n')
    .replace(/[\r\t]/g, ' ')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2022\u2023\u25E6\u2043\u2219]/g, '•')
    .replace(/[^\n\x20-\x7E\xA0-\xFF\u2022]/g, '')
    .trim();
}

/**
 * Formatea valores monetarios de ítems de forma segura sin producir "$NaN".
 */
export function formatInvoiceCurrency(value: number | string | undefined | null): string {
  if (value === undefined || value === null || value === '' || value === 0 || value === '0') {
    return '';
  }
  const cleaned = typeof value === 'string' ? value.replace(/[$,\s]/g, '').trim() : value;
  if (cleaned === '') return '';
  const num = Number(cleaned);
  if (Number.isFinite(num)) {
    return `$${num.toFixed(2)}`;
  }
  return String(value).trim();
}

/**
 * Envuelve un texto por palabras dentro de un ancho máximo medido;
 * si una palabra/código individual sin espacios excede el límite, lo parte por carácter
 * para garantizar que ninguna línea rebase su columna.
 */
export function wrapTextLinesToWidth(
  text: string,
  maxWidth: number,
  measureWidth: (segment: string) => number
): string[] {
  const safeWidth = Math.max(1, maxWidth);
  const paragraphs = text.split('\n');
  const lines: string[] = [];

  const pushHardWrappedToken = (token: string) => {
    let chunk = '';
    for (const ch of token) {
      const candidate = chunk + ch;
      if (chunk.length > 0 && measureWidth(candidate) > safeWidth) {
        lines.push(chunk);
        chunk = ch;
      } else {
        chunk = candidate;
      }
    }
    if (chunk.length > 0) {
      lines.push(chunk);
    }
  };

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();
    if (!trimmed) {
      lines.push('');
      continue;
    }

    const words = trimmed.split(/\s+/);
    let currentLine = '';

    for (const word of words) {
      if (!currentLine) {
        if (measureWidth(word) <= safeWidth) {
          currentLine = word;
        } else {
          pushHardWrappedToken(word);
        }
        continue;
      }

      const candidate = `${currentLine} ${word}`;
      if (measureWidth(candidate) <= safeWidth) {
        currentLine = candidate;
      } else {
        lines.push(currentLine);
        if (measureWidth(word) <= safeWidth) {
          currentLine = word;
        } else {
          currentLine = '';
          pushHardWrappedToken(word);
        }
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }
  }

  return lines.length > 0 ? lines : [''];
}

/**
 * Estima la cantidad de renglones visuales de un Item Name en columna de ~45% del ancho Letter/A4.
 */
export function estimateItemLineCount(name: string | undefined | null, maxCharsPerLine = 38): number {
  const raw = (name || '').replace(/\r\n/g, '\n').trim();
  if (!raw) return 1;
  const safeLimit = Math.max(8, maxCharsPerLine);
  return raw.split('\n').reduce((acc, paragraph) => {
    const wrapped = wrapTextLinesToWidth(paragraph, safeLimit, segment => segment.length);
    return acc + wrapped.length;
  }, 0);
}

/**
 * Calcula la altura elástica de relleno inferior para la Vista Previa HTML manteniendo
 * el cuadro clásico cuando hay pocos ítems y colapsando a 0 cuando la tabla supera la altura base.
 */
export function computePreviewFillerHeightPx(
  items: readonly InvoiceItem[] | undefined | null,
  minBodyHeightPx = 460
): number {
  if (!items || items.length === 0) {
    return Math.max(0, minBodyHeightPx - 56);
  }

  const consumedPx = items.reduce((sum, item) => {
    const lines = estimateItemLineCount(item.name, 38);
    // Cada fila ocupa ~12px de padding vertical + ~18px por cada renglón de texto
    return sum + 12 + lines * 18;
  }, 0);

  return Math.max(0, minBodyHeightPx - consumedPx);
}

/**
 * Calcula la altura elástica en twips (DXA) para completar la caja mínima del Word (.docx)
 * cuando la factura tiene pocos ítems, evitando espacios excesivos en listas largas.
 */
export function computeDocxFillerDxa(
  items: readonly InvoiceItem[] | undefined | null,
  minBodyHeightDxa = 4155
): number {
  if (!items || items.length === 0) {
    return Math.max(0, minBodyHeightDxa - 420);
  }

  const consumedDxa = items.reduce((sum, item) => {
    const lines = estimateItemLineCount(item.name, 42);
    return sum + 160 + lines * 250;
  }, 0);

  return Math.max(0, minBodyHeightDxa - consumedDxa);
}

/**
 * Formatea marcas de tiempo ISO (ej. Supabase timestamptz) a fecha/hora local legible DD/MM/YYYY HH:mm.
 */
export function formatHistorialSavedAt(savedAt: string | undefined | null): string {
  const trimmed = (savedAt || '').trim();
  if (!trimmed) return 'Reciente';

  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(trimmed)) {
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      const dd = String(parsed.getDate()).padStart(2, '0');
      const mm = String(parsed.getMonth() + 1).padStart(2, '0');
      const yyyy = parsed.getFullYear();
      const hh = String(parsed.getHours()).padStart(2, '0');
      const min = String(parsed.getMinutes()).padStart(2, '0');
      return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
    }
  }

  return trimmed;
}

/**
 * Filtra entradas del historial por número de factura, cliente o fecha preservando el índice original
 * para evitar borrar un registro equivocado cuando hay filtro activo.
 */
export function filterHistorialEntries(
  historial: readonly InvoiceData[],
  query: string
): Array<{ item: InvoiceData; originalIndex: number }> {
  const normalizedQuery = query.trim().toLowerCase();
  const indexed = historial.map((item, originalIndex) => ({ item, originalIndex }));
  if (!normalizedQuery) return indexed;

  return indexed.filter(({ item }) => {
    const haystack = [
      item.invoiceNumber || '',
      item.billToName || '',
      item.shipToName || '',
      item.invoiceDate || '',
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(normalizedQuery);
  });
}
