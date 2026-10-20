'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  User,
  Building2,
  Package,
  CheckCircle2,
  AlertCircle,
  Search,
  CreditCard,
  Phone,
  Mail,
  MapPin,
  Save,
  DollarSign,
  Users,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { ResumenCliente360 } from '../types';
import { smoothScrollManager } from '@/lib/smooth-scroll/manager';
import type { Cliente } from '@/types';

interface DirectorioClienteModalProps {
  isOpen: boolean;
  onClose: () => void;
  clienteResumen: ResumenCliente360 | null;
  clienteInfo?: Cliente | null;
  onNavigateToCobros?: (clienteNombre: string) => void;
  guardarTarifaCliente?: (clienteNombre: string, tarifa: number) => void;
  onClienteGuardado?: (cliente: Cliente) => void;
}

export const DirectorioClienteModal: React.FC<DirectorioClienteModalProps> = (props) => {
  if (!props.isOpen || !props.clienteResumen) return null;
  return <DirectorioClienteModalContent {...props} clienteResumen={props.clienteResumen} />;
};

const DirectorioClienteModalContent: React.FC<DirectorioClienteModalProps & { clienteResumen: ResumenCliente360 }> = ({
  onClose,
  clienteResumen,
  clienteInfo,
  onNavigateToCobros,
  guardarTarifaCliente,
  onClienteGuardado
}) => {
  const [tabInterna, setTabInterna] = useState<'ficha' | 'wrs' | 'consignatarios'>('ficha');
  const [filtroTexto, setFiltroTexto] = useState('');

  // Estado de Tarifa
  const [tarifaInput, setTarifaInput] = useState<string>(
    clienteResumen.tarifaPorKgUsd && clienteResumen.tarifaPorKgUsd > 0
      ? clienteResumen.tarifaPorKgUsd.toFixed(2)
      : ''
  );
  const [tarifaSavedFeedback, setTarifaSavedFeedback] = useState(false);

  // Estado de Datos del Cliente (DNI, Teléfono, Dirección)
  const [formData, setFormData] = useState({
    documentoIdentidad: clienteInfo?.documentoIdentidad || '',
    telefono: clienteInfo?.telefono || '',
    email: clienteInfo?.email || '',
    departamento: clienteInfo?.departamento || 'LIMA',
    provincia: clienteInfo?.provincia || 'LIMA',
    distrito: clienteInfo?.distrito || '',
    direccionEntrega: clienteInfo?.direccionEntrega || ''
  });
  const [guardandoCliente, setGuardandoCliente] = useState(false);
  const [clienteSavedMsg, setClienteSavedMsg] = useState<string | null>(null);
  const [clienteErrorMsg, setClienteErrorMsg] = useState<string | null>(null);

  // Bloqueo de scroll de fondo
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    smoothScrollManager.pushModalLock();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
      smoothScrollManager.popModalLock();
    };
  }, [onClose]);

  // Actualizar tarifa input si cambia externamente
  useEffect(() => {
    if (clienteResumen.tarifaPorKgUsd && clienteResumen.tarifaPorKgUsd > 0) {
      setTarifaInput(clienteResumen.tarifaPorKgUsd.toFixed(2));
    }
  }, [clienteResumen.tarifaPorKgUsd]);

  // Actualizar formData si clienteInfo cambia
  useEffect(() => {
    if (clienteInfo) {
      setFormData({
        documentoIdentidad: clienteInfo.documentoIdentidad || '',
        telefono: clienteInfo.telefono || '',
        email: clienteInfo.email || '',
        departamento: clienteInfo.departamento || 'LIMA',
        provincia: clienteInfo.provincia || 'LIMA',
        distrito: clienteInfo.distrito || '',
        direccionEntrega: clienteInfo.direccionEntrega || ''
      });
    }
  }, [clienteInfo]);

  // Guardar Tarifa
  const handleSaveTarifa = (tarifaNum: number) => {
    if (isNaN(tarifaNum) || tarifaNum < 0) return;
    setTarifaInput(tarifaNum > 0 ? tarifaNum.toFixed(2) : '');
    if (guardarTarifaCliente) {
      guardarTarifaCliente(clienteResumen.clienteNombre, tarifaNum);
      setTarifaSavedFeedback(true);
      setTimeout(() => setTarifaSavedFeedback(false), 2500);
    }
  };

  // Guardar datos del cliente a Supabase
  const handleGuardarDatosCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setGuardandoCliente(true);
      setClienteSavedMsg(null);
      setClienteErrorMsg(null);

      const res = await fetch('/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: clienteResumen.clienteNombre,
          documento_identidad: formData.documentoIdentidad,
          telefono: formData.telefono,
          email: formData.email,
          departamento: formData.departamento,
          provincia: formData.provincia,
          distrito: formData.distrito,
          direccion_entrega: formData.direccionEntrega
        })
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'No se pudo guardar la información del cliente.');
      }

      setClienteSavedMsg('¡Datos actualizados correctamente!');
      if (onClienteGuardado && data.cliente) {
        onClienteGuardado(data.cliente);
      }
      setTimeout(() => setClienteSavedMsg(null), 3000);
    } catch (err: unknown) {
      setClienteErrorMsg(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setGuardandoCliente(false);
    }
  };

  // Filtrado de paquetes WR
  const wrsFiltrados = useMemo(() => {
    if (!filtroTexto.trim()) return clienteResumen.historialWRs;
    const q = filtroTexto.trim().toUpperCase();
    return clienteResumen.historialWRs.filter(
      (w) =>
        w.wr.toUpperCase().includes(q) ||
        w.tracking?.toUpperCase().includes(q) ||
        w.consignatarioNombre?.toUpperCase().includes(q)
    );
  }, [clienteResumen.historialWRs, filtroTexto]);

  const DEPARTAMENTOS = [
    'LIMA',
    'CALLAO',
    'AREQUIPA',
    'LA LIBERTAD',
    'PIURA',
    'CUSCO',
    'LAMBAYEQUE',
    'JUNIN',
    'HUANUCO',
    'SAN MARTIN',
    'ANCASH',
    'ICA',
    'LORETO',
    'PUNO',
    'TACNA',
    'UCAYALI'
  ];

  return (
    <div className="modal-backdrop" style={{ zIndex: 99999 }}>
      <div
        className="modal-dialog"
        style={{
          maxWidth: '760px',
          width: '95%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(15, 23, 42, 0.06)',
          overflow: 'hidden',
          background: '#ffffff'
        }}
      >
        {/* HEADER MODERNO BLANCO CON ACABADO ERP */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #e2e8f0',
            background: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: clienteResumen.esCorporativo ? '#fef3c7' : '#eff6ff',
                border: clienteResumen.esCorporativo ? '1px solid #fde68a' : '1px solid #bfdbfe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: clienteResumen.esCorporativo ? '#b45309' : '#2563eb'
              }}
            >
              {clienteResumen.esCorporativo ? (
                <Building2 style={{ width: '22px', height: '22px' }} />
              ) : (
                <User style={{ width: '22px', height: '22px' }} />
              )}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h2
                  style={{
                    fontSize: '17px',
                    fontWeight: 900,
                    color: '#0f172a',
                    margin: 0,
                    letterSpacing: '-0.3px'
                  }}
                >
                  {clienteResumen.clienteNombre}
                </h2>
                {clienteResumen.esCorporativo ? (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '10px',
                      fontWeight: 800,
                      background: '#fef3c7',
                      color: '#92400e',
                      border: '1px solid #fde68a'
                    }}
                  >
                    <Building2 style={{ width: '10px', height: '10px' }} />
                    CORPORATIVO
                  </span>
                ) : (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '10px',
                      fontWeight: 700,
                      background: '#f1f5f9',
                      color: '#475569',
                      border: '1px solid #e2e8f0'
                    }}
                  >
                    Particular
                  </span>
                )}
              </div>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '3px 0 0 0', fontWeight: 500 }}>
                Ficha Oficial del Cliente en Directorio AMEX Courier
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              border: 'none',
              background: 'transparent',
              color: '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            className="hover:bg-slate-100 hover:text-slate-700"
          >
            <X style={{ width: '18px', height: '18px' }} />
          </button>
        </div>

        {/* BARRA DE PESTAÑAS (SEGMENTED CONTROL MODERNO) */}
        <div
          style={{
            padding: '10px 24px',
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              background: '#e2e8f0',
              padding: '3px',
              borderRadius: '10px',
              gap: '2px'
            }}
          >
            <button
              type="button"
              onClick={() => setTabInterna('ficha')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: tabInterna === 'ficha' ? 800 : 600,
                color: tabInterna === 'ficha' ? '#0f172a' : '#64748b',
                background: tabInterna === 'ficha' ? '#ffffff' : 'transparent',
                border: 'none',
                borderRadius: '8px',
                boxShadow: tabInterna === 'ficha' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <User style={{ width: '13px', height: '13px' }} />
              <span>Ficha y Datos Oficiales</span>
            </button>

            <button
              type="button"
              onClick={() => setTabInterna('wrs')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: tabInterna === 'wrs' ? 800 : 600,
                color: tabInterna === 'wrs' ? '#0f172a' : '#64748b',
                background: tabInterna === 'wrs' ? '#ffffff' : 'transparent',
                border: 'none',
                borderRadius: '8px',
                boxShadow: tabInterna === 'wrs' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <Package style={{ width: '13px', height: '13px' }} />
              <span>Historial de Paquetes ({clienteResumen.historialWRs.length})</span>
            </button>

            {clienteResumen.esCorporativo && (clienteResumen.subConsignatarios?.length || 0) > 0 && (
              <button
                type="button"
                onClick={() => setTabInterna('consignatarios')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  fontSize: '12px',
                  fontWeight: tabInterna === 'consignatarios' ? 800 : 600,
                  color: tabInterna === 'consignatarios' ? '#0f172a' : '#64748b',
                  background: tabInterna === 'consignatarios' ? '#ffffff' : 'transparent',
                  border: 'none',
                  borderRadius: '8px',
                  boxShadow: tabInterna === 'consignatarios' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <Users style={{ width: '13px', height: '13px' }} />
                <span>Sub-Destinatarios ({clienteResumen.subConsignatarios!.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* CUERPO PRINCIPAL DEL MODAL */}
        <div
          style={{
            padding: '24px',
            overflowY: 'auto',
            flex: '1 1 auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}
          data-lenis-prevent=""
          onWheel={(e) => e.stopPropagation()}
        >
          {/* TAB 1: FICHA Y DATOS OFICIALES */}
          {tabInterna === 'ficha' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* TARJETA 1: CONFIGURACIÓN DE TARIFA PARA COBROS */}
              <div
                style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '12px',
                  padding: '16px 18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '8px',
                        background: '#16a34a',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        fontWeight: 900
                      }}
                    >
                      $
                    </div>
                    <div>
                      <h3 style={{ fontSize: '12px', fontWeight: 800, color: '#166534', margin: 0, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                        Tarifa Asignada para Planilla de Cobros
                      </h3>
                      <p style={{ fontSize: '11px', color: '#15803d', margin: '2px 0 0 0' }}>
                        Esta tarifa se cruzará automáticamente en el Módulo 4 (Armar Planilla de Cobros) para calcular el PRECIO $.
                      </p>
                    </div>
                  </div>

                  {tarifaSavedFeedback && (
                    <span
                      style={{
                        fontSize: '11.5px',
                        fontWeight: 800,
                        color: '#15803d',
                        background: '#dcfce7',
                        border: '1px solid #86efac',
                        padding: '3px 9px',
                        borderRadius: '6px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <CheckCircle2 style={{ width: '13px', height: '13px' }} />
                      ¡Tarifa guardada!
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#166534', textTransform: 'uppercase' }}>
                    Presets rápidos:
                  </span>
                  {[6.0, 6.5, 7.0, 7.5, 8.0, 8.5].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleSaveTarifa(preset)}
                      style={{
                        padding: '4px 10px',
                        fontSize: '11.5px',
                        fontWeight: 800,
                        fontFamily: 'monospace',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        border: parseFloat(tarifaInput) === preset ? '1px solid #16a34a' : '1px solid #cbd5e1',
                        background: parseFloat(tarifaInput) === preset ? '#16a34a' : '#ffffff',
                        color: parseFloat(tarifaInput) === preset ? '#ffffff' : '#334155',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      ${preset.toFixed(2)}
                    </button>
                  ))}

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '6px' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        padding: '3px 8px'
                      }}
                    >
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#64748b', marginRight: '3px' }}>$</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={tarifaInput}
                        onChange={(e) => {
                          const val = e.target.value.replace(/,/g, '.');
                          if (val === '' || /^\d*\.?\d*$/.test(val)) {
                            setTarifaInput(val);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSaveTarifa(parseFloat(tarifaInput));
                          }
                        }}
                        style={{
                          width: '54px',
                          border: 'none',
                          outline: 'none',
                          fontSize: '12px',
                          fontWeight: 800,
                          fontFamily: 'monospace',
                          textAlign: 'right',
                          color: '#0f172a'
                        }}
                        placeholder="0.00"
                        className="no-spinners"
                      />
                      <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, marginLeft: '3px' }}>/kg</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSaveTarifa(parseFloat(tarifaInput))}
                      style={{
                        padding: '5px 12px',
                        borderRadius: '6px',
                        border: 'none',
                        background: '#0f172a',
                        color: '#ffffff',
                        fontSize: '11.5px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      className="hover:bg-slate-800"
                    >
                      Guardar
                    </button>
                  </div>
                </div>
              </div>

              {/* TARJETA 2: DATOS OFICIALES Y DE CONTACTO */}
              <form
                onSubmit={handleGuardarDatosCliente}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CreditCard style={{ width: '16px', height: '16px', color: '#2563eb' }} />
                    <h3 style={{ fontSize: '13px', fontWeight: 900, color: '#0f172a', margin: 0, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                      Datos de Identidad y Contacto
                    </h3>
                  </div>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                    Información oficial de la base de clientes
                  </span>
                </div>

                {clienteSavedMsg && (
                  <div
                    style={{
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: '#ecfdf5',
                      border: '1px solid #a7f3d0',
                      color: '#065f46',
                      fontSize: '12px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <CheckCircle2 style={{ width: '15px', height: '15px', color: '#059669' }} />
                    <span>{clienteSavedMsg}</span>
                  </div>
                )}

                {clienteErrorMsg && (
                  <div
                    style={{
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      color: '#991b1b',
                      fontSize: '12px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <AlertCircle style={{ width: '15px', height: '15px', color: '#dc2626' }} />
                    <span>{clienteErrorMsg}</span>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  {/* Documento Fiscal (DNI / RUC) */}
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '11px',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        color: '#475569',
                        marginBottom: '5px'
                      }}
                    >
                      Documento Fiscal (DNI / RUC)
                    </label>
                    <input
                      type="text"
                      value={formData.documentoIdentidad}
                      onChange={(e) => setFormData({ ...formData, documentoIdentidad: e.target.value })}
                      placeholder="DNI (8 dígitos) o RUC (11 dígitos)"
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        fontSize: '12.5px',
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        color: '#0f172a',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  {/* Teléfono / WhatsApp */}
                  <div>
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '11px',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        color: '#475569',
                        marginBottom: '5px'
                      }}
                    >
                      <Phone style={{ width: '12px', height: '12px', color: '#64748b' }} />
                      Teléfono / WhatsApp
                    </label>
                    <input
                      type="text"
                      value={formData.telefono}
                      onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                      placeholder="Ej: +51 987 654 321"
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        color: '#0f172a',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  {/* Correo Electrónico */}
                  <div>
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '11px',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        color: '#475569',
                        marginBottom: '5px'
                      }}
                    >
                      <Mail style={{ width: '12px', height: '12px', color: '#64748b' }} />
                      Correo Electrónico
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="Ej: cliente@correo.com"
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        color: '#0f172a',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  {/* Departamento */}
                  <div>
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '11px',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        color: '#475569',
                        marginBottom: '5px'
                      }}
                    >
                      <MapPin style={{ width: '12px', height: '12px', color: '#64748b' }} />
                      Departamento
                    </label>
                    <select
                      value={formData.departamento}
                      onChange={(e) => setFormData({ ...formData, departamento: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        fontSize: '12.5px',
                        fontWeight: 700,
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        color: '#0f172a',
                        outline: 'none',
                        boxSizing: 'border-box',
                        cursor: 'pointer'
                      }}
                    >
                      {DEPARTAMENTOS.map((dep) => (
                        <option key={dep} value={dep}>{dep}</option>
                      ))}
                    </select>
                  </div>

                  {/* Provincia */}
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '11px',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        color: '#475569',
                        marginBottom: '5px'
                      }}
                    >
                      Provincia
                    </label>
                    <input
                      type="text"
                      value={formData.provincia}
                      onChange={(e) => setFormData({ ...formData, provincia: e.target.value })}
                      placeholder="Ej: LIMA"
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        color: '#0f172a',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  {/* Distrito */}
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '11px',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        color: '#475569',
                        marginBottom: '5px'
                      }}
                    >
                      Distrito
                    </label>
                    <input
                      type="text"
                      value={formData.distrito}
                      onChange={(e) => setFormData({ ...formData, distrito: e.target.value })}
                      placeholder="Ej: LINCE / MIRAFLORES / SAN ISIDRO"
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        color: '#0f172a',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  {/* Dirección de Entrega */}
                  <div style={{ gridColumn: 'span 2' }}>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '11px',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        color: '#475569',
                        marginBottom: '5px'
                      }}
                    >
                      Dirección de Entrega
                    </label>
                    <input
                      type="text"
                      value={formData.direccionEntrega}
                      onChange={(e) => setFormData({ ...formData, direccionEntrega: e.target.value })}
                      placeholder="Ej: Sede Principal Lince / Av. Arequipa 2450 Dpto 402"
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        color: '#0f172a',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '4px' }}>
                  <button
                    type="submit"
                    disabled={guardandoCliente}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '9px 18px',
                      borderRadius: '8px',
                      border: 'none',
                      background: '#2563eb',
                      color: '#ffffff',
                      fontSize: '12.5px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      boxShadow: '0 1px 3px rgba(37,99,235,0.3)',
                      transition: 'all 0.15s ease'
                    }}
                    className="hover:opacity-95 disabled:opacity-50"
                  >
                    <Save style={{ width: '14px', height: '14px' }} />
                    <span>{guardandoCliente ? 'Guardando...' : 'Guardar Cambios de Cliente'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: HISTORIAL DE PAQUETES (WRs) */}
          {tabInterna === 'wrs' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search style={{ width: '14px', height: '14px', position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }} />
                  <input
                    type="text"
                    placeholder="Filtrar por código WR o tracking..."
                    value={filtroTexto}
                    onChange={(e) => setFiltroTexto(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '7px 10px 7px 32px',
                      fontSize: '12px',
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 700 }}>
                  {wrsFiltrados.length} paquetes
                </span>
              </div>

              <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', color: '#64748b', borderBottom: '1px solid #e2e8f0', textTransform: 'uppercase', fontSize: '10.5px' }}>
                      <th style={{ padding: '10px 12px', fontWeight: 800 }}>WR</th>
                      <th style={{ padding: '10px 12px', fontWeight: 800 }}>TRACKING</th>
                      {clienteResumen.esCorporativo && <th style={{ padding: '10px 12px', fontWeight: 800 }}>CONSIGNATARIO</th>}
                      <th style={{ padding: '10px 12px', fontWeight: 800, textAlign: 'center' }}>PESO</th>
                      <th style={{ padding: '10px 12px', fontWeight: 800, textAlign: 'center' }}>ESTADO</th>
                      <th style={{ padding: '10px 12px', fontWeight: 800 }}>NOTAS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wrsFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: '36px 16px', textAlign: 'center', color: '#94a3b8' }}>
                          <Package style={{ width: '28px', height: '28px', margin: '0 auto 6px auto', opacity: 0.4 }} />
                          <p style={{ margin: 0, fontWeight: 600, fontSize: '12px' }}>No hay paquetes registrados para este cliente.</p>
                        </td>
                      </tr>
                    ) : (
                      wrsFiltrados.map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }} className="hover:bg-slate-50">
                          <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontWeight: 800, color: '#0f172a' }}>
                            {item.wr}
                          </td>
                          <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: '#475569' }}>
                            {item.tracking || '—'}
                          </td>
                          {clienteResumen.esCorporativo && (
                            <td style={{ padding: '10px 12px', color: '#4338ca', fontWeight: 700 }}>
                              {item.consignatarioNombre || '—'}
                            </td>
                          )}
                          <td style={{ padding: '10px 12px', textAlign: 'center', fontFamily: 'monospace', fontWeight: 800, color: '#059669' }}>
                            {item.pesoKg > 0 ? `${item.pesoKg.toFixed(2)} kg` : '—'}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            {item.estadoEntrega === 'ENTREGADO' || item.estadoEntrega === 'RECOGIDO' ? (
                              <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 800, background: '#f3e8ff', color: '#7e22ce' }}>
                                ENTREGADO
                              </span>
                            ) : (
                              <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 800, background: '#fef3c7', color: '#b45309' }}>
                                EN ALMACÉN
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '10px 12px', color: '#64748b', fontSize: '11px' }}>
                            {item.cajaNumero ? `Caja: ${item.cajaNumero}` : (item.notas || '—')}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: SUB-DESTINATARIOS CORPORATIVOS */}
          {tabInterna === 'consignatarios' && clienteResumen.subConsignatarios && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                Destinatarios individuales asociados que consolidan bajo la cuenta de <strong style={{ color: '#0f172a' }}>{clienteResumen.clienteNombre}</strong>:
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {clienteResumen.subConsignatarios.map((sub, idx) => {
                  const subWrs = clienteResumen.historialWRs.filter(
                    (w) => w.consignatarioNombre?.toUpperCase() === sub.toUpperCase()
                  );

                  return (
                    <div
                      key={idx}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '10px',
                        border: '1px solid #e2e8f0',
                        background: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '8px',
                            background: '#e0e7ff',
                            border: '1px solid #c7d2fe',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#4338ca'
                          }}
                        >
                          <User style={{ width: '14px', height: '14px' }} />
                        </div>
                        <div>
                          <h4 style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                            {sub}
                          </h4>
                          <span style={{ fontSize: '10.5px', color: '#94a3b8' }}>
                            {subWrs.length} paquetes vinculados
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* FOOTER MODERNO */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid #e2e8f0',
            background: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px',
            flexShrink: 0
          }}
        >
          <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 500 }}>
            AMEX Courier &bull; Directorio de Clientes
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {onNavigateToCobros && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateToCobros(clienteResumen.clienteNombre);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  fontSize: '12px',
                  fontWeight: 800,
                  color: '#047857',
                  background: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                className="hover:bg-emerald-100"
              >
                <DollarSign style={{ width: '13px', height: '13px' }} />
                <span>Ir a Módulo de Cobros</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '7px 16px',
                fontSize: '12px',
                fontWeight: 700,
                color: '#334155',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                transition: 'all 0.15s ease'
              }}
              className="hover:bg-slate-100"
            >
              Cerrar Ficha
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Retrocompatibilidad
export const Client360Modal = DirectorioClienteModal;
