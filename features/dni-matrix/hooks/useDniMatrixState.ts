import { useState, useEffect, useCallback, useRef } from 'react';
import { dniDb, DniSlotData } from '@/lib/dni-matrix/db';
import { DniPrintSize } from '@/lib/dni-matrix/docx-exporter';
import { ToastMessage, DniFilterType, ZoomImageState, DniStats, CloudSyncStatus } from '../types';
import { compressImageForAi } from '@/lib/utils/imageCompressor';
import { DniCloudService } from '../services/dniCloud.service';

export function useDniMatrixState(currentUser?: { nombre?: string; email?: string; rol?: string; id?: string } | null) {
  const [totalSlots, setTotalSlots] = useState<number>(100);
  const [printSize, setPrintSize] = useState<DniPrintSize>('xlarge');
  const [activeSlotId, setActiveSlotIdState] = useState<number>(1);
  const [focusedSide, setFocusedSide] = useState<'anverso' | 'reverso' | null>(null);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<CloudSyncStatus>('synced');
  const isHydratedRef = useRef<boolean>(false);
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const setActiveSlotId = useCallback((idOrFn: number | ((prev: number) => number)) => {
    setActiveSlotIdState((prev) => {
      const nextId = typeof idOrFn === 'function' ? idOrFn(prev) : idOrFn;
      dniDb.saveSetting('activeSlotId', nextId).catch(() => {});
      return nextId;
    });
  }, []);

  const [slotsData, setSlotsData] = useState<Record<number, DniSlotData>>({});
  const [currentFilter, setCurrentFilter] = useState<DniFilterType>('all');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [quickJumpVal, setQuickJumpVal] = useState<string>('');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isExtractingName, setIsExtractingName] = useState<boolean>(false);

  // Modals state
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);
  const [showPdfModal, setShowPdfModal] = useState<boolean>(false);
  const [showAmexLinkModal, setShowAmexLinkModal] = useState<boolean>(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState<boolean>(false);

  const [zoomImage, setZoomImage] = useState<ZoomImageState | null>(null);
  const [previewZoom, setPreviewZoomState] = useState<number>(1.2);
  const [dragHoverSide, setDragHoverSide] = useState<'anverso' | 'reverso' | 'surface' | null>(null);

  const setPreviewZoom = useCallback((zoomOrFn: number | ((prev: number) => number)) => {
    setPreviewZoomState((prev) => {
      const nextZoom = typeof zoomOrFn === 'function' ? zoomOrFn(prev) : zoomOrFn;
      dniDb.saveSetting('previewZoom', nextZoom).catch(() => {});
      return nextZoom;
    });
  }, []);

  const activeSlotRef = useRef<number>(activeSlotId);
  activeSlotRef.current = activeSlotId;

  // Toast helper
  const showToast = useCallback((text: string, type: 'info' | 'success' | 'error' = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  // Web Audio API feedback
  const playSound = useCallback(
    (type: 'complete' | 'paste' | 'click' | 'error') => {
      if (!soundEnabled || typeof window === 'undefined') return;
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        if (type === 'complete') {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(587.33, ctx.currentTime);
          osc.frequency.setValueAtTime(880.0, ctx.currentTime + 0.1);
          gain.gain.setValueAtTime(0.2, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.4);
        } else if (type === 'paste') {
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(440, ctx.currentTime);
          gain.gain.setValueAtTime(0.12, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.16);
        } else if (type === 'click') {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(320, ctx.currentTime);
          gain.gain.setValueAtTime(0.05, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.08);
        }
      } catch {
        // Silencioso
      }
    },
    [soundEnabled]
  );

  // Carga inicial (Prioridad: IndexedDB local primero -> Sincronización y Merge con Supabase Nube)
  useEffect(() => {
    let isMounted = true;
    async function initData() {
      // 1. Cargar SIEMPRE primero desde IndexedDB local (Inmediato, offline-first, seguro contra pérdidas)
      const savedSlots = await dniDb.loadAllSlots();
      const localMap: Record<number, DniSlotData> = {};
      savedSlots.forEach((s) => {
        localMap[s.id] = s;
      });

      if (isMounted && Object.keys(localMap).length > 0) {
        setSlotsData(localMap);
      }

      // Cargar configuraciones de IndexedDB
      const savedTotal = await dniDb.getSetting<number>('totalSlots', 100);
      if (isMounted) setTotalSlots(savedTotal);

      const savedSound = await dniDb.getSetting<boolean>('soundEnabled', true);
      if (isMounted) setSoundEnabled(savedSound);

      const savedPrintSize = await dniDb.getSetting<DniPrintSize>('dniPrintSize', 'xlarge');
      const effectivePrintSize = (!savedPrintSize || savedPrintSize === 'large') ? 'xlarge' : savedPrintSize;
      if (isMounted) {
        setPrintSize(effectivePrintSize);
        dniDb.saveSetting('dniPrintSize', effectivePrintSize).catch(() => {});
      }

      const savedZoom = await dniDb.getSetting<number>('previewZoom', 1.2);
      if (isMounted) {
        if (savedZoom && savedZoom !== 1.78 && savedZoom !== 1.14) {
          setPreviewZoomState(savedZoom);
        } else {
          setPreviewZoomState(1.2);
          dniDb.saveSetting('previewZoom', 1.2).catch(() => {});
        }
      }

      const savedActiveSlot = await dniDb.getSetting<number>('activeSlotId', 1);
      if (isMounted && savedActiveSlot && savedActiveSlot >= 1 && savedActiveSlot <= (savedTotal || 100)) {
        setActiveSlotIdState(savedActiveSlot);
      }

      // 2. Si hay usuario logueado, sincronizar/enriquecer con la nube (MERGE INTELIGENTE, NUNCA destructivo)
      if (currentUser?.email) {
        setCloudSyncStatus('saving');
        try {
          const cloudDraft = await DniCloudService.loadDraftFromCloud(currentUser.email);
          if (isMounted && cloudDraft && Array.isArray(cloudDraft.slots) && cloudDraft.slots.length > 0) {
            // MERGE: Para cada slot, si local existe y tiene imágenes/datos, PRESERVAR local!
            const mergedMap: Record<number, DniSlotData> = { ...localMap };

            cloudDraft.slots.forEach((cs) => {
              const ls = localMap[cs.id];
              if (!ls) {
                // Cupo nuevo de la nube que no estaba en local
                mergedMap[cs.id] = cs;
                dniDb.saveSlot(cs).catch(() => {});
              } else {
                // Fusionar inteligentemente sin sobreescribir imágenes locales si la nube no las tiene o están recortadas
                const hasLocalAnverso = Boolean(ls.anverso && !ls.anverso.includes('[local_only]'));
                const hasCloudAnverso = Boolean(cs.anverso && !cs.anverso.includes('[local_only]'));
                const hasLocalReverso = Boolean(ls.reverso && !ls.reverso.includes('[local_only]'));
                const hasCloudReverso = Boolean(cs.reverso && !cs.reverso.includes('[local_only]'));

                const merged: DniSlotData = {
                  ...cs,
                  ...ls,
                  label: ls.label || cs.label || '',
                  dni: ls.dni || cs.dni || '',
                  anverso: hasLocalAnverso ? ls.anverso : (hasCloudAnverso ? cs.anverso : ls.anverso),
                  reverso: hasLocalReverso ? ls.reverso : (hasCloudReverso ? cs.reverso : ls.reverso),
                  anversoRotation: ls.anversoRotation ?? cs.anversoRotation ?? 0,
                  reversoRotation: ls.reversoRotation ?? cs.reversoRotation ?? 0,
                  updatedAt: Math.max(ls.updatedAt || 0, cs.updatedAt || 0)
                };
                mergedMap[cs.id] = merged;
                dniDb.saveSlot(merged).catch(() => {});
              }
            });

            setSlotsData(mergedMap);

            if (cloudDraft.totalSlots && cloudDraft.totalSlots > savedTotal) {
              setTotalSlots(cloudDraft.totalSlots);
              dniDb.saveSetting('totalSlots', cloudDraft.totalSlots).catch(() => {});
            }
          }
        } catch (err) {
          console.warn('[DNI Matrix] Error sincronizando con borrador remoto en initData:', err);
        }
      }

      if (isMounted) {
        setCloudSyncStatus('synced');
        isHydratedRef.current = true;
      }
    }
    initData();
    return () => {
      isMounted = false;
    };
  }, [currentUser?.email]);

  // Sincronización continua en la nube (Debounce 1500ms al detectar cambios)
  useEffect(() => {
    if (!isHydratedRef.current || !currentUser?.email) return;

    setCloudSyncStatus('saving');
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = setTimeout(async () => {
      const slotsList = Object.values(slotsData).filter(
        (s) => s && (s.anverso || s.reverso || s.label || s.dni)
      );
      const ok = await DniCloudService.saveDraftToCloud({
        slots: slotsList,
        settings: {
          printSize,
          soundEnabled,
          activeSlotId
        },
        totalSlots,
        userEmail: currentUser.email!,
        userId: currentUser?.id
      });
      setCloudSyncStatus(ok ? 'synced' : 'error');
    }, 1500);

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [slotsData, totalSlots, printSize, soundEnabled, activeSlotId, currentUser?.email, currentUser?.id]);

  const clearCloudDraft = useCallback(async () => {
    if (!currentUser?.email) return;
    setCloudSyncStatus('saving');
    const ok = await DniCloudService.clearDraftFromCloud(currentUser.email);
    setCloudSyncStatus(ok ? 'synced' : 'error');
  }, [currentUser?.email]);

  const padNum = (num: number): string => String(num).padStart(3, '0');

  const getSlot = useCallback(
    (id: number): DniSlotData => {
      return slotsData[id] || { id };
    },
    [slotsData]
  );

  const updateSlot = useCallback(async (slot: DniSlotData) => {
    setSlotsData((prev) => ({ ...prev, [slot.id]: slot }));
    await dniDb.saveSlot(slot);
  }, []);

  const getSlotStatus = (slot?: DniSlotData): 'ready' | 'partial' | 'empty' => {
    if (!slot) return 'empty';
    if (slot.anverso && slot.reverso) return 'ready';
    if (slot.anverso || slot.reverso) return 'partial';
    return 'empty';
  };

  const jumpToNextIncompleteSlot = useCallback(() => {
    let nextId: number | null = null;
    for (let id = activeSlotRef.current + 1; id <= totalSlots; id++) {
      if (getSlotStatus(slotsData[id]) !== 'ready') {
        nextId = id;
        break;
      }
    }
    if (!nextId) {
      for (let id = 1; id < activeSlotRef.current; id++) {
        if (getSlotStatus(slotsData[id]) !== 'ready') {
          nextId = id;
          break;
        }
      }
    }

    if (nextId) {
      playSound('click');
      setActiveSlotId(nextId);
      setFocusedSide(null);
      showToast(`Avanzando a cupo pendiente #${padNum(nextId)}`, 'info');
    } else {
      if (activeSlotRef.current < totalSlots) {
        playSound('click');
        setActiveSlotId(activeSlotRef.current + 1);
        setFocusedSide(null);
        showToast(`Avanzando a cupo #${padNum(activeSlotRef.current + 1)}`, 'info');
      } else {
        showToast('¡Felicidades! Todos los cupos están 100% completos.', 'success');
        playSound('complete');
      }
    }
  }, [slotsData, totalSlots, playSound, showToast, setActiveSlotId]);

  const handleExtractNameWithAi = async () => {
    const slot = getSlot(activeSlotId);
    if (!slot.anverso) {
      playSound('error');
      showToast('⚠️ Primero pega o carga la imagen del ANVERSO (frente) para que AMEXito lea el nombre.', 'error');
      return;
    }

    // Señalizar al sistema que hay una extracción de IA en curso para pausar el monitor de sesión
    if (typeof window !== 'undefined') {
      (window as any).__AMEX_AI_EXTRACTION_ACTIVE__ = true;
    }

    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, 25000); // 25s timeout para salvaguardar la UI

    try {
      setIsExtractingName(true);
      playSound('click');
      showToast('🤖 AMEXito está leyendo el DNI...', 'info');

      // Optimización de nitidez y rotación: Reducir a 1024px para transferencia ultra-rápida a OpenAI Vision
      const optimizedImage = await compressImageForAi(slot.anverso, 1024, 0.80, slot.anversoRotation || 0);

      const res = await fetch('/api/ai/extract-dni-name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: optimizedImage }),
        signal: abortController.signal
      });

      clearTimeout(timeoutId);

      if (res.status === 401) {
        showToast('⚠️ Sesión ocupada. Por favor reintenta la extracción.', 'error');
        return;
      }

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success || (!data.nombre_completo && !data.dni)) {
        throw new Error(data.error || 'AMEXito no detectó nombres ni DNI legibles en la imagen.');
      }

      const extractedName = (data.nombre_completo || '').toUpperCase().trim();
      const extractedDni = (data.dni || '').trim();

      const updatedSlot: DniSlotData = { ...slot };
      if (extractedName) updatedSlot.label = extractedName;
      if (extractedDni) updatedSlot.dni = extractedDni;

      await updateSlot(updatedSlot);
      playSound('complete');

      const toastDetails: string[] = [];
      if (extractedName) toastDetails.push(extractedName);
      if (extractedDni) toastDetails.push(`DNI: ${extractedDni}`);

      showToast(`🤖 AMEXito extrajo: ${toastDetails.join(' • ')}`, 'success');
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      const isAbort = err instanceof Error && err.name === 'AbortError';
      const msg = isAbort
        ? 'AMEXito tardó más de lo esperado. Por favor reintenta o ingresa el nombre manualmente.'
        : err instanceof Error
        ? err.message
        : 'Error al conectar con AMEXito IA.';
      playSound('error');
      showToast(`❌ ${msg}`, 'error');
    } finally {
      clearTimeout(timeoutId);
      if (typeof window !== 'undefined') {
        (window as any).__AMEX_AI_EXTRACTION_ACTIVE__ = false;
      }
      setIsExtractingName(false);
    }
  };

  const rotateSide = async (side: 'anverso' | 'reverso', degrees: number) => {
    const slot = getSlot(activeSlotId);
    if (!slot[side]) return;
    playSound('click');

    const rotKey = side === 'anverso' ? 'anversoRotation' : 'reversoRotation';
    const currentRot = slot[rotKey] || 0;
    const rawRot = (currentRot + degrees) % 360;
    const newRot = Math.round(((rawRot + 360) % 360) * 10) / 10;

    showToast(`Rotación ${side === 'anverso' ? 'Anverso' : 'Reverso'}: ${newRot}°`);
    await updateSlot({ ...slot, [rotKey]: newRot });
  };

  const setSideRotation = async (side: 'anverso' | 'reverso', targetRotation: number) => {
    const slot = getSlot(activeSlotId);
    if (!slot[side]) return;

    const rotKey = side === 'anverso' ? 'anversoRotation' : 'reversoRotation';
    const rawRot = targetRotation % 360;
    const normalizedRot = Math.round(((rawRot + 360) % 360) * 10) / 10;

    await updateSlot({ ...slot, [rotKey]: normalizedRot });
  };

  const clearSide = async (side: 'anverso' | 'reverso') => {
    const slot = getSlot(activeSlotId);
    if (!slot[side]) return;
    playSound('click');
    const rotKey = side === 'anverso' ? 'anversoRotation' : 'reversoRotation';
    await updateSlot({ ...slot, [side]: null, [rotKey]: 0 });
    showToast(`${side === 'anverso' ? 'Anverso' : 'Reverso'} eliminado`);
  };

  const swapSides = async () => {
    const slot = getSlot(activeSlotId);
    if (!slot.anverso && !slot.reverso) return;
    playSound('click');
    await updateSlot({
      ...slot,
      anverso: slot.reverso,
      reverso: slot.anverso,
      anversoRotation: slot.reversoRotation || 0,
      reversoRotation: slot.anversoRotation || 0
    });
    showToast('Caras intercambiadas exitosamente', 'success');
  };

  const processImagePayload = useCallback(
    async (base64Data: string, explicitSide?: 'anverso' | 'reverso' | null) => {
      const currentId = activeSlotRef.current;
      const currentSlot = getSlot(currentId);

      let sideToAssign = explicitSide || focusedSide;
      if (!sideToAssign) {
        if (!currentSlot.anverso) {
          sideToAssign = 'anverso';
        } else if (!currentSlot.reverso) {
          sideToAssign = 'reverso';
        } else {
          sideToAssign = 'anverso';
        }
      }

      let finalBase64 = base64Data;
      try {
        // Optimizar imágenes hiperpesadas (> 1.2 MB base64) para preservar memoria y agilidad sin perder nitidez de impresión A4
        if (base64Data && base64Data.length > 1_200_000) {
          finalBase64 = await compressImageForAi(base64Data, 1600, 0.90, 0);
        }
      } catch {
        finalBase64 = base64Data;
      }

      const rotKey = sideToAssign === 'anverso' ? 'anversoRotation' : 'reversoRotation';
      const updatedSlot: DniSlotData = {
        ...currentSlot,
        [sideToAssign]: finalBase64,
        [rotKey]: 0
      };

      await updateSlot(updatedSlot);
      const sideName = sideToAssign === 'anverso' ? 'Anverso' : 'Reverso';
      showToast(`${sideName} cargado en Expediente #${padNum(currentId)}`, 'success');

      const isNowComplete = Boolean(updatedSlot.anverso && updatedSlot.reverso);
      if (isNowComplete) {
        playSound('complete');
        setFocusedSide(null);
        showToast(
          `¡Expediente #${padNum(currentId)} completado (2 caras)! Presiona ENTER ⏎ para pasar al siguiente cupo`,
          'success'
        );
      } else {
        playSound('paste');
        setFocusedSide('reverso');
      }
    },
    [focusedSide, getSlot, updateSlot, showToast, playSound]
  );

  const convertUrlToBase64 = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject('No canvas context');
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/jpeg', 0.95));
        } catch {
          fetchBlobUrl(url).then(resolve).catch(reject);
        }
      };
      img.onerror = () => {
        fetchBlobUrl(url).then(resolve).catch(reject);
      };
      img.src = url;
    });
  };

  const fetchBlobUrl = (url: string): Promise<string> => {
    return fetch(url)
      .then((res) => res.blob())
      .then(
        (blob) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          })
      );
  };

  const extractBase64FromDataTransfer = async (dt: DataTransfer): Promise<string | null> => {
    if (dt.files && dt.files.length > 0) {
      for (let i = 0; i < dt.files.length; i++) {
        const f = dt.files[i];
        if (f.type.startsWith('image/')) {
          return new Promise((resolve) => {
            const r = new FileReader();
            r.onload = () => resolve(r.result as string);
            r.onerror = () => resolve(null);
            r.readAsDataURL(f);
          });
        }
      }
    }

    if (dt.items && dt.items.length > 0) {
      for (let i = 0; i < dt.items.length; i++) {
        const item = dt.items[i];
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            return new Promise((resolve) => {
              const r = new FileReader();
              r.onload = () => resolve(r.result as string);
              r.onerror = () => resolve(null);
              r.readAsDataURL(file);
            });
          }
        }
      }
    }

    const html = dt.getData('text/html');
    if (html) {
      const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (match && match[1]) {
        const src = match[1];
        if (src.startsWith('data:image')) return src;
        try {
          return await convertUrlToBase64(src);
        } catch {
          // Fallback
        }
      }
    }

    const uri = dt.getData('text/uri-list') || dt.getData('text/plain');
    if (uri && (uri.startsWith('blob:') || uri.startsWith('http') || uri.startsWith('data:image'))) {
      if (uri.startsWith('data:image')) return uri;
      try {
        return await convertUrlToBase64(uri);
      } catch {
        // Fallback
      }
    }

    return null;
  };

  // Window drag/drop prevention
  useEffect(() => {
    const handleWindowDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
    };

    const handleWindowDrop = async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragHoverSide(null);

      const dt = e.dataTransfer;
      if (!dt) return;

      const base64 = await extractBase64FromDataTransfer(dt);
      if (base64) {
        await processImagePayload(base64, focusedSide);
      }
    };

    window.addEventListener('dragenter', handleWindowDragOver, false);
    window.addEventListener('dragover', handleWindowDragOver, false);
    window.addEventListener('drop', handleWindowDrop, false);

    return () => {
      window.removeEventListener('dragenter', handleWindowDragOver);
      window.removeEventListener('dragover', handleWindowDragOver);
      window.removeEventListener('drop', handleWindowDrop);
    };
  }, [focusedSide, processImagePayload]);

  // Pegado global (Ctrl + V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (
        document.activeElement &&
        (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')
      ) {
        return;
      }

      const items = e.clipboardData?.items;
      if (!items) return;

      let imageItem: DataTransferItem | null = null;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          imageItem = items[i];
          break;
        }
      }

      if (!imageItem) return;

      e.preventDefault();
      const file = imageItem.getAsFile();
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64Data = event.target?.result as string;
        if (base64Data) {
          await processImagePayload(base64Data, focusedSide);
        }
      };

      reader.readAsDataURL(file);
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [focusedSide, processImagePayload]);

  // Atajos de teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isTyping =
        document.activeElement &&
        (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'SELECT');

      if (e.key === 'Enter' && !isTyping) {
        e.preventDefault();
        jumpToNextIncompleteSlot();
      } else if (e.key === 'ArrowLeft' && !isTyping) {
        e.preventDefault();
        if (activeSlotRef.current > 1) {
          playSound('click');
          setActiveSlotId((prev) => prev - 1);
        }
      } else if (e.key === 'ArrowRight' && !isTyping) {
        e.preventDefault();
        if (activeSlotRef.current < totalSlots) {
          playSound('click');
          setActiveSlotId((prev) => prev + 1);
        }
      } else if ((e.key === 'r' || e.key === 'R') && !isTyping && !e.ctrlKey) {
        e.preventDefault();
        const targetSide = focusedSide || 'anverso';
        rotateSide(targetSide, 90);
      } else if (e.key === 'Escape') {
        setShowDeleteConfirmModal(false);
        setShowConfigModal(false);
        setShowPreviewModal(false);
        setShowPdfModal(false);
        setShowAmexLinkModal(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [totalSlots, focusedSide, jumpToNextIncompleteSlot, playSound, setActiveSlotId]);

  // Estadísticas globales
  const allSlotsArray = Array.from({ length: totalSlots }, (_, i) => i + 1);
  const stats: DniStats = allSlotsArray.reduce(
    (acc, id) => {
      const st = getSlotStatus(slotsData[id]);
      if (st === 'ready') acc.ready++;
      else if (st === 'partial') acc.partial++;
      else acc.empty++;
      return acc;
    },
    { ready: 0, partial: 0, empty: 0 }
  );

  const progressPercent = totalSlots > 0 ? Math.round((stats.ready / totalSlots) * 100) : 0;

  const filteredSlotIds = allSlotsArray.filter((id) => {
    const st = getSlotStatus(slotsData[id]);
    if (currentFilter === 'ready') return st === 'ready';
    if (currentFilter === 'partial') return st === 'partial';
    if (currentFilter === 'empty') return st === 'empty';
    return true;
  });

  const activeSlot = getSlot(activeSlotId);
  const activeStatus = getSlotStatus(activeSlot);

  return {
    totalSlots,
    setTotalSlots,
    printSize,
    setPrintSize,
    activeSlotId,
    setActiveSlotId,
    activeSlot,
    activeStatus,
    focusedSide,
    setFocusedSide,
    slotsData,
    setSlotsData,
    currentFilter,
    setCurrentFilter,
    soundEnabled,
    setSoundEnabled,
    quickJumpVal,
    setQuickJumpVal,
    toasts,
    isExtractingName,
    previewZoom,
    setPreviewZoom,
    dragHoverSide,
    setDragHoverSide,
    zoomImage,
    setZoomImage,
    stats,
    progressPercent,
    filteredSlotIds,
    showConfigModal,
    setShowConfigModal,
    showPreviewModal,
    setShowPreviewModal,
    showPdfModal,
    setShowPdfModal,
    showAmexLinkModal,
    setShowAmexLinkModal,
    showDeleteConfirmModal,
    setShowDeleteConfirmModal,
    padNum,
    getSlot,
    updateSlot,
    getSlotStatus,
    jumpToNextIncompleteSlot,
    handleExtractNameWithAi,
    rotateSide,
    setSideRotation,
    clearSide,
    swapSides,
    processImagePayload,
    extractBase64FromDataTransfer,
    playSound,
    showToast,
    cloudSyncStatus,
    clearCloudDraft
  };
}
