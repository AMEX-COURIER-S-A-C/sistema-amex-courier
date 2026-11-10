import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase/client';
import { soundEffects } from '@/lib/audio/soundEffects';
import { HojaCotejo, ItemCotejo, Paquete, TipoEstadoItemCotejo } from '@/types';
import {
  ActiveCell,
  EditingCell,
  SheetRow,
  CellSelectionRange,
  SelectionStats,
  SheetTemplateMode,
  SPREADSHEET_COLUMNS,
  MAX_SPREADSHEET_ROWS
} from '../types';
import { parseClipboardSpreadsheet } from '../utils/clipboardParser';
import { extractLast6Digits } from '../utils/codeFormatters';
import { sheetsService } from '../services/sheets.service';
import { formatEstadoAmexLabel } from './useLiveSheetsData';

interface UseLiveSheetsKeyboardProps {
  activeHojaId: string | null;
  templateMode?: SheetTemplateMode;
  hojas?: HojaCotejo[];
  setHojas?: React.Dispatch<React.SetStateAction<HojaCotejo[]>>;
  items: ItemCotejo[];
  setItems: React.Dispatch<React.SetStateAction<ItemCotejo[]>>;
  visibleRows: SheetRow[];
  paquetes: Paquete[];
  operatorName: string;
  checkCodeInManifest: (code: string) => ItemCotejo | undefined;
  handleClearScanAtRow: (itemId: string) => Promise<void>;
  broadcastActiveCell: (col: string, row: number) => void;
  fetchItems?: (hojaId: string) => Promise<void>;
}

export function useLiveSheetsKeyboard({
  activeHojaId,
  templateMode = 'COTEJO',
  hojas = [],
  setHojas,
  items,
  setItems,
  visibleRows,
  paquetes,
  operatorName,
  checkCodeInManifest,
  handleClearScanAtRow,
  broadcastActiveCell
}: UseLiveSheetsKeyboardProps) {
  // Barcode Gun Scanning Input State
  const [barcodeInput, setBarcodeInput] = useState('');
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Active Cell Selection (1-based row index, Row 2 = first data row)
  const [activeCell, setActiveCell] = useState<ActiveCell>({
    col: 'D',
    row: 2,
    val: '',
    itemId: undefined
  });

  // Range Selection
  const [selectionRange, setSelectionRange] = useState<CellSelectionRange | null>({
    startCol: 'D',
    startRow: 2,
    endCol: 'D',
    endRow: 2
  });
  const [isSelecting, setIsSelecting] = useState(false);

  // Legacy inline editing state (kept for compatibility)
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [editingValue, setEditingValue] = useState('');

  // Modals
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [isNewSheetModalOpen, setIsNewSheetModalOpen] = useState(false);
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);

  // Audio & Voice settings
  const [isMuted, setIsMuted] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);

  useEffect(() => {
    soundEffects.setVoiceEnabled(isVoiceEnabled);
    soundEffects.setMuted(isMuted);
  }, [isVoiceEnabled, isMuted]);

  const focusBarcodeInput = useCallback(() => {
    if (barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, []);

  // Celdas libres adicionales para columnas G..Z o filas libres
  const [extraCells, setExtraCells] = useState<Record<string, string>>({});
  const loadedExtraHojaRef = useRef<string | null>(null);

  // Cargar extraCells guardados en la hoja activa cuando cambia activeHojaId
  useEffect(() => {
    if (!activeHojaId) {
      setExtraCells({});
      loadedExtraHojaRef.current = null;
      return;
    }
    const currentHoja = hojas.find(h => h.id === activeHojaId) as
      | (HojaCotejo & { extraCells?: Record<string, string> })
      | undefined;
    if (currentHoja && loadedExtraHojaRef.current !== activeHojaId) {
      loadedExtraHojaRef.current = activeHojaId;
      setExtraCells(currentHoja.extraCells || {});
    }
  }, [activeHojaId, hojas]);

  // Persistir cambios en extraCells (columnas G..Z o toda la hoja en modo BLANK) en Supabase
  const persistExtraCells = useCallback(
    async (nextExtra: Record<string, string>) => {
      if (!activeHojaId) return;
      const currentHoja = hojas.find(h => h.id === activeHojaId);
      if (setHojas) {
        setHojas(prev =>
          prev.map(h =>
            h.id === activeHojaId
              ? ({ ...h, extraCells: nextExtra } as HojaCotejo)
              : h
          )
        );
      }
      await sheetsService.saveSheetExtraMeta(
        activeHojaId,
        currentHoja?.descripcion || 'Cotejo y pistoleo en tiempo real de bultos recibidos',
        nextExtra,
        undefined,
        templateMode
      );
    },
    [activeHojaId, hojas, setHojas, templateMode]
  );

  // Obtener valor de celda por col y row (1-based)
  const getCellValue = useCallback(
    (col: string, rowNum: number): string => {
      if (templateMode === 'BLANK') {
        return extraCells[`${col}-${rowNum}`] || '';
      }
      const itemIndex = rowNum - 2;
      if (itemIndex >= 0 && itemIndex < visibleRows.length) {
        const r = visibleRows[itemIndex];
        if (r) {
          if (templateMode === 'WR_LOOKUP') {
            if (col === 'A') return r.codigoWarehouse || '';
            if (col === 'B') return r.nombre || '';
            if (col === 'C') return r.codigoTib || '';
            if (col === 'D') return r.pesoKg || '';
            if (col === 'E') return r.ubicacion || '';
            if (col === 'F') return r.estadoAmexLabel || '';
          } else {
            if (col === 'A') return r.nombre || '';
            if (col === 'B') return r.codigoWarehouse || '';
            if (col === 'C') return r.codigoTib || '';
            if (col === 'D') return r.codigoEscaneado || '';
            if (col === 'E') return r.estado || '';
            if (col === 'F') return r.nombreEscaneado || '';
          }
        }
      }
      return extraCells[`${col}-${rowNum}`] || '';
    },
    [visibleRows, extraCells, templateMode]
  );

  const getItemIdForRow = useCallback(
    (rowNum: number): string | undefined => {
      const itemIndex = rowNum - 2;
      if (itemIndex >= 0 && itemIndex < visibleRows.length) {
        return visibleRows[itemIndex].id;
      }
      return undefined;
    },
    [visibleRows]
  );

  // Resolver coincidencia de código exclusivamente contra las columnas B/C y el nombre de la Columna A (con herencia de grupo) de la hoja actual
  const resolveScannedCodeMatch = useCallback(
    (scannedText: string, targetItemIndex?: number) => {
      const cleanCode = scannedText.trim().toUpperCase().replace(/\s+/g, '');
      const cleanDigits = cleanCode.replace(/^[A-Za-z]+0*/, '');

      // 1. Manifiesto de la hoja actual (incluye nombre heredado de grupo en Columna A)
      const matchedManifest = checkCodeInManifest(cleanCode);

      // 2. Fila actual objetivo si coincide con su propio WR o TIB en la hoja
      let rowItemMatch = false;
      let rowItemConsignee = '';
      if (typeof targetItemIndex === 'number' && targetItemIndex >= 0 && targetItemIndex < items.length) {
        const it = items[targetItemIndex];
        const itWr = (it.codigoWr || '').toUpperCase().replace(/\s+/g, '');
        const itTib = (it.casillero || '').toUpperCase().replace(/\s+/g, '');
        const itDigits = itWr.replace(/^[A-Za-z]+0*/, '');
        if (
          (itWr && (itWr === cleanCode || `WR${itWr}` === cleanCode)) ||
          (itTib && (itTib === cleanCode || cleanDigits === itTib)) ||
          (itDigits && cleanDigits && itDigits === cleanDigits)
        ) {
          rowItemMatch = true;
          if (it.consignatario && it.consignatario.trim() && it.consignatario.trim() !== '[NOMBRE]') {
            rowItemConsignee = it.consignatario.trim();
          }
        }
      }

      const isMatch = !!(matchedManifest || rowItemMatch);

      let clientName = '';
      if (
        matchedManifest &&
        matchedManifest.consignatario &&
        matchedManifest.consignatario.trim() &&
        matchedManifest.consignatario.trim() !== '[NOMBRE]'
      ) {
        clientName = matchedManifest.consignatario.trim();
      } else if (rowItemConsignee) {
        clientName = rowItemConsignee;
      }

      const hasValidName =
        !!clientName && clientName !== 'CLIENTE AMEX' && clientName !== 'NO ASIGNADO' && clientName !== '[NOMBRE]';

      return {
        cleanCode,
        cleanDigits,
        isMatch,
        clientName,
        hasValidName,
        resolvedName: hasValidName ? clientName : isMatch ? 'CLIENTE AMEX' : 'NO ASIGNADO'
      };
    },
    [checkCodeInManifest, items]
  );

  // Reproducir sonido + voz para escaneo en Columna D (encontrado / no encontrado)
  const playScanFeedback = useCallback(
    (isMatch: boolean, hasValidName: boolean, clientName: string) => {
      if (isMuted) return;
      soundEffects.announceScanResult({
        status: isMatch ? 'FOUND' : 'NOT_FOUND',
        clientName: hasValidName ? clientName : ''
      });
    },
    [isMuted]
  );

  // Procesar escaneo por pistola láser o cámara hacia la Columna D (en COTEJO) o Columna A (en WR_LOOKUP)
  const processBarcodeScan = useCallback(
    async (scannedText: string, specificItemIndex?: number) => {
      if (!activeHojaId || !scannedText.trim() || templateMode === 'BLANK') return;
      setBarcodeInput('');

      const cleanRaw = scannedText.trim().toUpperCase().replace(/\s+/g, '');
      const cleanDigits = cleanRaw.replace(/^[A-Za-z]+0*/, '');
      const nowIso = new Date().toISOString();

      // MODO 3: ESCÁNER WR CONSULTA BD (escribe en Columna A y rellena B..F con datos de paquetes)
      if (templateMode === 'WR_LOOKUP') {
        const dbPkg = paquetes.find(p => {
          if (!p.numeroReciboBodega) return false;
          const pWr = p.numeroReciboBodega.toUpperCase().replace(/\s+/g, '');
          const pDigits = pWr.replace(/^[A-Za-z]+0*/, '');
          return (
            pWr === cleanRaw ||
            `WR${pWr}` === cleanRaw ||
            (cleanDigits && pDigits === cleanDigits)
          );
        });

        const isFound = !!dbPkg;
        const resolvedWr = dbPkg?.numeroReciboBodega?.toUpperCase() || cleanRaw;
        const resolvedClient = (dbPkg?.nombreConsignatario || '').trim();
        const hasValidClient =
          !!resolvedClient &&
          resolvedClient !== '[NOMBRE]' &&
          resolvedClient !== 'CLIENTE AMEX' &&
          resolvedClient !== 'NO ASIGNADO';

        playScanFeedback(isFound, hasValidClient, resolvedClient);

        const displayClient = isFound ? (resolvedClient || 'CLIENTE AMEX') : 'NO ENCONTRADO EN BD';
        const displayTracking = isFound ? (dbPkg?.tracking || '—') : '—';
        const displayPeso = isFound ? Number(dbPkg?.pesoKg || 0) : 0;
        const displayUbicacion = isFound
          ? dbPkg?.posicionEstante ||
            (dbPkg?.anaquel && dbPkg?.piso ? `${dbPkg.anaquel}-${dbPkg.piso}` : dbPkg?.anaquel) ||
            'OFI'
          : 'REC';
        const displayEstadoAmex = isFound
          ? formatEstadoAmexLabel(dbPkg?.estadoAmex, dbPkg?.ubicacionActual)
          : 'NO REGISTRADO';
        const rowEstado: TipoEstadoItemCotejo = isFound ? 'ESCANEADO' : 'NO_LISTADO';

        let targetIdx = -1;
        if (typeof specificItemIndex === 'number' && specificItemIndex >= 0 && specificItemIndex < items.length) {
          targetIdx = specificItemIndex;
        } else if (activeCell.row >= 2) {
          const candidateIdx = activeCell.row - 2;
          if (candidateIdx >= 0 && candidateIdx < items.length) {
            if (!items[candidateIdx].codigoWr || !items[candidateIdx].codigoWr?.trim()) {
              targetIdx = candidateIdx;
            } else {
              const firstEmpty = items.findIndex(it => !it.codigoWr || !it.codigoWr.trim());
              targetIdx = firstEmpty !== -1 ? firstEmpty : -1;
            }
          }
        } else {
          targetIdx = items.findIndex(it => !it.codigoWr || !it.codigoWr.trim());
        }

        if (targetIdx !== -1 && items[targetIdx]) {
          const targetItem = items[targetIdx];
          const nextRowNum = targetIdx + 3;

          setItems(prev =>
            prev.map((it, idx) =>
              idx === targetIdx
                ? {
                    ...it,
                    codigoWr: resolvedWr,
                    consignatario: displayClient,
                    tracking: displayTracking,
                    pesoKg: displayPeso,
                    posicionEstante: displayUbicacion,
                    notas: displayEstadoAmex,
                    estado: rowEstado,
                    escaneadoEn: nowIso,
                    escaneadoPor: operatorName,
                    vecesEscaneado: (it.vecesEscaneado || 0) + 1
                  }
                : it
            )
          );

          setActiveCell({
            col: 'A',
            row: nextRowNum,
            val: '',
            itemId: getItemIdForRow(nextRowNum)
          });

          await supabase
            .from('hojas_cotejo_items')
            .update({
              codigo_wr: resolvedWr,
              consignatario: displayClient,
              tracking: displayTracking,
              peso_kg: displayPeso,
              posicion_estante: displayUbicacion,
              notas: displayEstadoAmex,
              estado: rowEstado,
              escaneado_en: nowIso,
              escaneado_por: operatorName,
              veces_escaneado: (targetItem.vecesEscaneado || 0) + 1,
              actualizado_en: nowIso
            })
            .eq('id', targetItem.id);
        } else {
          const { data: newRow } = await supabase
            .from('hojas_cotejo_items')
            .insert({
              hoja_id: activeHojaId,
              codigo_wr: resolvedWr,
              casillero: cleanDigits,
              consignatario: displayClient,
              tracking: displayTracking,
              peso_kg: displayPeso,
              posicion_estante: displayUbicacion,
              notas: displayEstadoAmex,
              estado: rowEstado,
              escaneado_en: nowIso,
              escaneado_por: operatorName,
              veces_escaneado: 1,
              orden: items.length + 1
            })
            .select()
            .single();

          if (newRow) {
            setItems(prev => {
              if (prev.some(it => it.id === newRow.id)) return prev;
              return [
                ...prev,
                {
                  id: newRow.id,
                  hojaId: newRow.hoja_id,
                  codigoWr: resolvedWr,
                  casillero: cleanDigits,
                  consignatario: displayClient,
                  tracking: displayTracking,
                  pesoKg: displayPeso,
                  posicionEstante: displayUbicacion,
                  notas: displayEstadoAmex,
                  estado: rowEstado,
                  escaneadoEn: nowIso,
                  escaneadoPor: operatorName,
                  vecesEscaneado: 1,
                  orden: newRow.orden || items.length + 1,
                  creadoEn: newRow.creado_en,
                  actualizadoEn: newRow.actualizado_en
                }
              ];
            });

            setActiveCell({
              col: 'A',
              row: items.length + 3,
              val: '',
              itemId: newRow.id
            });
          }
        }
        return;
      }

      // MODO 2: HOJA DE COTEJO (escribe en Columna D y compara contra Columnas B/C de la hoja)
      let targetItemIndex = -1;
      if (typeof specificItemIndex === 'number' && specificItemIndex >= 0 && specificItemIndex < items.length) {
        targetItemIndex = specificItemIndex;
      } else if (activeCell.row >= 2) {
        const candidateIdx = activeCell.row - 2;
        if (candidateIdx >= 0 && candidateIdx < items.length) {
          // Si la fila seleccionada en D está vacía, usarla; si ya está ocupada, buscar la primera fila vacía en D
          if (!items[candidateIdx].tracking || !items[candidateIdx].tracking?.trim()) {
            targetItemIndex = candidateIdx;
          } else {
            const firstEmptyIdx = items.findIndex(it => !it.tracking || !it.tracking.trim());
            targetItemIndex = firstEmptyIdx !== -1 ? firstEmptyIdx : -1;
          }
        }
      } else {
        targetItemIndex = items.findIndex(it => !it.tracking || !it.tracking.trim());
      }

      const match = resolveScannedCodeMatch(scannedText, targetItemIndex !== -1 ? targetItemIndex : undefined);
      const { cleanCode, isMatch, clientName, hasValidName, resolvedName } = match;

      // Emitir sonido + voz inmediatamente
      playScanFeedback(isMatch, hasValidName, clientName);

      const newEstado: TipoEstadoItemCotejo = isMatch ? 'ESCANEADO' : 'NO_LISTADO';
      const finalNotes = isMatch ? resolvedName : 'NO ASIGNADO';

      if (targetItemIndex !== -1 && items[targetItemIndex]) {
        const targetItem = items[targetItemIndex];
        const nextRowNumber = targetItemIndex + 3; // Mover a la siguiente fila (1-based)

        setItems(prev =>
          prev.map((it, idx) =>
            idx === targetItemIndex
              ? {
                  ...it,
                  tracking: cleanCode,
                  notas: finalNotes,
                  estado: newEstado,
                  escaneadoEn: nowIso,
                  escaneadoPor: operatorName,
                  vecesEscaneado: (it.vecesEscaneado || 0) + 1
                }
              : it
          )
        );

        setActiveCell({
          col: 'D',
          row: nextRowNumber,
          val: '',
          itemId: getItemIdForRow(nextRowNumber)
        });

        await supabase
          .from('hojas_cotejo_items')
          .update({
            tracking: cleanCode,
            notas: finalNotes,
            estado: newEstado,
            escaneado_en: nowIso,
            escaneado_por: operatorName,
            veces_escaneado: (targetItem.vecesEscaneado || 0) + 1,
            actualizado_en: nowIso
          })
          .eq('id', targetItem.id);
      } else {
        // Insertar nueva fila al final de la hoja
        const { data: newRow } = await supabase
          .from('hojas_cotejo_items')
          .insert({
            hoja_id: activeHojaId,
            codigo_wr: '',
            casillero: cleanDigits,
            consignatario: '',
            tracking: cleanCode,
            notas: finalNotes,
            estado: newEstado,
            escaneado_en: nowIso,
            escaneado_por: operatorName,
            veces_escaneado: 1,
            orden: items.length + 1
          })
          .select()
          .single();

        if (newRow) {
          setItems(prev => {
            if (prev.some(it => it.id === newRow.id)) return prev;
            return [
              ...prev,
              {
                id: newRow.id,
                hojaId: newRow.hoja_id,
                codigoWr: '',
                casillero: cleanDigits,
                consignatario: '',
                tracking: cleanCode,
                notas: finalNotes,
                estado: newEstado,
                escaneadoEn: nowIso,
                escaneadoPor: operatorName,
                vecesEscaneado: 1,
                orden: newRow.orden || items.length + 1,
                creadoEn: newRow.creado_en,
                actualizadoEn: newRow.actualizado_en
              }
            ];
          });

          setActiveCell({
            col: 'D',
            row: items.length + 3,
            val: '',
            itemId: newRow.id
          });
        }
      }
    },
    [
      activeCell.row,
      activeHojaId,
      getItemIdForRow,
      items,
      operatorName,
      paquetes,
      playScanFeedback,
      resolveScannedCodeMatch,
      setItems,
      templateMode
    ]
  );

  const handleManualScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (barcodeInput.trim()) {
      processBarcodeScan(barcodeInput.trim());
      focusBarcodeInput();
    }
  };

  // Guardar un valor directamente en una celda (usado como helper o desde barra de fórmulas)
  const commitDirectValue = useCallback(
    async (col: string, rowNum: number, itemId: string | undefined, newVal: string) => {
      const trimmed = newVal.trim();
      if (col === 'C') return;

      const rowIndex = rowNum >= 2 ? rowNum - 2 : -1;
      const targetItem =
        (itemId ? items.find(it => it.id === itemId || (it.id && itemId.startsWith(it.id))) : undefined) ||
        (rowIndex >= 0 && rowIndex < items.length ? items[rowIndex] : undefined) ||
        (rowIndex >= 0 && rowIndex < visibleRows.length ? visibleRows[rowIndex]?.itemRef : undefined);

      if (!targetItem) {
        if (!trimmed) {
          setExtraCells(prev => {
            const next = { ...prev };
            delete next[`${col}-${rowNum}`];
            void persistExtraCells(next);
            return next;
          });
          return;
        }
        if (!['A', 'B', 'D', 'E', 'F'].includes(col)) {
          setExtraCells(prev => {
            const next = { ...prev, [`${col}-${rowNum}`]: trimmed };
            void persistExtraCells(next);
            return next;
          });
          return;
        }
        if (!activeHojaId) return;
        if (col === 'D') {
          await processBarcodeScan(trimmed);
          return;
        }
        try {
          const newItemPayload = {
            hoja_id: activeHojaId,
            codigo_wr: col === 'B' ? trimmed : '',
            tracking: '',
            casillero: col === 'B' ? extractLast6Digits(trimmed) : '',
            consignatario: col === 'A' ? trimmed : '',
            peso_kg: 0,
            posicion_estante: 'REC',
            notas: col === 'F' ? trimmed : '',
            estado:
              col === 'E' && (trimmed.toUpperCase() === 'ENCONTRADO' || trimmed.toUpperCase() === 'ESCANEADO')
                ? 'ESCANEADO'
                : 'PENDIENTE',
            veces_escaneado: 0,
            escaneado_en: null,
            escaneado_por: null,
            orden: items.length + 1
          };

          const { data, error } = await supabase
            .from('hojas_cotejo_items')
            .insert([newItemPayload])
            .select()
            .single();

          if (!error && data) {
            const created: ItemCotejo = {
              id: data.id,
              hojaId: data.hoja_id,
              codigoWr: data.codigo_wr || '',
              tracking: (data as any).tracking || '',
              casillero: data.casillero,
              consignatario: data.consignatario,
              pesoKg: Number(data.peso_kg || 0),
              posicionEstante: data.posicion_estante,
              notas: data.notas,
              estado: (data.estado as TipoEstadoItemCotejo) || 'PENDIENTE',
              escaneadoEn: data.escaneado_en,
              escaneadoPor: data.escaneado_por,
              vecesEscaneado: data.veces_escaneado || 0,
              orden: data.orden,
              creadoEn: data.creado_en,
              actualizadoEn: data.actualizado_en
            };
            setItems(prev => (prev.some(it => it.id === created.id) ? prev : [...prev, created]));
          }
        } catch (err) {
          console.error('Error creating new row item:', err);
        }
        return;
      }

      const targetId = targetItem.id;

      if (col === 'A') {
        setItems(prev => prev.map(it => (it.id === targetId ? { ...it, consignatario: trimmed } : it)));
        await supabase.from('hojas_cotejo_items').update({ consignatario: trimmed }).eq('id', targetId);
      } else if (col === 'B') {
        const computedTib = extractLast6Digits(trimmed);
        setItems(prev =>
          prev.map(it => (it.id === targetId ? { ...it, codigoWr: trimmed, casillero: computedTib } : it))
        );
        await supabase
          .from('hojas_cotejo_items')
          .update({ codigo_wr: trimmed, casillero: computedTib })
          .eq('id', targetId);
      } else if (col === 'D') {
        if (trimmed) {
          await processBarcodeScan(trimmed, items.findIndex(it => it.id === targetId));
        } else {
          await handleClearScanAtRow(targetId);
        }
      } else if (col === 'E') {
        const upper = trimmed.toUpperCase();
        const isEncontrado = upper === 'ENCONTRADO' || upper === 'ESCANEADO';
        const isNoEncontrado = upper === 'NO ENCONTRADO' || upper === 'NO_LISTADO';
        const newEstado: TipoEstadoItemCotejo = isEncontrado ? 'ESCANEADO' : isNoEncontrado ? 'NO_LISTADO' : 'PENDIENTE';
        setItems(prev => prev.map(it => (it.id === targetId ? { ...it, estado: newEstado } : it)));
        await supabase.from('hojas_cotejo_items').update({ estado: newEstado }).eq('id', targetId);
      } else if (col === 'F') {
        setItems(prev => prev.map(it => (it.id === targetId ? { ...it, notas: trimmed } : it)));
        await supabase.from('hojas_cotejo_items').update({ notas: trimmed }).eq('id', targetId);
      } else {
        setExtraCells(prev => {
          const next = { ...prev };
          if (trimmed) {
            next[`${col}-${rowNum}`] = trimmed;
          } else {
            delete next[`${col}-${rowNum}`];
          }
          void persistExtraCells(next);
          return next;
        });
      }
    },
    [
      activeHojaId,
      handleClearScanAtRow,
      items,
      persistExtraCells,
      processBarcodeScan,
      setItems,
      visibleRows
    ]
  );

  const commitInlineCellEdit = useCallback(
    async (valueOverride?: string) => {
      if (!editingCell) return;
      const { col, row, itemId } = editingCell;
      const val = valueOverride !== undefined ? valueOverride : editingValue;
      setEditingCell(null);
      await commitDirectValue(col, row, itemId, val);
    },
    [editingCell, editingValue, commitDirectValue]
  );

  const handleCellMouseDown = useCallback(
    (col: string, rowNum: number, currentVal: string, itemId?: string) => {
      if (rowNum < 2) return;
      setIsSelecting(true);
      setActiveCell({ col, row: rowNum, val: currentVal || '', itemId });
      setSelectionRange({ startCol: col, startRow: rowNum, endCol: col, endRow: rowNum });
      broadcastActiveCell(col, rowNum);
    },
    [broadcastActiveCell]
  );

  const handleCellMouseEnter = useCallback(
    (col: string, rowNum: number) => {
      if (!isSelecting || rowNum < 2) return;
      setSelectionRange(prev => {
        if (!prev) return { startCol: col, startRow: rowNum, endCol: col, endRow: rowNum };
        return { ...prev, endCol: col, endRow: rowNum };
      });
    },
    [isSelecting]
  );

  const handleCellClick = useCallback(
    (col: string, row: number, val: string, itemId?: string) => {
      setActiveCell({ col, row, val: val || '', itemId });
      setSelectionRange({ startCol: col, startRow: row, endCol: col, endRow: row });
      broadcastActiveCell(col, row);
    },
    [broadcastActiveCell]
  );

  // Estadísticas dinámicas de la selección estilo Excel (Average, Count, Sum)
  const selectionStats = useMemo<SelectionStats>(() => {
    if (!selectionRange) {
      return { count: 0, numericCount: 0, sum: 0, average: 0, hasNumbers: false };
    }

    const COLS = SPREADSHEET_COLUMNS;
    const startIdx = COLS.indexOf(selectionRange.startCol as any);
    const endIdx = COLS.indexOf(selectionRange.endCol as any);
    if (startIdx === -1 || endIdx === -1) {
      return { count: 0, numericCount: 0, sum: 0, average: 0, hasNumbers: false };
    }

    const minCol = Math.min(startIdx, endIdx);
    const maxCol = Math.max(startIdx, endIdx);
    const minRow = Math.min(selectionRange.startRow, selectionRange.endRow);
    const maxRow = Math.max(selectionRange.startRow, selectionRange.endRow);

    let count = 0;
    let numericCount = 0;
    let sum = 0;

    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        const val = getCellValue(COLS[c], r)?.trim();
        if (val && val !== '') {
          count++;
          const clean = val.replace(/,/g, '');
          const parsed = Number(clean);
          if (!isNaN(parsed) && clean !== '' && !/^[a-zA-Z]/i.test(clean)) {
            numericCount++;
            sum += parsed;
          }
        }
      }
    }

    const average = numericCount > 0 ? sum / numericCount : 0;
    return {
      count,
      numericCount,
      sum,
      average,
      hasNumbers: numericCount > 0
    };
  }, [selectionRange, getCellValue]);

  const handleCellDoubleClick = useCallback((col: string, rowNum: number, currentVal: string, itemId?: string) => {
    if (rowNum < 2 || col === 'C') return;
    setEditingCell({ col, row: rowNum, itemId });
    setEditingValue(currentVal || '');
  }, []);

  const handleFormulaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCell.col || !activeCell.row || activeCell.col === 'C') return;
    await commitDirectValue(activeCell.col, activeCell.row, activeCell.itemId, activeCell.val);
  };

  const handlePasteSpreadsheet = useCallback(
    async (pastedText: string, targetColOverride?: string, targetRowOverride?: number) => {
      if (!activeHojaId || !pastedText) return;
      const matrix = parseClipboardSpreadsheet(pastedText);
      if (matrix.length === 0) return;

      const COLS = SPREADSHEET_COLUMNS;
      const startCol = targetColOverride || activeCell.col || 'A';
      const startRow = Math.min(MAX_SPREADSHEET_ROWS, Math.max(2, targetRowOverride || activeCell.row || 2));
      const colStartIdx = Math.max(0, COLS.indexOf(startCol as any));

      for (let r = 0; r < matrix.length; r++) {
        const rowVals = matrix[r];
        const targetRowNum = startRow + r;
        for (let c = 0; c < rowVals.length; c++) {
          const colLetter = COLS[colStartIdx + c];
          if (!colLetter || colLetter === 'C') continue;
          await commitDirectValue(colLetter, targetRowNum, getItemIdForRow(targetRowNum), rowVals[c] ?? '');
        }
      }
    },
    [activeCell.col, activeCell.row, activeHojaId, commitDirectValue, getItemIdForRow]
  );

  return {
    barcodeInput,
    setBarcodeInput,
    barcodeInputRef,
    focusBarcodeInput,
    activeCell,
    setActiveCell,
    selectionRange,
    setSelectionRange,
    isSelecting,
    selectionStats,
    handleCellMouseDown,
    handleCellMouseEnter,
    editingCell,
    setEditingCell,
    editingValue,
    setEditingValue,
    isPasteModalOpen,
    setIsPasteModalOpen,
    isNewSheetModalOpen,
    setIsNewSheetModalOpen,
    isCameraScannerOpen,
    setIsCameraScannerOpen,
    isMuted,
    setIsMuted,
    isVoiceEnabled,
    setIsVoiceEnabled,
    resolveScannedCodeMatch,
    playScanFeedback,
    getCellValue,
    getItemIdForRow,
    processBarcodeScan,
    handleManualScanSubmit,
    commitDirectValue,
    commitInlineCellEdit,
    handleCellClick,
    handleCellDoubleClick,
    handleFormulaSubmit,
    handlePasteSpreadsheet,
    extraCells,
    setExtraCells,
    persistExtraCells
  };
}
