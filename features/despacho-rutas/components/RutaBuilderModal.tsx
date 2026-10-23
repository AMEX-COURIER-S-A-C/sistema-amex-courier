'use client';

import React, { useState } from 'react';
import { Plus, Trash2, Clipboard, CheckCircle2, X, AlertCircle, ClipboardPaste, Sparkles, Search } from 'lucide-react';
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
      setErrorMsg('Ingresa el nombre del chofer o motorizado responsable.');
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

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '1100px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden'
        }}
      >
        {/* Cabecera del Modal */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#f8fafc'
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
              🚚 Armar Hoja de Ruta y Despacho Diario
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: '#64748b' }}>
              Reemplazo del Excel manual: ingresa o pega paradas, detecta WRs múltiples automáticamente y publícalo para el chofer
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
        <div style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>
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

          {/* Formulario de Datos de la Ruta (Sin Nombre de Ruta, Placa CFM-085 por defecto) */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '16px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '14px'
            }}
          >
            <div>
              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 800, color: '#475569', marginBottom: '4px' }}>
                Chofer / Repartidor *
              </label>
              <input
                type="text"
                placeholder="Ej: Carlos Chofer"
                value={choferNombre}
                onChange={e => setChoferNombre(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  fontWeight: 600
                }}
              />
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
              Paradas de Entrega ({paradas.filter(p => p.destinatario.trim()).length} clientes ingresados)
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
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

          {/* Tabla Editable de Paradas: Columnas Códigos WR y Bultos Separadas */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflowX: 'auto' }}>
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

        {/* Pie del Modal con Resumen y Botón de Publicación */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#f8fafc',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', gap: '16px', fontSize: '13px' }}>
            <span>
              Total Paradas:{' '}
              <strong style={{ color: '#0f172a' }}>
                {paradas.filter(p => p.destinatario.trim()).length}
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

          <div style={{ display: 'flex', gap: '10px' }}>
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
