'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Building2,
  User,
  ExternalLink,
  Users
} from 'lucide-react';
import { ResumenCliente360, CotizacionKambista } from '../types';
import { DirectorioClienteModal } from './DirectorioClienteModal';
import type { Cliente, Paquete } from '@/types';

interface DirectorioClientesViewProps {
  getResumenCliente360: (clienteNombre: string, paquetes?: Paquete[]) => ResumenCliente360 | null;
  allClientNames: string[];
  paquetes?: Paquete[];
  clientes?: Cliente[];
  cotizacionKambista?: CotizacionKambista;
  onNavigateToCobros?: (clienteNombre: string) => void;
  guardarTarifaCliente?: (clienteNombre: string, tarifa: number) => void;
  initialClientName?: string;
}

interface InlineTarifaInputProps {
  clienteNombre: string;
  tarifaInicial: number;
  tarifaPersonalizada: boolean;
  guardarTarifaCliente?: (clienteNombre: string, tarifa: number) => void;
}

const InlineTarifaInput: React.FC<InlineTarifaInputProps> = ({
  clienteNombre,
  tarifaInicial,
  tarifaPersonalizada,
  guardarTarifaCliente,
}) => {
  const initialVal = tarifaPersonalizada && tarifaInicial > 0 ? tarifaInicial.toFixed(2) : '';
  const [valor, setValor] = useState(initialVal);
  const [guardado, setGuardado] = useState(false);

  useEffect(() => {
    setValor(tarifaPersonalizada && tarifaInicial > 0 ? tarifaInicial.toFixed(2) : '');
  }, [tarifaInicial, tarifaPersonalizada]);

  const handleGuardar = (nuevoValor: string) => {
    if (!guardarTarifaCliente) return;
    const num = parseFloat(nuevoValor);
    if (!isNaN(num) && num > 0) {
      guardarTarifaCliente(clienteNombre, num);
      setGuardado(true);
      setTimeout(() => setGuardado(false), 2000);
    } else if (nuevoValor.trim() === '' || num === 0) {
      guardarTarifaCliente(clienteNombre, 0);
      setGuardado(true);
      setTimeout(() => setGuardado(false), 2000);
    }
  };

  const handleBlur = () => {
    const num = parseFloat(valor);
    if (!isNaN(num) && num > 0) {
      const formatted = num.toFixed(2);
      setValor(formatted);
      handleGuardar(formatted);
    } else {
      setValor('');
      handleGuardar('0');
    }
  };

  return (
    <div
      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', position: 'relative' }}
      onClick={(e) => e.stopPropagation()}
    >
      <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>$</span>
      <input
        type="text"
        inputMode="decimal"
        placeholder="0.00"
        value={valor}
        onChange={(e) => {
          const val = e.target.value.replace(/,/g, '.');
          // Permitir únicamente dígitos y hasta un punto decimal
          if (val === '' || /^\d*\.?\d*$/.test(val)) {
            setValor(val);
          }
        }}
        onBlur={handleBlur}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            (e.target as HTMLInputElement).blur();
          }
        }}
        className="no-spinners"
        style={{
          width: '74px',
          padding: '4px 6px',
          fontSize: '12px',
          fontWeight: 800,
          fontFamily: 'monospace',
          textAlign: 'right',
          borderRadius: '6px',
          border: guardado ? '1.5px solid #10b981' : '1px solid #cbd5e1',
          background: guardado ? '#ecfdf5' : valor ? '#f0fdf4' : '#ffffff',
          color: valor ? '#166534' : '#64748b',
          outline: 'none',
          transition: 'all 0.2s ease',
        }}
      />
      <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>/kg</span>
      {guardado && (
        <span style={{ fontSize: '11px', color: '#059669', fontWeight: 800 }} title="Tarifa guardada">
          ✓
        </span>
      )}
    </div>
  );
};

export const DirectorioClientesView: React.FC<DirectorioClientesViewProps> = ({
  getResumenCliente360,
  allClientNames,
  paquetes,
  clientes,
  cotizacionKambista,
  onNavigateToCobros,
  guardarTarifaCliente,
  initialClientName
}) => {
  const [searchTerm, setSearchTerm] = useState(initialClientName || '');
  const [filterTipo, setFilterTipo] = useState<'TODOS' | 'CORP' | 'PARTICULAR'>('TODOS');
  const [activeModalCliente, setActiveModalCliente] = useState<ResumenCliente360 | null>(null);
  const [clientesLocales, setClientesLocales] = useState<Cliente[]>(clientes || []);

  useEffect(() => {
    if (clientes) {
      setClientesLocales(clientes);
    }
  }, [clientes]);

  // Si cambia el cliente inicial desde navegación externa, actualizar el buscador
  useEffect(() => {
    if (initialClientName) {
      setSearchTerm(initialClientName);
    }
  }, [initialClientName]);

  // Mapa de objeto Cliente completo por nombre
  const clienteObjMap = useMemo(() => {
    const map = new Map<string, Cliente>();
    clientesLocales.forEach((c) => {
      if (c.nombre) {
        map.set(c.nombre.trim().toUpperCase(), c);
      }
    });
    return map;
  }, [clientesLocales]);

  // Mapa de documento por nombre de cliente para búsqueda y visualización rápida
  const clienteDocMap = useMemo(() => {
    const map = new Map<string, string>();
    clientesLocales.forEach((c) => {
      if (c.nombre && c.documentoIdentidad) {
        map.set(c.nombre.trim().toUpperCase(), c.documentoIdentidad.trim());
      }
    });
    return map;
  }, [clientesLocales]);

  // Generar todos los resúmenes ordenados alfabéticamente
  const clientSummaries = useMemo(() => {
    const list: ResumenCliente360[] = [];
    allClientNames.forEach((name) => {
      const summary = getResumenCliente360(name, paquetes);
      if (summary) {
        list.push(summary);
      }
    });

    return list.sort((a, b) => a.clienteNombre.localeCompare(b.clienteNombre, 'es'));
  }, [allClientNames, getResumenCliente360, paquetes]);

  // Filtrado por buscador y tipo de cuenta
  const filteredSummaries = useMemo(() => {
    return clientSummaries.filter((c) => {
      if (filterTipo === 'CORP' && !c.esCorporativo) return false;
      if (filterTipo === 'PARTICULAR' && c.esCorporativo) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.trim().toUpperCase();
        const matchName = c.clienteNombre.toUpperCase().includes(q);
        const matchSub = c.subConsignatarios?.some((s) => s.toUpperCase().includes(q));
        const doc = clienteDocMap.get(c.clienteNombre.toUpperCase()) || '';
        const matchDoc = doc.toUpperCase().includes(q);
        if (!matchName && !matchSub && !matchDoc) return false;
      }

      return true;
    });
  }, [clientSummaries, filterTipo, searchTerm, clienteDocMap]);

  const countCorp = useMemo(() => clientSummaries.filter((c) => c.esCorporativo).length, [clientSummaries]);
  const countPart = useMemo(() => clientSummaries.filter((c) => !c.esCorporativo).length, [clientSummaries]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* 1. BARRA DE BÚSQUEDA Y FILTROS */}
      <div
        style={{
          background: '#ffffff',
          padding: '12px 16px',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
        }}
      >
        <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
          <Search style={{ width: '16px', height: '16px', position: 'absolute', left: '12px', top: '10px', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Buscar por cliente, documento (DNI / RUC), empresa corporativa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              fontSize: '12.5px',
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              color: '#0f172a',
              outline: 'none',
              fontWeight: 500
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '8px', gap: '4px' }}>
            <button
              onClick={() => setFilterTipo('TODOS')}
              style={{
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: 700,
                borderRadius: '6px',
                border: 'none',
                background: filterTipo === 'TODOS' ? '#ffffff' : 'transparent',
                color: filterTipo === 'TODOS' ? '#0f172a' : '#64748b',
                boxShadow: filterTipo === 'TODOS' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                cursor: 'pointer'
              }}
            >
              Todos ({clientSummaries.length})
            </button>
            <button
              onClick={() => setFilterTipo('CORP')}
              style={{
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: 700,
                borderRadius: '6px',
                border: 'none',
                background: filterTipo === 'CORP' ? '#f59e0b' : 'transparent',
                color: filterTipo === 'CORP' ? '#ffffff' : '#b45309',
                cursor: 'pointer'
              }}
            >
              Corporativos ({countCorp})
            </button>
            <button
              onClick={() => setFilterTipo('PARTICULAR')}
              style={{
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: 700,
                borderRadius: '6px',
                border: 'none',
                background: filterTipo === 'PARTICULAR' ? '#3b82f6' : 'transparent',
                color: filterTipo === 'PARTICULAR' ? '#ffffff' : '#1d4ed8',
                cursor: 'pointer'
              }}
            >
              Particulares ({countPart})
            </button>
          </div>
        </div>
      </div>

      {/* 2. TABLA DE CLIENTES (4 COLUMNAS ESENCIALES) */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}
      >
        <div style={{ overflowX: 'auto' }} data-lenis-prevent-horizontal>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', textAlign: 'left' }}>
                <th style={{ padding: '12px 14px', fontWeight: 800, fontSize: '11px', width: '45px' }}>#</th>
                <th style={{ padding: '12px 14px', fontWeight: 800, fontSize: '11px', minWidth: '280px' }}>CLIENTE / EMPRESA</th>
                <th style={{ padding: '12px 14px', fontWeight: 800, fontSize: '11px', minWidth: '160px', textAlign: 'center' }}>DOCUMENTO (DNI / RUC)</th>
                <th style={{ padding: '12px 14px', fontWeight: 800, fontSize: '11px', minWidth: '180px', textAlign: 'center' }}>TARIFA / KG ($)</th>
                <th style={{ padding: '12px 14px', fontWeight: 800, fontSize: '11px', textAlign: 'center', width: '130px' }}>ACCIONES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSummaries.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '40px 16px', textAlign: 'center', color: '#94a3b8' }}>
                    <Users style={{ width: '32px', height: '32px', margin: '0 auto 8px auto', opacity: 0.5 }} />
                    <p style={{ margin: 0, fontWeight: 600 }}>No se encontraron clientes que coincidan con la búsqueda.</p>
                  </td>
                </tr>
              ) : (
                filteredSummaries.map((c, index) => {
                  const doc = clienteDocMap.get(c.clienteNombre.toUpperCase());

                  return (
                    <tr
                      key={c.clienteNombre}
                      onClick={() => setActiveModalCliente(c)}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        cursor: 'pointer',
                        transition: 'background 0.1s ease',
                        background: '#ffffff'
                      }}
                      className="hover:bg-blue-50/40"
                    >
                      {/* # */}
                      <td style={{ padding: '12px 14px', color: '#94a3b8', fontFamily: 'monospace', fontWeight: 600 }}>
                        {index + 1}
                      </td>

                      {/* CLIENTE / EMPRESA */}
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '13px' }}>
                            {c.clienteNombre}
                          </span>
                          {c.esCorporativo ? (
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
                                fontWeight: 600,
                                background: '#f1f5f9',
                                color: '#475569'
                              }}
                            >
                              <User style={{ width: '10px', height: '10px' }} />
                              Particular
                            </span>
                          )}
                          {c.esCorporativo && (c.subConsignatarios?.length || 0) > 0 && (
                            <span style={{ fontSize: '11px', color: '#64748b' }}>
                              ({c.subConsignatarios!.length} destinatarios)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* DOCUMENTO (DNI / RUC) */}
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        {doc ? (
                          <span
                            style={{
                              fontFamily: 'monospace',
                              fontWeight: 700,
                              fontSize: '12px',
                              color: '#1e293b',
                              background: '#f8fafc',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              border: '1px solid #e2e8f0'
                            }}
                          >
                            {doc}
                          </span>
                        ) : (
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '10.5px',
                              fontWeight: 700,
                              background: '#fef2f2',
                              color: '#dc2626',
                              border: '1px solid #fecaca'
                            }}
                          >
                            POR REGISTRAR
                          </span>
                        )}
                      </td>

                      {/* TARIFA / KG ($) EDITABLE DIRECTAMENTE */}
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <InlineTarifaInput
                          clienteNombre={c.clienteNombre}
                          tarifaInicial={c.tarifaPorKgUsd}
                          tarifaPersonalizada={c.tarifaPersonalizada}
                          guardarTarifaCliente={guardarTarifaCliente}
                        />
                      </td>

                      {/* ACCIONES */}
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveModalCliente(c);
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '5px 10px',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              background: '#eff6ff',
                              color: '#2563eb',
                              border: '1px solid #bfdbfe',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                            className="hover:bg-blue-100"
                          >
                            <ExternalLink style={{ width: '13px', height: '13px' }} />
                            <span>Ver Ficha</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. MODAL DETALLE / EXPEDIENTE DEL CLIENTE */}
      <DirectorioClienteModal
        isOpen={Boolean(activeModalCliente)}
        onClose={() => setActiveModalCliente(null)}
        clienteResumen={activeModalCliente}
        clienteInfo={activeModalCliente ? clienteObjMap.get(activeModalCliente.clienteNombre.toUpperCase()) : null}
        onNavigateToCobros={onNavigateToCobros}
        guardarTarifaCliente={guardarTarifaCliente}
        onClienteGuardado={(updatedClient) => {
          setClientesLocales((prev) => {
            const idx = prev.findIndex((c) => c.nombre.toUpperCase() === updatedClient.nombre.toUpperCase());
            if (idx >= 0) {
              const copy = [...prev];
              copy[idx] = updatedClient;
              return copy;
            }
            return [updatedClient, ...prev];
          });
        }}
      />
    </div>
  );
};

// Retrocompatibilidad
export const Clientes360View = DirectorioClientesView;
