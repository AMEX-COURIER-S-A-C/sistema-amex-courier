import { useState, useEffect, useMemo, useCallback } from 'react';
import { HojaCotejo, ItemCotejo, Paquete, TipoProcesoCotejo } from '@/types';
import { soundEffects } from '@/lib/audio/soundEffects';
import writeXlsxFile from 'write-excel-file/browser';
import { sheetsService, resolveSheetTemplateMode } from '../services/sheets.service';
import { confirmDialog, alertDialog } from '@/lib/dialog';
import { SheetRow, SheetStats, SheetTemplateMode, SPREADSHEET_COLUMNS } from '../types';
import { extractLast6Digits, getSheetLongCode } from '../utils/codeFormatters';

export function formatEstadoAmexLabel(estadoAmex?: string, ubicacionActual?: string): string {
  if (estadoAmex === 'entregado' || ubicacionActual === 'Entregado') return 'ENTREGADO';
  if (estadoAmex === 'en_ruta') return 'EN RUTA';
  if (estadoAmex === 'listo_recojo') return 'LISTO RECOJO';
  if (estadoAmex === 'en_almacen' || estadoAmex === 'recibido') return 'EN ALMACÉN';
  return 'EN ALMACÉN';
}

interface UseLiveSheetsDataProps {
  paquetes: Paquete[];
  operatorName: string;
}

export function useLiveSheetsData({ paquetes, operatorName }: UseLiveSheetsDataProps) {
  // State: Hojas & Items
  const [hojas, setHojas] = useState<HojaCotejo[]>([]);
  const [activeLibroId, setActiveLibroId] = useState<string | null>(null);
  const [activeHojaId, setActiveHojaId] = useState<string | null>(null);
  const [items, setItems] = useState<ItemCotejo[]>([]);
  const [isLoadingSheets, setIsLoadingSheets] = useState(true);
  const [isLoadingItems, setIsLoadingItems] = useState(false);

  // Document Title & Starred
  const [docTitle, setDocTitle] = useState('AMEX WR');
  const [isStarred, setIsStarred] = useState(true);

  // Search filter
  const [searchInSheet, setSearchInSheet] = useState('');

  // Libros principales (Workbooks independientes para la galería / SheetsHub)
  const libros = useMemo(() => {
    return hojas.filter(h => !h.libroId);
  }, [hojas]);

  // Hojas pertenecientes ÚNICAMENTE al libro activo actual
  const activeBookSheets = useMemo(() => {
    if (!activeLibroId) return [];
    return hojas
      .filter(h => h.id === activeLibroId || h.libroId === activeLibroId)
      .sort((a, b) => new Date(a.creadoEn).getTime() - new Date(b.creadoEn).getTime());
  }, [hojas, activeLibroId]);

  // Modo de plantilla activa ('BLANK' | 'COTEJO' | 'WR_LOOKUP')
  const activeTemplateMode = useMemo<SheetTemplateMode>(() => {
    const currentHoja = hojas.find(h => h.id === activeHojaId) as
      | (HojaCotejo & { templateMode?: SheetTemplateMode })
      | undefined;
    if (currentHoja) {
      return resolveSheetTemplateMode(currentHoja.tipoProceso, currentHoja.templateMode);
    }
    const rootBook = hojas.find(h => h.id === activeLibroId) as
      | (HojaCotejo & { templateMode?: SheetTemplateMode })
      | undefined;
    return resolveSheetTemplateMode(rootBook?.tipoProceso, rootBook?.templateMode);
  }, [hojas, activeHojaId, activeLibroId]);

  // 1. Fetch Hojas
  const fetchHojas = useCallback(async () => {
    try {
      setIsLoadingSheets(true);
      const mapped = await sheetsService.fetchHojas();
      setHojas(mapped);
      if (activeLibroId) {
        const found = mapped.find(h => h.id === activeLibroId);
        if (found) setDocTitle(found.titulo || 'AMEX WR');
      }
    } catch (err) {
      console.error('Error in fetchHojas:', err);
    } finally {
      setIsLoadingSheets(false);
    }
  }, [activeLibroId]);

  // 2. Fetch Items
  const fetchItems = useCallback(async (hojaId: string) => {
    if (!hojaId) return;
    try {
      setIsLoadingItems(true);
      const mappedItems = await sheetsService.fetchItems(hojaId);
      const seen = new Set<string>();
      const deduped: ItemCotejo[] = [];
      for (const item of mappedItems) {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          deduped.push(item);
        }
      }
      setItems(deduped);
    } catch (err: any) {
      console.error('Error in fetchItems:', err?.message || err);
    } finally {
      setIsLoadingItems(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchHojas();
  }, [fetchHojas]);

  // Sync active sheet items
  useEffect(() => {
    if (activeHojaId) {
      fetchItems(activeHojaId);
    }
  }, [activeHojaId, fetchItems]);

  // Sync active workbook title
  useEffect(() => {
    if (activeLibroId) {
      const activeBook = hojas.find(h => h.id === activeLibroId);
      if (activeBook) {
        setDocTitle(activeBook.titulo || 'AMEX WR');
      }
    }
  }, [activeLibroId, hojas]);

  // Sincronización con URL limpia (/amex-excel/d/...) o Hash legado (#d/...)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let targetCode: string | null = null;

    if (window.location.pathname.startsWith('/amex-excel/d/')) {
      targetCode = window.location.pathname.replace('/amex-excel/d/', '').trim();
    } else if (window.location.hash && window.location.hash.startsWith('#d/')) {
      targetCode = window.location.hash.replace('#d/', '').trim();
    }

    if (targetCode) {
      targetCode = targetCode.split('/')[0].split('?')[0].split('#')[0].trim();
    }

    if (targetCode && hojas.length > 0) {
      const found = hojas.find(h => getSheetLongCode(h.id) === targetCode || h.id === targetCode);
      if (found) {
        const rootId = found.libroId || found.id;
        setActiveLibroId(rootId);
        setActiveHojaId(found.id);
        const rootBook = hojas.find(h => h.id === rootId);
        if (rootBook) setDocTitle(rootBook.titulo || 'AMEX WR');
      }
    }
  }, [hojas]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (activeLibroId) {
        const code = getSheetLongCode(activeLibroId);
        window.history.replaceState(null, '', `/amex-excel/d/${code}`);
      } else {
        if (window.location.pathname.startsWith('/amex-excel/d/')) {
          window.history.replaceState(null, '', '/amex-excel');
        }
      }
    }
  }, [activeLibroId]);

  // Mapa de nombre de consignatario heredado hacia abajo para grupos de paquetes de un mismo cliente
  const inheritedConsignees = useMemo(() => {
    const map = new Map<string, string>();
    let currentGroupConsignee = '';

    items.forEach((it, idx) => {
      const rawName = (it.consignatario || '').trim();
      const hasWr = !!(it.codigoWr || '').trim();

      if (rawName && rawName !== '[NOMBRE]') {
        currentGroupConsignee = rawName;
      } else if (!hasWr && !rawName) {
        // Fila completamente vacía rompe el grupo
        currentGroupConsignee = '';
      }

      const key = it.id || `idx-${idx}`;
      map.set(key, rawName && rawName !== '[NOMBRE]' ? rawName : hasWr ? currentGroupConsignee : '');
    });

    return map;
  }, [items]);

  // Códigos escaneados en columna D
  const allScannedCodes = useMemo(() => {
    const set = new Set<string>();
    items.forEach(it => {
      if (it.tracking) {
        const clean = it.tracking.toUpperCase().replace(/\s+/g, '');
        if (clean) {
          set.add(clean);
          const digits = clean.replace(/^[A-Za-z]+0*/, '');
          if (digits) {
            set.add(digits);
            set.add(`WR${digits}`);
          }
        }
      }
    });
    return set;
  }, [items]);

  // Comprobar coincidencia con manifiesto (incluyendo herencia de nombre de grupo en Columna A)
  const checkCodeInManifest = useCallback(
    (scannedText: string): ItemCotejo | undefined => {
      const cleanCode = scannedText.trim().toUpperCase().replace(/\s+/g, '');
      if (!cleanCode) return undefined;
      const cleanDigits = cleanCode.replace(/^[A-Za-z]+0*/, '');

      const foundIdx = items.findIndex(m => {
        const mWr = (m.codigoWr || '').toUpperCase().replace(/\s+/g, '');
        const mTib = (m.casillero || '').toUpperCase().replace(/\s+/g, '');
        const mDigits = mWr.replace(/^[A-Za-z]+0*/, '');

        return (
          (mWr && mWr === cleanCode) ||
          (mWr && `WR${mWr}` === cleanCode) ||
          (mDigits && cleanDigits && mDigits === cleanDigits) ||
          (mTib && mTib === cleanCode) ||
          (mTib && cleanDigits && mTib === cleanDigits)
        );
      });

      if (foundIdx === -1) return undefined;

      const foundItem = items[foundIdx];
      const inheritedName =
        inheritedConsignees.get(foundItem.id || `idx-${foundIdx}`) ||
        foundItem.consignatario ||
        '';

      if (inheritedName && (!foundItem.consignatario || foundItem.consignatario === '[NOMBRE]')) {
        return {
          ...foundItem,
          consignatario: inheritedName
        };
      }
      return foundItem;
    },
    [items, inheritedConsignees]
  );

  // Transformar ítems en filas 1:1 exactas según la plantilla activa
  const sheetRows = useMemo(() => {
    if (activeTemplateMode === 'BLANK') {
      return [];
    }

    const rows: SheetRow[] = [];
    const seenRowIds = new Set<string>();

    if (activeTemplateMode === 'WR_LOOKUP') {
      items.forEach((it, idx) => {
        const rawWr = (it.codigoWr || '').trim();
        const cleanWr = rawWr.toUpperCase().replace(/\s+/g, '');
        const cleanDigits = cleanWr.replace(/^[A-Za-z]+0*/, '');

        const dbPkg = cleanWr
          ? paquetes.find(p => {
              if (!p.numeroReciboBodega) return false;
              const pWr = p.numeroReciboBodega.toUpperCase().replace(/\s+/g, '');
              const pDigits = pWr.replace(/^[A-Za-z]+0*/, '');
              return (
                pWr === cleanWr ||
                `WR${pWr}` === cleanWr ||
                (cleanDigits && pDigits === cleanDigits)
              );
            })
          : undefined;

        const baseId = it.id || `item-${idx}`;
        const uniqueRowId = seenRowIds.has(baseId) ? `${baseId}-${idx}` : baseId;
        seenRowIds.add(uniqueRowId);

        if (dbPkg) {
          const loc =
            dbPkg.posicionEstante ||
            (dbPkg.anaquel && dbPkg.piso ? `${dbPkg.anaquel}-${dbPkg.piso}` : dbPkg.anaquel) ||
            it.posicionEstante ||
            '—';
          const statusLabel = formatEstadoAmexLabel(dbPkg.estadoAmex, dbPkg.ubicacionActual);
          rows.push({
            id: uniqueRowId,
            codigoWarehouse: dbPkg.numeroReciboBodega.toUpperCase(),
            nombre: (dbPkg.nombreConsignatario || it.consignatario || 'CLIENTE AMEX').trim(),
            codigoTib: (dbPkg.tracking || it.tracking || '—').trim(),
            pesoKg:
              dbPkg.pesoKg !== undefined && dbPkg.pesoKg !== null
                ? String(dbPkg.pesoKg)
                : it.pesoKg
                ? String(it.pesoKg)
                : '0',
            ubicacion: loc,
            estadoAmexLabel: statusLabel,
            codigoEscaneado: (dbPkg.tracking || it.tracking || '').trim(),
            estado: 'ENCONTRADO',
            nombreEscaneado: statusLabel,
            isManifestFound: true,
            itemRef: it,
            rawIndex: idx
          });
        } else if (cleanWr) {
          rows.push({
            id: uniqueRowId,
            codigoWarehouse: cleanWr,
            nombre:
              it.consignatario && it.consignatario !== '[NOMBRE]'
                ? it.consignatario
                : 'NO ENCONTRADO EN BD',
            codigoTib: it.tracking || '—',
            pesoKg: it.pesoKg ? String(it.pesoKg) : '—',
            ubicacion: it.posicionEstante && it.posicionEstante !== 'REC' ? it.posicionEstante : '—',
            estadoAmexLabel: it.notas || 'NO REGISTRADO',
            codigoEscaneado: '',
            estado: 'NO ENCONTRADO',
            nombreEscaneado: it.notas || 'NO REGISTRADO',
            isManifestFound: false,
            itemRef: it,
            rawIndex: idx
          });
        } else {
          rows.push({
            id: uniqueRowId,
            codigoWarehouse: '',
            nombre: '',
            codigoTib: '',
            pesoKg: '',
            ubicacion: '',
            estadoAmexLabel: '',
            codigoEscaneado: '',
            estado: '',
            nombreEscaneado: '',
            isManifestFound: false,
            itemRef: it,
            rawIndex: idx
          });
        }
      });

      return rows;
    }

    items.forEach((it, idx) => {
      const consignee = (it.consignatario || '').trim();
      const effectiveGroupConsignee = inheritedConsignees.get(it.id || `idx-${idx}`) || consignee;

      const wrUpper = (it.codigoWr || '').toUpperCase().replace(/\s+/g, '');
      const tibUpper = (it.casillero || '').toUpperCase().replace(/\s+/g, '');
      const wrDigits = wrUpper.replace(/^[A-Za-z]+0*/, '');

      const isManifestFound =
        (wrUpper && allScannedCodes.has(wrUpper)) ||
        (wrUpper && allScannedCodes.has(`WR${wrUpper}`)) ||
        (tibUpper && allScannedCodes.has(tibUpper)) ||
        (wrDigits && allScannedCodes.has(wrDigits));

      let displayEstado: 'ENCONTRADO' | 'NO ENCONTRADO' | 'PENDIENTE' | '' = '';
      const scannedCode = (it.tracking || '').trim();
      let scannedName = (it.notas || '').trim();

      if (scannedCode) {
        // 1. Buscar coincidencia únicamente en el manifiesto de la hoja actual (con nombre heredado de grupo en Columna A)
        const manifestMatch = checkCodeInManifest(scannedCode);

        // 2. Resolver el nombre correspondiente exclusivamente desde la Columna A de la fila encontrada en la hoja
        const relatedName =
          manifestMatch && manifestMatch.consignatario && manifestMatch.consignatario !== '[NOMBRE]'
            ? manifestMatch.consignatario.trim()
            : '';

        if (manifestMatch) {
          displayEstado = 'ENCONTRADO';
          scannedName = relatedName || 'CLIENTE AMEX';
        } else {
          displayEstado = 'NO ENCONTRADO';
          scannedName = 'NO ASIGNADO';
        }
      }

      const tib = extractLast6Digits(it.codigoWr) || it.casillero || '';
      const prevEffective =
        idx > 0 ? inheritedConsignees.get(items[idx - 1]?.id || `idx-${idx - 1}`) || '' : '';
      const nextEffective =
        idx < items.length - 1 ? inheritedConsignees.get(items[idx + 1]?.id || `idx-${idx + 1}`) || '' : '';

      const isGroupStart = (idx === 0 || prevEffective !== effectiveGroupConsignee) && !!effectiveGroupConsignee;
      const isGroupEnd = (idx === items.length - 1 || nextEffective !== effectiveGroupConsignee) && !!effectiveGroupConsignee;

      const baseId = it.id || `item-${idx}`;
      const uniqueRowId = seenRowIds.has(baseId) ? `${baseId}-${idx}` : baseId;
      seenRowIds.add(uniqueRowId);

      rows.push({
        id: uniqueRowId,
        nombre: consignee,
        codigoWarehouse: it.codigoWr || '',
        codigoTib: tib,
        codigoEscaneado: scannedCode,
        estado: displayEstado,
        nombreEscaneado: scannedName,
        isGroupStart,
        isGroupEnd,
        isManifestFound: !!isManifestFound,
        itemRef: it,
        rawIndex: idx
      });
    });

    return rows;
  }, [activeTemplateMode, allScannedCodes, checkCodeInManifest, inheritedConsignees, items, paquetes]);

  // Filtrado de filas
  const visibleRows = useMemo(() => {
    if (!searchInSheet.trim()) return sheetRows;
    const q = searchInSheet.toLowerCase().trim();
    return sheetRows.filter(
      r =>
        r.nombre.toLowerCase().includes(q) ||
        r.codigoWarehouse.toLowerCase().includes(q) ||
        r.codigoTib.toLowerCase().includes(q) ||
        r.codigoEscaneado.toLowerCase().includes(q) ||
        r.estado.toLowerCase().includes(q) ||
        r.nombreEscaneado.toLowerCase().includes(q)
    );
  }, [sheetRows, searchInSheet]);

  // Estadísticas
  const stats: SheetStats = useMemo(() => {
    if (activeTemplateMode === 'BLANK') {
      return { total: 0, encontrados: 0, noEncontrados: 0, pendientes: 0, progreso: 0 };
    }

    if (activeTemplateMode === 'WR_LOOKUP') {
      const filled = sheetRows.filter(r => !!r.codigoWarehouse);
      const total = filled.length;
      const encontrados = filled.filter(r => r.estado === 'ENCONTRADO').length;
      const noEncontrados = filled.filter(r => r.estado === 'NO ENCONTRADO').length;
      const progreso = total > 0 ? Math.round((encontrados / total) * 100) : 0;
      return { total, encontrados, noEncontrados, pendientes: 0, progreso };
    }

    const total = items.filter(i => !!i.codigoWr).length;
    const manifestEncontrados = items.filter(i => {
      if (!i.codigoWr) return false;
      const wr = i.codigoWr.toUpperCase().replace(/\s+/g, '');
      const digits = wr.replace(/^[A-Za-z]+0*/, '');
      const tib = (i.casillero || '').toUpperCase().replace(/\s+/g, '');
      return (
        allScannedCodes.has(wr) ||
        allScannedCodes.has(`WR${wr}`) ||
        allScannedCodes.has(tib) ||
        (digits && allScannedCodes.has(digits))
      );
    }).length;

    const noEncontrados = items.filter(i => i.tracking && i.estado === 'NO_LISTADO').length;
    const pendientes = Math.max(0, total - manifestEncontrados);
    const progreso = total > 0 ? Math.round((manifestEncontrados / total) * 100) : 0;
    return { total, encontrados: manifestEncontrados, noEncontrados, pendientes, progreso };
  }, [activeTemplateMode, allScannedCodes, items, sheetRows]);

  // Operaciones de negocio
  const handleLoadFromDatabase = async () => {
    if (!activeHojaId || paquetes.length === 0) return;

    const existingCodes = new Set(items.map(i => (i.codigoWr || '').toUpperCase()));
    const unaddedPackages = paquetes.filter(p => p.numeroReciboBodega && !existingCodes.has(p.numeroReciboBodega.toUpperCase()));

    if (unaddedPackages.length === 0) {
      await alertDialog({
        title: 'Paquetes en hoja',
        message: 'Todos los paquetes existentes ya se encuentran en la hoja.',
        variant: 'info'
      });
      return;
    }

    const rowsToInsert = unaddedPackages.map((p, idx) => ({
      hoja_id: activeHojaId,
      codigo_wr: p.numeroReciboBodega.toUpperCase(),
      casillero: extractLast6Digits(p.numeroReciboBodega),
      consignatario: p.nombreConsignatario || '',
      peso_kg: p.pesoKg || 0,
      posicion_estante: p.posicionEstante || 'OFI',
      notas: '',
      estado: 'PENDIENTE',
      veces_escaneado: 0,
      orden: items.length + idx + 1
    }));

    try {
      const data = await sheetsService.insertItems(rowsToInsert);
      if (data && data.length > 0) {
        soundEffects.playBulkLoaded();
        fetchItems(activeHojaId);
      }
    } catch (err) {
      console.error('Error loading packages into sheet:', err);
    }
  };

  const handleExportExcel = () => {
    const fileName = `${docTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;

    if (activeTemplateMode === 'BLANK') {
      const currentHoja = hojas.find(h => h.id === activeHojaId) as
        | (HojaCotejo & { extraCells?: Record<string, string> })
        | undefined;
      const cells = currentHoja?.extraCells || {};
      const entries = Object.entries(cells).filter(([, v]) => v && String(v).trim() !== '');
      if (entries.length === 0) return;

      let maxRow = 1;
      let maxCol = 0;
      for (const [k] of entries) {
        const [colLetter, rowStr] = k.split('-');
        const cIdx = SPREADSHEET_COLUMNS.indexOf(colLetter as any);
        const rNum = Number(rowStr);
        if (cIdx > maxCol) maxCol = cIdx;
        if (rNum > maxRow) maxRow = rNum;
      }

      const colKeys = SPREADSHEET_COLUMNS.slice(0, maxCol + 1);
      const exportData: Array<Record<string, string>> = [];
      for (let r = 1; r <= maxRow; r++) {
        const rowObj: Record<string, string> = {};
        for (const col of colKeys) {
          rowObj[col] = cells[`${col}-${r}`] || '';
        }
        exportData.push(rowObj);
      }

      const columns = colKeys.map(key => ({
        header: { value: key, fontWeight: 'bold' as const },
        cell: (row: Record<string, string>) => ({ value: row[key] ?? '' }),
        width: 16
      }));
      void writeXlsxFile(exportData, { sheet: docTitle || 'Hoja 1', columns }).toFile(fileName);
      return;
    }

    if (sheetRows.length === 0) return;

    if (activeTemplateMode === 'WR_LOOKUP') {
      const exportData = sheetRows
        .filter(r => !!r.codigoWarehouse)
        .map((r, idx) => ({
          '#': idx + 1,
          'CODIGO WR': r.codigoWarehouse,
          'NOMBRE CLIENTE': r.nombre,
          'TRACKING': r.codigoTib,
          'PESO (KG)': r.pesoKg || '',
          'UBICACIÓN': r.ubicacion || '',
          'ESTADO AMEX': r.estadoAmexLabel || ''
        }));

      if (exportData.length === 0) return;

      const columns = Object.keys(exportData[0]).map(key => ({
        header: { value: key, fontWeight: 'bold' as const },
        cell: (row: Record<string, string | number>) => ({ value: row[key] ?? '' }),
        width: Math.min(Math.max(key.length + 4, 14), 32)
      }));
      void writeXlsxFile(exportData, { sheet: docTitle || 'Escáner WR', columns }).toFile(fileName);
      return;
    }

    const exportData = sheetRows
      .filter(r => !r.isSeparator)
      .map((r, idx) => ({
        '#': idx + 1,
        'NOMBRE': r.nombre,
        'CODIGO WAREHOUSE': r.codigoWarehouse,
        'CODIGO TIB': r.codigoTib,
        'CODIGO ESCANEADO': r.codigoEscaneado,
        'ESTADO': r.estado,
        'NOMBRE ESCANEADO': r.nombreEscaneado
      }));

    if (exportData.length === 0) return;

    const columns = Object.keys(exportData[0]).map((key) => ({
      header: { value: key, fontWeight: 'bold' as const },
      cell: (row: Record<string, string | number>) => ({ value: row[key] ?? '' }),
      width: Math.min(Math.max(key.length + 4, 14), 32)
    }));
    void writeXlsxFile(exportData, { sheet: docTitle || 'AMEX WR', columns }).toFile(fileName);
  };

  const handleResetScans = async () => {
    if (!activeHojaId) return;

    if (activeTemplateMode === 'WR_LOOKUP') {
      const confirmed = await confirmDialog({
        title: 'Limpiar escaneos WR',
        message: '¿Seguro que deseas limpiar todos los códigos WR consultados en esta hoja?',
        confirmText: 'Sí, limpiar hoja',
        variant: 'warning'
      });
      if (!confirmed) return;

      setItems([]);
      try {
        const { supabase } = await import('@/lib/supabase/client');
        await supabase.from('hojas_cotejo_items').delete().eq('hoja_id', activeHojaId);
      } catch (err) {
        console.error('Error clearing WR lookup items:', err);
      }
      return;
    }

    const confirmed = await confirmDialog({
      title: 'Reiniciar cotejo',
      message: '¿Seguro que deseas reiniciar el cotejo? Los códigos escaneados en la Columna D se borrarán y volverán a PENDIENTE.',
      confirmText: 'Sí, reiniciar cotejo',
      variant: 'warning'
    });
    if (!confirmed) {
      return;
    }

    setItems(prev =>
      prev.map(i => ({
        ...i,
        estado: 'PENDIENTE',
        tracking: '',
        notas: '',
        escaneadoEn: undefined,
        escaneadoPor: undefined,
        vecesEscaneado: 0
      }))
    );

    try {
      await sheetsService.resetScans(activeHojaId);
    } catch (err) {
      console.error('Error resetting scans:', err);
    }
  };

  const handleSyncToMainPackages = async () => {
    const scannedItems = items.filter(i => i.estado === 'ESCANEADO' || (i.tracking && checkCodeInManifest(i.tracking)));
    if (scannedItems.length === 0) {
      await alertDialog({
        title: 'Sin paquetes encontrados',
        message: 'No hay paquetes marcados como ENCONTRADO para sincronizar.',
        variant: 'info'
      });
      return;
    }

    const confirmed = await confirmDialog({
      title: 'Sincronizar a Almacén Central',
      message: `¿Deseas actualizar el estado de los ${scannedItems.length} paquetes cotejados en el inventario principal a 'En Almacén Central Lince'?`,
      confirmText: 'Sincronizar paquetes',
      variant: 'info'
    });
    if (!confirmed) {
      return;
    }

    try {
      const updatedCount = await sheetsService.syncScannedToMainPackages(scannedItems);
      await alertDialog({
        title: 'Sincronización completada',
        message: `Se actualizaron ${updatedCount} paquetes en la base de datos central con éxito.`,
        variant: 'success'
      });
    } catch (err) {
      console.error('Error syncing to main packages:', err);
      await alertDialog({
        title: 'Error de sincronización',
        message: 'Error al sincronizar con el inventario principal.',
        variant: 'danger'
      });
    }
  };

  const handleClearScanAtRow = useCallback(async (itemId: string) => {
    setItems(prev =>
      prev.map(i =>
        i.id === itemId
          ? {
              ...i,
              tracking: '',
              notas: '',
              estado: 'PENDIENTE',
              escaneadoEn: undefined,
              escaneadoPor: undefined,
              vecesEscaneado: 0
            }
          : i
      )
    );

    try {
      await sheetsService.clearScanAtRow(itemId);
    } catch (err) {
      console.error('Error clearing scan at row:', err);
    }
  }, []);

  const handleTitleBlur = async () => {
    if (!activeLibroId || !docTitle.trim()) return;
    try {
      await sheetsService.updateSheetTitle(activeLibroId, docTitle.trim());
      setHojas(prev => prev.map(h => (h.id === activeLibroId ? { ...h, titulo: docTitle.trim() } : h)));
    } catch (err) {
      console.error('Error updating title:', err);
    }
  };

  // Abrir y cerrar libros
  const openWorkbook = useCallback((libroId: string) => {
    setActiveLibroId(libroId);
    const root = hojas.find(h => h.id === libroId);
    if (root) setDocTitle(root.titulo || 'AMEX WR');

    const subSheets = hojas
      .filter(h => h.id === libroId || h.libroId === libroId)
      .sort((a, b) => new Date(a.creadoEn).getTime() - new Date(b.creadoEn).getTime());

    if (subSheets.length > 0) {
      setActiveHojaId(subSheets[0].id);
    } else {
      setActiveHojaId(libroId);
    }
  }, [hojas]);

  const closeWorkbook = useCallback(() => {
    setActiveLibroId(null);
    setActiveHojaId(null);
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/amex-excel/d/')) {
      window.history.replaceState(null, '', '/amex-excel');
    }
  }, []);

  // Gestión de pestañas (hojas) dentro del libro activo
  const handleAddSubSheet = useCallback(async (customName?: string) => {
    if (!activeLibroId) return;
    const activeLibro = hojas.find(h => h.id === activeLibroId) as
      | (HojaCotejo & { templateMode?: SheetTemplateMode })
      | undefined;
    const currentCount = activeBookSheets.length;
    const tabName = customName?.trim() || `Hoja ${currentCount + 1}`;

    try {
      const newSubSheet = await sheetsService.createSubSheet(
        activeLibroId,
        tabName,
        operatorName,
        activeLibro?.tipoProceso || 'RECEPCION_LINCE',
        activeTemplateMode
      );
      if (newSubSheet) {
        setHojas(prev => [...prev, newSubSheet]);
        setActiveHojaId(newSubSheet.id);
        soundEffects.playBulkLoaded();
      }
    } catch (err) {
      console.error('Error creating sub-sheet:', err);
    }
  }, [activeLibroId, activeBookSheets.length, activeTemplateMode, hojas, operatorName]);

  const handleRenameTab = useCallback(async (sheetId: string, newTabName: string) => {
    if (!newTabName.trim()) return;
    try {
      await sheetsService.updateSheetTabName(sheetId, newTabName.trim());
      setHojas(prev =>
        prev.map(h =>
          h.id === sheetId
            ? { ...h, nombreHoja: newTabName.trim(), ...(h.libroId ? { titulo: newTabName.trim() } : {}) }
            : h
        )
      );
    } catch (err) {
      console.error('Error renaming tab:', err);
    }
  }, []);

  const handleDeleteTab = useCallback(async (sheetId: string) => {
    if (activeBookSheets.length <= 1) {
      await alertDialog({
        title: 'Límite de hojas',
        message: 'Un libro de cálculo debe tener al menos una hoja.',
        variant: 'warning'
      });
      return;
    }

    const sheetToDelete = hojas.find(h => h.id === sheetId);
    const sheetName = sheetToDelete?.nombreHoja || sheetToDelete?.titulo || 'esta hoja';
    const confirmed = await confirmDialog({
      title: 'Eliminar pestaña',
      message: `¿Eliminar definitivamente la pestaña "${sheetName}" y todos sus datos cotejados?`,
      confirmText: 'Sí, eliminar pestaña',
      variant: 'danger'
    });
    if (!confirmed) {
      return;
    }

    try {
      await sheetsService.deleteSheet(sheetId);
      const remaining = activeBookSheets.filter(h => h.id !== sheetId);
      setHojas(prev => prev.filter(h => h.id !== sheetId));
      if (activeHojaId === sheetId && remaining.length > 0) {
        setActiveHojaId(remaining[0].id);
      }
    } catch (err) {
      console.error('Error deleting tab:', err);
    }
  }, [activeBookSheets, activeHojaId, hojas]);

  const handleDuplicateTab = useCallback(async (sheetId: string) => {
    const target = hojas.find(h => h.id === sheetId);
    if (!target) return;
    try {
      const dup = await sheetsService.duplicateSheet(sheetId, operatorName, target);
      if (dup) {
        setHojas(prev => [...prev, dup]);
        setActiveHojaId(dup.id);
        soundEffects.playBulkLoaded();
      }
    } catch (err) {
      console.error('Error duplicating tab:', err);
    }
  }, [hojas, operatorName]);

  // Hub callbacks (para libros completos)
  const handleCreateSheetFromHub = async (
    title: string,
    tipoProceso?: TipoProcesoCotejo,
    templateMode?: SheetTemplateMode
  ) => {
    try {
      const resolvedMode = resolveSheetTemplateMode(tipoProceso, templateMode);
      const desc =
        resolvedMode === 'BLANK'
          ? 'Hoja de cálculo libre en blanco'
          : resolvedMode === 'WR_LOOKUP'
          ? 'Escáner de códigos WR con autocompletado desde Base de Datos'
          : 'Cotejo y pistoleo en tiempo real de bultos recibidos';
      const newBook = await sheetsService.createSheet(
        title,
        desc,
        tipoProceso,
        operatorName,
        null,
        'Hoja 1',
        resolvedMode
      );
      if (newBook) {
        setHojas(prev => [newBook, ...prev]);
        setActiveLibroId(newBook.id);
        setActiveHojaId(newBook.id);
        setDocTitle(newBook.titulo);
      }
    } catch (err) {
      console.error('Error creating sheet from hub:', err);
    }
  };

  const handleRenameSheetFromHub = async (sheetId: string, newTitle: string) => {
    try {
      await sheetsService.updateSheetTitle(sheetId, newTitle);
      setHojas(prev => prev.map(h => (h.id === sheetId ? { ...h, titulo: newTitle } : h)));
      if (activeLibroId === sheetId) setDocTitle(newTitle);
    } catch (err) {
      console.error('Error renaming sheet:', err);
    }
  };

  const handleDeleteSheetFromHub = async (sheetId: string) => {
    try {
      await sheetsService.deleteSheet(sheetId);
      setHojas(prev => prev.filter(h => h.id !== sheetId && h.libroId !== sheetId));
      if (activeLibroId === sheetId) {
        setActiveLibroId(null);
        setActiveHojaId(null);
      }
    } catch (err) {
      console.error('Error deleting sheet:', err);
    }
  };

  const handleDuplicateSheetFromHub = async (sheetId: string) => {
    const original = hojas.find(h => h.id === sheetId);
    if (!original) return;

    try {
      const newBook = await sheetsService.duplicateSheet(sheetId, operatorName, original);
      if (newBook) {
        setHojas(prev => [newBook, ...prev]);
        setActiveLibroId(newBook.id);
        setActiveHojaId(newBook.id);
        setDocTitle(newBook.titulo);
      }
    } catch (err) {
      console.error('Error duplicating sheet:', err);
    }
  };

  return {
    hojas,
    setHojas,
    libros,
    activeBookSheets,
    activeLibroId,
    setActiveLibroId,
    activeHojaId,
    setActiveHojaId,
    activeTemplateMode,
    openWorkbook,
    closeWorkbook,
    handleAddSubSheet,
    handleRenameTab,
    handleDeleteTab,
    handleDuplicateTab,
    items,
    setItems,
    isLoadingSheets,
    isLoadingItems,
    docTitle,
    setDocTitle,
    isStarred,
    setIsStarred,
    searchInSheet,
    setSearchInSheet,
    inheritedConsignees,
    allScannedCodes,
    checkCodeInManifest,
    sheetRows,
    visibleRows,
    stats,
    fetchHojas,
    fetchItems,
    handleLoadFromDatabase,
    handleExportExcel,
    handleResetScans,
    handleSyncToMainPackages,
    handleClearScanAtRow,
    handleTitleBlur,
    handleCreateSheetFromHub,
    handleRenameSheetFromHub,
    handleDeleteSheetFromHub,
    handleDuplicateSheetFromHub
  };
}
