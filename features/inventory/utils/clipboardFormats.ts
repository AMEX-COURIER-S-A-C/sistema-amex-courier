import { Paquete } from '@/types';

/**
 * Copia texto al portapapeles con fallback robusto para navegadores móviles
 * y contextos no seguros (HTTP LAN).
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  // 1. Intentar con Clipboard API moderna
  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback a continuación si hay error de permisos
    }
  }

  // 2. Fallback clásico de textarea oculta
  if (typeof document !== 'undefined') {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      textArea.setAttribute('readonly', '');
      document.body.appendChild(textArea);
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return Boolean(successful);
    } catch (fallbackErr) {
      console.error('Error en fallback de copiado al portapapeles:', fallbackErr);
      return false;
    }
  }

  return false;
}

/**
 * 1. Formato 2 Columnas: Cliente + Guía WR (Tabulado para Excel / Sheets)
 * Nombre a la izquierda y WR a la derecha separado por tabulador.
 * Al pegarlo en Excel o Google Sheets, se colocan automáticamente en 2 columnas distintas.
 */
export function formatClientAndWrTabbed(packages: Paquete[]): string {
  return packages
    .map(p => {
      const client = (p.nombreConsignatario || 'SIN CLIENTE').trim();
      const wr = (p.numeroReciboBodega || '').trim();
      return `${client}\t${wr}`;
    })
    .join('\n');
}

/**
 * 2. Formato 2 Columnas con Guion: Cliente - Guía WR (Texto para Chat / WhatsApp)
 * E.g.: AMEX JUAN PEREZ - WR00012345
 */
export function formatClientAndWrHyphen(packages: Paquete[]): string {
  return packages
    .map(p => {
      const client = (p.nombreConsignatario || 'SIN CLIENTE').trim();
      const wr = (p.numeroReciboBodega || '').trim();
      return `${client} - ${wr}`;
    })
    .join('\n');
}

/**
 * 3. Solo Códigos de Guías WR (1 por línea)
 * Lista limpia vertical ideal para cruces TIB, búsquedas masivas y filtros.
 */
export function formatOnlyWrs(packages: Paquete[]): string {
  return packages
    .map(p => (p.numeroReciboBodega || '').trim())
    .filter(Boolean)
    .join('\n');
}

/**
 * 4. Resumen WhatsApp con Emojis y Formato
 * Mensaje estructurado con negritas, emojis, peso, ubicación y estado.
 */
export function formatWhatsAppSummary(packages: Paquete[]): string {
  if (packages.length === 0) return '';
  const totalKg = packages.reduce((acc, p) => acc + Number(p.pesoKg || 0), 0).toFixed(2);
  const now = new Date();
  const fechaStr = now.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const horaStr = now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });

  const lines: string[] = [
    `📦 *AMEX COURIER - CONTROL DE PAQUETES*`,
    `📅 *${fechaStr} ${horaStr}* • *Total: ${packages.length} ${packages.length === 1 ? 'bulto' : 'bultos'} (${totalKg} kg)*`,
    `━━━━━━━━━━━━━━━━━━━━`
  ];

  packages.forEach(p => {
    const client = (p.nombreConsignatario || 'CLIENTE AMEX').trim();
    const wr = (p.numeroReciboBodega || '').trim();
    const ubic = (p.posicionEstante || p.ubicacionActual || 'EN BODEGA').trim();
    const peso = Number(p.pesoKg || 0).toFixed(2);
    const estado = (p.estadoAmex || 'en_almacen').replace('_', ' ').toUpperCase();
    const tracking = p.tracking ? ` | 🔎 Trk: ${p.tracking}` : '';

    lines.push(`👤 *${client}*`);
    lines.push(`   └ 🏷️ WR: \`${wr}\` | 📍 *${ubic}* | ⚖️ ${peso} kg | 📦 ${estado}${tracking}`);
  });

  lines.push(`━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`⚡ *Sistema AMEX Courier*`);
  return lines.join('\n');
}

/**
 * 5. Tabla Completa Tabulada (TSV / Formato Hoja de Cálculo)
 * Encabezados y todas las columnas tabuladas para pegar directo en Excel o Sheets.
 */
export function formatFullTableTsv(packages: Paquete[]): string {
  const headers = [
    'Guía WR',
    'Tracking',
    'Cliente / Consignatario',
    'Tipo Paquete',
    'Peso (Kg)',
    'Ubicación',
    'Estado AMEX',
    'Fecha'
  ];

  const rows = packages.map(p =>
    [
      p.numeroReciboBodega || '',
      p.tracking || '',
      p.nombreConsignatario || '',
      p.tipoEmpaque || 'PAQUETE',
      p.pesoKg != null ? String(p.pesoKg) : '0',
      p.posicionEstante || p.ubicacionActual || '',
      p.estadoAmex || '',
      p.creadoEn || ''
    ]
      .map(cell => String(cell).replace(/\t|\n|\r/g, ' '))
      .join('\t')
  );

  return [headers.join('\t'), ...rows].join('\n');
}

/**
 * 6. 3 Columnas: Cliente + Guía WR + Ubicación (Tabulado)
 * Útil para tareas de slotting, almacén y despacho.
 */
export function formatClientWrAndLocation(packages: Paquete[]): string {
  return packages
    .map(p => {
      const client = (p.nombreConsignatario || 'SIN CLIENTE').trim();
      const wr = (p.numeroReciboBodega || '').trim();
      const ubic = (p.posicionEstante || p.ubicacionActual || '-').trim();
      return `${client}\t${wr}\t${ubic}`;
    })
    .join('\n');
}

/**
 * 7. Tracking y Guía WR (Tracking ➔ WR ➔ Cliente)
 * Útil para transportistas y agencias.
 */
export function formatTrackingAndWr(packages: Paquete[]): string {
  return packages
    .map(p => {
      const trk = (p.tracking || 'SIN-TRACKING').trim();
      const wr = (p.numeroReciboBodega || '').trim();
      const client = (p.nombreConsignatario || '').trim();
      return `${trk}\t${wr}\t${client}`;
    })
    .join('\n');
}
