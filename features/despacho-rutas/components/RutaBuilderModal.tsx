'use client';

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Clipboard,
  CheckCircle2,
  X,
  AlertCircle,
  ClipboardPaste,
  Sparkles,
  Search,
  Phone,
  MessageCircle,
  Smartphone,
  Eye,
  MapPin,
  UserCheck
} from 'lucide-react';
import { CrearRutaInput, CrearParadaInput } from '@/types/despacho';
import {
  ZONAS_LIMA_DISTRITOS,
  parseQuickPasteRows,
  normalizeDistrito,
  parseWrAndBultos,
  parseWrCodes,
  isWrOrWrList
} from '@/lib/utils/phoneUtils';
import { supabase } from '@/lib/supabase/client';
import { confirmDialog } from '@/lib/dialog';
import { despachoService } from '../services/despacho.service';

interface UsuarioChofer {
  id: string;
  nombre_completo: string;
  email: string;
  rol_nombre?: string;
}

interface RutaBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveRuta: (ruta: CrearRutaInput, paradas: CrearParadaInput[]) => Promise<unknown>;
}

export default function RutaBuilderModal({ isOpen, onClose, onSaveRuta }: RutaBuilderModalProps) {
  // Datos de cabecera de la ruta
  const [choferNombre, setChoferNombre] = useState('');
  const [choferTelefono, setChoferTelefono] = useState('');
  const [vehiculoPlaca, setVehiculoPlaca] = useState('CFM-085');
  const [fechaDespacho, setFechaDespacho] = useState(new Date().toISOString().slice(0, 10));
  const [notas, setNotas] = useState('');

  // Usuarios registrados del sistema para selección de chofer
  const [usuariosSistema, setUsuariosSistema] = useState<UsuarioChofer[]>([]);
  const [isLoadingUsuarios, setIsLoadingUsuarios] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [isCustomChofer, setIsCustomChofer] = useState(false);

  // Paradas de la ruta
  const [paradas, setParadas] = useState<CrearParadaInput[]>([
    {
      destinatario: '',
      wrCodes: '',
      bultos: '1 CJ',
      wrBultos: '1 CJ',
      direccion: '',
      distrito: 'MIRAFLORES',
      telefono: '',
      montoCobro: 0,
      monedaCobro: 'USD'
    }
  ]);

  // Modo pegar desde Excel
  const [showPasteArea, setShowPasteArea] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [pasteError, setPasteError] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSearchingDb, setIsSearchingDb] = useState(false);
  const [dbEnrichMsg, setDbEnrichMsg] = useState<string | null>(null);
  const [activeTabBuilder, setActiveTabBuilder] = useState<'editor' | 'preview'>('editor');

  // Cargar usuarios registrados del sistema al abrir el modal
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsLoadingUsuarios(true);

    despachoService.getUsuariosChoferes()
      .then(users => {
        if (!isMounted) return;
        setUsuariosSistema(users);
        setIsLoadingUsuarios(false);

        if (choferNombre.trim()) {
          const match = users.find(u => u.nombre_completo.toLowerCase() === choferNombre.trim().toLowerCase());
          if (match) {
            setSelectedUserId(match.id);
            setIsCustomChofer(false);
          } else {
            setSelectedUserId('__custom__');
            setIsCustomChofer(true);
          }
        } else if (users.length > 0) {
          // Pre-seleccionar usuario sugerido si existe (ej. Angel u operador de almacén)
          const suggested = users.find(u =>
            u.nombre_completo.toLowerCase().includes('angel') ||
            (u.rol_nombre && u.rol_nombre.toLowerCase().includes('almacen'))
          ) || users[0];

          if (suggested) {
            setSelectedUserId(suggested.id);
            setChoferNombre(suggested.nombre_completo);
          }
        }
      })
      .catch(err => {
        console.warn('Error al cargar usuarios choferes:', err);
        if (isMounted) setIsLoadingUsuarios(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Selección de usuario chofer
  const handleChoferSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedUserId(val);

    if (val === '__custom__') {
      setIsCustomChofer(true);
    } else {
      setIsCustomChofer(false);
      const found = usuariosSistema.find(u => u.id === val);
      if (found) {
        setChoferNombre(found.nombre_completo);
      }
    }
  };

  if (!isOpen) return null;

  // Agregar una fila vacía manual
  const handleAddFila = () => {
    setParadas(prev => [
      ...prev,
      {
        destinatario: '',
        wrCodes: '',
        bultos: '1 CJ',
        wrBultos: '1 CJ',
        direccion: '',
        distrito: 'MIRAFLORES',
        telefono: '',
        montoCobro: 0,
        monedaCobro: 'USD'
      }
    ]);
  };

  // Modificar campo de una fila
  const handleUpdateFila = (index: number, field: keyof CrearParadaInput, value: string | number | undefined) => {
    setParadas(prev =>
      prev.map((p, idx) => {
        if (idx !== index) return p;
        const updated = { ...p, [field]: value };
        if (field === 'bultos' || field === 'wrCodes') {
          const wrCodes = String(updated.wrCodes || '').trim();
          const bultos = String(updated.bultos || '').trim();
          updated.wrBultos = wrCodes
            ? (bultos && bultos !== '1 CJ' ? `${wrCodes} · ${bultos}` : wrCodes)
            : (bultos || '1 CJ');
        }
        return updated;
      })
    );
  };

  // Cambio dinámico en la celda de WRs (detecta separación por guion o slash)
  const handleWrChange = (index: number, val: string) => {
    const parsed = parseWrAndBultos(val);
    setParadas(prev =>
      prev.map((p, idx) => {
        if (idx !== index) return p;
        const currentBultos = (p.bultos || '').trim();
        const shouldAutoUpdateBultos = !currentBultos || currentBultos === '1 CJ' || /^\d+\s*CJS?$/i.test(currentBultos);
        const newBultos = shouldAutoUpdateBultos && parsed.bultos ? parsed.bultos : (p.bultos || '1 CJ');
        return {
          ...p,
          wrCodes: val,
          bultos: newBultos,
          wrBultos: val
        };
      })
    );
  };

  // Al salir del campo WR, normaliza visualmente los separadores a ' / ' si fueron escritos con guion o slash
  const handleWrBlur = (index: number) => {
    setParadas(prev =>
      prev.map((p, idx) => {
        if (idx !== index) return p;
        const raw = (p.wrCodes || p.wrBultos || '').trim();
        if (!raw) return p;
        const parsed = parseWrAndBultos(raw);
        if (parsed.wrs.length > 0) {
          const normalized = parsed.normalizedWrs;
          const currentBultos = (p.bultos || '').trim();
          const shouldAutoUpdateBultos = !currentBultos || currentBultos === '1 CJ' || /^\d+\s*CJS?$/i.test(currentBultos);
          const finalBultos = shouldAutoUpdateBultos ? parsed.bultos : (p.bultos || '1 CJ');
          const finalWrBultos = (finalBultos && finalBultos !== '1 CJ')
            ? `${normalized} · ${finalBultos}`
            : normalized;
          return {
            ...p,
            wrCodes: normalized,
            bultos: finalBultos,
            wrBultos: finalWrBultos
          };
        }
        return p;
      })
    );
  };

  // Eliminar una fila
  const handleRemoveFila = (index: number) => {
    setParadas(prev => prev.filter((_, idx) => idx !== index));
  };

  // Procesar pegado de Excel (Quick Paste)
  const handleProcessQuickPaste = async () => {
    if (!pasteText.trim()) {
      setPasteError('Pega texto de filas copiado de Excel antes de procesar.');
      return;
    }

    const parsed = parseQuickPasteRows(pasteText);
    if (parsed.length === 0) {
      setPasteError('No se reconocieron paradas válidas. Puedes pegar una columna de códigos WR, o filas con Destinatario, WRs, Dirección y Celular.');
      return;
    }

    // Auto-enriquecer con DB si es posible
    const { enrichedParadas, count } = await enrichParadasWithDbData(parsed);

    // Si la primera fila estaba vacía (sin destinatario y sin WRs), reemplazarla
    setParadas(prev => {
      const cleanPrev = prev.filter(p => p.destinatario.trim() !== '' || (p.wrCodes && p.wrCodes.trim() !== ''));
      return [...cleanPrev, ...enrichedParadas];
    });

    setPasteText('');
    setShowPasteArea(false);
    setPasteError('');

    if (count > 0) {
      setDbEnrichMsg(`✨ ${enrichedParadas.length} paradas agregadas (${count} autocompletadas desde inventario).`);
      setTimeout(() => setDbEnrichMsg(null), 5000);
    }
  };

  // Enriquecer paradas con datos de clientes desde el inventario en Supabase
  const enrichParadasWithDbData = async (
    paradasToEnrich: CrearParadaInput[],
    forceUpdateNames = false
  ): Promise<{ enrichedParadas: CrearParadaInput[]; count: number }> => {
    const wrCodesMap = new Map<number, string[]>();
    const allWrsToSearch: string[] = [];

    paradasToEnrich.forEach((p, idx) => {
      const rawWr = p.wrCodes || p.wrBultos || '';
      const codes = parseWrCodes(rawWr);
      if (codes.length > 0) {
        wrCodesMap.set(idx, codes);
        codes.forEach(c => {
          if (!allWrsToSearch.includes(c)) allWrsToSearch.push(c);
        });
      }
    });

    if (allWrsToSearch.length === 0) {
      return { enrichedParadas: paradasToEnrich, count: 0 };
    }

    setIsSearchingDb(true);
    try {
      const { data: dbPackages, error } = await supabase
        .from('paquetes')
        .select(`
          numero_recibo_bodega,
          nombre_consignatario,
          tracking,
          cliente_id,
          clientes (
            nombre,
            apellido,
            telefono,
            distrito,
            direccion_entrega
          )
        `)
        .in('numero_recibo_bodega', allWrsToSearch)
        .is('eliminado_en', null);

      if (error || !dbPackages || dbPackages.length === 0) {
        return { enrichedParadas: paradasToEnrich, count: 0 };
      }

      const pkgMap = new Map<string, any>();
      dbPackages.forEach((pkg: any) => {
        if (pkg.numero_recibo_bodega) {
          pkgMap.set(pkg.numero_recibo_bodega.toUpperCase().trim(), pkg);
        }
      });

      let enrichedCount = 0;
      const updated = paradasToEnrich.map((parada, idx) => {
        const codes = wrCodesMap.get(idx);
        if (!codes || codes.length === 0) return parada;

        let matchedPkg: any = null;
        for (const c of codes) {
          const found = pkgMap.get(c.toUpperCase());
          if (found) {
            matchedPkg = found;
            break;
          }
        }

        if (!matchedPkg) return parada;

        let changed = false;
        const cliente = matchedPkg.clientes;
        const cleanDbName = cliente?.nombre
          ? `${cliente.nombre} ${cliente.apellido || ''}`.trim()
          : String(matchedPkg.nombre_consignatario || '')
              .replace(/^AMEX\s+(GLX\s+)?/i, '')
              .trim();

        let newDestinatario = parada.destinatario;
        if (
          forceUpdateNames ||
          !parada.destinatario?.trim() ||
          parada.destinatario.toUpperCase().startsWith('WR') ||
          parada.destinatario === 'Cliente Pendiente'
        ) {
          if (cleanDbName) {
            newDestinatario = cleanDbName;
            changed = true;
          }
        }

        let newDireccion = parada.direccion;
        if (!parada.direccion?.trim() || parada.direccion === 'Dirección pendiente') {
          if (cliente?.direccion_entrega) {
            newDireccion = cliente.direccion_entrega;
            changed = true;
          }
        }

        let newDistrito = parada.distrito;
        if (!parada.distrito || parada.distrito === 'MIRAFLORES') {
          if (cliente?.distrito) {
            newDistrito = normalizeDistrito(cliente.distrito);
            changed = true;
          }
        }

        let newTelefono = parada.telefono;
        if (!parada.telefono?.trim()) {
          if (cliente?.telefono) {
            newTelefono = cliente.telefono;
            changed = true;
          }
        }

        if (changed) {
          enrichedCount++;
          return {
            ...parada,
            destinatario: newDestinatario || parada.destinatario,
            direccion: newDireccion,
            distrito: newDistrito,
            telefono: newTelefono
          };
        }

        return parada;
      });

      return { enrichedParadas: updated, count: enrichedCount };
    } catch (err) {
      console.warn('Error al buscar paquetes en DB para enriquecer paradas:', err);
      return { enrichedParadas: paradasToEnrich, count: 0 };
    } finally {
      setIsSearchingDb(false);
    }
  };

  // Botón para buscar datos en inventario para todas las paradas actuales
  const handleBuscarEnInventario = async () => {
    const { enrichedParadas, count } = await enrichParadasWithDbData(paradas, true);
    setParadas(enrichedParadas);
    if (count > 0) {
      setDbEnrichMsg(`✅ Se autocompletaron ${count} paradas con datos de clientes desde el inventario.`);
    } else {
      setDbEnrichMsg('ℹ️ No se encontraron nuevos datos en el inventario para las paradas actuales.');
    }
    setTimeout(() => setDbEnrichMsg(null), 5000);
  };

  // Pegar directo desde portapapeles en el textarea
  const handlePasteFromClipboard = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setPasteText(text);
          setPasteError('');
        }
      }
    } catch (err) {
      console.warn('No se pudo acceder al portapapeles:', err);
    }
  };

  // Interceptar pegado de columna o WRs separados por guion/slash en la celda WR de la tabla
  const handleWrCellPaste = async (index: number, e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text');
    if (!text || !text.trim()) return;

    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

    // Si pegaron múltiples líneas (ej: copiaron una columna de 5 celdas de Excel)
    if (lines.length > 1) {
      e.preventDefault();
      const confirmed = await confirmDialog({
        title: '📋 Columna de códigos WR detectada',
        message: `Has pegado una columna con ${lines.length} códigos WR de Excel.\n\n¿Deseas distribuir los códigos en ${lines.length} paradas separadas? (Si cancelas, se agruparán todos en esta sola parada).`,
        confirmText: `Distribuir en ${lines.length} paradas`,
        cancelText: 'Agrupar en esta parada'
      });

      if (confirmed) {
        const newParadas = [...paradas];
        const parsedItems = lines.map(line => parseWrAndBultos(line));

        parsedItems.forEach((parsed, offset) => {
          const targetIdx = index + offset;
          const normWrs = parsed.normalizedWrs;
          const bultos = parsed.bultos || '1 CJ';
          const wrBultos = normWrs
            ? (bultos && bultos !== '1 CJ' ? `${normWrs} · ${bultos}` : normWrs)
            : bultos;

          const paradaData: CrearParadaInput = {
            destinatario: '',
            wrCodes: normWrs,
            bultos,
            wrBultos,
            direccion: 'Dirección pendiente',
            distrito: 'MIRAFLORES',
            telefono: '',
            montoCobro: 0,
            monedaCobro: 'USD'
          };

          if (targetIdx < newParadas.length) {
            newParadas[targetIdx] = {
              ...newParadas[targetIdx],
              wrCodes: normWrs,
              bultos,
              wrBultos
            };
          } else {
            newParadas.push(paradaData);
          }
        });

        // Intentar autocompletar con DB
        const { enrichedParadas, count } = await enrichParadasWithDbData(newParadas);
        setParadas(enrichedParadas);
        if (count > 0) {
          setDbEnrichMsg(`✨ ${lines.length} paradas generadas (${count} autocompletadas desde inventario).`);
          setTimeout(() => setDbEnrichMsg(null), 5000);
        }
        return;
      }
    }

    // Si es una sola línea o eligió agrupar en esta parada
    const parsed = parseWrAndBultos(text);
    if (parsed.count > 0 || parsed.bultos) {
      e.preventDefault();
      const normWrs = parsed.normalizedWrs;
      const currentBultos = (paradas[index]?.bultos || '').trim();
      const shouldAutoUpdate = !currentBultos || currentBultos === '1 CJ' || /^\d+\s*CJS?$/i.test(currentBultos);
      const finalBultos = (shouldAutoUpdate && parsed.bultos) ? parsed.bultos : (currentBultos || '1 CJ');
      const finalWrBultos = (finalBultos && finalBultos !== '1 CJ')
        ? `${normWrs} · ${finalBultos}`
        : normWrs;

      handleUpdateFila(index, 'wrCodes', normWrs);
      handleUpdateFila(index, 'bultos', finalBultos);
      handleUpdateFila(index, 'wrBultos', finalWrBultos);

      // Si el destinatario está vacío, intentar buscar en DB
      if (!paradas[index]?.destinatario?.trim() && parsed.wrs.length > 0) {
        const temp = [...paradas];
        temp[index] = {
          ...temp[index],
          wrCodes: normWrs,
          bultos: finalBultos,
          wrBultos: finalWrBultos
        };
        enrichParadasWithDbData(temp).then(({ enrichedParadas, count }) => {
          if (count > 0) {
            setParadas(enrichedParadas);
            setDbEnrichMsg('✨ Datos de cliente autocompletados desde el inventario.');
            setTimeout(() => setDbEnrichMsg(null), 4000);
          }
        });
      }
    }
  };

  // Guardar y publicar ruta
  const handleGuardarRuta = async () => {
    setErrorMsg('');

    if (!choferNombre.trim()) {
      setErrorMsg('Selecciona un usuario registrado como chofer responsable.');
      return;
    }

    const paradasValidas = paradas.filter(p => p.destinatario.trim() !== '' || (p.wrCodes && p.wrCodes.trim() !== ''));
    if (paradasValidas.length === 0) {
      setErrorMsg('Debes ingresar al menos una parada con destinatario o código WR.');
      return;
    }

    // Nombre de ruta generado automáticamente por el sistema
    const nombreRutaGenerado = `Ruta ${fechaDespacho} - ${choferNombre.trim() || 'Chofer'}`;

    setIsSubmitting(true);
    try {
      await onSaveRuta(
        {
          nombreRuta: nombreRutaGenerado,
          choferNombre: choferNombre.trim(),
          choferTelefono: choferTelefono.trim(),
          vehiculoPlaca: (vehiculoPlaca.trim() || 'CFM-085').toUpperCase(),
          fechaDespacho,
          notas: notas.trim()
        },
        paradasValidas.map((p, idx) => {
          const wrCodes = (p.wrCodes || '').trim();
          const bultos = (p.bultos || '1 CJ').trim();
          const wrBultos = wrCodes
            ? (bultos && bultos !== '1 CJ' ? `${wrCodes} · ${bultos}` : wrCodes)
            : (bultos || p.wrBultos || '1 CJ');

          return {
            ...p,
            wrCodes,
            bultos,
            wrBultos,
            orden: idx + 1
          };
        })
      );
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar y publicar la ruta.';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalCobro = paradas.reduce((acc, p) => acc + (Number(p.montoCobro) || 0), 0);
  const paradasValidas = paradas.filter(
    p => p.destinatario.trim() !== '' || (p.wrCodes && p.wrCodes.trim() !== '') || (p.direccion && p.direccion.trim() !== '')
  );

  return (
    <div className="ruta-builder-overlay">
      <style>{`
        .ruta-builder-overlay {
          position: fixed;
          inset: 0;
          background-color: rgba(15, 23, 42, 0.7);
          backdrop-filter: blur(4px);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          box-sizing: border-box;
        }
        .ruta-builder-dialog {
          background: #ffffff;
          border-radius: 16px;
          width: 100%;
          max-width: 1540px;
          max-height: 94vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }
        .ruta-builder-header {
          padding: 16px 24px;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #f8fafc;
        }
        .ruta-builder-body {
          padding: 18px 22px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 16px;
          -webkit-overflow-scrolling: touch;
        }
        .ruta-builder-tabs-nav {
          display: none;
        }
        .ruta-builder-tab-btn {
          flex: 1;
          padding: 8px 12px;
          font-size: 12.5px;
          font-weight: 700;
          border: none;
          border-radius: 8px;
          background: transparent;
          color: #64748b;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: all 0.15s ease;
        }
        .ruta-builder-tab-btn.active {
          background: #ffffff;
          color: #1d4ed8;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .ruta-builder-layout {
          display: grid;
          grid-template-columns: minmax(0, 1.45fr) minmax(360px, 420px);
          gap: 22px;
          align-items: start;
          width: 100%;
        }
        .ruta-builder-editor-col {
          display: flex;
          flex-direction: column;
          gap: 16px;
          min-width: 0;
        }
        .ruta-builder-preview-col {
          position: sticky;
          top: 0;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .ruta-preview-card-sticky {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          box-shadow: 0 4px 12px -2px rgba(15, 23, 42, 0.05);
        }
        .ruta-preview-live-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: #dcfce7;
          border: 1px solid #bbf7d0;
          color: #15803d;
          font-size: 10.5px;
          font-weight: 800;
          padding: 2px 7px;
          border-radius: 12px;
        }
        .ruta-preview-live-dot {
          width: 6px;
          height: 6px;
          background: #16a34a;
          border-radius: 50%;
          animation: rutaPulseDot 1.6s infinite ease-in-out;
        }
        @keyframes rutaPulseDot {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.35;
            transform: scale(0.75);
          }
        }
        .ruta-phone-shell {
          background: #0f172a;
          border-radius: 32px;
          padding: 8px 8px 12px 8px;
          box-shadow: 0 20px 30px -10px rgba(15, 23, 42, 0.35), inset 0 0 0 2px rgba(255, 255, 255, 0.1);
        }
        .ruta-phone-notch {
          width: 80px;
          height: 12px;
          background: #020617;
          border-radius: 10px;
          margin: 2px auto 8px auto;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          padding-right: 8px;
        }
        .ruta-phone-camera {
          width: 5px;
          height: 5px;
          background: #1e293b;
          border-radius: 50%;
        }
        .ruta-phone-screen {
          background: #f1f5f9;
          border-radius: 22px;
          overflow-y: auto;
          max-height: calc(92vh - 240px);
          min-height: 480px;
          padding: 12px 10px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          -webkit-overflow-scrolling: touch;
        }
        .ruta-phone-screen::-webkit-scrollbar {
          width: 4px;
        }
        .ruta-phone-screen::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        .ruta-builder-meta-grid {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 16px;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 14px;
        }
        .ruta-builder-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
        }
        .ruta-builder-toolbar-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .ruta-builder-footer {
          padding: 16px 24px;
          border-top: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #f8fafc;
          flex-wrap: wrap;
          gap: 12px;
        }
        .ruta-builder-footer-summary {
          display: flex;
          gap: 16px;
          font-size: 13px;
        }
        .ruta-builder-footer-btns {
          display: flex;
          gap: 10px;
        }
        .table-scroll-hint {
          display: none;
          font-size: 11px;
          font-weight: 700;
          color: #2563eb;
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          padding: 6px 10px;
          border-radius: 6px;
          align-items: center;
          gap: 6px;
        }

        @media (max-width: 1180px) {
          .ruta-builder-tabs-nav {
            display: flex;
            gap: 8px;
            background: #f1f5f9;
            padding: 4px;
            border-radius: 10px;
            border: 1px solid #e2e8f0;
          }
          .ruta-builder-layout {
            display: block;
          }
          .ruta-builder-editor-col.mobile-hidden,
          .ruta-builder-preview-col.mobile-hidden {
            display: none !important;
          }
          .ruta-phone-screen {
            max-height: 55vh !important;
            min-height: 380px !important;
          }
        }

        @media (max-width: 768px) {
          .ruta-builder-overlay {
            padding: 6px !important;
          }
          .ruta-builder-dialog {
            max-height: 96dvh !important;
            border-radius: 12px !important;
          }
          .ruta-builder-header {
            padding: 12px 14px !important;
          }
          .ruta-builder-header h2 {
            font-size: 15px !important;
          }
          .ruta-builder-header p {
            font-size: 11px !important;
          }
          .ruta-builder-body {
            padding: 12px 10px !important;
            gap: 12px !important;
          }
          .ruta-builder-meta-grid {
            padding: 12px 10px !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 10px !important;
          }
          .ruta-builder-toolbar {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 8px !important;
          }
          .ruta-builder-toolbar-actions {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 6px !important;
            width: 100% !important;
          }
          .ruta-builder-toolbar-actions button {
            justify-content: center !important;
            padding: 8px 6px !important;
            font-size: 11.5px !important;
          }
          .table-scroll-hint {
            display: flex !important;
          }
          .ruta-builder-footer {
            padding: 12px 14px !important;
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 10px !important;
          }
          .ruta-builder-footer-summary {
            display: flex !important;
            justify-content: space-between !important;
            width: 100% !important;
            font-size: 12px !important;
          }
          .ruta-builder-footer-btns {
            display: grid !important;
            grid-template-columns: 1fr 2fr !important;
            gap: 8px !important;
            width: 100% !important;
          }
          .ruta-builder-footer-btns button {
            justify-content: center !important;
            padding: 10px 10px !important;
            font-size: 12.5px !important;
          }
        }
      `}</style>
      <div className="ruta-builder-dialog">
        {/* Cabecera del Modal */}
        <div className="ruta-builder-header">
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
              🚚 Armar Hoja de Ruta y Despacho Diario
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: '#64748b' }}>
              Reemplazo del Excel manual: ingresa o pega paradas, detecta WRs múltiples automáticamente y previsualiza en vivo para el chofer
            </p>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              padding: '6px'
            }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo Scrollable */}
        <div className="ruta-builder-body">
          {/* Navegación por pestañas para pantallas pequeñas / móviles */}
          <div className="ruta-builder-tabs-nav">
            <button
              type="button"
              className={`ruta-builder-tab-btn ${activeTabBuilder === 'editor' ? 'active' : ''}`}
              onClick={() => setActiveTabBuilder('editor')}
            >
              <Clipboard className="w-4 h-4" />
              Editor de Ruta ({paradas.length})
            </button>
            <button
              type="button"
              className={`ruta-builder-tab-btn ${activeTabBuilder === 'preview' ? 'active' : ''}`}
              onClick={() => setActiveTabBuilder('preview')}
            >
              <Smartphone className="w-4 h-4" />
              Vista Previa Chofer ({paradasValidas.length})
            </button>
          </div>

          {/* Layout Principal: Dos Columnas en PC (Editor a la izquierda, Preview Móvil a la derecha) */}
          <div className="ruta-builder-layout">
            {/* Columna Izquierda: Formulario y Editor de Paradas */}
            <div className={`ruta-builder-editor-col ${activeTabBuilder !== 'editor' ? 'mobile-hidden' : ''}`}>
              {errorMsg && (
                <div
                  style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#dc2626',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    fontSize: '12.5px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontWeight: 600
                  }}
                >
                  <AlertCircle className="w-4 h-4 shrink-0" /> {errorMsg}
                </div>
              )}

              {/* Formulario de Datos de la Ruta */}
              <div className="ruta-builder-meta-grid">
                <div>
                  <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px', fontWeight: 800, color: '#475569', marginBottom: '4px' }}>
                    <span>Chofer / Usuario Responsable *</span>
                    {isLoadingUsuarios && (
                      <span style={{ fontSize: '10.5px', color: '#2563eb', fontWeight: 600 }}>Cargando usuarios...</span>
                    )}
                  </label>

                  <select
                    value={selectedUserId || (isCustomChofer ? '__custom__' : (choferNombre ? '__custom__' : ''))}
                    onChange={handleChoferSelectChange}
                    disabled={isLoadingUsuarios}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      fontWeight: 700,
                      background: '#ffffff',
                      color: '#0f172a',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="" disabled>
                      {isLoadingUsuarios ? 'Cargando usuarios del sistema...' : '-- Seleccionar Usuario Registrado --'}
                    </option>
                    {usuariosSistema.map(u => (
                      <option key={u.id} value={u.id}>
                        👤 {u.nombre_completo} {u.rol_nombre ? `(${u.rol_nombre})` : ''}
                      </option>
                    ))}
                    <option value="__custom__">✏️ Otro / Escribir chofer manual...</option>
                  </select>

                  {isCustomChofer && (
                    <div style={{ marginTop: '6px' }}>
                      <input
                        type="text"
                        placeholder="Escribe el nombre del chofer..."
                        value={choferNombre}
                        onChange={e => setChoferNombre(e.target.value)}
                        autoFocus
                        style={{
                          width: '100%',
                          padding: '7px 10px',
                          borderRadius: '6px',
                          border: '1px solid #93c5fd',
                          fontSize: '12.5px',
                          fontWeight: 600,
                          background: '#eff6ff'
                        }}
                      />
                      <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                        Chofer no registrado en el sistema
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 800, color: '#475569', marginBottom: '4px' }}>
                    Teléfono del Chofer
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: 997 123 456"
                    value={choferTelefono}
                    onChange={e => setChoferTelefono(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 800, color: '#475569', marginBottom: '4px' }}>
                    Placa
                  </label>
                  <input
                    type="text"
                    placeholder="CFM-085"
                    value={vehiculoPlaca}
                    onChange={e => setVehiculoPlaca(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      textTransform: 'uppercase'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 800, color: '#475569', marginBottom: '4px' }}>
                    Fecha de Despacho
                  </label>
                  <input
                    type="date"
                    value={fechaDespacho}
                    onChange={e => setFechaDespacho(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px'
                    }}
                  />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 800, color: '#475569', marginBottom: '4px' }}>
                    Observaciones / Instrucciones de Ruta
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Cobrar en efectivo al llegar, priorizar entregas de la mañana"
                    value={notas}
                    onChange={e => setNotas(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px'
                    }}
                  />
                </div>
              </div>

              {/* Barra de Herramientas de Paradas */}
              <div className="ruta-builder-toolbar">
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                  Paradas de Entrega ({paradas.filter(p => p.destinatario.trim()).length} clientes ingresados)
                </div>

                <div className="ruta-builder-toolbar-actions">
                  <button
                    type="button"
                    onClick={handleBuscarEnInventario}
                    disabled={isSearchingDb}
                    style={{
                      background: '#fdf4ff',
                      border: '1px solid #f0abfc',
                      color: '#a21caf',
                      borderRadius: '8px',
                      padding: '7px 12px',
                      fontSize: '12px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: isSearchingDb ? 'wait' : 'pointer'
                    }}
                    title="Busca los códigos WR en el inventario del sistema para autocompletar nombres, direcciones y celulares"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-fuchsia-600" />
                    {isSearchingDb ? 'Buscando en Inventario...' : 'Autocompletar de Inventario'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowPasteArea(!showPasteArea)}
                    style={{
                      background: showPasteArea ? '#e2e8f0' : '#eff6ff',
                      border: '1px solid #bfdbfe',
                      color: '#1d4ed8',
                      borderRadius: '8px',
                      padding: '7px 12px',
                      fontSize: '12px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    <Clipboard className="w-3.5 h-3.5" /> Pegar Filas o Columna de WRs
                  </button>

                  <button
                    type="button"
                    onClick={handleAddFila}
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      color: '#334155',
                      borderRadius: '8px',
                      padding: '7px 12px',
                      fontSize: '12px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    <Plus className="w-3.5 h-3.5" /> Agregar Fila
                  </button>
                </div>
              </div>

              {dbEnrichMsg && (
                <div
                  style={{
                    background: '#ecfdf5',
                    border: '1px solid #a7f3d0',
                    color: '#065f46',
                    borderRadius: '8px',
                    padding: '8px 14px',
                    fontSize: '12px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>{dbEnrichMsg}</span>
                </div>
              )}

              {/* Área de Pegado Rápido desde Excel (Quick Paste) */}
              {showPasteArea && (
                <div
                  style={{
                    background: '#f0fdf4',
                    border: '1px dashed #86efac',
                    borderRadius: '12px',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#166534' }}>
                      📋 Pegar Filas o Columna de Códigos WR desde Excel:
                    </div>
                    <button
                      type="button"
                      onClick={handlePasteFromClipboard}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #86efac',
                        color: '#15803d',
                        borderRadius: '6px',
                        padding: '4px 10px',
                        fontSize: '11px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        cursor: 'pointer'
                      }}
                    >
                      <ClipboardPaste className="w-3.5 h-3.5" /> Pegar Portapapeles (Ctrl+V)
                    </button>
                  </div>
                  <p style={{ margin: 0, fontSize: '11px', color: '#4b5563' }}>
                    ✨ Soporta columnas de <strong>puros códigos WR</strong> (uno por línea o separados por guion <code>-</code> o slash <code>/</code>), 2 columnas (Destinatario + WR), o formato completo de 5/6 columnas. Detecta y normaliza WRs automáticamente y autocompleta clientes desde inventario.
                  </p>

                  <textarea
                    rows={4}
                    value={pasteText}
                    onChange={e => setPasteText(e.target.value)}
                    placeholder={'Columna de WRs:\nWR000485000\n405148 - 405149\n405150 / 405151\n\nO formato completo de Excel:\nDANIEL VALDIVIA\t405148\tCALLE FRANCIA 510\tMIRAFLORES\t997 370 290'}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontFamily: 'monospace',
                      fontSize: '11.5px'
                    }}
                  />

                  {pasteError && (
                    <div style={{ fontSize: '11.5px', color: '#dc2626', fontWeight: 600 }}>{pasteError}</div>
                  )}

                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={() => setShowPasteArea(false)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#64748b',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      Cancelar
                    </button>

                    <button
                      type="button"
                      onClick={handleProcessQuickPaste}
                      style={{
                        background: '#16a34a',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '6px 14px',
                        fontSize: '12px',
                        fontWeight: 800,
                        cursor: 'pointer'
                      }}
                    >
                      Procesar y Cargar a la Tabla
                    </button>
                  </div>
                </div>
              )}

              {/* Indicador visual de desplazamiento para dispositivos móviles */}
              <div className="table-scroll-hint">
                <span>↔</span>
                <span>Desliza la tabla hacia los lados para ver y editar todas las columnas (Destinatario, WRs, Dirección, Celular)</span>
              </div>

              {/* Tabla Editable de Paradas */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '950px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 800 }}>
                      <th style={{ padding: '8px 10px', width: '38px', textAlign: 'center' }}>#</th>
                      <th style={{ padding: '8px 10px', minWidth: '150px' }}>Destinatario *</th>
                      <th style={{ padding: '8px 10px', minWidth: '170px' }}>Códigos WR *</th>
                      <th style={{ padding: '8px 10px', width: '105px' }}>Bultos / Cant.</th>
                      <th style={{ padding: '8px 10px', minWidth: '180px' }}>Dirección Completa *</th>
                      <th style={{ padding: '8px 10px', width: '170px' }}>Distrito (Zona)</th>
                      <th style={{ padding: '8px 10px', width: '120px' }}>Teléfono Celular</th>
                      <th style={{ padding: '8px 10px', width: '90px' }}>Cobrar ($)</th>
                      <th style={{ padding: '8px 10px', width: '38px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {paradas.map((parada, idx) => {
                      const wrValue = parada.wrCodes !== undefined ? parada.wrCodes : (parada.wrBultos || '');
                      const parsedInfo = parseWrAndBultos(wrValue);

                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '6px 10px', fontWeight: 800, color: '#64748b', textAlign: 'center' }}>
                            {idx + 1}
                          </td>

                          <td style={{ padding: '6px 8px' }}>
                            <input
                              type="text"
                              placeholder="Ej: Daniel Valdivia"
                              value={parada.destinatario}
                              onChange={e => handleUpdateFila(idx, 'destinatario', e.target.value)}
                              style={{
                                width: '100%',
                                padding: '6px 8px',
                                borderRadius: '4px',
                                border: '1px solid #cbd5e1',
                                fontWeight: 700
                              }}
                            />
                          </td>

                          {/* Columna Códigos WR con Detección de Guiones / Slash y Badge */}
                          <td style={{ padding: '6px 8px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              <input
                                type="text"
                                placeholder="Ej: 405148-405149 ó 405148 / 405149"
                                value={wrValue}
                                onChange={e => handleWrChange(idx, e.target.value)}
                                onBlur={() => handleWrBlur(idx)}
                                onPaste={e => handleWrCellPaste(idx, e)}
                                style={{
                                  width: '100%',
                                  padding: '6px 8px',
                                  borderRadius: '4px',
                                  border: '1px solid #cbd5e1',
                                  fontFamily: 'monospace',
                                  fontWeight: 600,
                                  fontSize: '12px'
                                }}
                              />
                              {parsedInfo.count > 1 ? (
                                <span
                                  style={{
                                    fontSize: '10px',
                                    color: '#15803d',
                                    background: '#dcfce7',
                                    border: '1px solid #bbf7d0',
                                    padding: '1px 6px',
                                    borderRadius: '4px',
                                    fontWeight: 800,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    width: 'fit-content'
                                  }}
                                >
                                  ✨ {parsedInfo.count} WRs detectados
                                </span>
                              ) : parsedInfo.count === 1 ? (
                                <span style={{ fontSize: '10px', color: '#2563eb', fontWeight: 700, paddingLeft: '2px' }}>
                                  🏷️ 1 WR detectado
                                </span>
                              ) : null}
                            </div>
                          </td>

                          {/* Columna Bultos / Cantidad (Autocalculada y Editable) */}
                          <td style={{ padding: '6px 8px' }}>
                            <input
                              type="text"
                              placeholder="1 CJ"
                              value={parada.bultos !== undefined ? parada.bultos : '1 CJ'}
                              onChange={e => handleUpdateFila(idx, 'bultos', e.target.value)}
                              style={{
                                width: '100%',
                                padding: '6px 8px',
                                borderRadius: '4px',
                                border: '1px solid #cbd5e1',
                                fontSize: '12px',
                                fontWeight: 700,
                                textAlign: 'center'
                              }}
                            />
                          </td>

                          <td style={{ padding: '6px 8px' }}>
                            <input
                              type="text"
                              placeholder="Calle, número, dpto, ref..."
                              value={parada.direccion}
                              onChange={e => handleUpdateFila(idx, 'direccion', e.target.value)}
                              style={{
                                width: '100%',
                                padding: '6px 8px',
                                borderRadius: '4px',
                                border: '1px solid #cbd5e1'
                              }}
                            />
                          </td>

                          <td style={{ padding: '6px 8px' }}>
                            <select
                              value={normalizeDistrito(parada.distrito)}
                              onChange={e => handleUpdateFila(idx, 'distrito', e.target.value)}
                              style={{
                                width: '100%',
                                padding: '6px 8px',
                                borderRadius: '4px',
                                border: '1px solid #cbd5e1',
                                background: '#ffffff',
                                fontSize: '12px',
                                fontWeight: 600,
                                color: '#0f172a',
                                cursor: 'pointer'
                              }}
                            >
                              <option value="" disabled>
                                Seleccionar Distrito...
                              </option>
                              {ZONAS_LIMA_DISTRITOS.map(zona => (
                                <optgroup key={zona.zona} label={zona.zona} style={{ fontWeight: 800, color: '#1e293b' }}>
                                  {zona.distritos.map(d => (
                                    <option key={d.value} value={d.value} style={{ fontWeight: 500, color: '#334155' }}>
                                      {d.label}
                                    </option>
                                  ))}
                                </optgroup>
                              ))}
                            </select>
                          </td>

                          <td style={{ padding: '6px 8px' }}>
                            <input
                              type="text"
                              placeholder="997 370 290"
                              value={parada.telefono}
                              onChange={e => handleUpdateFila(idx, 'telefono', e.target.value)}
                              style={{
                                width: '100%',
                                padding: '6px 8px',
                                borderRadius: '4px',
                                border: '1px solid #cbd5e1',
                                fontFamily: 'monospace'
                              }}
                            />
                          </td>

                          <td style={{ padding: '6px 8px' }}>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              value={parada.montoCobro || ''}
                              onChange={e => handleUpdateFila(idx, 'montoCobro', parseFloat(e.target.value) || 0)}
                              style={{
                                width: '100%',
                                padding: '6px 8px',
                                borderRadius: '4px',
                                border: '1px solid #cbd5e1',
                                textAlign: 'right'
                              }}
                            />
                          </td>

                          <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                            {paradas.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveFila(idx)}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: '#ef4444',
                                  cursor: 'pointer',
                                  padding: '4px'
                                }}
                                title="Eliminar fila"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <button
                type="button"
                onClick={handleAddFila}
                style={{
                  background: '#f8fafc',
                  border: '1px dashed #cbd5e1',
                  color: '#2563eb',
                  borderRadius: '8px',
                  padding: '8px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  cursor: 'pointer'
                }}
              >
                <Plus className="w-4 h-4" /> + Agregar otra parada
              </button>
            </div>

            {/* Columna Derecha: Vista Previa Móvil Chofer en Vivo (PC & Pestaña Móvil) */}
            <div className={`ruta-builder-preview-col ${activeTabBuilder !== 'preview' ? 'mobile-hidden' : ''}`}>
              <div className="ruta-preview-card-sticky">
                {/* Header de la Vista Previa */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      background: '#eff6ff',
                      color: '#2563eb',
                      padding: '6px',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                        Vista Previa Chofer
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        Reflejo interactivo en tiempo real
                      </div>
                    </div>
                  </div>

                  <span className="ruta-preview-live-badge">
                    <span className="ruta-preview-live-dot" />
                    En Vivo
                  </span>
                </div>

                {/* Carcasa del Smartphone Mockup */}
                <div className="ruta-phone-shell">
                  {/* Notch / Dynamic Island */}
                  <div className="ruta-phone-notch">
                    <div className="ruta-phone-camera" />
                  </div>

                  {/* Pantalla del Celular */}
                  <div className="ruta-phone-screen">
                    {/* Barra Superior Móvil */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '5px 8px',
                      background: '#ffffff',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '13px' }}>🚚</span>
                        <span style={{ fontSize: '11px', fontWeight: 900, color: '#1e3a8a', letterSpacing: '0.03em' }}>
                          AMEX COURIER
                        </span>
                      </div>
                      <span style={{
                        fontSize: '9.5px',
                        fontWeight: 800,
                        color: '#16a34a',
                        background: '#dcfce7',
                        padding: '2px 6px',
                        borderRadius: '4px'
                      }}>
                        Ruta Activa
                      </span>
                    </div>

                    {/* Tarjeta Resumen del Chofer */}
                    <div style={{
                      background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
                      borderRadius: '12px',
                      padding: '12px 14px',
                      color: '#ffffff',
                      boxShadow: '0 4px 10px -2px rgba(37, 99, 235, 0.3)'
                    }}>
                      <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.85, fontWeight: 700 }}>
                        Hoja de Reparto Chofer
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 900, marginTop: '2px', lineHeight: 1.2 }}>
                        {choferNombre.trim() ? choferNombre.trim() : 'Chofer por Asignar'}
                      </div>

                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '6px',
                        marginTop: '10px',
                        paddingTop: '8px',
                        borderTop: '1px solid rgba(255, 255, 255, 0.2)',
                        fontSize: '11px'
                      }}>
                        <div>
                          <span style={{ opacity: 0.75, fontSize: '9.5px', display: 'block' }}>PLACA:</span>
                          <strong>{vehiculoPlaca.trim() || 'CFM-085'}</strong>
                        </div>
                        <div>
                          <span style={{ opacity: 0.75, fontSize: '9.5px', display: 'block' }}>FECHA:</span>
                          <strong>{fechaDespacho}</strong>
                        </div>
                        <div>
                          <span style={{ opacity: 0.75, fontSize: '9.5px', display: 'block' }}>PARADAS:</span>
                          <strong>{paradasValidas.length} entregas</strong>
                        </div>
                        <div>
                          <span style={{ opacity: 0.75, fontSize: '9.5px', display: 'block' }}>COBRO TOTAL:</span>
                          <strong style={{ color: totalCobro > 0 ? '#fde047' : '#ffffff' }}>
                            {totalCobro > 0 ? `$${totalCobro.toFixed(2)}` : '$0.00'}
                          </strong>
                        </div>
                      </div>
                    </div>

                    {/* Notas / Indicaciones si existen */}
                    {notas.trim() && (
                      <div style={{
                        background: '#fef3c7',
                        border: '1px solid #fde68a',
                        borderRadius: '8px',
                        padding: '8px 10px',
                        fontSize: '11px',
                        color: '#92400e',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '6px'
                      }}>
                        <span style={{ fontSize: '13px' }}>📝</span>
                        <div>
                          <strong>Instrucciones:</strong> {notas.trim()}
                        </div>
                      </div>
                    )}

                    {/* Lista de Paradas para el Chofer */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '2px' }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '11px',
                        fontWeight: 800,
                        color: '#475569',
                        padding: '0 2px'
                      }}>
                        <span>Paradas ({paradasValidas.length})</span>
                        <span style={{ fontSize: '10px', color: '#64748b' }}>Orden de entrega</span>
                      </div>

                      {paradasValidas.length === 0 ? (
                        <div style={{
                          background: '#ffffff',
                          border: '2px dashed #cbd5e1',
                          borderRadius: '12px',
                          padding: '24px 14px',
                          textAlign: 'center',
                          color: '#64748b'
                        }}>
                          <Eye className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                          <div style={{ fontSize: '12px', fontWeight: 800, color: '#334155', marginBottom: '4px' }}>
                            Sin paradas agregadas
                          </div>
                          <div style={{ fontSize: '11px', lineHeight: 1.4 }}>
                            Escribe o pega paradas en la tabla de la izquierda para ver cómo se verá la hoja interactiva del chofer.
                          </div>
                        </div>
                      ) : (
                        paradasValidas.map((parada, idx) => {
                          const wrValue = parada.wrCodes !== undefined ? parada.wrCodes : (parada.wrBultos || '');
                          const parsedInfo = parseWrAndBultos(wrValue);

                          return (
                            <div
                              key={idx}
                              style={{
                                background: '#ffffff',
                                border: '1px solid #e2e8f0',
                                borderRadius: '10px',
                                padding: '10px 10px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '6px',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                              }}
                            >
                              {/* Fila superior: Número + Destinatario */}
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                                <span style={{
                                  background: '#2563eb',
                                  color: '#ffffff',
                                  fontSize: '10.5px',
                                  fontWeight: 900,
                                  padding: '2px 6px',
                                  borderRadius: '5px',
                                  flexShrink: 0
                                }}>
                                  #{idx + 1}
                                </span>

                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{
                                    fontSize: '12.5px',
                                    fontWeight: 800,
                                    color: '#0f172a',
                                    lineHeight: 1.25,
                                    wordBreak: 'break-word'
                                  }}>
                                    {parada.destinatario.trim() || 'Cliente Pendiente'}
                                  </div>
                                </div>

                                <span style={{
                                  fontSize: '9px',
                                  background: '#f1f5f9',
                                  color: '#475569',
                                  padding: '2px 5px',
                                  borderRadius: '4px',
                                  fontWeight: 700,
                                  flexShrink: 0
                                }}>
                                  Pendiente
                                </span>
                              </div>

                              {/* Badges de Bultos y WRs */}
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
                                <span style={{
                                  background: '#eff6ff',
                                  color: '#1d4ed8',
                                  border: '1px solid #bfdbfe',
                                  fontSize: '10.5px',
                                  fontWeight: 800,
                                  padding: '2px 6px',
                                  borderRadius: '4px'
                                }}>
                                  📦 {parada.bultos || '1 CJ'}
                                </span>

                                {parsedInfo.wrs.length > 0 ? (
                                  parsedInfo.wrs.map((w, wIdx) => (
                                    <span
                                      key={wIdx}
                                      style={{
                                        background: '#f8fafc',
                                        color: '#0f172a',
                                        border: '1px solid #cbd5e1',
                                        fontSize: '10px',
                                        fontFamily: 'monospace',
                                        fontWeight: 800,
                                        padding: '1px 5px',
                                        borderRadius: '4px'
                                      }}
                                    >
                                      🏷️ {w}
                                    </span>
                                  ))
                                ) : parada.wrCodes ? (
                                  <span style={{
                                    background: '#f8fafc',
                                    color: '#0f172a',
                                    border: '1px solid #cbd5e1',
                                    fontSize: '10px',
                                    fontFamily: 'monospace',
                                    fontWeight: 800,
                                    padding: '1px 5px',
                                    borderRadius: '4px'
                                  }}>
                                    🏷️ {parada.wrCodes}
                                  </span>
                                ) : null}
                              </div>

                              {/* Dirección y Distrito */}
                              <div style={{ fontSize: '11px', color: '#334155', display: 'flex', alignItems: 'flex-start', gap: '4px', lineHeight: 1.3 }}>
                                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                                <div>
                                  <span>{parada.direccion.trim() || 'Dirección por definir'}</span>
                                  {parada.distrito && (
                                    <span style={{
                                      display: 'inline-block',
                                      marginLeft: '4px',
                                      fontSize: '9.5px',
                                      fontWeight: 800,
                                      color: '#0369a1',
                                      background: '#e0f2fe',
                                      padding: '1px 4px',
                                      borderRadius: '3px'
                                    }}>
                                      {parada.distrito}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Teléfono */}
                              {parada.telefono && (
                                <div style={{ fontSize: '11px', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <Phone className="w-3 h-3 text-slate-400" />
                                  <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{parada.telefono}</span>
                                </div>
                              )}

                              {/* Cobro si aplica */}
                              {Number(parada.montoCobro) > 0 && (
                                <div style={{
                                  background: '#fef3c7',
                                  border: '1px solid #fde68a',
                                  color: '#b45309',
                                  fontSize: '11px',
                                  fontWeight: 800,
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between'
                                }}>
                                  <span>💵 Cobrar al entregar:</span>
                                  <span>${Number(parada.montoCobro).toFixed(2)} USD</span>
                                </div>
                              )}

                              {/* Botones de Acción Simulados (Mockup) */}
                              <div style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr 1fr',
                                gap: '4px',
                                marginTop: '2px',
                                paddingTop: '6px',
                                borderTop: '1px dashed #e2e8f0'
                              }}>
                                <div style={{
                                  background: '#22c55e',
                                  color: '#ffffff',
                                  fontSize: '9.5px',
                                  fontWeight: 700,
                                  borderRadius: '5px',
                                  padding: '4px 2px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '3px',
                                  opacity: 0.9
                                }}>
                                  <MessageCircle className="w-3 h-3" /> WhatsApp
                                </div>

                                <div style={{
                                  background: '#3b82f6',
                                  color: '#ffffff',
                                  fontSize: '9.5px',
                                  fontWeight: 700,
                                  borderRadius: '5px',
                                  padding: '4px 2px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '3px',
                                  opacity: 0.9
                                }}>
                                  <Phone className="w-3 h-3" /> Llamar
                                </div>

                                <div style={{
                                  background: '#64748b',
                                  color: '#ffffff',
                                  fontSize: '9.5px',
                                  fontWeight: 700,
                                  borderRadius: '5px',
                                  padding: '4px 2px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '3px',
                                  opacity: 0.9
                                }}>
                                  <MapPin className="w-3 h-3" /> Mapa
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pie del Modal con Resumen y Botón de Publicación */}
        <div className="ruta-builder-footer">
          <div className="ruta-builder-footer-summary">
            <span>
              Total Paradas:{' '}
              <strong style={{ color: '#0f172a' }}>
                {paradasValidas.length}
              </strong>
            </span>
            {totalCobro > 0 && (
              <span>
                Total a Cobrar:{' '}
                <strong style={{ color: '#b45309' }}>
                  $ {totalCobro.toFixed(2)} USD
                </strong>
              </span>
            )}
          </div>

          <div className="ruta-builder-footer-btns">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#475569',
                borderRadius: '8px',
                padding: '10px 18px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleGuardarRuta}
              disabled={isSubmitting}
              style={{
                background: '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 24px',
                fontSize: '13.5px',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 6px rgba(37,99,235,0.3)',
                opacity: isSubmitting ? 0.7 : 1
              }}
            >
              <CheckCircle2 className="w-4 h-4" />
              {isSubmitting ? 'Guardando...' : '✅ Guardar y Publicar Ruta'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
