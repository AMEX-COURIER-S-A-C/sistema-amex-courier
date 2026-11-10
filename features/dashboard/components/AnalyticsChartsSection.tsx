'use client';

import React from 'react';
import {
  Layers,
  Truck,
  CreditCard,
  Package,
  TrendingUp,
  ArrowRight,
  AlertTriangle,
  PieChart as PieIcon,
  CheckCircle2
} from 'lucide-react';
import type {
  ShelfCapacityStat,
  PaymentMethodStat,
  DeliveryChannelStat,
  PackageTypeStat
} from '../types';

interface AnalyticsChartsSectionProps {
  shelfStats: ShelfCapacityStat[];
  paymentStats: PaymentMethodStat[];
  deliveryChannels: DeliveryChannelStat[];
  packageTypes: PackageTypeStat[];
  unslottedCount?: number;
  onNavigateTab: (tabId: string) => void;
}

export function AnalyticsChartsSection({
  shelfStats,
  paymentStats,
  deliveryChannels,
  packageTypes,
  unslottedCount = 0,
  onNavigateTab
}: AnalyticsChartsSectionProps) {
  // Cálculo para el Donut Chart de Pagos
  const totalSolesRecaudado = paymentStats.reduce((acc, p) => acc + p.totalSoles, 0);

  // Generación de coordenadas de arcos para SVG Donut
  const donutSize = 140;
  const strokeWidth = 18;
  const radius = (donutSize - strokeWidth) / 2;
  const center = donutSize / 2;
  const circumference = 2 * Math.PI * radius;

  let currentOffset = 0;
  const donutSegments = paymentStats.map(pm => {
    const strokeDasharray = `${(pm.percentage / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -currentOffset;
    currentOffset += (pm.percentage / 100) * circumference;

    return {
      ...pm,
      strokeDasharray,
      strokeDashoffset
    };
  });

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '16px',
        flexShrink: 0
      }}
    >
      {/* 1. OCUPACIÓN DE ANAQUELES WMS (MONITOREO DE ALMACÉN) */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '16px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers style={{ width: '16px', height: '16px', color: '#64748b' }} />
              Ocupación WMS · Almacén Lince
            </span>
            <button
              type="button"
              onClick={() => onNavigateTab('mm-lince')}
              style={{
                fontSize: '12px',
                fontWeight: 500,
                color: '#2563eb',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <span>Ver WMS</span>
              <ArrowRight style={{ width: '12px', height: '12px' }} />
            </button>
          </div>

          {/* Alerta si hay bultos sin anaquel */}
          {unslottedCount > 0 && (
            <div
              onClick={() => onNavigateTab('mm-lince')}
              style={{
                background: '#fef2f2',
                border: '1px solid #fee2e2',
                borderRadius: '8px',
                padding: '10px 12px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle style={{ width: '16px', height: '16px', color: '#dc2626' }} />
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#991b1b' }}>
                  {unslottedCount} bultos sin anaquel asignado
                </span>
              </div>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#dc2626' }}>
                Asignar ahora →
              </span>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {shelfStats.map(shelf => {
              const isHigh = shelf.percentage >= 85;
              const isMedium = shelf.percentage >= 50 && shelf.percentage < 85;

              const barColor = isHigh ? '#ef4444' : isMedium ? '#2563eb' : '#10b981';
              const badgeBg = isHigh ? '#fef2f2' : isMedium ? '#eff6ff' : '#f0fdf4';
              const badgeColor = isHigh ? '#dc2626' : isMedium ? '#2563eb' : '#16a34a';

              return (
                <div key={shelf.code}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: '12px', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: '#0f172a', fontWeight: 500 }}>{shelf.name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                        {shelf.count} / {shelf.capacity}
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '1px 6px',
                          borderRadius: '4px',
                          background: badgeBg,
                          color: badgeColor
                        }}
                      >
                        {shelf.percentage}%
                      </span>
                    </div>
                  </div>

                  <div style={{ width: '100%', background: '#f1f5f9', borderRadius: '9999px', height: '6px', overflow: 'hidden' }}>
                    <div
                      style={{
                        background: barColor,
                        height: '100%',
                        borderRadius: '9999px',
                        width: `${shelf.percentage}%`,
                        transition: 'width 0.3s ease'
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ paddingTop: '12px', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', color: '#64748b' }}>
          <span>Capacidad total: 440 bultos</span>
          <span style={{ fontWeight: 500, color: '#0f172a' }}>Slotting dinámico</span>
        </div>
      </div>

      {/* 2. CANALES DE DISTRIBUCIÓN & CLASIFICACIÓN DE EMPAQUES */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '16px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Truck style={{ width: '16px', height: '16px', color: '#64748b' }} />
              Canales de Distribución & Envíos
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {deliveryChannels.map(channel => (
              <div key={channel.channel}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: '12px', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 500, color: '#0f172a' }}>{channel.label}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                      {channel.count} bultos
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: channel.color }}>
                      ({channel.percentage}%)
                    </span>
                  </div>
                </div>

                <div style={{ width: '100%', background: '#f1f5f9', borderRadius: '9999px', height: '7px', overflow: 'hidden' }}>
                  <div
                    style={{
                      background: channel.color || '#334155',
                      height: '100%',
                      borderRadius: '9999px',
                      width: `${channel.percentage}%`,
                      transition: 'width 0.3s ease'
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Desglose de tipos de bulto */}
          <div style={{ marginTop: '20px', paddingTop: '14px', borderTop: '1px solid #f1f5f9' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Clasificación de Empaques
            </span>
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
              {packageTypes.map(pt => (
                <div
                  key={pt.type}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '8px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: '#334155',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: pt.color }} />
                  <span>{pt.label}:</span>
                  <strong style={{ fontFamily: 'monospace', color: '#0f172a', fontWeight: 700 }}>{pt.count}</strong>
                  <span style={{ color: '#94a3b8', fontSize: '11px' }}>({pt.totalWeightKg} kg)</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3. RECAUDACIÓN Y CONCILIACIÓN CON GRÁFICO DONUT */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '16px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CreditCard style={{ width: '16px', height: '16px', color: '#64748b' }} />
              Canales de Recaudación (Vouchers)
            </span>
            <button
              type="button"
              onClick={() => onNavigateTab('fico-cobros')}
              style={{
                fontSize: '12px',
                fontWeight: 500,
                color: '#2563eb',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <span>Ver Vouchers</span>
              <ArrowRight style={{ width: '12px', height: '12px' }} />
            </button>
          </div>

          {paymentStats.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
              <CreditCard style={{ width: '28px', height: '28px', color: '#cbd5e1', margin: '0 auto 8px' }} />
              <p style={{ fontSize: '12px', fontWeight: 500, margin: 0, color: '#64748b' }}>
                Sin comprobantes conciliados en este rango
              </p>
            </div>
          ) : (
            <div>
              {/* Donut Chart SVG + Centro de Métricas */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                <div style={{ position: 'relative', width: `${donutSize}px`, height: `${donutSize}px`, flexShrink: 0 }}>
                  <svg width={donutSize} height={donutSize} style={{ transform: 'rotate(-90deg)' }}>
                    <circle
                      cx={center}
                      cy={center}
                      r={radius}
                      fill="transparent"
                      stroke="#f1f5f9"
                      strokeWidth={strokeWidth}
                    />
                    {donutSegments.map(seg => (
                      <circle
                        key={seg.method}
                        cx={center}
                        cy={center}
                        r={radius}
                        fill="transparent"
                        stroke={seg.color}
                        strokeWidth={strokeWidth}
                        strokeDasharray={seg.strokeDasharray}
                        strokeDashoffset={seg.strokeDashoffset}
                        strokeLinecap="round"
                        style={{ transition: 'stroke-dasharray 0.4s ease' }}
                      />
                    ))}
                  </svg>
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textAlign: 'center'
                    }}
                  >
                    <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                      Total
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                      S/ {Math.round(totalSolesRecaudado).toLocaleString('es-PE')}
                    </span>
                  </div>
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {paymentStats.slice(0, 4).map(pm => (
                    <div key={pm.method} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: pm.color }} />
                        <span style={{ color: '#0f172a', fontWeight: 500 }}>{pm.label}</span>
                      </div>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0f172a' }}>
                        {pm.percentage}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Lista Detallada con Montos */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                {paymentStats.map(pm => (
                  <div key={pm.method} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: '#0f172a', fontWeight: 500 }}>{pm.label}</span>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>({pm.count} ops)</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                        S/ {pm.totalSoles.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ paddingTop: '12px', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', color: '#64748b' }}>
          <span>Moneda principal: Soles (PEN)</span>
          <span style={{ fontWeight: 500, color: '#16a34a', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle2 style={{ width: '12px', height: '12px' }} />
            Conciliado
          </span>
        </div>
      </div>
    </div>
  );
}
