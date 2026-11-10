'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createUniver, LocaleType, mergeLocales } from '@univerjs/presets';
import { UniverSheetsCorePreset } from '@univerjs/preset-sheets-core';
import UniverPresetSheetsCoreEsES from '@univerjs/preset-sheets-core/locales/es-ES';
import '@univerjs/preset-sheets-core/lib/index.css';

import { UniverSheetsFilterPreset } from '@univerjs/preset-sheets-filter';
import UniverPresetSheetsFilterEsES from '@univerjs/preset-sheets-filter/locales/es-ES';
import '@univerjs/preset-sheets-filter/lib/index.css';

import { UniverSheetsSortPreset } from '@univerjs/preset-sheets-sort';
import UniverPresetSheetsSortEsES from '@univerjs/preset-sheets-sort/locales/es-ES';
import '@univerjs/preset-sheets-sort/lib/index.css';

import { UniverSheetsFindReplacePreset } from '@univerjs/preset-sheets-find-replace';
import UniverPresetSheetsFindReplaceEsES from '@univerjs/preset-sheets-find-replace/locales/es-ES';
import '@univerjs/preset-sheets-find-replace/lib/index.css';

import { UniverSheetsDataValidationPreset } from '@univerjs/preset-sheets-data-validation';
import UniverPresetSheetsDataValidationEsES from '@univerjs/preset-sheets-data-validation/locales/es-ES';
import '@univerjs/preset-sheets-data-validation/lib/index.css';

import { UniverSheetsConditionalFormattingPreset } from '@univerjs/preset-sheets-conditional-formatting';
import UniverPresetSheetsConditionalFormattingEsES from '@univerjs/preset-sheets-conditional-formatting/locales/es-ES';
import '@univerjs/preset-sheets-conditional-formatting/lib/index.css';

import { supabase } from '@/lib/supabase/client';
import { ItemCotejo, Paquete, TipoEstadoItemCotejo } from '@/types';
import {
  ActiveCell,
  CellSelectionRange,
  SheetRow,
  SheetTemplateMode,
  SPREADSHEET_COLUMNS
} from '../types';
import { extractLast6Digits } from '../utils/codeFormatters';
import { formatEstadoAmexLabel } from '../hooks/useLiveSheetsData';

export interface UniverAmexSheetProps {
  activeHojaId: string;
  templateMode?: SheetTemplateMode;
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

const COTEJO_HEADERS = [
  'NOMBRE',
  'CODIGO WAREHOUSE',
  'CODIGO TIB',
  'CODIGO ESCANEADO',
  'ESTADO',
  'NOMBRE ESCANEADO'
];

const WR_LOOKUP_HEADERS = [
  'CODIGO WR',
  'NOMBRE CLIENTE',
  'TRACKING',
  'PESO (KG)',
  'UBICACIÓN',
  'ESTADO AMEX'
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
 * Construye las 6 celdas A..F de una fila para la plantilla Escáner WR Consulta BD (WR_LOOKUP)
 */
function buildLookupRowCells(row: {
  codigoWarehouse: string;
  nombre: string;
  codigoTib: string;
  pesoKg?: string;
  ubicacion?: string;
  estadoAmexLabel?: string;
  estado?: string;
}) {
  const isFound = row.estado === 'ENCONTRADO';
  const isNotFound = row.estado === 'NO ENCONTRADO';

  const statusStyle = isFound
    ? STYLE_SCAN_FOUND
    : isNotFound
    ? STYLE_SCAN_NOT_FOUND
    : STYLE_CELL_DEFAULT;

  return [
    { v: row.codigoWarehouse || '', p: null, s: statusStyle },
    { v: row.nombre || '', p: null, s: isFound ? STYLE_MANIFEST_FOUND : isNotFound ? STYLE_SCAN_NOT_FOUND : STYLE_CELL_DEFAULT },
    { v: row.codigoTib || '', p: null, s: isFound ? STYLE_TIB_NORMAL : STYLE_CELL_DEFAULT },
    { v: row.pesoKg || '', p: null, s: STYLE_CELL_DEFAULT },
    { v: row.ubicacion || '', p: null, s: isFound ? STYLE_MANIFEST_FOUND : STYLE_CELL_DEFAULT },
    { v: row.estadoAmexLabel || '', p: null, s: statusStyle }
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

function computeRowSignature(cells: Array<{ v: string; s: any }>): string {
  return cells.map(c => `${c.v ?? ''}§${c.s?.bg?.rgb ?? ''}`).join('|');
}

export default function UniverAmexSheet({
  activeHojaId,
  templateMode = 'COTEJO',
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
  const isLocalExtraEditRef = useRef<boolean>(false);
  const previousRowCountRef = useRef<number>(0);
  const rowSignaturesRef = useRef<string[]>([]);
  const dbSyncQueueRef = useRef<Promise<void>>(Promise.resolve());
  const inFlightDbOpsRef = useRef<number>(0);
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);

  // Interceptor de Ráfaga para Pistola Lectora USB/Bluetooth HID (0ms de pérdida de caracteres y soporte 5+ WRs/seg)
  const cursorCoordRef = useRef<{ row: number; col: number }>({
    row: templateMode === 'BLANK' ? 0 : 1,
    col: templateMode === 'COTEJO' ? 3 : 0
  });
  const isManualEditorOpenRef = useRef<boolean>(false);
  const liveScanBufferRef = useRef<string>('');
  const liveBufferStartCoordRef = useRef<{ row: number; col: number } | null>(null);
  const lastKeyTimeRef = useRef<number>(0);
  const rapidKeyStreakRef = useRef<number>(0);
  const burstAutoCommitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewRafRef = useRef<number | null>(null);
  const [liveBufferPreview, setLiveBufferPreview] = useState<{
    cellLabel: string;
    text: string;
  } | null>(null);

  // Índice O(1) de paquetes por WR y dígitos para consultas instantáneas (< 0.01ms)
  const paquetesByWrMap = useMemo(() => {
    const map = new Map<string, Paquete>();
    for (const p of paquetes) {
      if (!p.numeroReciboBodega) continue;
      const wrUpper = p.numeroReciboBodega.toUpperCase().replace(/\s+/g, '');
      if (!wrUpper) continue;
      map.set(wrUpper, p);
      map.set(`WR${wrUpper}`, p);
      const digits = wrUpper.replace(/^[A-Za-z]+0*/, '');
      if (digits) {
        if (!map.has(digits)) map.set(digits, p);
        if (!map.has(`WR${digits}`)) map.set(`WR${digits}`, p);
      }
    }
    return map;
  }, [paquetes]);

  const paquetesByWrMapRef = useRef<Map<string, Paquete>>(paquetesByWrMap);
  paquetesByWrMapRef.current = paquetesByWrMap;

  // Refs actualizadas para usar dentro de los listeners de Univer
  const templateModeRef = useRef<SheetTemplateMode>(templateMode);
  templateModeRef.current = templateMode;

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

  // Inicializar instancia de Univer cuando cambia activeHojaId o templateMode
  useEffect(() => {
    const hostEl = hostRef.current;
    if (!hostEl || !activeHojaId) return;

    const currentMode = templateModeRef.current;
    const isBlankMode = currentMode === 'BLANK';
    const isWrLookupMode = currentMode === 'WR_LOOKUP';
    const activeHeaders = isWrLookupMode ? WR_LOOKUP_HEADERS : COTEJO_HEADERS;

    const mountEl = document.createElement('div');
    mountEl.style.width = '100%';
    mountEl.style.height = '100%';
    hostEl.appendChild(mountEl);

    const initialCellData: Record<number, Record<number, any>> = {};

    if (!isBlankMode) {
      initialCellData[0] = {};
      activeHeaders.forEach((h, colIdx) => {
        initialCellData[0][colIdx] = {
          v: h,
          p: null,
          s: STYLE_HEADER
        };
      });

      const initialSigs: string[] = [];
      sheetRowsRef.current.forEach((row, idx) => {
        const r = idx + 1;
        const cells = isWrLookupMode ? buildLookupRowCells(row) : buildRowCells(row);
        initialSigs.push(computeRowSignature(cells));
        initialCellData[r] = {};
        cells.forEach((c, colIdx) => {
          initialCellData[r][colIdx] = c;
        });
      });
      rowSignaturesRef.current = initialSigs;
    } else {
      rowSignaturesRef.current = [];
    }

    Object.entries(extraCellsRef.current || {}).forEach(([key, val]) => {
      if (!val) return;
      const [colLetter, rowStr] = key.split('-');
      const colIdx = SPREADSHEET_COLUMNS.indexOf(colLetter as any);
      const rowNum = Number(rowStr);
      const minCol = isBlankMode ? 0 : 6;
      const minRow = isBlankMode ? 1 : 2;
      if (colIdx >= minCol && rowNum >= minRow) {
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
        [LocaleType.ES_ES]: mergeLocales(
          UniverPresetSheetsCoreEsES,
          UniverPresetSheetsFilterEsES,
          UniverPresetSheetsSortEsES,
          UniverPresetSheetsFindReplaceEsES,
          UniverPresetSheetsDataValidationEsES,
          UniverPresetSheetsConditionalFormattingEsES
        )
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
        }),
        UniverSheetsFilterPreset(),
        UniverSheetsSortPreset(),
        UniverSheetsFindReplacePreset(),
        UniverSheetsDataValidationPreset({
          showEditOnDropdown: true,
          showSearchOnDropdown: true
        }),
        UniverSheetsConditionalFormattingPreset()
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
          ...(isBlankMode
            ? {}
            : {
                freeze: {
                  xSplit: 0,
                  ySplit: 1,
                  startRow: 1,
                  startColumn: 0
                },
                rowData: {
                  0: { h: 30 }
                },
                columnData: isWrLookupMode
                  ? {
                      0: { w: 185 }, // A: CODIGO WR
                      1: { w: 245 }, // B: NOMBRE CLIENTE
                      2: { w: 185 }, // C: TRACKING
                      3: { w: 115 }, // D: PESO (KG)
                      4: { w: 140 }, // E: UBICACIÓN
                      5: { w: 165 }  // F: ESTADO AMEX
                    }
                  : {
                      0: { w: 235 }, // A: NOMBRE
                      1: { w: 175 }, // B: CODIGO WAREHOUSE
                      2: { w: 120 }, // C: CODIGO TIB
                      3: { w: 185 }, // D: CODIGO ESCANEADO
                      4: { w: 145 }, // E: ESTADO
                      5: { w: 235 }  // F: NOMBRE ESCANEADO
                    }
              }),
          cellData: initialCellData
        }
      }
    });

    // Posicionar cursor inicial en la primera celda de escaneo según la plantilla activa
    const initialRowZero = isBlankMode ? 0 : 1;
    const initialColZero = currentMode === 'COTEJO' ? 3 : 0;
    cursorCoordRef.current = { row: initialRowZero, col: initialColZero };
    isManualEditorOpenRef.current = false;
    liveScanBufferRef.current = '';
    liveBufferStartCoordRef.current = null;
    setLiveBufferPreview(null);

    try {
      const initSheet = univerAPI.getActiveWorkbook()?.getActiveSheet();
      const initRange = initSheet?.getRange(initialRowZero, initialColZero, 1, 1);
      if (initRange) {
        if (typeof initSheet?.setActiveSelection === 'function') {
          initSheet.setActiveSelection(initRange);
        } else if (typeof initRange.activate === 'function') {
          initRange.activate();
        }
      }
    } catch {
      // ignore initial selection
    }

    queueMicrotask(() => {
      isProgrammaticRef.current = false;
    });

    // Helper: Confirmar de inmediato el buffer capturado en memoria RAM hacia la celda objetivo y avanzar el cursor síncronamente
    const commitBufferedCell = (
      direction: 'DOWN' | 'RIGHT' | 'UP' | 'LEFT' | 'NONE' = 'DOWN'
    ) => {
      if (burstAutoCommitTimerRef.current) {
        clearTimeout(burstAutoCommitTimerRef.current);
        burstAutoCommitTimerRef.current = null;
      }
      if (previewRafRef.current) {
        cancelAnimationFrame(previewRafRef.current);
        previewRafRef.current = null;
      }

      const rawText = liveScanBufferRef.current;
      const target = liveBufferStartCoordRef.current || { ...cursorCoordRef.current };
      liveScanBufferRef.current = '';
      liveBufferStartCoordRef.current = null;
      rapidKeyStreakRef.current = 0;
      setLiveBufferPreview(null);

      if (!rawText) return;

      const minZeroRow = templateModeRef.current === 'BLANK' ? 0 : 1;
      let nextRow = target.row;
      let nextCol = target.col;
      if (direction === 'DOWN') nextRow = target.row + 1;
      else if (direction === 'UP') nextRow = Math.max(minZeroRow, target.row - 1);
      else if (direction === 'RIGHT') nextCol = Math.min(25, target.col + 1);
      else if (direction === 'LEFT') nextCol = Math.max(0, target.col - 1);

      // 1. AVANCE SÍNCRONO DEL CURSOR EN 0.001ms (antes de escribir en Univer o red)
      // Si el segundo disparo de la pistola entra 10ms o 300ms después, ya apunta a la siguiente fila sin pisar la anterior
      cursorCoordRef.current = { row: nextRow, col: nextCol };

      const activeWorkbook = univerAPI.getActiveWorkbook();
      const worksheet = activeWorkbook?.getActiveSheet();
      if (!worksheet) return;

      // 2. Escribir valor completo en la celda objetivo (dispara SheetValueChanged con el código 100% íntegro)
      const cellRange = worksheet.getRange(target.row, target.col, 1, 1);
      if (rawText.startsWith('=')) {
        cellRange.setValues([[{ f: rawText, p: null, s: STYLE_CELL_DEFAULT }]]);
      } else {
        cellRange.setValues([[{ v: rawText, p: null, s: STYLE_CELL_DEFAULT }]]);
      }

      // 3. Mover selección visual en el lienzo a la nueva coordenada del cursor
      if (direction !== 'NONE') {
        isProgrammaticRef.current = true;
        try {
          const nextRange = worksheet.getRange(
            cursorCoordRef.current.row,
            cursorCoordRef.current.col,
            1,
            1
          );
          if (typeof worksheet.setActiveSelection === 'function') {
            worksheet.setActiveSelection(nextRange);
          } else if (typeof nextRange?.activate === 'function') {
            nextRange.activate();
          }
          const colLetter =
            SPREADSHEET_COLUMNS[cursorCoordRef.current.col] ||
            (templateModeRef.current === 'COTEJO' ? 'D' : 'A');
          const rowNum1Based = cursorCoordRef.current.row + 1;
          setActiveCell(prev => ({
            ...prev,
            col: colLetter,
            row: rowNum1Based
          }));
          setSelectionRange({
            startCol: colLetter,
            startRow: rowNum1Based,
            endCol: colLetter,
            endRow: rowNum1Based
          });
          broadcastActiveCell(colLetter, rowNum1Based);
        } finally {
          queueMicrotask(() => {
            isProgrammaticRef.current = false;
          });
        }
      }
    };

    const schedulePreviewUpdate = () => {
      if (previewRafRef.current) return;
      previewRafRef.current = requestAnimationFrame(() => {
        previewRafRef.current = null;
        const txt = liveScanBufferRef.current;
        if (!txt) {
          setLiveBufferPreview(null);
          return;
        }
        const coord = liveBufferStartCoordRef.current || cursorCoordRef.current;
        const colLetter = SPREADSHEET_COLUMNS[coord.col] || 'A';
        setLiveBufferPreview({
          cellLabel: `${colLetter}${coord.row + 1}`,
          text: txt
        });
      });
    };

    // Listener de doble clic para permitir edición manual nativa de Univer cuando el usuario hace doble clic en una celda
    const handleHostDblClick = () => {
      if (liveScanBufferRef.current.length > 0) {
        commitBufferedCell('NONE');
      }
      isManualEditorOpenRef.current = true;
    };
    hostEl.addEventListener('dblclick', handleHostDblClick, true);

    // Interceptor en fase CAPTURE a nivel window: atrapa el 100% de los caracteres de la pistola en RAM (< 0.005ms)
    // evitando que Univer demore 30ms abriendo su pesado editor contenteditable y pierda las primeras letras
    const handleCaptureKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
          return;
        }
      }
      if (document.querySelector('[role="dialog"]')) {
        return;
      }

      // Si el usuario abrió manualmente el editor con doble clic, F2 o fórmula '='
      if (isManualEditorOpenRef.current) {
        if (e.key === 'Enter' || e.key === 'Escape' || e.key === 'Tab') {
          isManualEditorOpenRef.current = false;
        }
        return;
      }

      if (e.key === 'F2') {
        isManualEditorOpenRef.current = true;
        return;
      }

      // Si empieza con '=' y el buffer está vacío, dejar que Univer abra su editor nativo de fórmulas (=SUM, etc.)
      if (liveScanBufferRef.current === '' && e.key === '=' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        isManualEditorOpenRef.current = true;
        return;
      }

      // Ignorar combinaciones con Ctrl / Cmd / Alt (Ctrl+C, Ctrl+V, Ctrl+Z, Ctrl+F pasan directo a Univer)
      if (e.ctrlKey || e.metaKey || e.altKey) {
        return;
      }

      // A. Carácter imprimible (pistola lectora o teclado directo)
      if (e.key.length === 1) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        const now = performance.now();
        const dt = now - lastKeyTimeRef.current;
        lastKeyTimeRef.current = now;

        if (liveScanBufferRef.current === '') {
          liveBufferStartCoordRef.current = { ...cursorCoordRef.current };
          rapidKeyStreakRef.current = 1;
        } else if (dt < 45) {
          rapidKeyStreakRef.current += 1;
        } else {
          rapidKeyStreakRef.current = 1;
        }

        liveScanBufferRef.current += e.key;
        schedulePreviewUpdate();

        // Si se detecta ráfaga de hardware (>= 6 teclas a < 45ms), activar auto-commit de respaldo (85ms)
        // por si la pistola no envía Enter al final; si envía Enter a los 2ms, Enter lo confirma en 0ms.
        if (burstAutoCommitTimerRef.current) {
          clearTimeout(burstAutoCommitTimerRef.current);
          burstAutoCommitTimerRef.current = null;
        }
        if (rapidKeyStreakRef.current >= 6) {
          burstAutoCommitTimerRef.current = setTimeout(() => {
            commitBufferedCell('DOWN');
          }, 85);
        }
        return;
      }

      // B. Teclas de control cuando hay texto en el buffer instantáneo
      if (liveScanBufferRef.current.length > 0) {
        if (e.key === 'Backspace') {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          liveScanBufferRef.current = liveScanBufferRef.current.slice(0, -1);
          if (liveScanBufferRef.current.length === 0) {
            liveBufferStartCoordRef.current = null;
            setLiveBufferPreview(null);
          } else {
            schedulePreviewUpdate();
          }
          return;
        }

        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          if (burstAutoCommitTimerRef.current) {
            clearTimeout(burstAutoCommitTimerRef.current);
            burstAutoCommitTimerRef.current = null;
          }
          liveScanBufferRef.current = '';
          liveBufferStartCoordRef.current = null;
          rapidKeyStreakRef.current = 0;
          setLiveBufferPreview(null);
          return;
        }

        if (e.key === 'Enter' || e.key === 'ArrowDown') {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          commitBufferedCell('DOWN');
          return;
        }

        if (e.key === 'Tab' || e.key === 'ArrowRight') {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          commitBufferedCell('RIGHT');
          return;
        }

        if (e.key === 'ArrowUp') {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          commitBufferedCell('UP');
          return;
        }

        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          commitBufferedCell('LEFT');
          return;
        }
      }
    };

    window.addEventListener('keydown', handleCaptureKeyDown, true);

    // Listener de selección
    const selectionDisp = univerAPI.addEvent(
      univerAPI.Event.SelectionChanged,
      (params: any) => {
        const selections = params?.selections;
        if (!selections || selections.length === 0) return;
        const sel = selections[0];
        const minRowAllowed = templateModeRef.current === 'BLANK' ? 1 : 2;
        const startColIdx = Math.max(0, Math.min(25, sel.startColumn ?? 0));
        const endColIdx = Math.max(0, Math.min(25, sel.endColumn ?? startColIdx));
        const startRowNum = Math.max(minRowAllowed, (sel.startRow ?? (minRowAllowed - 1)) + 1);
        const endRowNum = Math.max(minRowAllowed, (sel.endRow ?? sel.startRow ?? (minRowAllowed - 1)) + 1);

        // Si el usuario cambió de celda manualmente con el mouse y había texto pendiente en el buffer, guardarlo
        if (!isProgrammaticRef.current) {
          if (liveScanBufferRef.current.length > 0) {
            commitBufferedCell('NONE');
          }
          cursorCoordRef.current = {
            row: startRowNum - 1,
            col: startColIdx
          };
          isManualEditorOpenRef.current = false;
        }

        const defaultCol = templateModeRef.current === 'COTEJO' ? 'D' : 'A';
        const startCol = SPREADSHEET_COLUMNS[startColIdx] || defaultCol;
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

        const liveMode = templateModeRef.current;

        // MODO 1: PLANTILLA EN BLANCO (100% libre desde Fila 1 y Columna A hasta Z)
        if (liveMode === 'BLANK') {
          const blankCoords = new Map<string, { r: number; c: number }>();

          for (const fRange of effectedRanges) {
            const startR = fRange.getRow();
            const startC = fRange.getColumn();
            const height = fRange.getHeight();
            const width = fRange.getWidth();
            for (let r = startR; r < startR + height; r++) {
              if (r < 0) continue;
              for (let c = startC; c < startC + width; c++) {
                if (c >= 0 && c < 26) {
                  blankCoords.set(`${r}-${c}`, { r, c });
                }
              }
            }
          }

          const rawMatrix = params?.payload?.params?.cellValue;
          if (rawMatrix && typeof rawMatrix === 'object') {
            for (const rKey of Object.keys(rawMatrix)) {
              const r = Number(rKey);
              if (isNaN(r) || r < 0) continue;
              const rowObj = rawMatrix[rKey];
              if (rowObj && typeof rowObj === 'object') {
                for (const cKey of Object.keys(rowObj)) {
                  const c = Number(cKey);
                  if (isNaN(c) || c < 0 || c >= 26) continue;
                  blankCoords.set(`${r}-${c}`, { r, c });
                }
              }
            }
          }

          if (blankCoords.size > 0) {
            const nextExtra = { ...extraCellsRef.current };
            for (const { r, c } of blankCoords.values()) {
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
            isLocalExtraEditRef.current = true;
            extraCellsRef.current = nextExtra;
            setExtraCells(nextExtra);
            void persistExtraCellsRef.current(nextExtra);
          }
          return;
        }

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

        // Proteger la fila 1 de encabezados fijos según el modo activo
        if (touchedHeaderRow) {
          const headersToRestore = liveMode === 'WR_LOOKUP' ? WR_LOOKUP_HEADERS : COTEJO_HEADERS;
          isProgrammaticRef.current = true;
          try {
            const headerRange = worksheet.getRange(0, 0, 1, 6);
            headerRange.setValues([
              headersToRestore.map(h => ({ v: h, p: null, s: STYLE_HEADER }))
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

        // Leer la región activa de filas usando directamente getValues() + cleanCellText (extrae tanto cell.v como rich-text cell.p en < 0.1ms sin el costo de getDisplayValues)
        const totalRowsToInspect = Math.max(itemsRef.current.length, maxTouchedRow);
        if (totalRowsToInspect <= 0) return;

        const fullRange = worksheet.getRange(1, 0, totalRowsToInspect, 6);
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
          const vRow = rawGrid[i] || [];
          gridRows.push({
            r: i + 1,
            itemIdx: i,
            rawA: cleanCellText(vRow[0]),
            rawB: cleanCellText(vRow[1]),
            rawC: cleanCellText(vRow[2]),
            rawD: cleanCellText(vRow[3]),
            rawE: cleanCellText(vRow[4]),
            rawF: cleanCellText(vRow[5])
          });
        }

        let feedbackPlayed = false;
        const reconciledCellsMatrix: any[][] = [];

        interface ReconciledRowData {
          itemIdx: number;
          consignatario: string;
          codigoWr: string;
          casillero: string;
          tracking: string;
          pesoKg: number;
          posicionEstante: string;
          estado: TipoEstadoItemCotejo;
          displayEstado: 'ENCONTRADO' | 'NO ENCONTRADO' | '';
          notas: string;
          isManifestFound: boolean;
          scanChangedInThisEvent: boolean;
        }

        const reconciledRows: ReconciledRowData[] = [];

        // MODO 3: ESCÁNER WR CONSULTA BD (escribe en Columna A y rellena B..F con datos de paquetes en O(1))
        if (liveMode === 'WR_LOOKUP') {
          const pkgMap = paquetesByWrMapRef.current;

          for (let i = 0; i < gridRows.length; i++) {
            const gr = gridRows[i];
            const existingItem = itemsRef.current[i];

            const prevWrClean = (existingItem?.codigoWr || '').trim().toUpperCase().replace(/\s+/g, '');
            const currentAClean = gr.rawA.toUpperCase().replace(/\s+/g, '');
            const currentADigits = currentAClean.replace(/^[A-Za-z]+0*/, '');

            const scanChangedInThisEvent =
              touchedRowsInThisEvent.has(gr.r) &&
              touchedColsInThisEvent.has(0) &&
              currentAClean !== prevWrClean;

            if (currentAClean) {
              const dbPkg =
                pkgMap.get(currentAClean) ||
                pkgMap.get(`WR${currentAClean}`) ||
                (currentADigits ? pkgMap.get(currentADigits) : undefined);

              const isFound = !!dbPkg;
              const resolvedWr = dbPkg?.numeroReciboBodega?.toUpperCase() || currentAClean;
              const resolvedClient = (dbPkg?.nombreConsignatario || '').trim();
              const hasValidClient =
                !!resolvedClient &&
                resolvedClient !== '[NOMBRE]' &&
                resolvedClient !== 'CLIENTE AMEX' &&
                resolvedClient !== 'NO ASIGNADO';

              if (scanChangedInThisEvent && !feedbackPlayed) {
                feedbackPlayed = true;
                playScanFeedbackRef.current(isFound, hasValidClient, resolvedClient);
              }

              const displayClient = isFound ? (resolvedClient || 'CLIENTE AMEX') : 'NO ENCONTRADO EN BD';
              const displayTracking = isFound ? (dbPkg?.tracking || '—').trim() : '—';
              const displayPesoNum = isFound ? Number(dbPkg?.pesoKg || 0) : 0;
              const displayPesoStr = isFound ? String(displayPesoNum) : '—';
              const displayUbicacion = isFound
                ? dbPkg?.posicionEstante ||
                  (dbPkg?.anaquel && dbPkg?.piso ? `${dbPkg.anaquel}-${dbPkg.piso}` : dbPkg?.anaquel) ||
                  '—'
                : '—';
              const displayEstadoAmex = isFound
                ? formatEstadoAmexLabel(dbPkg?.estadoAmex, dbPkg?.ubicacionActual)
                : 'NO REGISTRADO';
              const rowEstado: TipoEstadoItemCotejo = isFound ? 'ESCANEADO' : 'NO_LISTADO';
              const displayEstado: 'ENCONTRADO' | 'NO ENCONTRADO' = isFound ? 'ENCONTRADO' : 'NO ENCONTRADO';

              reconciledRows.push({
                itemIdx: i,
                consignatario: displayClient,
                codigoWr: resolvedWr,
                casillero: currentADigits || extractLast6Digits(resolvedWr),
                tracking: displayTracking,
                pesoKg: displayPesoNum,
                posicionEstante: displayUbicacion === '—' ? 'REC' : displayUbicacion,
                estado: rowEstado,
                displayEstado,
                notas: displayEstadoAmex,
                isManifestFound: isFound,
                scanChangedInThisEvent
              });

              reconciledCellsMatrix.push(
                buildLookupRowCells({
                  codigoWarehouse: resolvedWr,
                  nombre: displayClient,
                  codigoTib: displayTracking,
                  pesoKg: displayPesoStr,
                  ubicacion: displayUbicacion,
                  estadoAmexLabel: displayEstadoAmex,
                  estado: displayEstado
                })
              );
            } else {
              reconciledRows.push({
                itemIdx: i,
                consignatario: '',
                codigoWr: '',
                casillero: '',
                tracking: '',
                pesoKg: 0,
                posicionEstante: 'REC',
                estado: 'PENDIENTE',
                displayEstado: '',
                notas: '',
                isManifestFound: false,
                scanChangedInThisEvent
              });

              reconciledCellsMatrix.push(
                buildLookupRowCells({
                  codigoWarehouse: '',
                  nombre: '',
                  codigoTib: '',
                  pesoKg: '',
                  ubicacion: '',
                  estadoAmexLabel: '',
                  estado: ''
                })
              );
            }
          }
        } else {
          // MODO 2: HOJA DE COTEJO (Compara Columna D contra Columnas B/C y nombre de Columna A en O(1))
          let runningGroupName = '';
          interface ManifestEntry {
            itemIdx: number;
            effectiveConsignee: string;
            rawConsignee: string;
            wrClean: string;
            wrDigits: string;
            tibClean: string;
          }
          const liveManifest: ManifestEntry[] = [];
          const manifestLookupMap = new Map<string, ManifestEntry>();

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

            const entry: ManifestEntry = {
              itemIdx: gr.itemIdx,
              effectiveConsignee,
              rawConsignee,
              wrClean,
              wrDigits,
              tibClean
            };
            liveManifest.push(entry);

            if (wrClean) {
              if (!manifestLookupMap.has(wrClean)) manifestLookupMap.set(wrClean, entry);
              if (!manifestLookupMap.has(`WR${wrClean}`)) manifestLookupMap.set(`WR${wrClean}`, entry);
              if (wrDigits && !manifestLookupMap.has(wrDigits)) manifestLookupMap.set(wrDigits, entry);
            }
            if (tibClean && !manifestLookupMap.has(tibClean)) {
              manifestLookupMap.set(tibClean, entry);
            }
          }

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

          const matchAgainstLiveSheet = (scanText: string) => {
            const cleanCode = scanText.toUpperCase().replace(/\s+/g, '');
            const cleanDigits = cleanCode.replace(/^[A-Za-z]+0*/, '');

            const manifestEntry =
              manifestLookupMap.get(cleanCode) ||
              manifestLookupMap.get(`WR${cleanCode}`) ||
              (cleanDigits ? manifestLookupMap.get(cleanDigits) : undefined);

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
              pesoKg: existingItem?.pesoKg || 0,
              posicionEstante: existingItem?.posicionEstante || 'REC',
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
        }

        // Pintar selectivamente solo las filas que cambiaron (diffing O(1) para fluidez instantánea)
        isProgrammaticRef.current = true;
        try {
          const prevSigs = rowSignaturesRef.current;
          const nextSigs: string[] = new Array(reconciledCellsMatrix.length);
          const changedRowIndices: number[] = [];

          for (let i = 0; i < reconciledCellsMatrix.length; i++) {
            const sig = computeRowSignature(reconciledCellsMatrix[i]);
            nextSigs[i] = sig;
            if (prevSigs[i] !== sig || touchedRowsInThisEvent.has(i + 1)) {
              changedRowIndices.push(i);
            }
          }

          if (changedRowIndices.length > 0) {
            if (changedRowIndices.length <= 6) {
              for (const rowIdx of changedRowIndices) {
                worksheet.getRange(rowIdx + 1, 0, 1, 6).setValues([reconciledCellsMatrix[rowIdx]]);
              }
            } else {
              const minIdx = changedRowIndices[0];
              const maxIdx = changedRowIndices[changedRowIndices.length - 1];
              const sliceLen = maxIdx - minIdx + 1;
              worksheet
                .getRange(minIdx + 1, 0, sliceLen, 6)
                .setValues(reconciledCellsMatrix.slice(minIdx, maxIdx + 1));
            }
          }

          rowSignaturesRef.current = nextSigs;
          previousRowCountRef.current = reconciledCellsMatrix.length;

          // Auto-avance a la fila inferior cuando se pistolea/da Enter en 1 sola celda de escaneo (Col A en WR_LOOKUP, Col D en COTEJO)
          const targetScanCol = liveMode === 'WR_LOOKUP' ? 0 : 3;
          if (
            touchedColsInThisEvent.size === 1 &&
            touchedColsInThisEvent.has(targetScanCol) &&
            touchedRowsInThisEvent.size === 1
          ) {
            const [singleTouchedRow] = Array.from(touchedRowsInThisEvent);
            const recRow = reconciledRows[singleTouchedRow - 1];
            const hasScanText = liveMode === 'WR_LOOKUP' ? !!recRow?.codigoWr : !!recRow?.tracking;
            if (hasScanText) {
              const nextZeroRow = Math.max(cursorCoordRef.current.row, singleTouchedRow + 1);
              cursorCoordRef.current = { row: nextZeroRow, col: targetScanCol };
              const nextRange = worksheet.getRange(nextZeroRow, targetScanCol, 1, 1);
              if (typeof worksheet.setActiveSelection === 'function') {
                worksheet.setActiveSelection(nextRange);
              } else if (typeof nextRange?.activate === 'function') {
                nextRange.activate();
              }
            }
          }
        } finally {
          queueMicrotask(() => {
            isProgrammaticRef.current = false;
          });
        }

        // 3. Actualización OPTIMISTA SÍNCRONA en memoria (0ms) + Cola secuencial hacia Supabase
        // Garantiza que si se escanean 2 o 5 WRs en 1 segundo, el 2.º disparo ya vea el 1.º en itemsRef.current sin esperar a la red
        const currentHojaId = activeHojaIdRef.current;
        const currentOperator = operatorNameRef.current;
        const syncNowIso = new Date().toISOString();
        const prevItemsSnapshot = [...itemsRef.current];
        const optimisticNextItems: ItemCotejo[] = [...prevItemsSnapshot];

        interface PendingRowDbOp {
          itemIdx: number;
          tempOrRealId: string;
          consignatario: string;
          codigoWr: string;
          casillero: string;
          tracking: string;
          pesoKg: number;
          posicionEstante: string;
          notas: string;
          estado: TipoEstadoItemCotejo;
          vecesEscaneado: number;
          escaneadoEn: string | null;
          escaneadoPor: string | null;
          orden: number;
          actualizadoEn: string;
        }

        const pendingDbOps: PendingRowDbOp[] = [];

        for (const rec of reconciledRows) {
          const existing = prevItemsSnapshot[rec.itemIdx];
          if (existing) {
            const changed =
              (existing.consignatario || '') !== rec.consignatario ||
              (existing.codigoWr || '') !== rec.codigoWr ||
              (existing.casillero || '') !== rec.casillero ||
              (existing.tracking || '') !== rec.tracking ||
              Number(existing.pesoKg || 0) !== Number(rec.pesoKg || 0) ||
              (existing.posicionEstante || 'REC') !== (rec.posicionEstante || 'REC') ||
              (existing.notas || '') !== rec.notas ||
              existing.estado !== rec.estado;

            if (changed) {
              const hasScanVal = liveMode === 'WR_LOOKUP' ? !!rec.codigoWr : !!rec.tracking;
              const nextVeces = rec.scanChangedInThisEvent
                ? hasScanVal
                  ? (existing.vecesEscaneado || 0) + 1
                  : 0
                : existing.vecesEscaneado || 0;
              const nextEscaneadoEn = rec.scanChangedInThisEvent
                ? hasScanVal
                  ? syncNowIso
                  : null
                : existing.escaneadoEn || null;
              const nextEscaneadoPor = rec.scanChangedInThisEvent
                ? hasScanVal
                  ? currentOperator
                  : null
                : existing.escaneadoPor || null;
              const rowOrder = existing.orden || rec.itemIdx + 1;

              optimisticNextItems[rec.itemIdx] = {
                ...existing,
                consignatario: rec.consignatario,
                codigoWr: rec.codigoWr,
                casillero: rec.casillero,
                tracking: rec.tracking,
                pesoKg: rec.pesoKg,
                posicionEstante: rec.posicionEstante,
                notas: rec.notas,
                estado: rec.estado,
                vecesEscaneado: nextVeces,
                escaneadoEn: nextEscaneadoEn || undefined,
                escaneadoPor: nextEscaneadoPor || undefined,
                orden: rowOrder,
                actualizadoEn: syncNowIso
              };

              pendingDbOps.push({
                itemIdx: rec.itemIdx,
                tempOrRealId: existing.id,
                consignatario: rec.consignatario,
                codigoWr: rec.codigoWr,
                casillero: rec.casillero,
                tracking: rec.tracking,
                pesoKg: rec.pesoKg,
                posicionEstante: rec.posicionEstante || 'REC',
                notas: rec.notas,
                estado: rec.estado,
                vecesEscaneado: nextVeces,
                escaneadoEn: nextEscaneadoEn,
                escaneadoPor: nextEscaneadoPor,
                orden: rowOrder,
                actualizadoEn: syncNowIso
              });
            }
          } else {
            const hasAnyDataFromHere = reconciledRows
              .slice(rec.itemIdx)
              .some(r => r.consignatario || r.codigoWr || r.tracking || r.notas);

            if (hasAnyDataFromHere) {
              const hasScanVal = liveMode === 'WR_LOOKUP' ? !!rec.codigoWr : !!rec.tracking;
              const rowOrder = rec.itemIdx + 1;
              const tempId = `temp-row-${rowOrder}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
              const nextVeces = hasScanVal ? 1 : 0;
              const nextEscaneadoEn = hasScanVal ? syncNowIso : null;
              const nextEscaneadoPor = hasScanVal ? currentOperator : null;

              optimisticNextItems[rec.itemIdx] = {
                id: tempId,
                hojaId: currentHojaId,
                consignatario: rec.consignatario,
                codigoWr: rec.codigoWr,
                casillero: rec.casillero,
                tracking: rec.tracking,
                pesoKg: rec.pesoKg || 0,
                posicionEstante: rec.posicionEstante || 'REC',
                notas: rec.notas,
                estado: rec.estado,
                vecesEscaneado: nextVeces,
                escaneadoEn: nextEscaneadoEn || undefined,
                escaneadoPor: nextEscaneadoPor || undefined,
                orden: rowOrder,
                creadoEn: syncNowIso,
                actualizadoEn: syncNowIso
              };

              pendingDbOps.push({
                itemIdx: rec.itemIdx,
                tempOrRealId: tempId,
                consignatario: rec.consignatario,
                codigoWr: rec.codigoWr,
                casillero: rec.casillero,
                tracking: rec.tracking,
                pesoKg: rec.pesoKg || 0,
                posicionEstante: rec.posicionEstante || 'REC',
                notas: rec.notas,
                estado: rec.estado,
                vecesEscaneado: nextVeces,
                escaneadoEn: nextEscaneadoEn,
                escaneadoPor: nextEscaneadoPor,
                orden: rowOrder,
                actualizadoEn: syncNowIso
              });
            }
          }
        }

        if (pendingDbOps.length === 0) return;

        // Actualizar itemsRef.current y estado de React inmediatamente (0ms)
        itemsRef.current = optimisticNextItems;
        setItems(optimisticNextItems);

        inFlightDbOpsRef.current += 1;
        setIsSyncingCloud(true);

        dbSyncQueueRef.current = dbSyncQueueRef.current
          .then(async () => {
            const upsertBatch: Array<Record<string, any>> = [];
            const newPayloads: Array<Record<string, any>> = [];

            for (const op of pendingDbOps) {
              // Verificar si una tarea anterior de la cola ya convirtió el temp-id en un UUID real de Supabase
              const latestItemAtIdx = itemsRef.current[op.itemIdx];
              const resolvedId =
                latestItemAtIdx && !latestItemAtIdx.id.startsWith('temp-')
                  ? latestItemAtIdx.id
                  : !op.tempOrRealId.startsWith('temp-')
                  ? op.tempOrRealId
                  : null;

              if (resolvedId) {
                upsertBatch.push({
                  id: resolvedId,
                  hoja_id: currentHojaId,
                  consignatario: op.consignatario,
                  codigo_wr: op.codigoWr,
                  casillero: op.casillero,
                  tracking: op.tracking || null,
                  peso_kg: op.pesoKg || 0,
                  posicion_estante: op.posicionEstante || 'REC',
                  notas: op.notas || null,
                  estado: op.estado,
                  veces_escaneado: op.vecesEscaneado,
                  escaneado_en: op.escaneadoEn,
                  escaneado_por: op.escaneadoPor,
                  orden: op.orden,
                  actualizado_en: op.actualizadoEn
                });
              } else {
                newPayloads.push({
                  hoja_id: currentHojaId,
                  consignatario: op.consignatario,
                  codigo_wr: op.codigoWr,
                  casillero: op.casillero,
                  tracking: op.tracking || null,
                  peso_kg: op.pesoKg || 0,
                  posicion_estante: op.posicionEstante || 'REC',
                  notas: op.notas || null,
                  estado: op.estado,
                  veces_escaneado: op.vecesEscaneado,
                  escaneado_en: op.escaneadoEn,
                  escaneado_por: op.escaneadoPor,
                  orden: op.orden
                });
              }
            }

            if (upsertBatch.length > 0) {
              await supabase.from('hojas_cotejo_items').upsert(upsertBatch, { onConflict: 'id' });
            }

            if (newPayloads.length > 0) {
              const { data: inserted } = await supabase
                .from('hojas_cotejo_items')
                .insert(newPayloads)
                .select();

              if (inserted && inserted.length > 0) {
                const insertedByOrder = new Map<number, any>();
                for (const row of inserted) {
                  if (typeof row.orden === 'number') {
                    insertedByOrder.set(row.orden, row);
                  }
                }

                setItems(prev => {
                  const next = prev.map((it, idx) => {
                    const orderNum = it.orden || idx + 1;
                    const dbRow = insertedByOrder.get(orderNum);
                    if (dbRow && it.id.startsWith('temp-')) {
                      return {
                        ...it,
                        id: dbRow.id,
                        creadoEn: dbRow.creado_en || it.creadoEn,
                        actualizadoEn: dbRow.actualizado_en || it.actualizadoEn
                      };
                    }
                    return it;
                  });
                  itemsRef.current = next;
                  return next;
                });
              }
            }
          })
          .catch(err => {
            console.error('[UniverAmexSheet] Error en cola de sincronización:', err);
          })
          .finally(() => {
            inFlightDbOpsRef.current = Math.max(0, inFlightDbOpsRef.current - 1);
            if (inFlightDbOpsRef.current === 0) {
              setIsSyncingCloud(false);
            }
          });
      }
    );

    return () => {
      window.removeEventListener('keydown', handleCaptureKeyDown, true);
      hostEl.removeEventListener('dblclick', handleHostDblClick, true);
      if (burstAutoCommitTimerRef.current) {
        clearTimeout(burstAutoCommitTimerRef.current);
        burstAutoCommitTimerRef.current = null;
      }
      if (previewRafRef.current) {
        cancelAnimationFrame(previewRafRef.current);
        previewRafRef.current = null;
      }
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
  }, [activeHojaId, templateMode]);

  // Sincronizar extraCells en modo BLANK solo cuando provienen de una carga inicial/remota (no del propio teclado local)
  useEffect(() => {
    if (templateMode !== 'BLANK') return;
    if (isLocalExtraEditRef.current) {
      isLocalExtraEditRef.current = false;
      return;
    }
    const univerAPI = univerAPIRef.current;
    if (!univerAPI) return;
    const activeWorkbook = univerAPI.getActiveWorkbook();
    const worksheet = activeWorkbook?.getActiveSheet();
    if (!worksheet) return;

    isProgrammaticRef.current = true;
    try {
      Object.entries(extraCells || {}).forEach(([key, val]) => {
        if (!val) return;
        const [colLetter, rowStr] = key.split('-');
        const colIdx = SPREADSHEET_COLUMNS.indexOf(colLetter as any);
        const rowNum = Number(rowStr);
        if (colIdx >= 0 && rowNum >= 1) {
          const cellRange = worksheet.getRange(rowNum - 1, colIdx, 1, 1);
          if (String(val).startsWith('=')) {
            cellRange.setValues([[{ f: String(val), p: null, s: STYLE_CELL_DEFAULT }]]);
          } else {
            cellRange.setValues([[{ v: String(val), p: null, s: STYLE_CELL_DEFAULT }]]);
          }
        }
      });
    } catch (err) {
      console.error('[UniverAmexSheet] Error sincronizando extraCells en modo BLANK:', err);
    } finally {
      queueMicrotask(() => {
        isProgrammaticRef.current = false;
      });
    }
  }, [extraCells, templateMode]);

  // Sincronizar cambios externos de sheetRows (pistola superior, modales, Reiniciar, Realtime) usando diffing por fila
  useEffect(() => {
    if (templateMode === 'BLANK') return;
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
      const prevSigs = rowSignaturesRef.current;
      const nextSigs: string[] = new Array(currentLen);

      if (currentLen > 0) {
        const matrix = sheetRows.map(r =>
          templateMode === 'WR_LOOKUP' ? buildLookupRowCells(r) : buildRowCells(r)
        );
        const changedIndices: number[] = [];
        for (let i = 0; i < currentLen; i++) {
          const sig = computeRowSignature(matrix[i]);
          nextSigs[i] = sig;
          if (prevSigs[i] !== sig) {
            changedIndices.push(i);
          }
        }

        if (changedIndices.length > 0) {
          if (changedIndices.length <= 6) {
            for (const idx of changedIndices) {
              worksheet.getRange(idx + 1, 0, 1, 6).setValues([matrix[idx]]);
            }
          } else {
            const minIdx = changedIndices[0];
            const maxIdx = changedIndices[changedIndices.length - 1];
            worksheet
              .getRange(minIdx + 1, 0, maxIdx - minIdx + 1, 6)
              .setValues(matrix.slice(minIdx, maxIdx + 1));
          }
        }
      }

      if (prevLen > currentLen) {
        const diff = prevLen - currentLen;
        const emptyMatrix = Array.from({ length: diff }, () =>
          Array.from({ length: 6 }, () => ({ v: '', p: null, s: STYLE_CELL_DEFAULT }))
        );
        const clearRange = worksheet.getRange(currentLen + 1, 0, diff, 6);
        clearRange.setValues(emptyMatrix);
      }

      rowSignaturesRef.current = nextSigs;
      previousRowCountRef.current = currentLen;
    } catch (err) {
      console.error('[UniverAmexSheet] Error sincronizando filas con Univer:', err);
    } finally {
      queueMicrotask(() => {
        isProgrammaticRef.current = false;
      });
    }
  }, [sheetRows, templateMode]);

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
      {liveBufferPreview && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 45,
            background: '#0f172a',
            color: '#f8fafc',
            fontSize: '12px',
            fontWeight: 700,
            padding: '5px 14px',
            borderRadius: '999px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.25)',
            border: '1px solid #38bdf8',
            pointerEvents: 'none'
          }}
        >
          <span style={{ color: '#38bdf8' }}>⚡ {liveBufferPreview.cellLabel}:</span>
          <span style={{ fontFamily: 'monospace', letterSpacing: '0.5px' }}>
            {liveBufferPreview.text}
          </span>
        </div>
      )}
      {(isLoadingItems || isSyncingCloud) && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            right: 16,
            zIndex: 40,
            background: isSyncingCloud ? 'rgba(3, 105, 161, 0.9)' : 'rgba(15, 23, 42, 0.85)',
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
          <span>{isSyncingCloud ? 'Guardando en la nube...' : 'Sincronizando hoja...'}</span>
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
