'use client';

import React, { useMemo } from 'react';
import {
  Package,
  Search,
  Printer,
  FileText,
  ChevronRight,
  ExternalLink,
  MapPin,
  Truck,
  Store,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  Inbox
} from 'lucide-react';
import { Paquete } from '@/types';
import { PackageStatusFilter } from '../types';

interface LivePackagesStreamProps {
  paquetes: Paquete[];
  allPaquetesCount: number;
  linceCount: number;
  rutaCount: number;
  entregadosCount: number;
  packageFilter: PackageStatusFilter;
  onChangeFilter: (filter: PackageStatusFilter) => void;
  searchQuery: string;
  onChangeSearch: (query: string) => void;
  onPrintLabel: (pkg: Paquete) => void;
  onViewPdf: (url: string) => void;
  onNavigateTab: (tabId: string) => void;
}

export function LivePackagesStream({
  paquetes,
  allPaquetesCount,
  linceCount,
  rutaCount,
  entregadosCount,
  packageFilter,
  onChangeFilter,
  searchQuery,
  onChangeSearch,
  onPrintLabel,
  onViewPdf,
  onNavigateTab
}: LivePackagesStreamProps) {
  // Ordenar priorizando excepciones (sin anaquel primero, luego en ruta, luego por fecha)
  const prioritizedPaquetes = useMemo(() => {
    return [...paquetes].sort((a, b) => {
      const aNoSlot = !a.posicionEstante || a.posicionEstante === 'SIN_ASIGNAR' || a.posicionEstante.includes('REC');
      const bNoSlot = !b.posicionEstante || b.posicionEstante === 'SIN_ASIGNAR' || b.posicionEstante.includes('REC');
      if (aNoSlot && !bNoSlot) return -1;
      if (!aNoSlot && bNoSlot) return 1;

      const aRuta = a.estadoEntrega === 'EnRutaCarroAmex';
      const bRuta = b.estadoEntrega === 'EnRutaCarroAmex';
      if (aRuta && !bRuta) return -1;
      if (!aRuta && bRuta) return 1;

      return (b.creadoEn || '').localeCompare(a.creadoEn || '');
    }).slice(0, 10); // Vista ejecutiva: máximo 10 bultos prioritarios
  }, [paquetes]);

  const getDeliveryMethodBadge = (metodo?: string) => {
    switch (metodo) {
      case 'CarroAmexDomicilio':
        return (
          <span
            style={{
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 500,
              background: '#f8fafc',
              color: '#475569',
              border: '1px solid #e2e8f0',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Truck style={{ width: '12px', height: '12px', color: '#64748b' }} />
            Carro AMEX
          </span>
        );
      case 'AgenciaProvincia':
        return (
          <span
            style={{
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 500,
              background: '#f8fafc',
              color: '#475569',
              border: '1px solid #e2e8f0',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <MapPin style={{ width: '12px', height: '12px', color: '#64748b' }} />
            Provincia
          </span>
        );
      default:
        return (
          <span
            style={{
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 500,
              background: '#f8fafc',
              color: '#475569',
              border: '1px solid #e2e8f0',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Store style={{ width: '12px', height: '12px', color: '#64748b' }} />
            Mostrador Lince
          </span>
        );
    }
  };

  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Header de la Consola de Excepciones */}
      <div
        style={{
          padding: '20px 24px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'wrap'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldAlert style={{ width: '18px', height: '18px', color: '#2563eb' }} />
              Consola de Excepciones & Bultos Prioritarios
            </span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#2563eb',
                background: '#eff6ff',
                padding: '2px 8px',
                borderRadius: '9999px'
              }}
            >
              Control de Piso
            </span>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b' }}>
            Bultos que requieren acción: sin anaquel asignado, en ruta o con seguimiento pendiente
          </p>
        </div>

        {/* Buscador Rápido de WR */}
        <div style={{ position: 'relative', width: '260px' }}>
          <Search
            style={{
              width: '14px',
              height: '14px',
              color: '#94a3b8',
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)'
            }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={e => onChangeSearch(e.target.value)}
            placeholder="Buscar WR#, tracking o cliente..."
            style={{
              width: '100%',
              paddingLeft: '34px',
              paddingRight: '12px',
              paddingTop: '6px',
              paddingBottom: '6px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              fontSize: '12px',
              color: '#0f172a',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>
      </div>

      {/* Barra de Filtros de Estado */}
      <div
        style={{
          padding: '12px 24px',
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          overflowX: 'auto'
        }}
      >
        {[
          { key: 'ALL', label: 'Todos los Prioritarios', count: allPaquetesCount },
          { key: 'LINCE', label: 'En Almacén Lince', count: linceCount },
          { key: 'EN_RUTA', label: 'En Ruta Carro AMEX', count: rutaCount },
          { key: 'ENTREGADO', label: 'Entregados Recientes', count: entregadosCount }
        ].map(f => {
          const isActive = packageFilter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => onChangeFilter(f.key as PackageStatusFilter)}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: isActive ? 700 : 500,
                border: isActive ? '1px solid #cbd5e1' : '1px solid transparent',
                cursor: 'pointer',
                background: isActive ? '#ffffff' : 'transparent',
                color: isActive ? '#0f172a' : '#64748b',
                boxShadow: isActive ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap'
              }}
            >
              <span>{f.label}</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 600, color: isActive ? '#2563eb' : '#94a3b8' }}>
                ({f.count})
              </span>
            </button>
          );
        })}
      </div>

      {/* Lista Ejecutiva de Bultos */}
      {prioritizedPaquetes.length === 0 ? (
        <div style={{ padding: '36px 24px', textAlign: 'center', color: '#64748b' }}>
          <Inbox style={{ width: '32px', height: '32px', color: '#cbd5e1', margin: '0 auto 8px' }} />
          <p style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', margin: 0 }}>
            Sin bultos en este filtro
          </p>
          <p style={{ fontSize: '12px', color: '#94a3b8', margin: '4px 0 0' }}>
            No se encontraron paquetes pendientes con los filtros actuales
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {prioritizedPaquetes.map(pkg => {
            const isNoSlot = !pkg.posicionEstante || pkg.posicionEstante === 'SIN_ASIGNAR' || pkg.posicionEstante.includes('REC');
            const isRuta = pkg.estadoEntrega === 'EnRutaCarroAmex';
            const isDelivered = pkg.estadoEntrega === 'Entregado' || pkg.estadoEntrega === 'EntregadoDomicilio';

            return (
              <div
                key={pkg.id}
                style={{
                  padding: '14px 24px',
                  borderBottom: '1px solid #f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  flexWrap: 'wrap',
                  transition: 'background 0.1s ease'
                }}
                className="hover:bg-slate-50"
              >
                {/* Info Izquierda: WR# y Tracking */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '220px' }}>
                  <div
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '8px',
                      background: isNoSlot ? '#fef2f2' : isRuta ? '#fef3c7' : '#f1f5f9',
                      color: isNoSlot ? '#dc2626' : isRuta ? '#d97706' : '#475569',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    <Package style={{ width: '16px', height: '16px' }} />
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                        {pkg.numeroReciboBodega}
                      </span>
                      {isNoSlot && (
                        <span style={{ fontSize: '10px', fontWeight: 700, color: '#dc2626', background: '#fef2f2', padding: '1px 6px', borderRadius: '4px' }}>
                          Sin Anaquel
                        </span>
                      )}
                      {isRuta && (
                        <span style={{ fontSize: '10px', fontWeight: 700, color: '#d97706', background: '#fef3c7', padding: '1px 6px', borderRadius: '4px' }}>
                          En Reparto
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                      {pkg.tracking || 'Sin tracking externo'} · {pkg.pesoKg || 0} kg
                    </div>
                  </div>
                </div>

                {/* Cliente / Consignatario */}
                <div style={{ flex: 1, minWidth: '180px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a' }}>
                    {pkg.nombreConsignatario || 'Consignatario no registrado'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                    {pkg.descripcion || 'Sin descripción de carga'}
                  </div>
                </div>

                {/* Ubicación / Canal */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {getDeliveryMethodBadge(pkg.metodoEntrega)}

                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 600,
                      fontFamily: 'monospace',
                      background: isNoSlot ? '#fef2f2' : '#f1f5f9',
                      color: isNoSlot ? '#dc2626' : '#334155',
                      border: '1px solid #e2e8f0'
                    }}
                  >
                    {pkg.posicionEstante || 'MESA-REC'}
                  </span>
                </div>

                {/* Acciones Rápidas */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => onPrintLabel(pkg)}
                    title="Imprimir Rótulo Térmico"
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      padding: '6px 8px',
                      cursor: 'pointer',
                      color: '#475569',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <Printer style={{ width: '14px', height: '14px' }} />
                  </button>

                  {pkg.facturaPdfUrl && (
                    <button
                      type="button"
                      onClick={() => onViewPdf(pkg.facturaPdfUrl!)}
                      title="Ver Factura Comercial PDF"
                      style={{
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        padding: '6px 8px',
                        cursor: 'pointer',
                        color: '#475569',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <FileText style={{ width: '14px', height: '14px' }} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer Ejecutivo: Salto al Módulo 3 (Inventario Completo) */}
      <div
        style={{
          padding: '14px 24px',
          background: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <span style={{ fontSize: '12px', color: '#64748b' }}>
          Mostrando los <strong>{prioritizedPaquetes.length} bultos prioritarios</strong> de {allPaquetesCount} registrados
        </span>

        <button
          type="button"
          onClick={() => onNavigateTab('inventario')}
          style={{
            fontSize: '12px',
            fontWeight: 600,
            color: '#2563eb',
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            padding: '6px 14px',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <span>Abrir Inventario Completo (Módulo 3)</span>
          <ArrowRight style={{ width: '12px', height: '12px' }} />
        </button>
      </div>
    </div>
  );
}
