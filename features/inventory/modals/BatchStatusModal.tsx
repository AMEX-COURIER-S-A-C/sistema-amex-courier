'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Truck, CheckCircle2, AlertTriangle } from 'lucide-react';
import { TipoEstadoEntrega, TipoEstadoAmex, Paquete } from '@/types';

export interface BatchStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCount: number;
  batchTargetStatus: TipoEstadoEntrega;
  setBatchTargetStatus: React.Dispatch<React.SetStateAction<TipoEstadoEntrega>>;
  batchTargetStatusAmex?: TipoEstadoAmex;
  setBatchTargetStatusAmex?: React.Dispatch<React.SetStateAction<TipoEstadoAmex>>;
  onConfirm: (skipDelivered?: boolean, tipoEntrega?: string, detalleEntrega?: string) => Promise<void> | void;
  paquetes?: Paquete[];
  selectedIds?: string[];
}

export default function BatchStatusModal({
  isOpen,
  onClose,
  selectedCount,
  batchTargetStatus,
  setBatchTargetStatus,
  batchTargetStatusAmex = 'en_almacen',
  setBatchTargetStatusAmex,
  onConfirm,
  paquetes = [],
  selectedIds = []
}: BatchStatusModalProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [isClosing, setIsClosing] = useState(false);
  const [skipDelivered, setSkipDelivered] = useState(true);
  const [modalidadEntrega, setModalidadEntrega] = useState<string>('Presencial');
  const [agenciaSeleccionada, setAgenciaSeleccionada] = useState<string>('Shalom');
  const [otraAgenciaTexto, setOtraAgenciaTexto] = useState<string>('');
  const [motorizadoDetalle, setMotorizadoDetalle] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setStatus('idle');
      setIsClosing(false);
      setSkipDelivered(true);
    }
  }, [isOpen]);

  const deliveredCount = useMemo(() => {
    if (!paquetes || !selectedIds || selectedIds.length === 0) return 0;
    return paquetes.filter(p => selectedIds.includes(p.id) && p.estadoAmex === 'entregado').length;
  }, [paquetes, selectedIds]);

  const hasDeliveredConflict = batchTargetStatusAmex !== 'entregado' && deliveredCount > 0;
  const effectiveCount = hasDeliveredConflict && skipDelivered
    ? Math.max(0, selectedCount - deliveredCount)
    : selectedCount;

  const handleClose = () => {
    if (status === 'loading') return;
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 180);
  };

  const handleApply = async () => {
    if (status !== 'idle') return;
    try {
      setStatus('loading');
      let detalle: string | undefined = undefined;
      if (batchTargetStatusAmex === 'entregado') {
        if (modalidadEntrega === 'Agencia') {
          detalle = agenciaSeleccionada === 'Otra Agencia' ? (otraAgenciaTexto.trim() || 'Agencia') : agenciaSeleccionada;
        } else if (modalidadEntrega === 'Motorizado') {
          detalle = motorizadoDetalle.trim() || undefined;
        }
      }
      await onConfirm(skipDelivered, modalidadEntrega, detalle);
      setStatus('success');
      // Mantener estado de éxito por 400ms para feedback visual
      setTimeout(() => {
        setIsClosing(true);
        setTimeout(() => {
          onClose();
          setIsClosing(false);
          setStatus('idle');
        }, 180);
      }, 400);
    } catch (err) {
      console.error('Error al aplicar cambio de estado masivo:', err);
      setStatus('idle');
    }
  };

  if (!isOpen && !isClosing) return null;

  return (
    <div className={`modal-backdrop ${isClosing ? 'modal-backdrop-closing' : ''}`}>
      <div
        className={`modal-dialog ${isClosing ? 'modal-dialog-closing' : ''}`}
        style={{ maxWidth: '480px' }}
      >
        <div className="modal-header">
          <span
            className="modal-title"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#2563eb' }}
          >
            <Truck className="w-5 h-5" /> Cambiar Estado Masivo ({selectedCount} paquetes)
          </span>
          <button
            type="button"
            onClick={handleClose}
            disabled={status !== 'idle'}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '18px',
              cursor: status !== 'idle' ? 'not-allowed' : 'pointer',
              color: '#64748b',
              opacity: status !== 'idle' ? 0.4 : 1
            }}
          >
            ✕
          </button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <p style={{ fontSize: '12.5px', color: '#475569', margin: 0 }}>
            Configura el nuevo estado para los <strong>{selectedCount}</strong> paquetes seleccionados:
          </p>

          <div className="form-group">
            <label
              style={{
                fontSize: '12px',
                fontWeight: 800,
                color: '#0369a1',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginBottom: '6px'
              }}
            >
              ⭐ Nuevo Estado Operativo AMEX
            </label>
            <select
              value={batchTargetStatusAmex}
              disabled={status !== 'idle'}
              onChange={e => setBatchTargetStatusAmex?.(e.target.value as TipoEstadoAmex)}
              className="form-control"
              style={{
                fontWeight: 700,
                borderColor: '#93c5fd',
                background: '#f0f9ff',
                color: '#0369a1',
                padding: '8px 12px',
                borderRadius: '8px',
                cursor: status !== 'idle' ? 'not-allowed' : 'default',
                opacity: status !== 'idle' ? 0.7 : 1
              }}
            >
              <option value="en_almacen">📦 En Almacén (Ubicado en Estante)</option>
              <option value="listo_recojo">🏪 Listo para Recojo en Tienda Lince</option>
              <option value="en_ruta">🚚 En Ruta (Reparto / Envío a Provincia)</option>
              <option value="entregado">✅ Entregado al Cliente Final</option>
            </select>
          </div>

          {/* Modalidad de Entrega (solo visible cuando se selecciona Entregado) */}
          {batchTargetStatusAmex === 'entregado' && (
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}
            >
              <label
                style={{
                  fontSize: '12px',
                  fontWeight: 800,
                  color: '#0f172a',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                🚚 Modalidad de Entrega <span style={{ color: '#ef4444' }}>*</span>
              </label>

              <select
                value={modalidadEntrega}
                disabled={status !== 'idle'}
                onChange={e => setModalidadEntrega(e.target.value)}
                className="form-control"
                style={{
                  fontWeight: 700,
                  fontSize: '12.5px',
                  padding: '7px 10px',
                  borderRadius: '6px',
                  border: '1px solid #94a3b8',
                  background: '#ffffff'
                }}
              >
                <option value="Presencial">🏢 Presencial (Retiro Mostrador Lince)</option>
                <option value="Agencia">📦 Agencia (Shalom / Olva / Provincias)</option>
                <option value="Domicilio">🚐 A Domicilio (Móvil / Carro AMEX)</option>
                <option value="Motorizado">🛵 Motorizado (Contratado por Cliente)</option>
              </select>

              {modalidadEntrega === 'Agencia' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '2px' }}>
                  <select
                    value={agenciaSeleccionada}
                    disabled={status !== 'idle'}
                    onChange={e => setAgenciaSeleccionada(e.target.value)}
                    className="form-control"
                    style={{ fontSize: '12px', fontWeight: 600, padding: '6px 8px' }}
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
                      placeholder="Nombre de la agencia..."
                      value={otraAgenciaTexto}
                      onChange={e => setOtraAgenciaTexto(e.target.value)}
                      required
                      className="form-control"
                      style={{ fontSize: '12px', padding: '6px 8px' }}
                    />
                  )}
                </div>
              )}

              {modalidadEntrega === 'Motorizado' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '2px' }}>
                  <div style={{ fontSize: '11px', color: '#6b21a8', fontWeight: 700 }}>
                    ℹ️ Servicio contratado y pagado por el cliente (no por AMEX).
                  </div>
                  <input
                    type="text"
                    placeholder="Detalles del motorizado (opcional: Rappi, placa, etc.)"
                    value={motorizadoDetalle}
                    onChange={e => setMotorizadoDetalle(e.target.value)}
                    className="form-control"
                    style={{ fontSize: '12px', padding: '6px 8px' }}
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
                <span>Atención: {deliveredCount} de los {selectedCount} paquetes ya están ENTREGADOS</span>
              </div>
              <p style={{ margin: 0, fontSize: '11px', color: '#78350f' }}>
                Para evitar que se sobreescriba su entrega accidentalmente, se recomienda omitirlos.
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
                  disabled={status !== 'idle'}
                  onChange={e => setSkipDelivered(e.target.checked)}
                  style={{ accentColor: '#d97706', width: '15px', height: '15px', cursor: 'pointer' }}
                />
                <span>
                  Omitir paquetes ya entregados (Actualiza solo {selectedCount - deliveredCount} pendientes)
                </span>
              </label>
            </div>
          )}

          <div
            className="modal-footer"
            style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}
          >
            <button
              type="button"
              onClick={handleClose}
              disabled={status !== 'idle'}
              className="btn btn-secondary"
              style={{
                opacity: status !== 'idle' ? 0.5 : 1,
                cursor: status !== 'idle' ? 'not-allowed' : 'pointer'
              }}
            >
              Cancelar
            </button>

            {status === 'loading' && (
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

            {status === 'success' && (
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

            {status === 'idle' && (
              <button
                type="button"
                onClick={handleApply}
                disabled={effectiveCount === 0}
                className="btn btn-primary"
                style={{
                  fontWeight: 800,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  opacity: effectiveCount === 0 ? 0.6 : 1,
                  cursor: effectiveCount === 0 ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                ✓ Aplicar a {effectiveCount} paquetes {hasDeliveredConflict && skipDelivered ? 'pendientes' : ''}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
