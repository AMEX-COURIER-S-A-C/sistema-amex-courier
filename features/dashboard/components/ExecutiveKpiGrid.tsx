'use client';

import React from 'react';
import {
  DollarSign,
  Package,
  Boxes,
  Truck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  Send
} from 'lucide-react';
import { ExecutiveKpis } from '../types';

interface ExecutiveKpiGridProps {
  kpis: ExecutiveKpis;
  onNavigateTab: (tabId: string) => void;
}

export function ExecutiveKpiGrid({ kpis, onNavigateTab }: ExecutiveKpiGridProps) {
  // Sparklines SVG decorativos de contexto visual (KPI Dashboard Design best practice)
  const sparklineUp = (
    <svg width="60" height="20" viewBox="0 0 60 20" fill="none" style={{ opacity: 0.8 }}>
      <path
        d="M2 16 L 15 12 L 28 14 L 40 8 L 50 10 L 58 4"
        stroke="#2563eb"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  const sparklineGreen = (
    <svg width="60" height="20" viewBox="0 0 60 20" fill="none" style={{ opacity: 0.8 }}>
      <path
        d="M2 18 L 14 15 L 26 12 L 38 9 L 48 6 L 58 3"
        stroke="#10b981"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '16px',
        flexShrink: 0
      }}
    >
      {/* 1. VOLUMEN ACTIVO DE OPERACIÓN */}
      <div
        onClick={() => onNavigateTab('mm-lince')}
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '16px',
          transition: 'all 0.15s ease'
        }}
        className="hover:border-slate-400 hover:shadow-sm"
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#64748b' }}>
            Volumen Activo de Operación
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {sparklineUp}
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: '#f1f5f9',
                color: '#334155',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Package style={{ width: '16px', height: '16px' }} />
            </div>
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span
              style={{
                fontSize: '36px',
                fontWeight: 800,
                color: '#0f172a',
                lineHeight: 1.1,
                letterSpacing: '-0.02em',
                fontVariantNumeric: 'tabular-nums'
              }}
            >
              {kpis.totalPaquetes}
            </span>
            <span style={{ fontSize: '13px', fontWeight: 500, color: '#64748b' }}>
              bultos en sistema
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginTop: '12px',
              fontSize: '12px',
              color: '#64748b',
              flexWrap: 'wrap'
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#2563eb' }} />
              <strong style={{ color: '#0f172a', fontWeight: 600 }}>{kpis.paquetesEnLince}</strong> en Almacén Lince
            </span>
            <span>•</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f59e0b' }} />
              <strong style={{ color: '#0f172a', fontWeight: 600 }}>{kpis.paquetesEnRuta}</strong> en Reparto
            </span>
          </div>
        </div>
      </div>

      {/* 2. FINANZAS & RECAUDACIÓN */}
      <div
        onClick={() => onNavigateTab('fico-cobros')}
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '16px',
          transition: 'all 0.15s ease'
        }}
        className="hover:border-slate-400 hover:shadow-sm"
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#64748b' }}>
            Recaudación & Liquidación
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {sparklineGreen}
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: '#f1f5f9',
                color: '#334155',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <DollarSign style={{ width: '16px', height: '16px' }} />
            </div>
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span
              style={{
                fontSize: '28px',
                fontWeight: 800,
                color: '#0f172a',
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '-0.01em'
              }}
            >
              S/ {kpis.totalCobradoSoles.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            {kpis.totalCobradoDolares > 0 && (
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>
                + ${kpis.totalCobradoDolares.toFixed(2)}
              </span>
            )}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '12px',
              fontSize: '12px'
            }}
          >
            <span style={{ color: '#64748b' }}>
              Pendiente: <strong style={{ color: kpis.totalPendienteSoles > 0 ? '#dc2626' : '#0f172a', fontWeight: 600 }}>S/ {kpis.totalPendienteSoles.toFixed(2)}</strong>
            </span>

            {kpis.vouchersPendientesCount > 0 ? (
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  fontSize: '11px',
                  fontWeight: 600,
                  background: '#fef2f2',
                  color: '#dc2626',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <AlertTriangle style={{ width: '12px', height: '12px' }} />
                {kpis.vouchersPendientesCount} por validar
              </span>
            ) : (
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  fontSize: '11px',
                  fontWeight: 600,
                  background: '#f0fdf4',
                  color: '#16a34a',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <CheckCircle2 style={{ width: '12px', height: '12px' }} />
                Al día
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 3. ALMACÉN CENTRAL LINCE (WMS) */}
      <div
        onClick={() => onNavigateTab('mm-lince')}
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '16px',
          transition: 'all 0.15s ease'
        }}
        className="hover:border-slate-400 hover:shadow-sm"
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#64748b' }}>
            Almacén Lince (WMS)
          </span>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: '#f1f5f9',
              color: '#334155',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Boxes style={{ width: '16px', height: '16px' }} />
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span
              style={{
                fontSize: '28px',
                fontWeight: 800,
                color: '#0f172a',
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '-0.01em'
              }}
            >
              {kpis.totalPesoKgLince.toFixed(1)} <span style={{ fontSize: '14px', fontWeight: 500, color: '#64748b' }}>kg</span>
            </span>
            <span style={{ fontSize: '13px', fontWeight: 500, color: '#64748b' }}>
              en custodia
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '12px',
              fontSize: '12px'
            }}
          >
            <span style={{ color: '#64748b' }}>
              Promedio: <strong style={{ color: '#0f172a', fontWeight: 600 }}>{kpis.pesoPromedioKg} kg/bulto</strong>
            </span>
            <span
              style={{
                padding: '2px 8px',
                borderRadius: '9999px',
                fontSize: '11px',
                fontWeight: 600,
                background: kpis.paquetesSinUbicar > 0 ? '#fef2f2' : '#f0fdf4',
                color: kpis.paquetesSinUbicar > 0 ? '#dc2626' : '#16a34a',
                border: '1px solid transparent',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: kpis.paquetesSinUbicar > 0 ? '#ef4444' : '#10b981'
                }}
              />
              {kpis.paquetesSinUbicar > 0 ? `${kpis.paquetesSinUbicar} sin anaquel` : 'Slotting al 100%'}
            </span>
          </div>
        </div>
      </div>

      {/* 4. ENTREGAS, DESPACHO & CUMPLIMIENTO OPERATIVO (Reemplazo de la métrica de vanidad) */}
      <div
        onClick={() => onNavigateTab('despacho-rutas')}
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '16px',
          transition: 'all 0.15s ease'
        }}
        className="hover:border-slate-400 hover:shadow-sm"
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#64748b' }}>
            Despachos & Cumplimiento
          </span>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: '#f1f5f9',
              color: '#334155',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Send style={{ width: '16px', height: '16px' }} />
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span
              style={{
                fontSize: '28px',
                fontWeight: 800,
                color: '#0f172a',
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '-0.01em'
              }}
            >
              {kpis.paquetesListosDespachoCount}
            </span>
            <span style={{ fontSize: '13px', fontWeight: 500, color: '#64748b' }}>
              listos para entrega
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '12px',
              fontSize: '12px'
            }}
          >
            {kpis.paquetesRezagadosCount > 0 ? (
              <span style={{ color: '#d97706', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Clock style={{ width: '12px', height: '12px' }} />
                {kpis.paquetesRezagadosCount} con &gt;7 días
              </span>
            ) : (
              <span style={{ color: '#64748b' }}>
                Sin bultos rezagados
              </span>
            )}

            <span
              style={{
                padding: '2px 8px',
                borderRadius: '9999px',
                fontSize: '11px',
                fontWeight: 600,
                background: '#eff6ff',
                color: '#2563eb',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              {kpis.tasaEntregaPorcentaje}% Despachado
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
