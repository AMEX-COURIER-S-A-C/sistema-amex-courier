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
    isDuplicate: boolean;
    clientName: string;
    hasValidName: boolean;
    resolvedName: string;
  };
  playScanFeedback: (
    isMatch: boolean,
    hasValidName: boolean,
    clientName: string,
    isDuplicate?: boolean
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

function buildRowCells(row: SheetRow) {
  const isManifestFound = !!row.isManifestFound;
  const isScanFound = row.estado === 'ENCONTRADO';
  const isScanNotFound = row.estado === 'NO ENCONTRADO';

  const scanStyle = isScanFound
    ? STYLE_SCAN_FOUND
    : isScanNotFound
    ? STYLE_SCAN_NOT_FOUND
    : STYLE_CELL_DEFAULT;

  return [
    { v: row.nombre || '', s: STYLE_CELL_DEFAULT },
    {
      v: row.codigoWarehouse || '',
      s: isManifestFound ? STYLE_MANIFEST_FOUND : STYLE_MANIFEST_NORMAL
    },
    {
      v: row.codigoTib || '',
      s: isManifestFound ? STYLE_MANIFEST_FOUND : STYLE_TIB_NORMAL
    },
    { v: row.codigoEscaneado || '', s: scanStyle },
    { v: row.estado || '', s: scanStyle },
    { v: row.nombreEscaneado || '', s: STYLE_CELL_DEFAULT }
  ];
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
  resolveScannedCodeMatch,
  playScanFeedback,
  setActiveCell,
  setSelectionRange,
  broadcastActiveCell
}: UniverAmexSheetProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const univerAPIRef = useRef<any>(null);
  const isProgrammaticRef = useRef<boolean>(false);
  const previousRowCountRef = useRef<number>(0);

  // Refs actualizadas para usar dentro de los listeners de Univer sin recrear la instancia
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

  const resolveScannedCodeMatchRef = useRef(resolveScannedCodeMatch);
  resolveScannedCodeMatchRef.current = resolveScannedCodeMatch;

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
        s: STYLE_HEADER
      };
    });

    // Poblar filas iniciales si ya están cargadas
    sheetRowsRef.current.forEach((row, idx) => {
      const r = idx + 1;
      const cells = buildRowCells(row);
      initialCellData[r] = {};
      cells.forEach((c, colIdx) => {
        initialCellData[r][colIdx] = c;
      });
    });

    // Poblar celdas extra (G..Z o filas libres)
    Object.entries(extraCellsRef.current || {}).forEach(([key, val]) => {
      if (!val) return;
      const [colLetter, rowStr] = key.split('-');
      const colIdx = SPREADSHEET_COLUMNS.indexOf(colLetter as any);
      const rowNum = Number(rowStr);
      if (colIdx >= 6 && rowNum >= 2) {
        const r = rowNum - 1;
        if (!initialCellData[r]) initialCellData[r] = {};
        if (String(val).startsWith('=')) {
          initialCellData[r][colIdx] = { f: String(val), s: STYLE_CELL_DEFAULT };
        } else {
          initialCellData[r][colIdx] = { v: String(val), s: STYLE_CELL_DEFAULT };
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
          footer: false
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

    // Listener de selección para actualizar estadísticas (Suma, Promedio, Recuento) y presencia
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

    // Listener de cambios de valor en celdas (edición directa, pegado Ctrl+V, suprimir Delete, deshacer Ctrl+Z)
    const valueChangeDisp = univerAPI.addEvent(
      univerAPI.Event.SheetValueChanged,
      async (params: any) => {
        if (isProgrammaticRef.current) return;

        const effectedRanges: any[] = params?.effectedRanges || [];
        if (effectedRanges.length === 0) return;

        const activeWorkbook = univerAPI.getActiveWorkbook();
        const worksheet = activeWorkbook?.getActiveSheet();
        if (!worksheet) return;

        const touchedDataRows = new Set<number>();
        let touchedHeaderRow = false;
        const touchedExtraCoords: Array<{ r: number; c: number }> = [];

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
            for (let c = startC; c < startC + width; c++) {
              if (c < 6) {
                touchedDataRows.add(r);
              } else if (c < 26) {
                touchedExtraCoords.push({ r, c });
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
              FIXED_HEADERS.map(h => ({ v: h, s: STYLE_HEADER }))
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
            const rawVal = cellRange.getValue?.();
            const finalStr = formula ? formula : rawVal !== null && rawVal !== undefined ? String(rawVal).trim() : '';
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

        if (touchedDataRows.size === 0) return;

        const sortedRows = Array.from(touchedDataRows).sort((a, b) => a - b);
        const currentItems = [...itemsRef.current];
        const currentHojaId = activeHojaIdRef.current;
        const nowIso = new Date().toISOString();

        const dbUpdates: Array<{ id: string; patch: Record<string, any> }> = [];
        const newDbRows: Array<{
          rowIndex: number;
          payload: Record<string, any>;
        }> = [];
        const updatedItemsMap = new Map<string, ItemCotejo>();

        let feedbackTriggered = false;
        const seenScansInBatch = new Set<string>();

        for (const r of sortedRows) {
          const itemIdx = r - 1;
          const rowRange = worksheet.getRange(r, 0, 1, 6);
          const rowVals = rowRange.getValues()?.[0] || [];

          const rawA = String(rowVals[0] ?? '').trim();
          const rawB = String(rowVals[1] ?? '').trim();
          const rawD = String(rowVals[3] ?? '').trim();
          const rawE = String(rowVals[4] ?? '').trim();
          const rawF = String(rowVals[5] ?? '').trim();

          const existing = itemIdx >= 0 && itemIdx < currentItems.length ? currentItems[itemIdx] : undefined;

          if (existing) {
            const prevA = (existing.consignatario || '').trim();
            const prevB = (existing.codigoWr || '').trim();
            const prevD = (existing.tracking || '').trim();
            const prevF = (existing.notas || '').trim();

            const bChanged = rawB !== prevB;
            const dChanged =
              rawD.toUpperCase().replace(/\s+/g, '') !== prevD.toUpperCase().replace(/\s+/g, '');

            // Resolver consignatario si se pegó WR en B y A está vacío o '[NOMBRE]'
            let nextConsignatario = rawA;
            if (bChanged && rawB && (!rawA || rawA === '[NOMBRE]')) {
              const cleanWr = rawB.toUpperCase().replace(/\s+/g, '');
              const dbPkg = paquetesRef.current.find(
                p => p.numeroReciboBodega && p.numeroReciboBodega.toUpperCase().replace(/\s+/g, '') === cleanWr
              );
              if (dbPkg?.nombreConsignatario) {
                nextConsignatario = dbPkg.nombreConsignatario;
              }
            }

            const nextCodigoWr = rawB;
            const nextCasillero = extractLast6Digits(rawB) || (rawB ? '' : existing.casillero || '');

            let nextTracking = existing.tracking || '';
            let nextEstado: TipoEstadoItemCotejo = existing.estado || 'PENDIENTE';
            let nextNotas = rawF;

            if (dChanged) {
              if (rawD) {
                const match = resolveScannedCodeMatchRef.current(rawD, itemIdx);
                const isBatchDup = seenScansInBatch.has(match.cleanCode);
                seenScansInBatch.add(match.cleanCode);

                nextTracking = match.cleanCode;
                nextEstado = match.isMatch ? 'ESCANEADO' : 'NO_LISTADO';
                nextNotas = match.isMatch ? match.resolvedName : 'NO ASIGNADO';

                if (!feedbackTriggered) {
                  feedbackTriggered = true;
                  playScanFeedbackRef.current(
                    match.isMatch,
                    match.hasValidName,
                    match.clientName,
                    match.isDuplicate || isBatchDup
                  );
                }
              } else {
                // Se borró el código escaneado en la Columna D
                nextTracking = '';
                nextEstado = 'PENDIENTE';
                nextNotas = '';
              }
            } else if (rawE) {
              const upperE = rawE.toUpperCase();
              if (upperE === 'ENCONTRADO' || upperE === 'ESCANEADO') {
                nextEstado = 'ESCANEADO';
              } else if (upperE === 'NO ENCONTRADO' || upperE === 'NO_LISTADO') {
                nextEstado = 'NO_LISTADO';
              }
            } else if (!rawD) {
              nextEstado = 'PENDIENTE';
            }

            const patch: Record<string, any> = {
              consignatario: nextConsignatario,
              codigo_wr: nextCodigoWr,
              casillero: nextCasillero,
              tracking: nextTracking || null,
              notas: nextNotas || null,
              estado: nextEstado,
              actualizado_en: nowIso
            };

            if (dChanged) {
              patch.veces_escaneado = rawD ? (existing.vecesEscaneado || 0) + 1 : 0;
              patch.escaneado_en = rawD ? nowIso : null;
              patch.escaneado_por = rawD ? operatorNameRef.current : null;
            }

            if (
              nextConsignatario !== prevA ||
              nextCodigoWr !== prevB ||
              dChanged ||
              nextNotas !== prevF
            ) {
              dbUpdates.push({ id: existing.id, patch });
              updatedItemsMap.set(existing.id, {
                ...existing,
                consignatario: nextConsignatario,
                codigoWr: nextCodigoWr,
                casillero: nextCasillero,
                tracking: nextTracking,
                notas: nextNotas,
                estado: nextEstado,
                escaneadoEn: dChanged ? (rawD ? nowIso : undefined) : existing.escaneadoEn,
                escaneadoPor: dChanged ? (rawD ? operatorNameRef.current : undefined) : existing.escaneadoPor,
                vecesEscaneado: dChanged ? (rawD ? (existing.vecesEscaneado || 0) + 1 : 0) : existing.vecesEscaneado,
                actualizadoEn: nowIso
              });
            }
          } else {
            // Nueva fila más allá de items.length
            if (!rawA && !rawB && !rawD && !rawE && !rawF) {
              continue;
            }

            const cleanWr = rawB.toUpperCase().replace(/\s+/g, '');
            const dbPkg = cleanWr
              ? paquetesRef.current.find(
                  p => p.numeroReciboBodega && p.numeroReciboBodega.toUpperCase().replace(/\s+/g, '') === cleanWr
                )
              : undefined;

            const finalConsignatario =
              rawA && rawA !== '[NOMBRE]' ? rawA : dbPkg?.nombreConsignatario || '';
            const finalCasillero = extractLast6Digits(rawB) || '';

            let finalTracking = '';
            let finalEstado: TipoEstadoItemCotejo = 'PENDIENTE';
            let finalNotas = rawF;

            if (rawD) {
              const match = resolveScannedCodeMatchRef.current(rawD);
              const isBatchDup = seenScansInBatch.has(match.cleanCode);
              seenScansInBatch.add(match.cleanCode);

              finalTracking = match.cleanCode;
              finalEstado = match.isMatch ? 'ESCANEADO' : 'NO_LISTADO';
              finalNotas = rawF || (match.isMatch ? match.resolvedName : 'NO ASIGNADO');

              if (!feedbackTriggered) {
                feedbackTriggered = true;
                playScanFeedbackRef.current(
                  match.isMatch,
                  match.hasValidName,
                  match.clientName,
                  match.isDuplicate || isBatchDup
                );
              }
            }

            newDbRows.push({
              rowIndex: itemIdx,
              payload: {
                hoja_id: currentHojaId,
                consignatario: finalConsignatario,
                codigo_wr: rawB,
                casillero: finalCasillero,
                tracking: finalTracking || null,
                peso_kg: dbPkg?.pesoKg || 0,
                posicion_estante: dbPkg?.posicionEstante || 'REC',
                notas: finalNotas || null,
                estado: finalEstado,
                veces_escaneado: finalTracking ? 1 : 0,
                escaneado_en: finalTracking ? nowIso : null,
                escaneado_por: finalTracking ? operatorNameRef.current : null,
                orden: itemIdx + 1
              }
            });
          }
        }

        // Aplicar actualizaciones optimistas a React state
        if (updatedItemsMap.size > 0) {
          setItems(prev => prev.map(it => updatedItemsMap.get(it.id) || it));
        }

        // Persistir updates en Supabase
        if (dbUpdates.length > 0) {
          await Promise.all(
            dbUpdates.map(u =>
              supabase.from('hojas_cotejo_items').update(u.patch).eq('id', u.id)
            )
          );
        }

        // Persistir nuevas filas (incluyendo filas puente vacías si el usuario escribió más abajo)
        if (newDbRows.length > 0) {
          const maxTargetIdx = Math.max(...newDbRows.map(n => n.rowIndex));
          const byIndex = new Map(newDbRows.map(n => [n.rowIndex, n.payload]));
          const payloadsToInsert: any[] = [];

          for (let idx = currentItems.length; idx <= maxTargetIdx; idx++) {
            const existingPayload = byIndex.get(idx);
            if (existingPayload) {
              payloadsToInsert.push(existingPayload);
            } else {
              payloadsToInsert.push({
                hoja_id: currentHojaId,
                consignatario: '',
                codigo_wr: '',
                casillero: '',
                tracking: null,
                peso_kg: 0,
                posicion_estante: 'REC',
                notas: null,
                estado: 'PENDIENTE',
                veces_escaneado: 0,
                escaneado_en: null,
                escaneado_por: null,
                orden: idx + 1
              });
            }
          }

          const { data: inserted } = await supabase
            .from('hojas_cotejo_items')
            .insert(payloadsToInsert)
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
              return [...prev, ...fresh];
            });
          }
        }
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

  // Sincronizar cambios de sheetRows (pistola superior, modales, TIB automático, colores de estado, Realtime) hacia Univer
  useEffect(() => {
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

      // Si había más filas antes (ej. al cambiar o limpiar hoja), limpiar las filas sobrantes
      if (prevLen > currentLen) {
        const diff = prevLen - currentLen;
        const emptyMatrix = Array.from({ length: diff }, () =>
          Array.from({ length: 6 }, () => ({ v: '', s: STYLE_CELL_DEFAULT }))
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
