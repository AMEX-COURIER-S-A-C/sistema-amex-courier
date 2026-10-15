'use client';

import React, { useState, useEffect } from 'react';
import { Truck, CheckCircle2 } from 'lucide-react';
import { TipoEstadoEntrega, TipoEstadoAmex } from '@/types';

export interface BatchStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCount: number;
  batchTargetStatus: TipoEstadoEntrega;
  setBatchTargetStatus: React.Dispatch<React.SetStateAction<TipoEstadoEntrega>>;
  batchTargetStatusAmex?: TipoEstadoAmex;
  setBatchTargetStatusAmex?: React.Dispatch<React.SetStateAction<TipoEstadoAmex>>;
  onConfirm: () => Promise<void> | void;
}

export default function BatchStatusModal({
  isOpen,
  onClose,
  selectedCount,
  batchTargetStatus,
  setBatchTargetStatus,
  batchTargetStatusAmex = 'en_almacen',
  setBatchTargetStatusAmex,
  onConfirm
}: BatchStatusModalProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStatus('idle');
      setIsClosing(false);
    }
  }, [isOpen]);

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
      await onConfirm();
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
        style={{ maxWidth: '460px' }}
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
                className="btn btn-primary"
                style={{
                  fontWeight: 800,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease'
                }}
              >
                ✓ Aplicar a {selectedCount} paquetes
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
