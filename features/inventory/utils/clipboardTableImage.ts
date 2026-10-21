import { Paquete } from '@/types';

/**
 * Genera un canvas Ultra-HD (3x Retina / 3K) con la tabla corporativa de paquetes
 * optimizada para máxima nitidez, contraste y legibilidad al hacer zoom en WhatsApp.
 */
export function renderPackagesTableCanvas(packages: Paquete[]): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  const dpr = 3; // Factor de resolución 3x Ultra-HD para nitidez cristalina en WhatsApp al hacer zoom

  const width = 1140;
  const headerHeight = 90;
  const columnHeaderHeight = 40;
  const rowHeight = 44;
  const footerHeight = 46;
  const totalRows = Math.min(packages.length, 100); // Límite razonable por imagen
  const height = headerHeight + columnHeaderHeight + (totalRows * rowHeight) + footerHeight;

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.scale(dpr, dpr);

  // Activación de calidad máxima de suavizado en Canvas
  if ('imageSmoothingEnabled' in ctx) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
  }

  // 1. Fondo general blanco nítido
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // 2. Cabecera Corporativa (Gradiente Azul AMEX Profundo)
  const headerGrad = ctx.createLinearGradient(0, 0, width, headerHeight);
  headerGrad.addColorStop(0, '#0f172a');
  headerGrad.addColorStop(1, '#1e3a8a');
  ctx.fillStyle = headerGrad;
  ctx.fillRect(0, 0, width, headerHeight);

  // Logo / Título con tipografía más grande y nítida
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif';
  ctx.fillText('📦 AMEX COURIER', 24, 40);

  ctx.fillStyle = '#93c5fd';
  ctx.font = '600 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('Almacén Central Lince • Reporte de Bultos & Ubicación', 24, 62);

  // Fecha actual
  const now = new Date();
  const fechaStr = now.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  const horaStr = now.toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit'
  });

  ctx.fillStyle = '#cbd5e1';
  ctx.font = '600 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`Generado: ${fechaStr} ${horaStr}`, width - 24, 38);

  // Badge Contador de Bultos
  const totalKg = packages.reduce((acc, p) => acc + Number(p.pesoKg || 0), 0).toFixed(2);
  const badgeText = `${packages.length} ${packages.length === 1 ? 'BULTO' : 'BULTOS'} (${totalKg} kg)`;
  ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const badgeWidth = ctx.measureText(badgeText).width + 22;
  const badgeX = width - 24 - badgeWidth;
  const badgeY = 48;

  ctx.fillStyle = '#2563eb';
  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, badgeWidth, 26, 6);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText(badgeText, badgeX + badgeWidth / 2, badgeY + 18);

  // 3. Encabezados de Columna
  ctx.textAlign = 'left';
  const colY = headerHeight;
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(0, colY, width, columnHeaderHeight);

  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(0, colY + columnHeaderHeight - 1, width, 1.5);

  ctx.fillStyle = '#334155';
  ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

  // Coordenadas de columnas optimizadas para ancho 1140px:
  const colX = {
    cliente: 24,
    wr: 290,
    tracking: 430,
    tipoCaja: 580,
    peso: 710,
    ubicacion: 805,
    estado: 940
  };

  ctx.fillText('CLIENTE / CONSIGNATARIO', colX.cliente, colY + 25);
  ctx.fillText('GUÍA WR', colX.wr, colY + 25);
  ctx.fillText('TRACKING', colX.tracking, colY + 25);
  ctx.fillText('TIPO DE CAJA', colX.tipoCaja, colY + 25);
  ctx.fillText('PESO', colX.peso, colY + 25);
  ctx.fillText('UBICACIÓN', colX.ubicacion, colY + 25);
  ctx.fillText('ESTADO AMEX', colX.estado, colY + 25);

  // 4. Filas de Paquetes
  let currentY = headerHeight + columnHeaderHeight;

  packages.slice(0, totalRows).forEach((pkg, index) => {
    // Fondo alternado de alto contraste
    ctx.fillStyle = index % 2 === 0 ? '#ffffff' : '#f8fafc';
    ctx.fillRect(0, currentY, width, rowHeight);

    // Borde inferior sutil
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(0, currentY + rowHeight - 1, width, 1);

    // Columna 1: Nombre de Cliente / Consignatario (tipografía más grande y nítida)
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 13.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const rawNombre = (pkg.nombreConsignatario || 'CLIENTE AMEX').trim();
    const cleanNombre = rawNombre.length > 30 ? `${rawNombre.slice(0, 28)}...` : rawNombre;
    ctx.fillText(cleanNombre, colX.cliente, currentY + 27);

    // Columna 2: Guía WR (Extra nítida, negrita y color azul institucional)
    ctx.fillStyle = '#1e3a8a';
    ctx.font = 'bold 13.5px "JetBrains Mono", Consolas, "Liberation Mono", Menlo, monospace';
    const wrText = pkg.numeroReciboBodega || pkg.tracking || 'S/N';
    const cleanWr = wrText.length > 14 ? `${wrText.slice(0, 13)}.` : wrText;
    ctx.fillText(cleanWr, colX.wr, currentY + 27);

    // Columna 3: Tracking
    ctx.fillStyle = '#334155';
    ctx.font = '600 12px "JetBrains Mono", Consolas, "Liberation Mono", Menlo, monospace';
    const rawTracking = (pkg.tracking || '-').trim();
    const cleanTracking = rawTracking.length > 18 ? `${rawTracking.slice(0, 16)}...` : rawTracking;
    ctx.fillText(cleanTracking, colX.tracking, currentY + 27);

    // Columna 4: Tipo de Caja (Píldora distintiva de alto contraste)
    const rawTipo = (pkg.tipoEmpaque || 'CAJA').trim().toUpperCase();
    let tipoBg = '#fef3c7';
    let tipoColor = '#92400e';
    let tipoBorder = '#fde68a';

    if (rawTipo.includes('SOBRE')) {
      tipoBg = '#e0e7ff';
      tipoColor = '#3730a3';
      tipoBorder = '#c7d2fe';
    } else if (rawTipo.includes('BOLSA')) {
      tipoBg = '#ecfdf5';
      tipoColor = '#065f46';
      tipoBorder = '#a7f3d0';
    } else if (rawTipo.includes('SACA')) {
      tipoBg = '#f3e8ff';
      tipoColor = '#6b21a8';
      tipoBorder = '#e9d5ff';
    }

    const tipoLabel = rawTipo.length > 12 ? `${rawTipo.slice(0, 11)}.` : rawTipo;
    ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const tipoWidth = ctx.measureText(tipoLabel).width + 16;
    const tipoPillY = currentY + 10;

    ctx.fillStyle = tipoBg;
    ctx.beginPath();
    ctx.roundRect(colX.tipoCaja, tipoPillY, tipoWidth, 24, 6);
    ctx.fill();

    ctx.strokeStyle = tipoBorder;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = tipoColor;
    ctx.fillText(tipoLabel, colX.tipoCaja + 8, tipoPillY + 17);

    // Columna 5: Peso
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const pNum = Number(pkg.pesoKg);
    const pesoText = !isNaN(pNum) && pNum > 0 ? `${pNum.toFixed(2)} kg` : (pkg.pesoKg ? `${pkg.pesoKg} kg` : '-');
    ctx.fillText(pesoText, colX.peso, currentY + 27);

    // Columna 5: Ubicación WMS (Insignia visual nítida)
    const pos =
      pkg.posicionEstante ||
      (pkg.anaquel && pkg.piso ? `${pkg.anaquel}-${pkg.piso}` : pkg.anaquel || 'REC');

    // Colores según zona
    let locBg = '#f1f5f9';
    let locColor = '#334155';
    let locBorder = '#cbd5e1';

    if (pos.startsWith('DSP')) {
      locBg = '#fdf2f8';
      locColor = '#9d174d';
      locBorder = '#fbcfe8';
    } else if (pos.startsWith('OFI')) {
      locBg = '#eff6ff';
      locColor = '#1d4ed8';
      locBorder = '#bfdbfe';
    } else if (pos.startsWith('A1') || pos.startsWith('A2')) {
      locBg = '#f0fdf4';
      locColor = '#15803d';
      locBorder = '#bbf7d0';
    } else if (pos.startsWith('REC')) {
      locBg = '#fffbeb';
      locColor = '#b45309';
      locBorder = '#fde68a';
    }

    const locText = pos;
    ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const locWidth = ctx.measureText(locText).width + 18;
    const locPillY = currentY + 10;

    ctx.fillStyle = locBg;
    ctx.beginPath();
    ctx.roundRect(colX.ubicacion, locPillY, locWidth, 24, 6);
    ctx.fill();

    ctx.strokeStyle = locBorder;
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.fillStyle = locColor;
    ctx.fillText(locText, colX.ubicacion + 9, locPillY + 17);

    // Columna 6: Estado AMEX (Píldora de estado con bordes limpios)
    const rawEst = (pkg.estadoAmex || 'en_almacen').toLowerCase();
    const est = rawEst === 'recibido' ? 'en_almacen' : rawEst;
    let estBg = '#faf5ff';
    let estColor = '#7e22ce';
    let estLabel = 'EN ALMACÉN';
    let estBorder = '#e9d5ff';

    if (est === 'entregado') {
      estBg = '#f0fdf4';
      estColor = '#15803d';
      estLabel = 'ENTREGADO';
      estBorder = '#bbf7d0';
    } else if (est === 'en_almacen') {
      estBg = '#faf5ff';
      estColor = '#7e22ce';
      estLabel = 'EN ALMACÉN';
      estBorder = '#e9d5ff';
    } else if (est === 'en_ruta') {
      estBg = '#fff7ed';
      estColor = '#c2410c';
      estLabel = 'EN RUTA';
      estBorder = '#fed7aa';
    } else if (est === 'listo_recojo') {
      estBg = '#f0fdfa';
      estColor = '#0f766e';
      estLabel = 'LISTO RECOJO';
      estBorder = '#99f6e4';
    }

    ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const estWidth = ctx.measureText(estLabel).width + 16;
    const estPillY = currentY + 10;

    ctx.fillStyle = estBg;
    ctx.beginPath();
    ctx.roundRect(colX.estado, estPillY, estWidth, 24, 6);
    ctx.fill();

    ctx.strokeStyle = estBorder;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = estColor;
    ctx.fillText(estLabel, colX.estado + 8, estPillY + 17);

    currentY += rowHeight;
  });

  // 5. Pie de Página Corporativo
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, currentY, width, footerHeight);

  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(0, currentY, width, 1.5);

  ctx.fillStyle = '#64748b';
  ctx.font = '600 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('⚡ Sistema AMEX Courier • Consulta en tiempo real de almacén', 24, currentY + 28);

  ctx.textAlign = 'right';
  ctx.fillText(`Mostrando ${packages.length} paquete(s)`, width - 24, currentY + 28);

  // Borde externo completo alrededor de la tarjeta
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(0, 0, width, height);

  return canvas;
}

/**
 * Copia directamente la tabla de paquetes renderizada como imagen PNG al portapapeles.
 * Retorna true si tuvo éxito, o false si hubo un error.
 */
export async function copyPackagesTableAsImage(packages: Paquete[]): Promise<{
  success: boolean;
  count: number;
  error?: string;
}> {
  if (!packages || packages.length === 0) {
    return { success: false, count: 0, error: 'No hay paquetes seleccionados o filtrados para copiar.' };
  }

  try {
    const canvas = renderPackagesTableCanvas(packages);
    if (!canvas) {
      throw new Error('Canvas no está disponible en este entorno.');
    }

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/png');
    });

    if (!blob) {
      throw new Error('No se pudo generar la imagen a partir del canvas.');
    }

    if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
      const item = new ClipboardItem({ 'image/png': blob });
      await navigator.clipboard.write([item]);
      return { success: true, count: packages.length };
    } else {
      // Fallback: descargar la imagen si la API de portapapeles está bloqueada
      downloadBlob(blob, `amex-paquetes-${Date.now()}.png`);
      return {
        success: true,
        count: packages.length,
        error: 'El navegador no permitió copiar directo; se descargó como imagen PNG.'
      };
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    console.error('Error al copiar imagen:', err);

    // Fallback secundario de descarga
    try {
      const canvas = renderPackagesTableCanvas(packages);
      if (canvas) {
        const dataUrl = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `amex-paquetes-${Date.now()}.png`;
        a.click();
        return {
          success: true,
          count: packages.length,
          error: 'No se pudo copiar al portapapeles directamente; se descargó como imagen PNG.'
        };
      }
      return { success: false, count: packages.length, error: msg };
    } catch {
      return { success: false, count: packages.length, error: msg };
    }
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
