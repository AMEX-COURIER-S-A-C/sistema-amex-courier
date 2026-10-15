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
}

/**
 * Filtra paquetes cuyo estado AMEX sea 'en_almacen' o 'recibido'
 * (los que constituyen la carga actualmente física en almacén).
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
        tipo: rawTipo || 'SIN TIPO',
        posicion: rawPosicion || 'REC',
        fecha
      };
    });
}

/**
 * Agrupa los paquetes en almacén por cliente, calculando el total de paquetes,
 * la suma de peso en kg y la lista completa de WRs y trackings asociados.
 * Ordenado descendentemente por cantidad de paquetes y peso.
 */
export function buildClientSummary(rows: EnAlmacenRow[]): ClientSummaryItem[] {
  if (!Array.isArray(rows) || rows.length === 0) return [];

  const map = new Map<string, {
    paquetes: number;
    pesoKg: number;
    wrs: string[];
    trackings: Set<string>;
    tipos: Set<string>;
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
        tipos: new Set<string>()
      };
      map.set(cli, current);
    }

    current.paquetes += 1;
    current.pesoKg += r.pesoKg > 0 ? r.pesoKg : 0;
    if (r.wr && r.wr !== 'SIN WR') current.wrs.push(r.wr);
    if (r.tracking && r.tracking !== '—') current.trackings.add(r.tracking);
    if (r.tipo && r.tipo !== 'SIN TIPO') current.tipos.add(r.tipo);
  }

  const result: ClientSummaryItem[] = [];
  for (const [cliente, data] of map.entries()) {
    result.push({
      cliente,
      paquetes: data.paquetes,
      pesoKg: Math.round(data.pesoKg * 100) / 100,
      wrs: data.wrs,
      trackings: Array.from(data.trackings),
      tipos: Array.from(data.tipos)
    });
  }

  // Orden descendente por paquetes, luego por peso, luego por nombre
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
 * Construye el archivo Excel (.xlsx) limpio y 100% estándar con 2 hojas:
 * 1. "Resumen por Cliente": Cantidad de clientes, paquetes por persona, peso total y lista de sus WRs.
 * 2. "Detalle de Paquetes": Lista completa de cada paquete físico en almacén.
 */
export async function buildEnAlmacenReport(paquetes: Paquete[]): Promise<Blob> {
  const rows = selectEnAlmacen(paquetes);
  if (rows.length === 0) {
    throw new Error('No hay paquetes con Estado AMEX = "En Almacén" o "Recibido" para exportar.');
  }

  const summary = buildClientSummary(rows);
  const totalPaquetes = rows.length;
  const totalPeso = Math.round(rows.reduce((acc, r) => acc + r.pesoKg, 0) * 100) / 100;

  // -------------------------------------------------------------
  // HOJA 1: Resumen por Cliente (Personas, Cantidad y Cuáles Son)
  // -------------------------------------------------------------
  const headerStyle = {
    fontWeight: 'bold' as const,
    color: '#ffffff',
    backgroundColor: '#0f172a'
  };

  const headerRow1 = [
    { value: 'N°', ...headerStyle, align: 'center' as const },
    { value: 'Cliente / Consignatario', ...headerStyle },
    { value: 'Cant. Paquetes', ...headerStyle, align: 'right' as const },
    { value: 'Peso Total (Kg)', ...headerStyle, align: 'right' as const },
    { value: 'Guías WR en Almacén', ...headerStyle },
    { value: 'Trackings USA', ...headerStyle },
    { value: 'Tipos de Empaque', ...headerStyle }
  ];

  const dataRows1 = summary.map((item, idx) => [
    { value: idx + 1, align: 'center' as const },
    { value: item.cliente, fontWeight: 'bold' as const },
    { value: item.paquetes, type: Number, format: '#,##0', align: 'right' as const },
    { value: item.pesoKg, type: Number, format: '0.00', align: 'right' as const },
    { value: item.wrs.join(', ') || '—' },
    { value: item.trackings.join(', ') || '—' },
    { value: item.tipos.join(', ') || '—' }
  ]);

  const totalStyle = {
    fontWeight: 'bold' as const,
    backgroundColor: '#f1f5f9'
  };

  const totalRow1 = [
    { value: '', ...totalStyle },
    { value: `TOTAL GENERAL (${summary.length} CLIENTES)`, ...totalStyle },
    { value: totalPaquetes, type: Number, format: '#,##0', ...totalStyle, align: 'right' as const },
    { value: totalPeso, type: Number, format: '0.00', ...totalStyle, align: 'right' as const },
    { value: `${totalPaquetes} guías en almacén`, ...totalStyle },
    { value: '', ...totalStyle },
    { value: '', ...totalStyle }
  ];

  const sheet1Data = [headerRow1, ...dataRows1, totalRow1];

  const sheet1Columns = [
    { width: 6 },   // N°
    { width: 34 },  // Cliente
    { width: 16 },  // Cant. Paquetes
    { width: 16 },  // Peso Total
    { width: 38 },  // Guías WR
    { width: 34 },  // Trackings
    { width: 22 }   // Tipos
  ];

  // -------------------------------------------------------------
  // HOJA 2: Detalle de Paquetes en Almacén
  // -------------------------------------------------------------
  const headerRow2 = [
    { value: 'N°', ...headerStyle, align: 'center' as const },
    { value: 'Cliente / Consignatario', ...headerStyle },
    { value: 'Guía WR', ...headerStyle, align: 'center' as const },
    { value: 'Tracking USA', ...headerStyle },
    { value: 'Peso (Kg)', ...headerStyle, align: 'right' as const },
    { value: 'Tipo de Empaque', ...headerStyle },
    { value: 'Estado AMEX', ...headerStyle, align: 'center' as const },
    { value: 'Posición WMS', ...headerStyle, align: 'center' as const },
    { value: 'Fecha Registro', ...headerStyle, align: 'center' as const }
  ];

  const dataRows2 = rows.map((r, idx) => [
    { value: idx + 1, align: 'center' as const },
    { value: r.cliente },
    { value: r.wr, align: 'center' as const },
    { value: r.tracking },
    { value: r.pesoKg > 0 ? r.pesoKg : '', type: Number, format: '0.00', align: 'right' as const },
    { value: r.tipo },
    { value: 'En Almacén', align: 'center' as const },
    { value: r.posicion || 'REC', align: 'center' as const },
    { value: r.fecha || '—', align: 'center' as const }
  ]);

  const totalRow2 = [
    { value: '', ...totalStyle },
    { value: `TOTAL: ${totalPaquetes} PAQUETES`, ...totalStyle },
    { value: '', ...totalStyle },
    { value: '', ...totalStyle },
    { value: totalPeso, type: Number, format: '0.00', ...totalStyle, align: 'right' as const },
    { value: '', ...totalStyle },
    { value: '', ...totalStyle },
    { value: '', ...totalStyle },
    { value: '', ...totalStyle }
  ];

  const sheet2Data = [headerRow2, ...dataRows2, totalRow2];

  const sheet2Columns = [
    { width: 6 },   // N°
    { width: 32 },  // Cliente
    { width: 16 },  // Guía WR
    { width: 26 },  // Tracking
    { width: 14 },  // Peso (Kg)
    { width: 18 },  // Tipo Empaque
    { width: 16 },  // Estado AMEX
    { width: 16 },  // Posición WMS
    { width: 16 }   // Fecha
  ];

  // Generar archivo nativo 100% estándar con write-excel-file
  const blob = await writeXlsxFile([
    {
      data: sheet1Data,
      sheet: 'Resumen por Cliente',
      columns: sheet1Columns
    },
    {
      data: sheet2Data,
      sheet: 'Detalle de Paquetes',
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
