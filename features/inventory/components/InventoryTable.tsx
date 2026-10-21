'use client';

import React, { useState } from 'react';
import {
  Boxes,
  Camera,
  Edit3
} from 'lucide-react';
import ConfirmDeliveryModal from '../modals/ConfirmDeliveryModal';
import { Paquete } from '@/types';
import { formatFechaModificadoParts } from '@/lib/excelExport';
import { confirmDialog } from '@/lib/dialog';
import RowActionsDropdown from './RowActionsDropdown';

export interface InventoryTableProps {
  filteredPaquetes: Paquete[];
  paginatedPaquetes: Paquete[];
  selectedIds: string[];
  totalCount?: number;
  deliveringIds?: string[];
  recentlyDeliveredIds?: string[];
  onToggleSelect: (id: string) => void;
  onSelectAll: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onQuickDeliver?: (pkg: Paquete, tipoEntrega?: string, detalleEntrega?: string) => Promise<void> | void;
  onUpdateDeliveryMethod?: (pkgId: string, tipoEntrega: string, detalleEntrega?: string) => Promise<boolean | void> | boolean | void;
  onOpenTransferModal: (pkg: Paquete) => void;
  onOpenEditModal: (pkg: Paquete) => void;
  onSelectThermalPkg: (pkg: Paquete) => void;
  onViewPdf: (url: string) => void;
  onOpenTibImage?: (pkg: Paquete) => void;
  onDeletePackage: (id: string, wrCode: string) => void;
  currentPage: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  pageSize: number;
  setPageSize: (size: number) => void;
  totalPages: number;
}

export default function InventoryTable({
  filteredPaquetes,
  paginatedPaquetes,
  selectedIds,
  totalCount,
  deliveringIds = [],
  recentlyDeliveredIds = [],
  onToggleSelect,
  onSelectAll,
  onQuickDeliver,
  onUpdateDeliveryMethod,
  onOpenTransferModal,
  onOpenEditModal,
  onSelectThermalPkg,
  onViewPdf,
  onOpenTibImage,
  onDeletePackage,
  currentPage,
  setCurrentPage,
  pageSize,
  setPageSize,
  totalPages
}: InventoryTableProps) {
  const [deliveryModalPkg, setDeliveryModalPkg] = useState<Paquete | null>(null);
  const total = totalCount !== undefined ? totalCount : filteredPaquetes.length;

  const renderPagination = (position: 'top' | 'bottom') => {
    if (filteredPaquetes.length === 0) return null;

    return (
      <div
        style={{
          padding: '10px 16px',
          background: '#f8fafc',
          borderBottom: position === 'top' ? '1px solid #e2e8f0' : undefined,
          borderTop: position === 'bottom' ? '1px solid #e2e8f0' : undefined,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
          fontSize: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b' }}>
          <span>
            Mostrando <b>{total > 0 ? (currentPage - 1) * pageSize + 1 : 0}</b> -{' '}
            <b>{Math.min(currentPage * pageSize, total)}</b> de{' '}
            <b>{total}</b> paquetes
          </span>

          <span style={{ color: '#cbd5e1' }}>•</span>

          <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>Por página:</span>
            <select
              value={pageSize}
              onChange={e => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              style={{
                padding: '2px 6px',
                borderRadius: '4px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                fontSize: '12px',
                fontWeight: 700
              }}
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
            </select>
          </label>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="px-3 py-1 rounded-md border text-xs font-bold transition-colors disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed bg-white text-slate-800 hover:bg-slate-50 border-slate-300 cursor-pointer"
          >
            Anterior
          </button>

          <span className="px-2.5 py-1 font-extrabold text-blue-600 text-xs">
            {currentPage} / {totalPages}
          </span>

          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className="px-3 py-1 rounded-md border text-xs font-bold transition-colors disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed bg-white text-slate-800 hover:bg-slate-50 border-slate-300 cursor-pointer"
          >
            Siguiente
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
      {/* Paginación Superior */}
      {renderPagination('top')}

      <div className="overflow-x-auto" data-lenis-prevent-horizontal>
        <table className="w-full border-collapse text-xs text-left">
          <thead className="sticky top-0 bg-slate-50 z-10 shadow-xs">
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
              <th className="py-2.5 px-3.5 w-10">
                <input
                  type="checkbox"
                  checked={selectedIds.length > 0 && selectedIds.length === filteredPaquetes.length}
                  onChange={onSelectAll}
                />
              </th>
              <th className="py-2.5 px-3.5">Guía WR</th>
              <th className="py-2.5 px-3.5">Tracking</th>
              <th className="py-2.5 px-3.5">Cliente</th>
              <th className="py-2.5 px-3.5 whitespace-nowrap">Tipo de Caja</th>
              <th className="py-2.5 px-3.5">Peso</th>
              <th className="py-2.5 px-3.5">Ubicación</th>
              <th className="py-2.5 px-3.5">Estado AMEX</th>
              <th className="py-2.5 px-3.5 whitespace-nowrap">Tipo Entrega</th>
              <th className="py-2.5 px-3.5 whitespace-nowrap">Modificado</th>
              <th className="py-2.5 px-3.5 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredPaquetes.length === 0 ? (
              <tr>
                <td colSpan={11} style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                  <Boxes style={{ width: '40px', height: '40px', margin: '0 auto 8px auto', color: '#cbd5e1' }} />
                  <div style={{ fontWeight: 800, color: '#64748b' }}>
                    No se encontraron paquetes con los filtros seleccionados
                  </div>
                </td>
              </tr>
            ) : (
              paginatedPaquetes.map((pkg, index) => {
                const pos =
                  pkg.posicionEstante ||
                  (pkg.anaquel && pkg.piso ? `${pkg.anaquel}-${pkg.piso}` : 'REC');
                const isSelected = selectedIds.includes(pkg.id);
                const isDelivering = deliveringIds?.includes(pkg.id);
                const isRecentlyDelivered = recentlyDeliveredIds?.includes(pkg.id);

                let rowBg = '#ffffff';
                if (isRecentlyDelivered) {
                  rowBg = '#ecfdf5';
                } else if (isSelected) {
                  rowBg = '#eff6ff';
                } else if (isDelivering) {
                  rowBg = '#f8fafc';
                }

                return (
                  <tr
                    key={pkg.id}
                    style={{
                      borderBottom: isRecentlyDelivered ? '1px solid #a7f3d0' : '1px solid #f1f5f9',
                      background: rowBg,
                      transition: 'background-color 0.35s ease, border-color 0.35s ease, opacity 0.25s ease',
                      opacity: isDelivering ? 0.7 : 1
                    }}
                  >
                    <td style={{ padding: '10px 14px' }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelect(pkg.id)}
                      />
                    </td>
                    <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div
                          style={{
                            fontWeight: 800,
                            color: '#0f172a',
                            fontFamily: 'monospace',
                            fontSize: '13px'
                          }}
                        >
                          {pkg.numeroReciboBodega}
                        </div>
                        {onOpenTibImage && (
                          <button
                            type="button"
                            title={pkg.tibImagenUrl ? "Ver Foto TIB (Guardada)" : "Consultar Foto de Bodega TIB"}
                            onClick={() => onOpenTibImage(pkg)}
                            style={{
                              background: pkg.tibImagenUrl ? '#eff6ff' : '#f8fafc',
                              border: pkg.tibImagenUrl ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
                              color: pkg.tibImagenUrl ? '#2563eb' : '#64748b',
                              padding: '2px 6px',
                              borderRadius: '5px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              fontSize: '10px',
                              fontWeight: 700,
                              boxShadow: pkg.tibImagenUrl ? '0 1px 2px rgba(37,99,235,0.08)' : 'none',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <Camera style={{ width: '11px', height: '11px' }} />
                            <span>{pkg.tibImagenUrl ? 'Foto' : 'Ver'}</span>
                          </button>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                      <div
                        style={{
                          fontSize: '11.5px',
                          color: '#475569',
                          fontFamily: 'monospace',
                          fontWeight: 600
                        }}
                      >
                        {pkg.tracking || ''}
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ fontWeight: 800, color: '#2563eb' }}>
                        {pkg.nombreConsignatario || ''}
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                      {(() => {
                        const rawTipo = (pkg.tipoEmpaque || 'CAJA').trim().toUpperCase();
                        let bg = '#eff6ff';
                        let text = '#1d4ed8';
                        let border = '#bfdbfe';
                        let icon = '📦';

                        if (rawTipo.includes('CAJA')) {
                          bg = '#fef3c7';
                          text = '#92400e';
                          border = '#fde68a';
                          icon = '📦';
                        } else if (rawTipo.includes('SOBRE')) {
                          bg = '#e0e7ff';
                          text = '#3730a3';
                          border = '#c7d2fe';
                          icon = '✉️';
                        } else if (rawTipo.includes('BOLSA')) {
                          bg = '#ecfdf5';
                          text = '#065f46';
                          border = '#a7f3d0';
                          icon = '🛍️';
                        } else if (rawTipo.includes('SACA')) {
                          bg = '#f3e8ff';
                          text = '#6b21a8';
                          border = '#e9d5ff';
                          icon = '👜';
                        }

                        return (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 800,
                              background: bg,
                              color: text,
                              border: `1px solid ${border}`,
                              textTransform: 'uppercase'
                            }}
                            title={pkg.descripcion || `Tipo de empaque: ${rawTipo}`}
                          >
                            <span>{icon}</span>
                            <span>{rawTipo}</span>
                          </span>
                        );
                      })()}
                    </td>
                    <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: 800, color: '#0f172a' }}>
                        {pkg.pesoKg !== null && pkg.pesoKg !== undefined && Number(pkg.pesoKg) > 0 ? Number(pkg.pesoKg).toFixed(2) : ''}
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span
                        style={{
                          fontFamily: 'monospace',
                          fontWeight: 900,
                          fontSize: '12px',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: pos.startsWith('REC') ? '#fef3c7' : '#eff6ff',
                          color: pos.startsWith('REC') ? '#b45309' : '#1d4ed8',
                          border: pos.startsWith('REC') ? '1px solid #fde68a' : '1px solid #bfdbfe'
                        }}
                      >
                        {pos}
                      </span>
                    </td>
                    {/* ESTADO AMEX (Operativo Interno) */}
                    <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                      {isDelivering ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '3px 9px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            background: '#ecfdf5',
                            color: '#047857',
                            border: '1px solid #a7f3d0'
                          }}
                        >
                          <span className="w-3 h-3 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                          ENTREGANDO...
                        </span>
                      ) : (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '3px 9px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            background:
                              isRecentlyDelivered || pkg.estadoAmex === 'entregado'
                                ? '#dcfce7'
                                : pkg.estadoAmex === 'en_almacen' || pkg.estadoAmex === 'recibido'
                                ? '#e0e7ff'
                                : pkg.estadoAmex === 'listo_recojo'
                                ? '#fef3c7'
                                : pkg.estadoAmex === 'en_ruta'
                                ? '#f3e8ff'
                                : '#f1f5f9',
                            color:
                              isRecentlyDelivered || pkg.estadoAmex === 'entregado'
                                ? '#15803d'
                                : pkg.estadoAmex === 'en_almacen' || pkg.estadoAmex === 'recibido'
                                ? '#3730a3'
                                : pkg.estadoAmex === 'listo_recojo'
                                ? '#92400e'
                                : pkg.estadoAmex === 'en_ruta'
                                ? '#6b21a8'
                                : '#475569',
                            border:
                              isRecentlyDelivered || pkg.estadoAmex === 'entregado'
                                ? '1px solid #86efac'
                                : pkg.estadoAmex === 'en_almacen' || pkg.estadoAmex === 'recibido'
                                ? '1px solid #c7d2fe'
                                : pkg.estadoAmex === 'listo_recojo'
                                ? '1px solid #fde68a'
                                : pkg.estadoAmex === 'en_ruta'
                                ? '1px solid #e9d5ff'
                                : '1px solid #e2e8f0',
                            boxShadow: isRecentlyDelivered ? '0 0 10px rgba(34, 197, 94, 0.45)' : 'none',
                            transition: 'all 0.3s ease'
                          }}
                        >
                          {isRecentlyDelivered || pkg.estadoAmex === 'entregado'
                            ? '✅ ENTREGADO'
                            : pkg.estadoAmex === 'en_almacen' || pkg.estadoAmex === 'recibido'
                            ? '📦 EN ALMACÉN'
                            : pkg.estadoAmex === 'listo_recojo'
                            ? '🏪 LISTO RECOJO'
                            : pkg.estadoAmex === 'en_ruta'
                            ? '🚚 EN RUTA'
                            : (pkg.estadoAmex || 'EN ALMACÉN').toUpperCase()}
                        </span>
                      )}
                    </td>

                    {/* TIPO DE ENTREGA (Modalidad: Presencial, Agencia, Domicilio, Motorizado) */}
                    <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                      {isRecentlyDelivered || pkg.estadoAmex === 'entregado' ? (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          {(() => {
                            const tipo = pkg.tipoEntrega || 'Presencial';
                            if (tipo === 'Agencia') {
                              return (
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '3px 8px',
                                    borderRadius: '6px',
                                    fontSize: '11px',
                                    fontWeight: 800,
                                    background: '#fffbeb',
                                    color: '#b45309',
                                    border: '1px solid #fde68a'
                                  }}
                                  title={pkg.detalleEntrega ? `Agencia: ${pkg.detalleEntrega}` : 'Agencia Externa'}
                                >
                                  <span>📦</span>
                                  <span>{pkg.detalleEntrega || 'Agencia'}</span>
                                </span>
                              );
                            }
                            if (tipo === 'Domicilio') {
                              return (
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '3px 8px',
                                    borderRadius: '6px',
                                    fontSize: '11px',
                                    fontWeight: 800,
                                    background: '#f0fdf4',
                                    color: '#15803d',
                                    border: '1px solid #bbf7d0'
                                  }}
                                  title="Entrega con Móvil/Carro AMEX a Domicilio"
                                >
                                  <span>🚐</span>
                                  <span>A Domicilio</span>
                                </span>
                              );
                            }
                            if (tipo === 'Motorizado') {
                              return (
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '3px 8px',
                                    borderRadius: '6px',
                                    fontSize: '11px',
                                    fontWeight: 800,
                                    background: '#faf5ff',
                                    color: '#7e22ce',
                                    border: '1px solid #e9d5ff'
                                  }}
                                  title={`Motorizado contratado por el cliente${pkg.detalleEntrega ? ': ' + pkg.detalleEntrega : ''}`}
                                >
                                  <span>🛵</span>
                                  <span>Motorizado</span>
                                </span>
                              );
                            }
                            return (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  fontWeight: 800,
                                  background: '#eff6ff',
                                  color: '#1d4ed8',
                                  border: '1px solid #bfdbfe'
                                }}
                                title="Retiro presencial en mostrador Lince"
                              >
                                <span>🏢</span>
                                <span>Presencial</span>
                              </span>
                            );
                          })()}
                          <button
                            type="button"
                            title="Modificar modalidad de entrega"
                            onClick={() => setDeliveryModalPkg(pkg)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#94a3b8',
                              cursor: 'pointer',
                              padding: '2px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              borderRadius: '4px'
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = '#3b82f6')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
                          >
                            <Edit3 style={{ width: '12px', height: '12px' }} />
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '13px', fontWeight: 600 }}>—</span>
                      )}
                    </td>

                    {/* MODIFICADO (Fecha y Hora idéntico a TIB: DD/MM/AAAA HH:mm:ss) */}
                    <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                      {(() => {
                        const modParts = formatFechaModificadoParts(pkg.actualizadoEn || pkg.creadoEn);
                        if (!modParts) {
                          return <span style={{ color: '#94a3b8' }}>—</span>;
                        }
                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                            <span
                              style={{
                                fontSize: '11.5px',
                                fontWeight: 700,
                                color: '#1e293b',
                                fontFamily: 'monospace'
                              }}
                            >
                              {modParts.fecha}
                            </span>
                            <span
                              style={{
                                fontSize: '10.5px',
                                fontWeight: 600,
                                color: '#64748b',
                                fontFamily: 'monospace'
                              }}
                            >
                              {modParts.hora}
                            </span>
                          </div>
                        );
                      })()}
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <RowActionsDropdown
                        pkg={pkg}
                        index={index}
                        totalRows={paginatedPaquetes.length}
                        isDelivering={isDelivering}
                        onQuickDeliver={onQuickDeliver ? (p) => {
                          setDeliveryModalPkg(p);
                        } : undefined}
                        onOpenTransferModal={onOpenTransferModal}
                        onOpenEditModal={onOpenEditModal}
                        onSelectThermalPkg={onSelectThermalPkg}
                        onViewPdf={onViewPdf}
                        onOpenTibImage={onOpenTibImage}
                        onDeletePackage={onDeletePackage}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación Inferior */}
      {renderPagination('bottom')}

      {/* Modal de Confirmación y Modalidad de Entrega */}
      {deliveryModalPkg && (
        <ConfirmDeliveryModal
          isOpen={Boolean(deliveryModalPkg)}
          pkg={deliveryModalPkg}
          onClose={() => setDeliveryModalPkg(null)}
          onConfirmDelivery={async (p, tipoEntrega, detalleEntrega) => {
            if (p.estadoAmex === 'entregado') {
              if (onUpdateDeliveryMethod) {
                await onUpdateDeliveryMethod(p.id, tipoEntrega, detalleEntrega);
              }
            } else {
              if (onQuickDeliver) {
                await onQuickDeliver(p, tipoEntrega, detalleEntrega);
              }
            }
          }}
        />
      )}
    </div>
  );
}
