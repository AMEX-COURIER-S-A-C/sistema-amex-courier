'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle2, Building2, Package, Truck, Bike, AlertCircle, Loader2 } from 'lucide-react';
import { Paquete, TipoModalidadEntrega } from '@/types';

export interface ConfirmDeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  pkg: Paquete | null;
  onConfirmDelivery: (pkg: Paquete, tipoEntrega: string, detalleEntrega?: string) => Promise<void> | void;
}

export default function ConfirmDeliveryModal({
  isOpen,
  onClose,
  pkg,
  onConfirmDelivery
}: ConfirmDeliveryModalProps) {
  const [selectedModalidad, setSelectedModalidad] = useState<TipoModalidadEntrega>('Presencial');
  const [agenciaSeleccionada, setAgenciaSeleccionada] = useState<string>('Shalom');
  const [otraAgenciaTexto, setOtraAgenciaTexto] = useState<string>('');
  const [motorizadoDetalle, setMotorizadoDetalle] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && pkg) {
      // Si el paquete ya tenía pre-asignada una modalidad, cargarla
      const preTipo = pkg.tipoEntrega || 'Presencial';
      setSelectedModalidad(preTipo);
      if (preTipo === 'Agencia') {
        const det = pkg.detalleEntrega || 'Shalom';
        if (['Shalom', 'Olva Courier', 'Marvisur', 'Flores Hermanos', 'Cavassa'].includes(det)) {
          setAgenciaSeleccionada(det);
          setOtraAgenciaTexto('');
        } else {
          setAgenciaSeleccionada('Otra Agencia');
          setOtraAgenciaTexto(det);
        }
      } else if (preTipo === 'Motorizado') {
        setMotorizadoDetalle(pkg.detalleEntrega || '');
      } else {
        setAgenciaSeleccionada('Shalom');
        setOtraAgenciaTexto('');
        setMotorizadoDetalle('');
      }
      setIsSubmitting(false);
    }
  }, [isOpen, pkg]);

  if (!isOpen || !pkg) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModalidad) return;

    let detalleFinal: string | undefined = undefined;

    if (selectedModalidad === 'Agencia') {
      if (agenciaSeleccionada === 'Otra Agencia') {
        detalleFinal = otraAgenciaTexto.trim() || 'Agencia Externa';
      } else {
        detalleFinal = agenciaSeleccionada;
      }
    } else if (selectedModalidad === 'Motorizado') {
      detalleFinal = motorizadoDetalle.trim() || 'Motorizado Particular';
    }

    setIsSubmitting(true);
    try {
      await onConfirmDelivery(pkg, selectedModalidad, detalleFinal);
      onClose();
    } catch (err) {
      console.error('Error al confirmar entrega:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = (() => {
    if (!selectedModalidad) return false;
    if (selectedModalidad === 'Agencia' && agenciaSeleccionada === 'Otra Agencia') {
      return otraAgenciaTexto.trim().length > 0;
    }
    return true;
  })();

  return (
    <div className="modal-backdrop">
      <div className="modal-dialog" style={{ maxWidth: '560px' }}>
        <div className="modal-header" style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
          <span className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            Confirmar Entrega de Paquete
          </span>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748b', padding: '4px' }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Tarjeta de Resumen del Paquete */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '12px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '14px', fontWeight: 900, color: '#1d4ed8', fontFamily: 'monospace' }}>
                  {pkg.numeroReciboBodega}
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '5px',
                    background: '#eff6ff',
                    color: '#2563eb',
                    border: '1px solid #bfdbfe'
                  }}
                >
                  {pkg.pesoKg ? `${pkg.pesoKg} kg` : '0 kg'} · {pkg.tipoEmpaque || 'PAQUETE'}
                </span>
              </div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>
                {pkg.nombreConsignatario || 'Sin Consignatario'}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', gap: '12px' }}>
                <span>Tracking: <b>{pkg.tracking || '—'}</b></span>
                <span>Ubicación: <b>{pkg.posicionEstante || (pkg.anaquel && pkg.piso ? `${pkg.anaquel}-${pkg.piso}` : 'Almacén Lince')}</b></span>
              </div>
            </div>

            {/* Selector Obligatorio de Modalidades */}
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 800, color: '#334155', marginBottom: '8px' }}>
                Selecciona la Modalidad de Entrega <span style={{ color: '#ef4444' }}>*</span>
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {/* 1. Presencial */}
                <div
                  onClick={() => setSelectedModalidad('Presencial')}
                  style={{
                    border: selectedModalidad === 'Presencial' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                    background: selectedModalidad === 'Presencial' ? '#eff6ff' : '#ffffff',
                    borderRadius: '9px',
                    padding: '10px 12px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
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
                  onClick={() => setSelectedModalidad('Agencia')}
                  style={{
                    border: selectedModalidad === 'Agencia' ? '2px solid #d97706' : '1px solid #cbd5e1',
                    background: selectedModalidad === 'Agencia' ? '#fffbeb' : '#ffffff',
                    borderRadius: '9px',
                    padding: '10px 12px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                    <Package className={`w-4 h-4 ${selectedModalidad === 'Agencia' ? 'text-amber-600' : 'text-slate-500'}`} />
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
                  onClick={() => setSelectedModalidad('Domicilio')}
                  style={{
                    border: selectedModalidad === 'Domicilio' ? '2px solid #16a34a' : '1px solid #cbd5e1',
                    background: selectedModalidad === 'Domicilio' ? '#f0fdf4' : '#ffffff',
                    borderRadius: '9px',
                    padding: '10px 12px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
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
                  onClick={() => setSelectedModalidad('Motorizado')}
                  style={{
                    border: selectedModalidad === 'Motorizado' ? '2px solid #7e22ce' : '1px solid #cbd5e1',
                    background: selectedModalidad === 'Motorizado' ? '#faf5ff' : '#ffffff',
                    borderRadius: '9px',
                    padding: '10px 12px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
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
                <label style={{ fontSize: '12px', fontWeight: 800, color: '#92400e' }}>
                  Agencia de Transporte:
                </label>
                <select
                  value={agenciaSeleccionada}
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

                <label style={{ fontSize: '12px', fontWeight: 800, color: '#581c87', marginTop: '2px' }}>
                  Datos del Motorizado o App (Opcional):
                </label>
                <input
                  type="text"
                  placeholder="Ej: Rappi - Carlos R. / PedidosYa / Particular Placa 4512-AB"
                  value={motorizadoDetalle}
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

          <div
            className="modal-footer"
            style={{
              padding: '14px 20px',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '10px',
              background: '#f8fafc'
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="btn"
              style={{
                padding: '7px 14px',
                borderRadius: '7px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#475569',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={!isFormValid || isSubmitting}
              className="btn"
              style={{
                padding: '7px 18px',
                borderRadius: '7px',
                border: 'none',
                background: isFormValid && !isSubmitting ? 'linear-gradient(135deg, #16a34a, #15803d)' : '#cbd5e1',
                color: '#ffffff',
                fontSize: '12.5px',
                fontWeight: 800,
                cursor: isFormValid && !isSubmitting ? 'pointer' : 'not-allowed',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: isFormValid && !isSubmitting ? '0 2px 5px rgba(22, 163, 74, 0.3)' : 'none'
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Procesando...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>Confirmar Entrega</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
