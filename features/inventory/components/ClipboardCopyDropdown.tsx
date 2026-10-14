'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Copy,
  ChevronDown,
  Camera,
  Columns,
  MessageSquare,
  FileText,
  Hash,
  Table,
  Barcode,
  MapPin,
  Check,
  Loader2,
  Sparkles
} from 'lucide-react';
import { Paquete } from '@/types';
import { copyPackagesTableAsImage } from '../utils/clipboardTableImage';
import {
  copyTextToClipboard,
  formatClientAndWrTabbed,
  formatClientAndWrHyphen,
  formatOnlyWrs,
  formatWhatsAppSummary,
  formatFullTableTsv,
  formatClientWrAndLocation,
  formatTrackingAndWr
} from '../utils/clipboardFormats';
import { alertDialog } from '@/lib/dialog';
import { soundEffects } from '@/lib/audio/soundEffects';

export interface ClipboardCopyDropdownProps {
  paquetes: Paquete[];
  filteredPaquetes: Paquete[];
  selectedIds: string[];
  className?: string;
}

export default function ClipboardCopyDropdown({
  paquetes,
  filteredPaquetes,
  selectedIds,
  className = ''
}: ClipboardCopyDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copying' | 'copied'>('idle');
  const [copiedLabel, setCopiedLabel] = useState<string>('¡Copiado!');
  const [scope, setScope] = useState<'auto' | 'selected' | 'filtered' | 'all'>('auto');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Conteo de paquetes
  const totalCount = paquetes.length;
  const filteredCount = filteredPaquetes.length;
  const selectedCount = selectedIds.length;

  // Ámbito efectivo actual
  const effectiveScope =
    scope === 'auto'
      ? selectedCount > 0
        ? 'selected'
        : 'filtered'
      : scope;

  // Lista de paquetes sobre los que se operará
  const activePackages =
    effectiveScope === 'selected'
      ? paquetes.filter(p => selectedIds.includes(p.id))
      : effectiveScope === 'all'
      ? paquetes
      : filteredPaquetes;

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Manejador para copiar imagen (Canvas Render)
  const handleCopyImage = async () => {
    if (activePackages.length === 0) {
      soundEffects.playNotFound();
      await alertDialog({
        title: 'Portapapeles',
        message: 'No hay paquetes disponibles en la selección o vista actual para copiar.',
        variant: 'warning'
      });
      return;
    }

    setIsOpen(false);
    setCopyStatus('copying');
    try {
      const res = await copyPackagesTableAsImage(activePackages);
      if (res.success) {
        soundEffects.playSuccess();
        setCopiedLabel(`¡Imagen Copiada (${res.count})!`);
        setCopyStatus('copied');
        setTimeout(() => setCopyStatus('idle'), 3000);
      } else {
        soundEffects.playNotFound();
        await alertDialog({
          title: 'Error al Copiar Imagen',
          message: res.error || 'No se pudo generar o copiar la imagen de la tabla.',
          variant: 'danger'
        });
        setCopyStatus('idle');
      }
    } catch {
      soundEffects.playNotFound();
      setCopyStatus('idle');
    }
  };

  // Manejador para copiar en formatos de texto plano
  const handleCopyTextFormat = async (
    formatType:
      | 'client_wr_tab'
      | 'client_wr_hyphen'
      | 'only_wrs'
      | 'whatsapp_summary'
      | 'full_tsv'
      | 'client_wr_location'
      | 'tracking_wr'
  ) => {
    if (activePackages.length === 0) {
      soundEffects.playNotFound();
      await alertDialog({
        title: 'Portapapeles',
        message: 'No hay paquetes disponibles para copiar en la opción seleccionada.',
        variant: 'warning'
      });
      return;
    }

    setIsOpen(false);
    let textToCopy = '';
    let successMessage = '';

    switch (formatType) {
      case 'client_wr_tab':
        textToCopy = formatClientAndWrTabbed(activePackages);
        successMessage = `¡${activePackages.length} pares Cliente-WR copiados (2 col)!`;
        break;
      case 'client_wr_hyphen':
        textToCopy = formatClientAndWrHyphen(activePackages);
        successMessage = `¡${activePackages.length} líneas Cliente-WR copiadas!`;
        break;
      case 'only_wrs':
        textToCopy = formatOnlyWrs(activePackages);
        successMessage = `¡${activePackages.length} guías WR copiadas!`;
        break;
      case 'whatsapp_summary':
        textToCopy = formatWhatsAppSummary(activePackages);
        successMessage = `¡Mensaje WhatsApp estructurado copiado!`;
        break;
      case 'full_tsv':
        textToCopy = formatFullTableTsv(activePackages);
        successMessage = `¡Tabla completa copiada (${activePackages.length} filas)!`;
        break;
      case 'client_wr_location':
        textToCopy = formatClientWrAndLocation(activePackages);
        successMessage = `¡Cliente + WR + Ubicación copiado (3 col)!`;
        break;
      case 'tracking_wr':
        textToCopy = formatTrackingAndWr(activePackages);
        successMessage = `¡Trackings y WRs copiados!`;
        break;
    }

    const ok = await copyTextToClipboard(textToCopy);
    if (ok) {
      soundEffects.playSuccess();
      setCopiedLabel(successMessage);
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus('idle'), 3000);
    } else {
      soundEffects.playNotFound();
      await alertDialog({
        title: 'Error de Portapapeles',
        message: 'El navegador bloqueó el acceso al portapapeles. Intenta conceder permisos.',
        variant: 'danger'
      });
    }
  };

  const itemHover = (e: React.MouseEvent<HTMLButtonElement>, isHover: boolean) => {
    e.currentTarget.style.background = isHover ? '#f8fafc' : 'transparent';
  };

  return (
    <div ref={dropdownRef} className={`relative inline-block ${className}`} style={{ position: 'relative' }}>
      {/* Botón Principal Desplegable */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        disabled={copyStatus === 'copying'}
        className="btn"
        style={{
          background: copyStatus === 'copied' ? '#ecfdf5' : '#ffffff',
          border: copyStatus === 'copied' ? '1px solid #10b981' : '1px solid #cbd5e1',
          color: copyStatus === 'copied' ? '#065f46' : '#1e293b',
          height: '33px',
          padding: '0 12px',
          borderRadius: '8px',
          fontSize: '12px',
          fontWeight: 700,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          cursor: copyStatus === 'copying' ? 'wait' : 'pointer',
          transition: 'all 0.15s ease',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
        }}
        title="Copiar imagen corporativa para WhatsApp o texto plano en múltiples formatos (Excel, 2 columnas, solo WRs, etc.)"
      >
        {copyStatus === 'copying' ? (
          <Loader2 className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
        ) : copyStatus === 'copied' ? (
          <Check className="w-3.5 h-3.5 text-emerald-600" />
        ) : (
          <Copy className="w-3.5 h-3.5 text-emerald-600" />
        )}

        <span>
          {copyStatus === 'copying'
            ? 'Generando...'
            : copyStatus === 'copied'
            ? copiedLabel
            : selectedCount > 0
            ? `Copiar Datos (${selectedCount})`
            : 'Copiar / Portapapeles'}
        </span>

        <ChevronDown
          className="w-3.5 h-3.5 text-slate-500"
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.15s ease'
          }}
        />
      </button>

      {/* Menú Desplegable con Opciones de Copiado */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 'calc(100% + 6px)',
            width: '330px',
            maxWidth: 'calc(100vw - 32px)',
            background: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 12px 28px -4px rgba(0, 0, 0, 0.16), 0 8px 10px -6px rgba(0, 0, 0, 0.08)',
            padding: '6px',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            animation: 'fadeIn 0.15s ease-out'
          }}
        >
          {/* Encabezado y Selector de Alcance (Scope) */}
          <div
            style={{
              padding: '6px 8px 8px 8px',
              borderBottom: '1px solid #f1f5f9',
              marginBottom: '4px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Opciones de Copiado
              </span>
              <span style={{ fontSize: '10px', fontWeight: 800, color: '#059669', background: '#ecfdf5', padding: '1.5px 6px', borderRadius: '4px', border: '1px solid #a7f3d0' }}>
                {activePackages.length} {activePackages.length === 1 ? 'bulto' : 'bultos'}
              </span>
            </div>

            {/* Selector de ámbito de copiado */}
            <div style={{ display: 'flex', gap: '3px', background: '#f1f5f9', padding: '2px', borderRadius: '6px' }}>
              <button
                type="button"
                onClick={() => setScope('selected')}
                disabled={selectedCount === 0}
                style={{
                  flex: 1,
                  border: 'none',
                  background: effectiveScope === 'selected' ? '#ffffff' : 'transparent',
                  color: effectiveScope === 'selected' ? '#1e293b' : '#64748b',
                  fontWeight: effectiveScope === 'selected' ? 800 : 600,
                  fontSize: '10.5px',
                  padding: '3px 4px',
                  borderRadius: '5px',
                  cursor: selectedCount === 0 ? 'not-allowed' : 'pointer',
                  opacity: selectedCount === 0 ? 0.45 : 1,
                  boxShadow: effectiveScope === 'selected' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.12s ease'
                }}
                title={selectedCount === 0 ? 'Selecciona paquetes con las casillas para activar' : `Copiar los ${selectedCount} paquetes seleccionados`}
              >
                Selección ({selectedCount})
              </button>

              <button
                type="button"
                onClick={() => setScope('filtered')}
                style={{
                  flex: 1,
                  border: 'none',
                  background: effectiveScope === 'filtered' ? '#ffffff' : 'transparent',
                  color: effectiveScope === 'filtered' ? '#1e293b' : '#64748b',
                  fontWeight: effectiveScope === 'filtered' ? 800 : 600,
                  fontSize: '10.5px',
                  padding: '3px 4px',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  boxShadow: effectiveScope === 'filtered' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.12s ease'
                }}
                title={`Copiar los ${filteredCount} paquetes visibles con filtros actuales`}
              >
                Vista ({filteredCount})
              </button>

              <button
                type="button"
                onClick={() => setScope('all')}
                style={{
                  flex: 1,
                  border: 'none',
                  background: effectiveScope === 'all' ? '#ffffff' : 'transparent',
                  color: effectiveScope === 'all' ? '#1e293b' : '#64748b',
                  fontWeight: effectiveScope === 'all' ? 800 : 600,
                  fontSize: '10.5px',
                  padding: '3px 4px',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  boxShadow: effectiveScope === 'all' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.12s ease'
                }}
                title={`Copiar todo el inventario activo (${totalCount} paquetes)`}
              >
                Todo ({totalCount})
              </button>
            </div>
          </div>

          {/* 1. SECCIÓN: IMAGEN VISUAL PARA WHATSAPP */}
          <div style={{ padding: '2px 8px', fontSize: '9.5px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Imagen para WhatsApp
          </div>

          <button
            type="button"
            onClick={handleCopyImage}
            style={dropdownButtonStyle}
            onMouseEnter={e => itemHover(e, true)}
            onMouseLeave={e => itemHover(e, false)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={iconBoxStyle('#ecfdf5', '#059669')}>
                <Camera className="w-4 h-4 text-emerald-600" />
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '12px' }}>
                  Copiar Imagen de Tabla
                </div>
                <div style={{ fontSize: '10.5px', color: '#64748b' }}>
                  Render HD con logo corporativo, WR, cliente, peso y ubicación
                </div>
              </div>
            </div>
          </button>

          <div style={{ height: '1px', background: '#f1f5f9', margin: '3px 0' }} />

          {/* 2. SECCIÓN: TEXTO PLANO Y COLUMNAS (EXCEL & CHATS) */}
          <div style={{ padding: '2px 8px', fontSize: '9.5px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Texto Plano y Columnas
          </div>

          {/* Opción A: 2 Columnas: Nombre a la izquierda y WR a la derecha (Tabulado) */}
          <button
            type="button"
            onClick={() => handleCopyTextFormat('client_wr_tab')}
            style={dropdownButtonStyle}
            onMouseEnter={e => itemHover(e, true)}
            onMouseLeave={e => itemHover(e, false)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={iconBoxStyle('#eff6ff', '#2563eb')}>
                <Columns className="w-4 h-4 text-blue-600" />
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '12px' }}>
                  2 Columnas: Nombre + WR (Excel)
                </div>
                <div style={{ fontSize: '10.5px', color: '#64748b' }}>
                  Nombre a la izq. y WR a la der. (pega en 2 columnas separadas)
                </div>
              </div>
            </div>
          </button>

          {/* Opción B: 2 Columnas con Guion (Chat / WhatsApp) */}
          <button
            type="button"
            onClick={() => handleCopyTextFormat('client_wr_hyphen')}
            style={dropdownButtonStyle}
            onMouseEnter={e => itemHover(e, true)}
            onMouseLeave={e => itemHover(e, false)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={iconBoxStyle('#f0f9ff', '#0284c7')}>
                <FileText className="w-4 h-4 text-sky-600" />
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '12px' }}>
                  Cliente - WR (Formato Chat)
                </div>
                <div style={{ fontSize: '10.5px', color: '#64748b' }}>
                  Texto limpio para WhatsApp: <code>AMEX CLIENTE - WR000123</code>
                </div>
              </div>
            </div>
          </button>

          {/* Opción C: Solo Guías WR (1 por línea) */}
          <button
            type="button"
            onClick={() => handleCopyTextFormat('only_wrs')}
            style={dropdownButtonStyle}
            onMouseEnter={e => itemHover(e, true)}
            onMouseLeave={e => itemHover(e, false)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={iconBoxStyle('#faf5ff', '#9333ea')}>
                <Hash className="w-4 h-4 text-purple-600" />
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '12px' }}>
                  Solo Guías WR (1 por línea)
                </div>
                <div style={{ fontSize: '10.5px', color: '#64748b' }}>
                  Lista vertical de códigos para cruces TIB, filtros y búsquedas
                </div>
              </div>
            </div>
          </button>

          <div style={{ height: '1px', background: '#f1f5f9', margin: '3px 0' }} />

          {/* 3. SECCIÓN: REPORTES ESTRUCTURADOS Y DETALLADOS */}
          <div style={{ padding: '2px 8px', fontSize: '9.5px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Reportes y Detallados
          </div>

          {/* Opción D: Resumen WhatsApp con Emojis */}
          <button
            type="button"
            onClick={() => handleCopyTextFormat('whatsapp_summary')}
            style={dropdownButtonStyle}
            onMouseEnter={e => itemHover(e, true)}
            onMouseLeave={e => itemHover(e, false)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={iconBoxStyle('#f0fdf4', '#16a34a')}>
                <MessageSquare className="w-4 h-4 text-green-600" />
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '12px' }}>
                  Resumen WhatsApp con Emojis
                </div>
                <div style={{ fontSize: '10.5px', color: '#64748b' }}>
                  Mensaje listo con encabezado, cliente, WR, anaquel y peso
                </div>
              </div>
            </div>
          </button>

          {/* Opción E: Cliente + WR + Ubicación (3 columnas) */}
          <button
            type="button"
            onClick={() => handleCopyTextFormat('client_wr_location')}
            style={dropdownButtonStyle}
            onMouseEnter={e => itemHover(e, true)}
            onMouseLeave={e => itemHover(e, false)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={iconBoxStyle('#fef3c7', '#d97706')}>
                <MapPin className="w-4 h-4 text-amber-600" />
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '12px' }}>
                  Cliente + WR + Ubicación (3 col)
                </div>
                <div style={{ fontSize: '10.5px', color: '#64748b' }}>
                  Tabulado para control físico, slotting y despacho en bodega
                </div>
              </div>
            </div>
          </button>

          {/* Opción F: Tabla Completa TSV (Excel / Sheets) */}
          <button
            type="button"
            onClick={() => handleCopyTextFormat('full_tsv')}
            style={dropdownButtonStyle}
            onMouseEnter={e => itemHover(e, true)}
            onMouseLeave={e => itemHover(e, false)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={iconBoxStyle('#f0fdfa', '#0d9488')}>
                <Table className="w-4 h-4 text-teal-600" />
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '12px' }}>
                  Tabla Completa (TSV / Excel)
                </div>
                <div style={{ fontSize: '10.5px', color: '#64748b' }}>
                  Con cabeceras: WR, Trk, Cliente, Tipo, Peso, Ubic, Estado
                </div>
              </div>
            </div>
          </button>

          {/* Opción G: Tracking y Guía WR */}
          <button
            type="button"
            onClick={() => handleCopyTextFormat('tracking_wr')}
            style={dropdownButtonStyle}
            onMouseEnter={e => itemHover(e, true)}
            onMouseLeave={e => itemHover(e, false)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={iconBoxStyle('#fff7ed', '#ea580c')}>
                <Barcode className="w-4 h-4 text-orange-600" />
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '12px' }}>
                  Tracking y Guía WR
                </div>
                <div style={{ fontSize: '10.5px', color: '#64748b' }}>
                  Para transportistas y cruces con guías de courier
                </div>
              </div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}

const dropdownButtonStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  width: '100%',
  padding: '6px 8px',
  border: 'none',
  background: 'transparent',
  borderRadius: '7px',
  cursor: 'pointer',
  transition: 'background 0.12s ease',
  textAlign: 'left'
};

const iconBoxStyle = (bg: string, _color: string): React.CSSProperties => ({
  width: '28px',
  height: '28px',
  borderRadius: '6px',
  background: bg,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0
});
