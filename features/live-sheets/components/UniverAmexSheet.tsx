'use client';

import React, { useEffect, useRef } from 'react';
import { createUniver, LocaleType, mergeLocales } from '@univerjs/presets';
import { UniverSheetsCorePreset } from '@univerjs/preset-sheets-core';
import UniverPresetSheetsCoreEsES from '@univerjs/preset-sheets-core/locales/es-ES';
import '@univerjs/preset-sheets-core/lib/index.css';

import { supabase } from '@/lib/supabase/client';
import { ItemCotejo, Paquete, TipoEstadoItemCotejo } from '@/types';
import {
  ActiveCell,
  CellSelectionRange,
  SheetRow,
  SPREADSHEET_COLUMNS
} from '../types';
import { extractLast6Digits } from '../utils/codeFormatters';

export interface UniverAmexSheetProps {
  activeHojaId: string;
  docTitle: string;
  isLoadingItems: boolean;
  items: ItemCotejo[];
  setItems: React.Dispatch<React.SetStateAction<ItemCotejo[]>>;
  sheetRows: SheetRow[];
  paquetes: Paquete[];
  operatorName: string;
  extraCells: Record<string, string>;
  setExtraCells: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  persistExtraCells: (nextExtra: Record<string, string>) => Promise<void>;
  resolveScannedCodeMatch: (
    scannedText: string,
    targetItemIndex?: number
  ) => {
    cleanCode: string;
    cleanDigits: string;
    isMatch: boolean;
    clientName: string;
    hasValidName: boolean;
    resolvedName: string;
  };
  playScanFeedback: (
    isMatch: boolean,
    hasValidName: boolean,
    clientName: string
  ) => void;
  activeCell: ActiveCell;
  setActiveCell: React.Dispatch<React.SetStateAction<ActiveCell>>;
  setSelectionRange: React.Dispatch<React.SetStateAction<CellSelectionRange | null>>;
  broadcastActiveCell: (col: string, row: number) => void;
}

const FIXED_HEADERS = [
  'NOMBRE',
  'CODIGO WAREHOUSE',
  'CODIGO TIB',
  'CODIGO ESCANEADO',
  'ESTADO',
  'NOMBRE ESCANEADO'
];

const STYLE_HEADER = {
  bg: { rgb: '#f1f5f9' },
  cl: { rgb: '#0f172a' },
  bl: 1,
  fs: 10,
  vt: 2,
  ht: 1,
  bd: {
    b: { s: 2, cl: { rgb: '#94a3b8' } },
    r: { s: 1, cl: { rgb: '#cbd5e1' } }
  }
};

const STYLE_MANIFEST_FOUND = {
  bg: { rgb: '#d1fae5' },
  cl: { rgb: '#065f46' },
  bl: 1,
  fs: 10,
  vt: 2
};

const STYLE_MANIFEST_NORMAL = {
  bg: null,
  cl: { rgb: '#0f172a' },
  bl: 0,
  fs: 10,
  vt: 2
};

const STYLE_TIB_NORMAL = {
  bg: { rgb: '#f8fafc' },
  cl: { rgb: '#475569' },
  bl: 1,
  fs: 10,
  vt: 2
};

const STYLE_SCAN_FOUND = {
  bg: { rgb: '#dcfce7' },
  cl: { rgb: '#15803d' },
  bl: 1,
  fs: 10,
  vt: 2
};

const STYLE_SCAN_NOT_FOUND = {
  bg: { rgb: '#fee2e2' },
  cl: { rgb: '#b91c1c' },
  bl: 1,
  fs: 10,
  vt: 2
};

const STYLE_CELL_DEFAULT = {
  bg: null,
  cl: { rgb: '#1e293b' },
  bl: 0,
  fs: 10,
  vt: 2
};

/**
 * Construye las 6 celdas A..F de una fila limpiando explícitamente `p: null`
 * para que ningún formato rich-text pegado desde Excel/Google Sheets bloquee el color o valor.
 */
function buildRowCells(row: {
  nombre: string;
  codigoWarehouse: string;
  codigoTib: string;
  codigoEscaneado: string;
  estado: string;
  nombreEscaneado: string;
  isManifestFound?: boolean;
}) {
  const isManifestFound = !!row.isManifestFound;
  const isScanFound = row.estado === 'ENCONTRADO';
  const isScanNotFound = row.estado === 'NO ENCONTRADO';

  const scanStyle = isScanFound
    ? STYLE_SCAN_FOUND
    : isScanNotFound
    ? STYLE_SCAN_NOT_FOUND
    : STYLE_CELL_DEFAULT;

  return [
    { v: row.nombre || '', p: null, s: STYLE_CELL_DEFAULT },
    {
      v: row.codigoWarehouse || '',
      p: null,
      s: isManifestFound ? STYLE_MANIFEST_FOUND : STYLE_MANIFEST_NORMAL
    },
    {
      v: row.codigoTib || '',
      p: null,
      s: isManifestFound ? STYLE_MANIFEST_FOUND : STYLE_TIB_NORMAL
    },
    { v: row.codigoEscaneado || '', p: null, s: scanStyle },
    { v: row.estado || '', p: null, s: scanStyle },
    { v: row.nombreEscaneado || '', p: null, s: STYLE_CELL_DEFAULT }
  ];
}

/**
 * Limpia saltos de línea y espacios invisibles de valores leídos de celdas (incluyendo rich text `p`).
 */
function cleanCellText(val: unknown): string {
  if (val === null || val === undefined) return '';
  return String(val)
    .replace(/[\r\n]+/g, ' ')
    .trim();
}

export default function UniverAmexSheet({
  activeHojaId,
  docTitle,
  isLoadingItems,
  items,
  setItems,
  sheetRows,
  paquetes,
  operatorName,
  extraCells,
  setExtraCells,
  persistExtraCells,
  playScanFeedback,
  setActiveCell,
  setSelectionRange,
  broadcastActiveCell
}: UniverAmexSheetProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const univerAPIRef = useRef<any>(null);
  const isProgrammaticRef = useRef<boolean>(false);
  const previousRowCountRef = useRef<number>(0);
  const dbSyncQueueRef = useRef<Promise<void>>(Promise.resolve());
  const inFlightDbOpsRef = useRef<number>(0);

  // Refs actualizadas para usar dentro de los listeners de Univer
  const itemsRef = useRef<ItemCotejo[]>(items);
  itemsRef.current = items;

  const sheetRowsRef = useRef<SheetRow[]>(sheetRows);
  sheetRowsRef.current = sheetRows;

  const paquetesRef = useRef<Paquete[]>(paquetes);
  paquetesRef.current = paquetes;

  const operatorNameRef = useRef<string>(operatorName);
  operatorNameRef.current = operatorName;

  const activeHojaIdRef = useRef<string>(activeHojaId);
  activeHojaIdRef.current = activeHojaId;

  const extraCellsRef = useRef<Record<string, string>>(extraCells);
  extraCellsRef.current = extraCells;

  const persistExtraCellsRef = useRef(persistExtraCells);
  persistExtraCellsRef.current = persistExtraCells;

  const playScanFeedbackRef = useRef(playScanFeedback);
  playScanFeedbackRef.current = playScanFeedback;

  // Inicializar instancia de Univer cuando cambia activeHojaId
  useEffect(() => {
    const hostEl = hostRef.current;
    if (!hostEl || !activeHojaId) return;

    const mountEl = document.createElement('div');
    mountEl.style.width = '100%';
    mountEl.style.height = '100%';
    hostEl.appendChild(mountEl);

    const initialCellData: Record<number, Record<number, any>> = {
      0: {}
    };

    FIXED_HEADERS.forEach((h, colIdx) => {
      initialCellData[0][colIdx] = {
        v: h,
        p: null,
        s: STYLE_HEADER
      };
    });

    sheetRowsRef.current.forEach((row, idx) => {
      const r = idx + 1;
      const cells = buildRowCells(row);
      initialCellData[r] = {};
      cells.forEach((c, colIdx) => {
        initialCellData[r][colIdx] = c;
      });
    });

    Object.entries(extraCellsRef.current || {}).forEach(([key, val]) => {
      if (!val) return;
      const [colLetter, rowStr] = key.split('-');
      const colIdx = SPREADSHEET_COLUMNS.indexOf(colLetter as any);
      const rowNum = Number(rowStr);
      if (colIdx >= 6 && rowNum >= 2) {
        const r = rowNum - 1;
        if (!initialCellData[r]) initialCellData[r] = {};
        if (String(val).startsWith('=')) {
          initialCellData[r][colIdx] = { f: String(val), p: null, s: STYLE_CELL_DEFAULT };
        } else {
          initialCellData[r][colIdx] = { v: String(val), p: null, s: STYLE_CELL_DEFAULT };
        }
      }
    });

    previousRowCountRef.current = sheetRowsRef.current.length;

    const { univer, univerAPI } = createUniver({
      locale: LocaleType.ES_ES,
      locales: {
        [LocaleType.ES_ES]: mergeLocales(UniverPresetSheetsCoreEsES)
      },
      presets: [
        UniverSheetsCorePreset({
          container: mountEl,
          header: true,
          toolbar: true,
          formulaBar: true,
          footer: false,
          sheets: {
            allowArrowKeyWrapOnSheetBoundary: false
          }
        })
      ]
    });

    univerAPIRef.current = univerAPI;

    isProgrammaticRef.current = true;
    univerAPI.createWorkbook({
      id: `workbook-${activeHojaId}`,
      name: docTitle || 'AMEX WR',
      appVersion: '0.21.0',
      locale: LocaleType.ES_ES,
      styles: {},
      sheetOrder: ['sheet-main'],
      sheets: {
        'sheet-main': {
          id: 'sheet-main',
          name: docTitle || 'Hoja 1',
          rowCount: Math.max(1000, sheetRowsRef.current.length + 200),
          columnCount: 26,
          defaultColumnWidth: 120,
          defaultRowHeight: 25,
          freeze: {
            xSplit: 0,
            ySplit: 1,
            startRow: 1,
            startColumn: 0
          },
          rowData: {
            0: { h: 30 }
          },
          columnData: {
            0: { w: 235 }, // A: NOMBRE
            1: { w: 175 }, // B: CODIGO WAREHOUSE
            2: { w: 120 }, // C: CODIGO TIB
            3: { w: 185 }, // D: CODIGO ESCANEADO
            4: { w: 145 }, // E: ESTADO
            5: { w: 235 }  // F: NOMBRE ESCANEADO
          },
          cellData: initialCellData
        }
      }
    });

    queueMicrotask(() => {
      isProgrammaticRef.current = false;
    });

    // Listener de selección
    const selectionDisp = univerAPI.addEvent(
      univerAPI.Event.SelectionChanged,
      (params: any) => {
        const selections = params?.selections;
        if (!selections || selections.length === 0) return;
        const sel = selections[0];
        const startColIdx = Math.max(0, Math.min(25, sel.startColumn ?? 0));
        const endColIdx = Math.max(0, Math.min(25, sel.endColumn ?? startColIdx));
        const startRowNum = Math.max(2, (sel.startRow ?? 1) + 1);
        const endRowNum = Math.max(2, (sel.endRow ?? sel.startRow ?? 1) + 1);

        const startCol = SPREADSHEET_COLUMNS[startColIdx] || 'D';
        const endCol = SPREADSHEET_COLUMNS[endColIdx] || startCol;

        setActiveCell(prev => ({
          ...prev,
          col: startCol,
          row: startRowNum
        }));
        setSelectionRange({
          startCol,
          startRow: startRowNum,
          endCol,
          endRow: endRowNum
        });
        broadcastActiveCell(startCol, startRowNum);
      }
    );

    // Listener de cambios de valor en celdas (edición directa, pegado Ctrl+V con rich text o texto plano, Delete, Ctrl+Z)
    const valueChangeDisp = univerAPI.addEvent(
      univerAPI.Event.SheetValueChanged,
      (params: any) => {
        if (isProgrammaticRef.current) return;

        const effectedRanges: any[] = params?.effectedRanges || [];
        if (effectedRanges.length === 0) return;

        const activeWorkbook = univerAPI.getActiveWorkbook();
        const worksheet = activeWorkbook?.getActiveSheet();
        if (!worksheet) return;

        const touchedRowsInThisEvent = new Set<number>();
        const touchedColsInThisEvent = new Set<number>();
        let touchedHeaderRow = false;
        const touchedExtraCoords: Array<{ r: number; c: number }> = [];
        let maxTouchedRow = 0;

        for (const fRange of effectedRanges) {
          const startR = fRange.getRow();
          const startC = fRange.getColumn();
          const height = fRange.getHeight();
          const width = fRange.getWidth();

          for (let r = startR; r < startR + height; r++) {
            if (r === 0) {
              touchedHeaderRow = true;
              continue;
            }
            if (r > maxTouchedRow) maxTouchedRow = r;
            for (let c = startC; c < startC + width; c++) {
              touchedColsInThisEvent.add(c);
              if (c < 6) {
                touchedRowsInThisEvent.add(r);
              } else if (c < 26) {
                touchedExtraCoords.push({ r, c });
              }
            }
          }
        }

        // También inspeccionar directamente las llaves de payload.params.cellValue por si algún rango fue disperso
        const rawCellValueMatrix = params?.payload?.params?.cellValue;
        if (rawCellValueMatrix && typeof rawCellValueMatrix === 'object') {
          for (const rKey of Object.keys(rawCellValueMatrix)) {
            const r = Number(rKey);
            if (isNaN(r)) continue;
            if (r === 0) {
              touchedHeaderRow = true;
              continue;
            }
            if (r > maxTouchedRow) maxTouchedRow = r;
            const rowObj = rawCellValueMatrix[rKey];
            if (rowObj && typeof rowObj === 'object') {
              for (const cKey of Object.keys(rowObj)) {
                const c = Number(cKey);
                if (isNaN(c)) continue;
                touchedColsInThisEvent.add(c);
                if (c < 6) {
                  touchedRowsInThisEvent.add(r);
                } else if (c < 26) {
                  touchedExtraCoords.push({ r, c });
                }
              }
            }
          }
        }

        // Proteger la fila 1 de encabezados fijos
        if (touchedHeaderRow) {
          isProgrammaticRef.current = true;
          try {
            const headerRange = worksheet.getRange(0, 0, 1, 6);
            headerRange.setValues([
              FIXED_HEADERS.map(h => ({ v: h, p: null, s: STYLE_HEADER }))
            ]);
          } finally {
            queueMicrotask(() => {
              isProgrammaticRef.current = false;
            });
          }
        }

        // Persistir celdas libres en columnas G..Z
        if (touchedExtraCoords.length > 0) {
          const nextExtra = { ...extraCellsRef.current };
          for (const { r, c } of touchedExtraCoords) {
            const colLetter = SPREADSHEET_COLUMNS[c];
            if (!colLetter) continue;
            const cellRange = worksheet.getRange(r, c, 1, 1);
            const formula = cellRange.getFormula?.() || '';
            const dispVal = cellRange.getDisplayValues?.()?.[0]?.[0];
            const rawVal = dispVal !== undefined && dispVal !== '' ? dispVal : cellRange.getValue?.();
            const finalStr = formula ? formula : cleanCellText(rawVal);
            const key = `${colLetter}-${r + 1}`;
            if (finalStr) {
              nextExtra[key] = finalStr;
            } else {
              delete nextExtra[key];
            }
          }
          setExtraCells(nextExtra);
          void persistExtraCellsRef.current(nextExtra);
        }

        if (touchedRowsInThisEvent.size === 0) return;

        // Leer TODA la región activa de filas (desde fila 1 hasta max(items.length, maxTouchedRow))
        // usando getDisplayValues() para capturar tanto cell.v como rich-text cell.p pegado desde Excel/Sheets
        const totalRowsToInspect = Math.max(itemsRef.current.length, maxTouchedRow);
        if (totalRowsToInspect <= 0) return;

        const fullRange = worksheet.getRange(1, 0, totalRowsToInspect, 6);
        const displayGrid: string[][] = fullRange.getDisplayValues?.() || [];
        const rawGrid: any[][] = fullRange.getValues?.() || [];

        const gridRows: Array<{
          r: number;
          itemIdx: number;
          rawA: string;
          rawB: string;
          rawC: string;
          rawD: string;
          rawE: string;
          rawF: string;
        }> = [];

        for (let i = 0; i < totalRowsToInspect; i++) {
          const dRow = displayGrid[i] || [];
          const vRow = rawGrid[i] || [];
          const pick = (col: number) => {
            const d = cleanCellText(dRow[col]);
            if (d) return d;
            return cleanCellText(vRow[col]);
          };
          gridRows.push({
            r: i + 1,
            itemIdx: i,
            rawA: pick(0),
            rawB: pick(1),
            rawC: pick(2),
            rawD: pick(3),
            rawE: pick(4),
            rawF: pick(5)
          });
        }

        // 1. Construir el manifiesto en vivo de toda la hoja (con herencia de cliente por grupo en Columna A)
        let runningGroupName = '';
        const liveManifest: Array<{
          itemIdx: number;
          effectiveConsignee: string;
          rawConsignee: string;
          wrClean: string;
          wrDigits: string;
          tibClean: string;
        }> = [];

        for (const gr of gridRows) {
          const rawConsignee = gr.rawA;
          const wrClean = gr.rawB.toUpperCase().replace(/\s+/g, '');
          const wrDigits = wrClean.replace(/^[A-Za-z]+0*/, '');
          const tibClean = extractLast6Digits(gr.rawB) || gr.rawC.toUpperCase().replace(/\s+/g, '');

          if (rawConsignee && rawConsignee !== '[NOMBRE]') {
            runningGroupName = rawConsignee;
          } else if (!wrClean && !rawConsignee) {
            runningGroupName = '';
          }

          const effectiveConsignee =
            rawConsignee && rawConsignee !== '[NOMBRE]'
              ? rawConsignee
              : wrClean
              ? runningGroupName
              : '';

          liveManifest.push({
            itemIdx: gr.itemIdx,
            effectiveConsignee,
            rawConsignee,
            wrClean,
            wrDigits,
            tibClean
          });
        }

        // Conjunto de todos los códigos escaneados en Columna D de la hoja para colorear B y C
        const allLiveScannedCodes = new Set<string>();
        for (const gr of gridRows) {
          if (gr.rawD) {
            const cleanD = gr.rawD.toUpperCase().replace(/\s+/g, '');
            const digitsD = cleanD.replace(/^[A-Za-z]+0*/, '');
            if (cleanD) {
              allLiveScannedCodes.add(cleanD);
              if (digitsD) {
                allLiveScannedCodes.add(digitsD);
                allLiveScannedCodes.add(`WR${digitsD}`);
              }
            }
          }
        }

        // Función para evaluar un código escaneado en Columna D exclusivamente contra el manifiesto de la hoja actual (Columnas B/C y nombre de Columna A)
        const matchAgainstLiveSheet = (scanText: string) => {
          const cleanCode = scanText.toUpperCase().replace(/\s+/g, '');
          const cleanDigits = cleanCode.replace(/^[A-Za-z]+0*/, '');

          const manifestEntry = liveManifest.find(m => {
            if (!m.wrClean && !m.tibClean) return false;
            return (
              (m.wrClean && m.wrClean === cleanCode) ||
              (m.wrClean && `WR${m.wrClean}` === cleanCode) ||
              (m.wrDigits && cleanDigits && m.wrDigits === cleanDigits) ||
              (m.tibClean && m.tibClean === cleanCode) ||
              (m.tibClean && cleanDigits && m.tibClean === cleanDigits)
            );
          });

          const isMatch = !!manifestEntry;
          const clientName = manifestEntry?.effectiveConsignee?.trim() || '';

          const hasValidName =
            !!clientName &&
            clientName !== '[NOMBRE]' &&
            clientName !== 'CLIENTE AMEX' &&
            clientName !== 'NO ASIGNADO';

          return {
            cleanCode,
            cleanDigits,
            isMatch,
            clientName,
            hasValidName,
            resolvedName: hasValidName ? clientName : isMatch ? 'CLIENTE AMEX' : 'NO ASIGNADO'
          };
        };

        // 2. Construir el estado reconciliado de cada fila y pintar inmediatamente en Univer
        let feedbackPlayed = false;
        const reconciledCellsMatrix: any[][] = [];

        interface ReconciledRowData {
          itemIdx: number;
          consignatario: string;
          codigoWr: string;
          casillero: string;
          tracking: string;
          estado: TipoEstadoItemCotejo;
          displayEstado: 'ENCONTRADO' | 'NO ENCONTRADO' | '';
          notas: string;
          isManifestFound: boolean;
          scanChangedInThisEvent: boolean;
        }

        const reconciledRows: ReconciledRowData[] = [];

        for (let i = 0; i < gridRows.length; i++) {
          const gr = gridRows[i];
          const mf = liveManifest[i];
          const existingItem = itemsRef.current[i];

          const consignatario = mf.rawConsignee || gr.rawA;
          const codigoWr = gr.rawB;
          const casillero = extractLast6Digits(codigoWr) || (codigoWr ? '' : gr.rawC);

          const isManifestFound = !!(
            (mf.wrClean && allLiveScannedCodes.has(mf.wrClean)) ||
            (mf.wrClean && allLiveScannedCodes.has(`WR${mf.wrClean}`)) ||
            (mf.tibClean && allLiveScannedCodes.has(mf.tibClean)) ||
            (mf.wrDigits && allLiveScannedCodes.has(mf.wrDigits))
          );

          let tracking = '';
          let estado: TipoEstadoItemCotejo = 'PENDIENTE';
          let displayEstado: 'ENCONTRADO' | 'NO ENCONTRADO' | '' = '';
          let notas = '';

          const prevTrackingClean = (existingItem?.tracking || '').trim().toUpperCase().replace(/\s+/g, '');
          const currentDClean = gr.rawD.toUpperCase().replace(/\s+/g, '');
          const scanChangedInThisEvent =
            touchedRowsInThisEvent.has(gr.r) &&
            touchedColsInThisEvent.has(3) &&
            currentDClean !== prevTrackingClean;

          if (gr.rawD) {
            const match = matchAgainstLiveSheet(gr.rawD);
            tracking = match.cleanCode;
            estado = match.isMatch ? 'ESCANEADO' : 'NO_LISTADO';
            displayEstado = match.isMatch ? 'ENCONTRADO' : 'NO ENCONTRADO';
            notas = match.isMatch ? match.resolvedName : 'NO ASIGNADO';

            if (scanChangedInThisEvent && !feedbackPlayed) {
              feedbackPlayed = true;
              playScanFeedbackRef.current(
                match.isMatch,
                match.hasValidName,
                match.clientName
              );
            }
          }

          reconciledRows.push({
            itemIdx: i,
            consignatario,
            codigoWr,
            casillero,
            tracking,
            estado,
            displayEstado,
            notas,
            isManifestFound,
            scanChangedInThisEvent
          });

          reconciledCellsMatrix.push(
            buildRowCells({
              nombre: consignatario,
              codigoWarehouse: codigoWr,
              codigoTib: casillero,
              codigoEscaneado: tracking,
              estado: displayEstado,
              nombreEscaneado: notas,
              isManifestFound
            })
          );
        }

        // Pintar inmediatamente todas las celdas A..F reconciliadas (con p: null y colores exactos)
        isProgrammaticRef.current = true;
        try {
          fullRange.setValues(reconciledCellsMatrix);
          previousRowCountRef.current = reconciledCellsMatrix.length;
        } finally {
          queueMicrotask(() => {
            isProgrammaticRef.current = false;
          });
        }

        // 3. Encolar sincronización con React state y Supabase en orden estricto (sin condiciones de carrera)
        const currentHojaId = activeHojaIdRef.current;
        const currentOperator = operatorNameRef.current;
        inFlightDbOpsRef.current += 1;

        dbSyncQueueRef.current = dbSyncQueueRef.current
          .then(async () => {
            const nowIso = new Date().toISOString();
            const latestItems = [...itemsRef.current];
            const dbUpdates: Array<{ id: string; patch: Record<string, any> }> = [];
            const newPayloads: Array<Record<string, any>> = [];
            const updatedItemsList: ItemCotejo[] = [...latestItems];

            for (const rec of reconciledRows) {
              const existing = latestItems[rec.itemIdx];
              if (existing && !existing.id.startsWith('temp-')) {
                const changed =
                  (existing.consignatario || '') !== rec.consignatario ||
                  (existing.codigoWr || '') !== rec.codigoWr ||
                  (existing.casillero || '') !== rec.casillero ||
                  (existing.tracking || '') !== rec.tracking ||
                  (existing.notas || '') !== rec.notas ||
                  existing.estado !== rec.estado;

                if (changed) {
                  const patch: Record<string, any> = {
                    consignatario: rec.consignatario,
                    codigo_wr: rec.codigoWr,
                    casillero: rec.casillero,
                    tracking: rec.tracking || null,
                    notas: rec.notas || null,
                    estado: rec.estado,
                    actualizado_en: nowIso
                  };

                  if (rec.scanChangedInThisEvent) {
                    patch.veces_escaneado = rec.tracking ? (existing.vecesEscaneado || 0) + 1 : 0;
                    patch.escaneado_en = rec.tracking ? nowIso : null;
                    patch.escaneado_por = rec.tracking ? currentOperator : null;
                  }

                  dbUpdates.push({ id: existing.id, patch });
                  updatedItemsList[rec.itemIdx] = {
                    ...existing,
                    consignatario: rec.consignatario,
                    codigoWr: rec.codigoWr,
                    casillero: rec.casillero,
                    tracking: rec.tracking,
                    notas: rec.notas,
                    estado: rec.estado,
                    actualizadoEn: nowIso
                  };
                }
              } else if (
                rec.consignatario ||
                rec.codigoWr ||
                rec.tracking ||
                rec.notas ||
                rec.itemIdx < reconciledRows.length
              ) {
                // Verificar si hay alguna fila con datos desde este índice en adelante
                const hasAnyDataFromHere = reconciledRows
                  .slice(rec.itemIdx)
                  .some(r => r.consignatario || r.codigoWr || r.tracking || r.notas);

                if (hasAnyDataFromHere) {
                  newPayloads.push({
                    hoja_id: currentHojaId,
                    consignatario: rec.consignatario,
                    codigo_wr: rec.codigoWr,
                    casillero: rec.casillero,
                    tracking: rec.tracking || null,
                    peso_kg: 0,
                    posicion_estante: 'REC',
                    notas: rec.notas || null,
                    estado: rec.estado,
                    veces_escaneado: rec.tracking ? 1 : 0,
                    escaneado_en: rec.tracking ? nowIso : null,
                    escaneado_por: rec.tracking ? currentOperator : null,
                    orden: rec.itemIdx + 1
                  });
                }
              }
            }

            if (dbUpdates.length > 0) {
              itemsRef.current = updatedItemsList;
              setItems(updatedItemsList);
              await Promise.all(
                dbUpdates.map(u =>
                  supabase.from('hojas_cotejo_items').update(u.patch).eq('id', u.id)
                )
              );
            }

            if (newPayloads.length > 0) {
              const { data: inserted } = await supabase
                .from('hojas_cotejo_items')
                .insert(newPayloads)
                .select();

              if (inserted && inserted.length > 0) {
                const mappedInserted: ItemCotejo[] = inserted.map(row => ({
                  id: row.id,
                  hojaId: row.hoja_id,
                  codigoWr: row.codigo_wr || '',
                  tracking: (row as any).tracking || '',
                  casillero: row.casillero || '',
                  consignatario: row.consignatario || '',
                  pesoKg: Number(row.peso_kg || 0),
                  posicionEstante: row.posicion_estante || 'REC',
                  notas: row.notas || '',
                  estado: (row.estado as TipoEstadoItemCotejo) || 'PENDIENTE',
                  escaneadoEn: row.escaneado_en,
                  escaneadoPor: row.escaneado_por,
                  vecesEscaneado: row.veces_escaneado || 0,
                  orden: row.orden,
                  creadoEn: row.creado_en,
                  actualizadoEn: row.actualizado_en
                }));

                setItems(prev => {
                  const existingIds = new Set(prev.map(p => p.id));
                  const fresh = mappedInserted.filter(m => !existingIds.has(m.id));
                  const merged = [...prev, ...fresh].sort((a, b) => (a.orden || 0) - (b.orden || 0));
                  itemsRef.current = merged;
                  return merged;
                });
              }
            }
          })
          .catch(err => {
            console.error('[UniverAmexSheet] Error en cola de sincronización:', err);
          })
          .finally(() => {
            inFlightDbOpsRef.current = Math.max(0, inFlightDbOpsRef.current - 1);
          });
      }
    );

    return () => {
      selectionDisp?.dispose?.();
      valueChangeDisp?.dispose?.();
      univerAPIRef.current = null;
      queueMicrotask(() => {
        try {
          univer.dispose();
        } catch {
          // ignore disposal race
        }
        mountEl.remove();
      });
    };
  }, [activeHojaId]);

  // Sincronizar cambios externos de sheetRows (pistola superior, modales, Cargar BD, Reiniciar, Realtime) hacia Univer
  useEffect(() => {
    if (inFlightDbOpsRef.current > 0) return;
    const univerAPI = univerAPIRef.current;
    if (!univerAPI) return;

    const activeWorkbook = univerAPI.getActiveWorkbook();
    const worksheet = activeWorkbook?.getActiveSheet();
    if (!worksheet) return;

    isProgrammaticRef.current = true;
    try {
      const currentLen = sheetRows.length;
      const prevLen = previousRowCountRef.current;

      if (currentLen > 0) {
        const matrix = sheetRows.map(r => buildRowCells(r));
        const dataRange = worksheet.getRange(1, 0, currentLen, 6);
        dataRange.setValues(matrix);
      }

      if (prevLen > currentLen) {
        const diff = prevLen - currentLen;
        const emptyMatrix = Array.from({ length: diff }, () =>
          Array.from({ length: 6 }, () => ({ v: '', p: null, s: STYLE_CELL_DEFAULT }))
        );
        const clearRange = worksheet.getRange(currentLen + 1, 0, diff, 6);
        clearRange.setValues(emptyMatrix);
      }

      previousRowCountRef.current = currentLen;
    } catch (err) {
      console.error('[UniverAmexSheet] Error sincronizando filas con Univer:', err);
    } finally {
      queueMicrotask(() => {
        isProgrammaticRef.current = false;
      });
    }
  }, [sheetRows]);

  return (
    <div
      style={{
        position: 'relative',
        flex: 1,
        width: '100%',
        height: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        background: '#ffffff'
      }}
    >
      {isLoadingItems && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            right: 16,
            zIndex: 40,
            background: 'rgba(15, 23, 42, 0.85)',
            color: '#f8fafc',
            fontSize: '11px',
            fontWeight: 600,
            padding: '4px 10px',
            borderRadius: '999px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            pointerEvents: 'none'
          }}
        >
          <span>Sincronizando hoja...</span>
        </div>
      )}
      <div
        ref={hostRef}
        style={{
          flex: 1,
          width: '100%',
          height: '100%',
          minHeight: 0
        }}
      />
    </div>
  );
}
