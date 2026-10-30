'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Clock,
  Search,
  ChevronDown,
  ChevronUp,
  X,
  Building2,
  Package as PackageIcon,
  Truck,
  Bike,
  AlertCircle
} from 'lucide-react';
import { Paquete, TipoEstadoAmex, TipoEstadoEntrega, TipoModalidadEntrega } from '@/types';
import { alertDialog } from '@/lib/dialog';
import { smartFormatWr } from '@/lib/validations/wr';

export interface BulkStatusByWrModalProps {
  isOpen: boolean;
  onClose: () => void;
  paquetes: Paquete[];
  onApply: (
    matchedIds: string[],
    targetStatusAmex: TipoEstadoAmex,
    targetStatusTib?: TipoEstadoEntrega,
    skipDelivered?: boolean,
    tipoEntrega?: string,
    detalleEntrega?: string
  ) => Promise<void> | void;
}

export default function BulkStatusByWrModal({
  isOpen,
  onClose,
  paquetes,
  onApply
}: BulkStatusByWrModalProps) {
  const [rawText, setRawText] = useState('');
  const [targetStatusAmex, setTargetStatusAmex] = useState<TipoEstadoAmex>('entregado');
  const [selectedModalidad, setSelectedModalidad] = useState<TipoModalidadEntrega>('Presencial');
  const [agenciaSeleccionada, setAgenciaSeleccionada] = useState<string>('Shalom');
  const [otraAgenciaTexto, setOtraAgenciaTexto] = useState<string>('');
  const [motorizadoDetalle, setMotorizadoDetalle] = useState<string>('');
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [isClosing, setIsClosing] = useState(false);
  const [skipDelivered, setSkipDelivered] = useState(true);
  const [showMissingDetails, setShowMissingDetails] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSubmitStatus('idle');
      setIsClosing(false);
      setSkipDelivered(true);
      setTargetStatusAmex('entregado');
      setSelectedModalidad('Presencial');
      setAgenciaSeleccionada('Shalom');
      setOtraAgenciaTexto('');
      setMotorizadoDetalle('');
    }
  }, [isOpen]);

  // Parsing y cruce en tiempo real con el inventario
  const { parsedCodes, matchedPackages, missingCodes } = useMemo(() => {
    if (!rawText.trim()) {
      return { parsedCodes: [], matchedPackages: [], missingCodes: [] };
    }

    // Separar por saltos de línea, comas, puntos y comas, slashes (/) o guiones (-)
    let cleaned = rawText.replace(/[/\\|,;–—]+/g, '\n');
    cleaned = cleaned.replace(/\s+-\s*/g, '\n').replace(/\s*-\s+/g, '\n');
    cleaned = cleaned.replace(/(?<=[0-9a-zA-Z])-(?=[a-zA-Z])/g, '\n');
    const rawItems = cleaned
      .split(/\s+/)
      .map(item => item.replace(/["'()[\]{}]/g, '').trim())
      .filter(Boolean);

    // Normalizar códigos únicos
    const uniqueCodes = Array.from(new Set(rawItems.map(c => c.toUpperCase())));

    const matched: Paquete[] = [];
    const missing: string[] = [];

    // Mapas para búsqueda O(1)
    const wrMap = new Map<string, Paquete>();
    const trackingMap = new Map<string, Paquete>();

    paquetes.forEach(p => {
      if (p.numeroReciboBodega) {
        wrMap.set(p.numeroReciboBodega.trim().toUpperCase(), p);
      }
      if (p.tracking) {
        trackingMap.set(p.tracking.trim().toUpperCase(), p);
      }
    });

    uniqueCodes.forEach(code => {
      const formattedWr = smartFormatWr(code);
      // Buscar coincidencia exacta por WR, WR formateado (11 chars) o por Tracking
      let match = wrMap.get(code) || wrMap.get(formattedWr) || trackingMap.get(code);

      // Si no encuentra coincidencia directa y el usuario ingresó solo dígitos, buscar sufijo de WR
      if (!match) {
        const matchingPkg = paquetes.find(
          p =>
            p.numeroReciboBodega?.toUpperCase().includes(code) ||
            p.tracking?.toUpperCase().includes(code)
        );
        if (matchingPkg) {
          match = matchingPkg;
        }
      }

      if (match) {
        // Evitar duplicar el paquete en matched si múltiples códigos apuntan al mismo
        if (!matched.some(m => m.id === match!.id)) {
          matched.push(match);
        }
      } else {
        missing.push(code);
      }
    });

    return {
      parsedCodes: uniqueCodes,
      matchedPackages: matched,
      missingCodes: missing
    };
  }, [rawText, paquetes]);

  const deliveredCount = useMemo(
    () => matchedPackages.filter(p => p.estadoAmex === 'entregado').length,
    [matchedPackages]
  );
  const hasDeliveredConflict = targetStatusAmex !== 'entregado' && deliveredCount > 0;
  const effectiveCount = hasDeliveredConflict && skipDelivered
    ? Math.max(0, matchedPackages.length - deliveredCount)
    : matchedPackages.length;

  const isFormValid = useMemo(() => {
    if (matchedPackages.length === 0 || effectiveCount === 0) return false;
    if (
      targetStatusAmex === 'entregado' &&
      selectedModalidad === 'Agencia' &&
      agenciaSeleccionada === 'Otra Agencia' &&
      !otraAgenciaTexto.trim()
    ) {
      return false;
    }
    return true;
  }, [
    matchedPackages.length,
    effectiveCount,
    targetStatusAmex,
    selectedModalidad,
    agenciaSeleccionada,
    otraAgenciaTexto
  ]);

  const handleClose = () => {
    if (submitStatus === 'loading') return;
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 180);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (matchedPackages.length === 0 || submitStatus !== 'idle') return;
    if (!isFormValid) return;

    const idsToApply = hasDeliveredConflict && skipDelivered
      ? matchedPackages.filter(p => p.estadoAmex !== 'entregado').map(p => p.id)
      : matchedPackages.map(p => p.id);

    if (idsToApply.length === 0) {
      await alertDialog({
        title: 'Operación Protegida',
        message: `Todos los ${deliveredCount} paquetes encontrados ya figuran como ENTREGADOS. No se realizó ningún cambio para proteger su historial.`,
        variant: 'info'
      });
      return;
    }

    let tipoEntregaFinal: string | undefined = undefined;
    let detalleFinal: string | undefined = undefined;

    if (targetStatusAmex === 'entregado') {
      tipoEntregaFinal = selectedModalidad;
      if (selectedModalidad === 'Agencia') {
        detalleFinal = agenciaSeleccionada === 'Otra Agencia'
          ? (otraAgenciaTexto.trim() || 'Agencia Externa')
          : agenciaSeleccionada;
      } else if (selectedModalidad === 'Motorizado') {
        detalleFinal = motorizadoDetalle.trim() || undefined;
      }
    }

    try {
      setSubmitStatus('loading');
      await onApply(
        idsToApply,
        targetStatusAmex,
        undefined,
        skipDelivered,
        tipoEntregaFinal,
        detalleFinal
      );
      setSubmitStatus('success');
      setTimeout(() => {
        setIsClosing(true);
        setTimeout(() => {
          setRawText('');
          onClose();
          setIsClosing(false);
          setSubmitStatus('idle');
        }, 180);
      }, 400);
    } catch (err) {
      console.error('Error aplicando cambio de estado por lista de WRs:', err);
      setSubmitStatus('idle');
      await alertDialog({
        title: 'Error de actualización',
        message: 'Ocurrió un error al actualizar los paquetes.',
        variant: 'danger'
      });
    }
  };

  if (!isOpen && !isClosing) return null;

  return (
    <div className={`modal-backdrop ${isClosing ? 'modal-backdrop-closing' : ''}`}>
      <div
        className={`modal-dialog ${isClosing ? 'modal-dialog-closing' : ''}`}
        style={{
          maxWidth: '640px',
          width: '95%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div className="modal-header" style={{ flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Zap className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <span className="modal-title" style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                Actualizar Estados por Lista de WRs
              </span>
              <p style={{ margin: 0, fontSize: '11.5px', color: '#64748b' }}>
                Pega múltiples Guías WR o Trackings para marcar entregas o cambiar estados en lote
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={submitStatus !== 'idle'}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '18px',
              cursor: submitStatus !== 'idle' ? 'not-allowed' : 'pointer',
              color: '#64748b',
              opacity: submitStatus !== 'idle' ? 0.4 : 1
            }}
          >
            ✕
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="modal-body"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            overflowY: 'auto',
            maxHeight: 'calc(92vh - 70px)'
          }}
        >
          {/* Textarea de Entrada */}
          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', fontWeight: 800, color: '#334155', display: 'flex', justifyContent: 'space-between' }}>
              <span>Pegar lista de Guías WR (una por línea, comas o espacios):</span>
              {parsedCodes.length > 0 && (
                <span style={{ color: '#2563eb', fontWeight: 700 }}>
                  {parsedCodes.length} código(s) detectado(s)
                </span>
              )}
            </label>
            <textarea
              rows={5}
              value={rawText}
              onChange={e => setRawText(e.target.value)}
              placeholder="Ejemplo:&#10;WR-100345&#10;WR-100346&#10;WR-100347&#10;o pega desde un Excel o mensaje de WhatsApp..."
              className="form-control"
              style={{
                fontFamily: 'monospace',
                fontSize: '12.5px',
                lineHeight: '1.4',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1'
              }}
              required
            />
          </div>

          {/* Resumen de Detección en Tiempo Real */}
          {rawText.trim() && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '10px 14px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#166534', fontWeight: 800 }}>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    {matchedPackages.length} Encontrados en Inventario
                  </span>

                  {missingCodes.length > 0 && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#b91c1c', fontWeight: 800 }}>
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      {missingCodes.length} No Encontrados
                    </span>
                  )}
                </div>

                {missingCodes.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowMissingDetails(prev => !prev)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#dc2626',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {showMissingDetails ? 'Ocultar no encontrados' : 'Ver no encontrados'}
                    {showMissingDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                )}
              </div>

              {/* Detalle de Códigos No Encontrados */}
              {showMissingDetails && missingCodes.length > 0 && (
                <div
                  style={{
                    background: '#fff1f2',
                    border: '1px solid #fecdd3',
                    borderRadius: '6px',
                    padding: '8px 10px',
                    fontSize: '11px',
                    color: '#9f1239'
                  }}
                >
                  <p style={{ margin: '0 0 4px 0', fontWeight: 800 }}>
                    Los siguientes códigos no existen en la base de datos de Almacén Lince:
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {missingCodes.map(code => (
                      <span
                        key={code}
                        style={{
                          background: '#ffffff',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          border: '1px solid #fca5a5',
                          fontFamily: 'monospace',
                          fontSize: '10.5px'
                        }}
                      >
                        {code}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Vista Previa de Bultos Encontrados */}
              {matchedPackages.length > 0 && (
                <div style={{ marginTop: '4px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Bultos que se actualizarán ({matchedPackages.length}):
                  </div>
                  <div
                    style={{
                      maxHeight: '120px',
                      overflowY: 'auto',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      padding: '6px'
                    }}
                  >
                    {matchedPackages.map(pkg => (
                      <div
                        key={pkg.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '11px',
                          padding: '3px 6px',
                          borderRadius: '4px',
                          background: '#f8fafc'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 800, fontFamily: 'monospace', color: '#0f172a' }}>
                            {pkg.numeroReciboBodega}
                          </span>
                          <span style={{ color: '#475569' }}>
                            {pkg.nombreConsignatario || 'Sin nombre'}
                          </span>
                        </div>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 800,
                            padding: '1px 6px',
                            borderRadius: '4px',
                            background: pkg.estadoAmex === 'entregado' ? '#dcfce7' : '#e0f2fe',
                            color: pkg.estadoAmex === 'entregado' ? '#15803d' : '#0369a1',
                            border: pkg.estadoAmex === 'entregado' ? '1px solid #86efac' : 'none'
                          }}
                        >
                          {pkg.estadoAmex === 'entregado'
                            ? '✅ YA ENTREGADO'
                            : `Actual: ${(pkg.estadoAmex === 'recibido' ? 'EN ALMACÉN' : (pkg.estadoAmex || 'EN ALMACÉN')).toUpperCase()}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Selector de Nuevo Estado AMEX */}
          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', fontWeight: 800, color: '#0369a1', display: 'flex', alignItems: 'center', gap: '6px' }}>
              ⭐ Nuevo Estado Operativo AMEX
            </label>
            <select
              value={targetStatusAmex}
              disabled={submitStatus !== 'idle'}
              onChange={e => setTargetStatusAmex(e.target.value as TipoEstadoAmex)}
              className="form-control"
              style={{
                fontWeight: 800,
                borderColor: '#93c5fd',
                background: '#f0f9ff',
                color: '#0369a1',
                padding: '8px 12px',
                borderRadius: '8px',
                cursor: submitStatus !== 'idle' ? 'not-allowed' : 'default',
                opacity: submitStatus !== 'idle' ? 0.7 : 1
              }}
            >
              <option value="entregado">✅ Entregado al Cliente Final</option>
              <option value="listo_recojo">🏪 Listo para Recojo en Tienda Lince</option>
              <option value="en_ruta">🚚 En Ruta (Reparto / Envío a Provincia)</option>
              <option value="en_almacen">📦 En Almacén (Ubicado en Estante)</option>
            </select>
          </div>

          {/* Selector Obligatorio de Modalidades de Entrega (solo visible cuando se marca Entregado) */}
          {targetStatusAmex === 'entregado' && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                padding: '12px 14px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12.5px',
                    fontWeight: 800,
                    color: '#1e293b',
                    margin: 0
                  }}
                >
                  🚚 Modalidad de Entrega <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                  Selecciona cómo se entregó el lote
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                {/* 1. Presencial */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedModalidad('Presencial')}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setSelectedModalidad('Presencial'); }}
                  style={{
                    border: selectedModalidad === 'Presencial' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                    background: selectedModalidad === 'Presencial' ? '#eff6ff' : '#ffffff',
                    borderRadius: '9px',
                    padding: '10px 12px',
                    cursor: submitStatus !== 'idle' ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s ease',
                    userSelect: 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                    <Building2 className={`w-4 h-4 ${selectedModalidad === 'Presencial' ? 'text-blue-600' : 'text-slate-500'}`} />
                    <span style={{ fontWeight: 800, fontSize: '12.5px', color: selectedModalidad === 'Presencial' ? '#1d4ed8' : '#334155' }}>
                      Presencial
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', lineHeight: 1.25 }}>
                    Retiro en mostrador Lince
                  </div>
                </div>

                {/* 2. Agencia */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedModalidad('Agencia')}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setSelectedModalidad('Agencia'); }}
                  style={{
                    border: selectedModalidad === 'Agencia' ? '2px solid #d97706' : '1px solid #cbd5e1',
                    background: selectedModalidad === 'Agencia' ? '#fffbeb' : '#ffffff',
                    borderRadius: '9px',
                    padding: '10px 12px',
                    cursor: submitStatus !== 'idle' ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s ease',
                    userSelect: 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                    <PackageIcon className={`w-4 h-4 ${selectedModalidad === 'Agencia' ? 'text-amber-600' : 'text-slate-500'}`} />
                    <span style={{ fontWeight: 800, fontSize: '12.5px', color: selectedModalidad === 'Agencia' ? '#b45309' : '#334155' }}>
                      Agencia
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', lineHeight: 1.25 }}>
                    Shalom / Olva / Provincias
                  </div>
                </div>

                {/* 3. A Domicilio */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedModalidad('Domicilio')}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setSelectedModalidad('Domicilio'); }}
                  style={{
                    border: selectedModalidad === 'Domicilio' ? '2px solid #16a34a' : '1px solid #cbd5e1',
                    background: selectedModalidad === 'Domicilio' ? '#f0fdf4' : '#ffffff',
                    borderRadius: '9px',
                    padding: '10px 12px',
                    cursor: submitStatus !== 'idle' ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s ease',
                    userSelect: 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                    <Truck className={`w-4 h-4 ${selectedModalidad === 'Domicilio' ? 'text-emerald-600' : 'text-slate-500'}`} />
                    <span style={{ fontWeight: 800, fontSize: '12.5px', color: selectedModalidad === 'Domicilio' ? '#15803d' : '#334155' }}>
                      A Domicilio
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', lineHeight: 1.25 }}>
                    Móvil / Carro AMEX
                  </div>
                </div>

                {/* 4. Motorizado */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedModalidad('Motorizado')}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setSelectedModalidad('Motorizado'); }}
                  style={{
                    border: selectedModalidad === 'Motorizado' ? '2px solid #7e22ce' : '1px solid #cbd5e1',
                    background: selectedModalidad === 'Motorizado' ? '#faf5ff' : '#ffffff',
                    borderRadius: '9px',
                    padding: '10px 12px',
                    cursor: submitStatus !== 'idle' ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s ease',
                    userSelect: 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                    <Bike className={`w-4 h-4 ${selectedModalidad === 'Motorizado' ? 'text-purple-600' : 'text-slate-500'}`} />
                    <span style={{ fontWeight: 800, fontSize: '12.5px', color: selectedModalidad === 'Motorizado' ? '#7e22ce' : '#334155' }}>
                      Motorizado
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', lineHeight: 1.25 }}>
                    Contratado por Cliente
                  </div>
                </div>
              </div>

              {/* Sub-formulario cuando es Agencia */}
              {selectedModalidad === 'Agencia' && (
                <div
                  style={{
                    background: '#fffbeb',
                    border: '1px solid #fde68a',
                    borderRadius: '9px',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                >
                  <label style={{ fontSize: '12px', fontWeight: 800, color: '#92400e', margin: 0 }}>
                    Agencia de Transporte:
                  </label>
                  <select
                    value={agenciaSeleccionada}
                    disabled={submitStatus !== 'idle'}
                    onChange={e => setAgenciaSeleccionada(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      borderRadius: '6px',
                      border: '1px solid #f59e0b',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      background: '#ffffff',
                      color: '#78350f'
                    }}
                  >
                    <option value="Shalom">Shalom (Agencia Oficial)</option>
                    <option value="Olva Courier">Olva Courier</option>
                    <option value="Marvisur">Marvisur</option>
                    <option value="Flores Hermanos">Flores Hermanos</option>
                    <option value="Cavassa">Cavassa</option>
                    <option value="Otra Agencia">Otra Agencia (Escribir nombre)</option>
                  </select>

                  {agenciaSeleccionada === 'Otra Agencia' && (
                    <input
                      type="text"
                      placeholder="Escribe el nombre de la agencia (ej. Cruz del Sur, Móvil Bus...)"
                      value={otraAgenciaTexto}
                      disabled={submitStatus !== 'idle'}
                      onChange={e => setOtraAgenciaTexto(e.target.value)}
                      autoFocus
                      required
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        borderRadius: '6px',
                        border: '1px solid #d97706',
                        fontSize: '12px',
                        background: '#ffffff'
                      }}
                    />
                  )}
                </div>
              )}

              {/* Sub-formulario cuando es Motorizado */}
              {selectedModalidad === 'Motorizado' && (
                <div
                  style={{
                    background: '#faf5ff',
                    border: '1px solid #e9d5ff',
                    borderRadius: '9px',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: '#6b21a8', fontWeight: 700 }}>
                    <AlertCircle className="w-4 h-4 text-purple-600 flex-shrink-0" />
                    <span>Servicio de motorizado contratado y pagado por el cliente (no por AMEX).</span>
                  </div>

                  <label style={{ fontSize: '12px', fontWeight: 800, color: '#581c87', marginTop: '2px', margin: 0 }}>
                    Datos del Motorizado o App (Opcional):
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Rappi - Carlos R. / PedidosYa / Particular Placa 4512-AB"
                    value={motorizadoDetalle}
                    disabled={submitStatus !== 'idle'}
                    onChange={e => setMotorizadoDetalle(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      borderRadius: '6px',
                      border: '1px solid #a855f7',
                      fontSize: '12px',
                      background: '#ffffff'
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Banner de protección si hay paquetes ya entregados */}
          {hasDeliveredConflict && (
            <div
              style={{
                background: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: '8px',
                padding: '10px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: '#b45309',
                  fontSize: '12px',
                  fontWeight: 700
                }}
              >
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>Atención: {deliveredCount} de las {matchedPackages.length} guías ya figuran como ENTREGADAS</span>
              </div>
              <p style={{ margin: 0, fontSize: '11px', color: '#78350f' }}>
                Para evitar que se sobreescriba su historial de entrega, se recomienda omitirlos de la actualización.
              </p>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '11.5px',
                  color: '#92400e',
                  cursor: 'pointer',
                  fontWeight: 600,
                  marginTop: '2px'
                }}
              >
                <input
                  type="checkbox"
                  checked={skipDelivered}
                  disabled={submitStatus !== 'idle'}
                  onChange={e => setSkipDelivered(e.target.checked)}
                  style={{ accentColor: '#d97706', width: '15px', height: '15px', cursor: 'pointer' }}
                />
                <span>
                  Proteger historial: Omitir {deliveredCount} paquetes ya entregados (Actualiza solo {effectiveCount} pendientes)
                </span>
              </label>
            </div>
          )}

          {/* Footer de Acciones */}
          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
            <button
              type="button"
              onClick={handleClose}
              disabled={submitStatus !== 'idle'}
              className="btn btn-secondary"
              style={{
                opacity: submitStatus !== 'idle' ? 0.5 : 1,
                cursor: submitStatus !== 'idle' ? 'not-allowed' : 'pointer'
              }}
            >
              Cancelar
            </button>

            {submitStatus === 'loading' && (
              <button
                type="button"
                disabled
                className="btn btn-primary"
                style={{
                  fontWeight: 800,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  opacity: 0.9,
                  cursor: 'wait',
                  transition: 'all 0.2s ease'
                }}
              >
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin flex-shrink-0" />
                <span>Actualizando...</span>
              </button>
            )}

            {submitStatus === 'success' && (
              <button
                type="button"
                disabled
                className="btn"
                style={{
                  fontWeight: 800,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#16a34a',
                  color: '#ffffff',
                  border: '1px solid #15803d',
                  transform: 'scale(1.02)',
                  boxShadow: '0 0 12px rgba(22, 163, 74, 0.45)',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
              >
                <CheckCircle2 className="w-4 h-4 text-white flex-shrink-0" />
                <span>¡Actualizado!</span>
              </button>
            )}

            {submitStatus === 'idle' && (
              <button
                type="submit"
                disabled={!isFormValid}
                className="btn btn-primary"
                style={{
                  fontWeight: 800,
                  opacity: !isFormValid ? 0.6 : 1,
                  cursor: !isFormValid ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease'
                }}
              >
                ✓ {targetStatusAmex === 'entregado' ? 'Marcar entrega de' : 'Aplicar cambio a'} {effectiveCount} paquete(s) {hasDeliveredConflict && skipDelivered ? 'pendientes' : ''}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
