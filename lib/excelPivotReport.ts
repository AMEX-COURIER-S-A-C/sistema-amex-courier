import writeXlsxFile from 'write-excel-file/universal';
import { saveAs } from 'file-saver';
import { Paquete } from '@/types';

export interface EnAlmacenRow {
  cliente: string;
  wr: string;
  tracking: string;
  pesoKg: number;
  tipo: string;
  posicion?: string;
  fecha?: string;
}

export interface ClientSummaryItem {
  cliente: string;
  paquetes: number;
  pesoKg: number;
  wrs: string[];
  trackings: string[];
  tipos: string[];
  items: EnAlmacenRow[];
}

/**
 * Filtra paquetes cuyo estado AMEX sea 'en_almacen' o 'recibido'
 * (los que constituyen la carga física en almacén).
 */
export function selectEnAlmacen(paquetes: Paquete[]): EnAlmacenRow[] {
  if (!Array.isArray(paquetes)) return [];

  return paquetes
    .filter(p => {
      const norm = (p.estadoAmex || '').trim().toLowerCase();
      return norm === 'en_almacen' || norm === 'recibido';
    })
    .map(p => {
      const rawCliente = (p.nombreConsignatario || '').trim();
      const rawWr = (p.numeroReciboBodega || '').trim();
      const rawTracking = (p.tracking || '').trim();
      const rawTipo = (p.tipoEmpaque || '').trim();
      const rawPosicion = (p.posicionEstante || (p.anaquel && p.piso ? `${p.anaquel}-${p.piso}` : 'REC')).trim();

      const numPeso = p.pesoKg && Number(p.pesoKg) > 0 ? Number(p.pesoKg) : 0;
      const pesoKg = Math.round(numPeso * 100) / 100;

      let fecha = '—';
      if (p.creadoEn) {
        try {
          const d = new Date(p.creadoEn);
          if (!isNaN(d.getTime())) {
            fecha = d.toLocaleDateString('es-PE');
          }
        } catch {
          fecha = '—';
        }
      }

      return {
        cliente: rawCliente || 'SIN CLIENTE',
        wr: rawWr || 'SIN WR',
        tracking: rawTracking || '—',
        pesoKg,
        tipo: rawTipo || 'CAJA',
        posicion: rawPosicion || 'REC',
        fecha
      };
    });
}

/**
 * Agrupa los paquetes en almacén por cliente, calculando el total de paquetes,
 * la suma de peso en kg y la lista detallada de cada paquete.
 * Ordenado descendentemente por cantidad de paquetes (los que tienen más carga primero).
 */
export function buildClientSummary(rows: EnAlmacenRow[]): ClientSummaryItem[] {
  if (!Array.isArray(rows) || rows.length === 0) return [];

  const map = new Map<string, {
    paquetes: number;
    pesoKg: number;
    wrs: string[];
    trackings: Set<string>;
    tipos: Set<string>;
    items: EnAlmacenRow[];
  }>();

  for (const r of rows) {
    const cli = r.cliente || 'SIN CLIENTE';
    let current = map.get(cli);
    if (!current) {
      current = {
        paquetes: 0,
        pesoKg: 0,
        wrs: [],
        trackings: new Set<string>(),
        tipos: new Set<string>(),
        items: []
      };
      map.set(cli, current);
    }

    current.paquetes += 1;
    current.pesoKg += r.pesoKg > 0 ? r.pesoKg : 0;
    current.items.push(r);
    if (r.wr && r.wr !== 'SIN WR') current.wrs.push(r.wr);
    if (r.tracking && r.tracking !== '—') current.trackings.add(r.tracking);
    if (r.tipo) current.tipos.add(r.tipo);
  }

  const result: ClientSummaryItem[] = [];
  for (const [cliente, data] of map.entries()) {
    result.push({
      cliente,
      paquetes: data.paquetes,
      pesoKg: Math.round(data.pesoKg * 100) / 100,
      wrs: data.wrs,
      trackings: Array.from(data.trackings),
      tipos: Array.from(data.tipos),
      items: data.items
    });
  }

  // Orden descendente por cantidad de paquetes, luego por peso, luego por nombre
  return result.sort((a, b) => {
    if (b.paquetes !== a.paquetes) {
      return b.paquetes - a.paquetes;
    }
    if (b.pesoKg !== a.pesoKg) {
      return b.pesoKg - a.pesoKg;
    }
    return a.cliente.localeCompare(b.cliente, 'es');
  });
}

/**
 * Construye el archivo Excel (.xlsx) profesional con:
 * - Encabezado limpio SIN relleno de color (no pintado) con borde marcado.
 * - Celdas combinadas y centradas para el nombre y cantidad del cliente cuando tiene varios paquetes.
 * - Bordes completos finos y profesionales en todas las celdas.
 */
export async function buildEnAlmacenReport(paquetes: Paquete[]): Promise<Blob> {
  const rows = selectEnAlmacen(paquetes);
  if (rows.length === 0) {
    throw new Error('No hay paquetes con Estado AMEX = "En Almacén" o "Recibido" para exportar.');
  }

  const summary = buildClientSummary(rows);
  const totalPaquetes = rows.length;
  const totalPeso = Math.round(rows.reduce((acc, r) => acc + r.pesoKg, 0) * 100) / 100;

  // Bordes profesionales para todas las celdas
  const cellBorder = {
    borderStyle: 'thin' as const,
    borderColor: '#cbd5e1'
  };

  // Encabezado sin relleno (no pintado), con texto oscuro en negrita y borde inferior más marcado
  const headerStyle = {
    fontWeight: 'bold' as const,
    color: '#0f172a',
    borderStyle: 'thin' as const,
    borderColor: '#94a3b8',
    bottomBorderStyle: 'medium' as const,
    bottomBorderColor: '#0f172a',
    align: 'center' as const,
    alignVertical: 'center' as const
  };

  // -------------------------------------------------------------
  // HOJA 1: "Carga por Cliente" (Detallada con Combinar y Centrar)
  // -------------------------------------------------------------
  const headerRow1 = [
    { value: 'N° Cliente', ...headerStyle },
    { value: 'Cliente / Consignatario', ...headerStyle },
    { value: 'Cant. Total Pqtes', ...headerStyle },
    { value: 'Pqte N°', ...headerStyle },
    { value: 'Guía WR', ...headerStyle },
    { value: 'Tracking USA', ...headerStyle },
    { value: 'Peso (Kg)', ...headerStyle, align: 'right' as const },
    { value: 'Tipo de Empaque', ...headerStyle },
    { value: 'Posición WMS', ...headerStyle },
    { value: 'Fecha Registro', ...headerStyle }
  ];

  const dataRows1: any[] = [];

  summary.forEach((clientGroup, clientIdx) => {
    const rowCount = clientGroup.items.length;

    clientGroup.items.forEach((item, itemIdx) => {
      if (itemIdx === 0) {
        // Primera fila del cliente: define el valor, rowSpan y combinar y centrar
        const span = rowCount > 1 ? rowCount : undefined;

        dataRows1.push([
          // Col A: N° Cliente (Combinar y centrar)
          {
            value: clientIdx + 1,
            rowSpan: span,
            align: 'center' as const,
            alignVertical: 'center' as const,
            ...cellBorder
          },
          // Col B: Cliente / Consignatario (Combinar y centrar)
          {
            value: clientGroup.cliente,
            rowSpan: span,
            align: 'center' as const,
            alignVertical: 'center' as const,
            fontWeight: 'bold' as const,
            ...cellBorder
          },
          // Col C: Cant. Total Pqtes (Combinar y centrar)
          {
            value: clientGroup.paquetes,
            rowSpan: span,
            type: Number,
            format: '#,##0',
            align: 'center' as const,
            alignVertical: 'center' as const,
            fontWeight: 'bold' as const,
            ...cellBorder
          },
          // Col D: Pqte N°
          {
            value: `${itemIdx + 1} de ${rowCount}`,
            align: 'center' as const,
            alignVertical: 'center' as const,
            ...cellBorder
          },
          // Col E: Guía WR
          {
            value: item.wr,
            align: 'center' as const,
            alignVertical: 'center' as const,
            fontWeight: 'bold' as const,
            ...cellBorder
          },
          // Col F: Tracking USA
          {
            value: item.tracking,
            alignVertical: 'center' as const,
            ...cellBorder
          },
          // Col G: Peso (Kg)
          {
            value: item.pesoKg > 0 ? item.pesoKg : '',
            type: Number,
            format: '0.00',
            align: 'right' as const,
            alignVertical: 'center' as const,
            ...cellBorder
          },
          // Col H: Tipo de Empaque
          {
            value: item.tipo,
            align: 'center' as const,
            alignVertical: 'center' as const,
            ...cellBorder
          },
          // Col I: Posición WMS
          {
            value: item.posicion || 'REC',
            align: 'center' as const,
            alignVertical: 'center' as const,
            ...cellBorder
          },
          // Col J: Fecha Registro
          {
            value: item.fecha || '—',
            align: 'center' as const,
            alignVertical: 'center' as const,
            ...cellBorder
          }
        ]);
      } else {
        // Filas subsiguientes del mismo cliente: Col A, B y C son null porque están combinadas
        dataRows1.push([
          null, // Col A (cubierta por rowSpan)
          null, // Col B (cubierta por rowSpan)
          null, // Col C (cubierta por rowSpan)
          // Col D: Pqte N°
          {
            value: `${itemIdx + 1} de ${rowCount}`,
            align: 'center' as const,
            alignVertical: 'center' as const,
            ...cellBorder
          },
          // Col E: Guía WR
          {
            value: item.wr,
            align: 'center' as const,
            alignVertical: 'center' as const,
            fontWeight: 'bold' as const,
            ...cellBorder
          },
          // Col F: Tracking USA
          {
            value: item.tracking,
            alignVertical: 'center' as const,
            ...cellBorder
          },
          // Col G: Peso (Kg)
          {
            value: item.pesoKg > 0 ? item.pesoKg : '',
            type: Number,
            format: '0.00',
            align: 'right' as const,
            alignVertical: 'center' as const,
            ...cellBorder
          },
          // Col H: Tipo de Empaque
          {
            value: item.tipo,
            align: 'center' as const,
            alignVertical: 'center' as const,
            ...cellBorder
          },
          // Col I: Posición WMS
          {
            value: item.posicion || 'REC',
            align: 'center' as const,
            alignVertical: 'center' as const,
            ...cellBorder
          },
          // Col J: Fecha Registro
          {
            value: item.fecha || '—',
            align: 'center' as const,
            alignVertical: 'center' as const,
            ...cellBorder
          }
        ]);
      }
    });
  });

  // Fila Totalizadora General al final de Hoja 1 con borde doble inferior
  const totalStyle = {
    fontWeight: 'bold' as const,
    borderStyle: 'thin' as const,
    borderColor: '#94a3b8',
    topBorderStyle: 'medium' as const,
    topBorderColor: '#0f172a',
    bottomBorderStyle: 'double' as const,
    bottomBorderColor: '#0f172a',
    alignVertical: 'center' as const
  };

  const totalRow1 = [
    { value: '', ...totalStyle },
    { value: `TOTAL GENERAL (${summary.length} CLIENTES)`, ...totalStyle, align: 'left' as const },
    { value: totalPaquetes, type: Number, format: '#,##0', ...totalStyle, align: 'center' as const },
    { value: `${totalPaquetes} paquetes`, ...totalStyle, align: 'center' as const },
    { value: '', ...totalStyle },
    { value: '', ...totalStyle },
    { value: totalPeso, type: Number, format: '0.00', ...totalStyle, align: 'right' as const },
    { value: '', ...totalStyle },
    { value: '', ...totalStyle },
    { value: '', ...totalStyle }
  ];

  const sheet1Data = [headerRow1, ...dataRows1, totalRow1];

  const sheet1Columns = [
    { width: 12 },  // N° Cliente
    { width: 36 },  // Cliente
    { width: 18 },  // Cant. Total Pqtes
    { width: 14 },  // Pqte N°
    { width: 18 },  // Guía WR
    { width: 28 },  // Tracking USA
    { width: 14 },  // Peso (Kg)
    { width: 18 },  // Tipo Empaque
    { width: 16 },  // Posición WMS
    { width: 16 }   // Fecha
  ];

  // -------------------------------------------------------------
  // HOJA 2: "Totales por Cliente" (Resumen numérico limpio con bordes)
  // -------------------------------------------------------------
  const headerRow2 = [
    { value: 'N°', ...headerStyle },
    { value: 'Cliente / Consignatario', ...headerStyle, align: 'left' as const },
    { value: 'Cant. Paquetes', ...headerStyle, align: 'right' as const },
    { value: 'Peso Total (Kg)', ...headerStyle, align: 'right' as const },
    { value: 'Promedio Kg/Pqte', ...headerStyle, align: 'right' as const }
  ];

  const dataRows2 = summary.map((client, idx) => {
    const avg = client.paquetes > 0 ? client.pesoKg / client.paquetes : 0;
    return [
      { value: idx + 1, align: 'center' as const, alignVertical: 'center' as const, ...cellBorder },
      { value: client.cliente, fontWeight: 'bold' as const, alignVertical: 'center' as const, ...cellBorder },
      { value: client.paquetes, type: Number, format: '#,##0', align: 'right' as const, alignVertical: 'center' as const, ...cellBorder },
      { value: client.pesoKg, type: Number, format: '0.00', align: 'right' as const, alignVertical: 'center' as const, ...cellBorder },
      { value: Math.round(avg * 100) / 100, type: Number, format: '0.00', align: 'right' as const, alignVertical: 'center' as const, ...cellBorder }
    ];
  });

  const totalRow2 = [
    { value: '', ...totalStyle },
    { value: `TOTAL GENERAL (${summary.length} CLIENTES)`, ...totalStyle, align: 'left' as const },
    { value: totalPaquetes, type: Number, format: '#,##0', ...totalStyle, align: 'right' as const },
    { value: totalPeso, type: Number, format: '0.00', ...totalStyle, align: 'right' as const },
    { value: Math.round((totalPeso / (totalPaquetes || 1)) * 100) / 100, type: Number, format: '0.00', ...totalStyle, align: 'right' as const }
  ];

  const sheet2Data = [headerRow2, ...dataRows2, totalRow2];

  const sheet2Columns = [
    { width: 8 },   // N°
    { width: 36 },  // Cliente
    { width: 18 },  // Cant. Paquetes
    { width: 18 },  // Peso Total
    { width: 20 }   // Promedio
  ];

  // Generar archivo estándar OpenXML con celdas combinadas y bordes
  const blob = await writeXlsxFile([
    {
      data: sheet1Data,
      sheet: 'Carga por Cliente',
      columns: sheet1Columns
    },
    {
      data: sheet2Data,
      sheet: 'Totales por Cliente',
      columns: sheet2Columns
    }
  ]).toBlob();

  return blob;
}

/**
 * Exporta el reporte de personas y paquetes en almacén directamente a descarga (.xlsx)
 */
export async function exportEnAlmacenPivotReport(paquetes: Paquete[]): Promise<void> {
  const blob = await buildEnAlmacenReport(paquetes);
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `Reporte_Clientes_En_Almacen_AMEX_${dateStr}.xlsx`;
  saveAs(blob, filename);
}
