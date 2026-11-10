'use client';

import React, { useState } from 'react';
import {
  TrendingUp,
  Package,
  CheckCircle2,
  DollarSign,
  Calendar,
  Activity
} from 'lucide-react';
import type { DailyActivityDataPoint } from '../types';

interface ActivityVelocityChartProps {
  data: DailyActivityDataPoint[];
}

export function ActivityVelocityChart({ data }: ActivityVelocityChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [activeSeries, setActiveSeries] = useState<'ALL' | 'INGRESOS' | 'ENTREGAS'>('ALL');

  if (!data || data.length === 0) {
    return null;
  }

  // Dimensiones del canvas SVG
  const width = 800;
  const height = 220;
  const padding = { top: 20, right: 30, bottom: 40, left: 40 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Totales y promedios del periodo
  const totalIngresos = data.reduce((acc, d) => acc + d.ingresos, 0);
  const totalEntregas = data.reduce((acc, d) => acc + d.entregas, 0);
  const totalRecaudacion = data.reduce((acc, d) => acc + d.recaudacionSoles, 0);
  const promedioDiario = Math.round((totalIngresos / data.length) * 10) / 10;

  // Escala máxima en Y (con margen de seguridad)
  const maxVal = Math.max(
    ...data.map(d => Math.max(d.ingresos, d.entregas)),
    5 // Mínimo de 5 para evitar división por cero
  );
  const yMax = Math.ceil(maxVal * 1.25);

  // Mapeo de coordenadas
  const getX = (idx: number) => {
    if (data.length <= 1) return padding.left + chartWidth / 2;
    return padding.left + (idx / (data.length - 1)) * chartWidth;
  };

  const getY = (val: number) => {
    return padding.top + chartHeight - (val / yMax) * chartHeight;
  };

  // Puntos para líneas y áreas
  const ingresoPoints = data.map((d, i) => `${getX(i)},${getY(d.ingresos)}`).join(' ');
  const entregaPoints = data.map((d, i) => `${getX(i)},${getY(d.entregas)}`).join(' ');

  const ingresoAreaPoints = `${getX(0)},${getY(0)} ${ingresoPoints} ${getX(data.length - 1)},${getY(0)}`;
  const entregaAreaPoints = `${getX(0)},${getY(0)} ${entregaPoints} ${getX(data.length - 1)},${getY(0)}`;

  // Líneas de cuadrícula horizontal en Y
  const yGridLines = [0, Math.round(yMax / 2), yMax];

  const activePoint = hoveredIdx !== null ? data[hoveredIdx] : null;

  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}
    >
      {/* Encabezado y Métricas Rápidas del Gráfico */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity style={{ width: '18px', height: '18px', color: '#2563eb' }} />
              Velocidad & Flujo Diario de Operación
            </span>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
            Tendencia cronológica de bultos procesados vs entregados en el período
          </p>
        </div>

        {/* Botones de filtro de series */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', padding: '4px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <button
            type="button"
            onClick={() => setActiveSeries('ALL')}
            style={{
              fontSize: '11px',
              fontWeight: 600,
              padding: '4px 10px',
              borderRadius: '6px',
              border: 'none',
              background: activeSeries === 'ALL' ? '#ffffff' : 'transparent',
              color: activeSeries === 'ALL' ? '#0f172a' : '#64748b',
              boxShadow: activeSeries === 'ALL' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
              cursor: 'pointer'
            }}
          >
            Ambas Series
          </button>
          <button
            type="button"
            onClick={() => setActiveSeries('INGRESOS')}
            style={{
              fontSize: '11px',
              fontWeight: 600,
              padding: '4px 10px',
              borderRadius: '6px',
              border: 'none',
              background: activeSeries === 'INGRESOS' ? '#ffffff' : 'transparent',
              color: activeSeries === 'INGRESOS' ? '#0284c7' : '#64748b',
              boxShadow: activeSeries === 'INGRESOS' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
              cursor: 'pointer'
            }}
          >
            Solo Ingresos
          </button>
          <button
            type="button"
            onClick={() => setActiveSeries('ENTREGAS')}
            style={{
              fontSize: '11px',
              fontWeight: 600,
              padding: '4px 10px',
              borderRadius: '6px',
              border: 'none',
              background: activeSeries === 'ENTREGAS' ? '#ffffff' : 'transparent',
              color: activeSeries === 'ENTREGAS' ? '#10b981' : '#64748b',
              boxShadow: activeSeries === 'ENTREGAS' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
              cursor: 'pointer'
            }}
          >
            Solo Entregas
          </button>
        </div>
      </div>

      {/* Resumen de Métricas Clave del Gráfico */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: '12px'
        }}
      >
        <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 600, color: '#0284c7' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0284c7' }} />
            <span>Ingresos Registrados</span>
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', marginTop: '4px', fontVariantNumeric: 'tabular-nums' }}>
            {totalIngresos} <span style={{ fontSize: '11px', fontWeight: 500, color: '#64748b' }}>bultos</span>
          </div>
        </div>

        <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 600, color: '#10b981' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
            <span>Bultos Entregados</span>
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', marginTop: '4px', fontVariantNumeric: 'tabular-nums' }}>
            {totalEntregas} <span style={{ fontSize: '11px', fontWeight: 500, color: '#64748b' }}>liquidados</span>
          </div>
        </div>

        <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 600, color: '#64748b' }}>
            <TrendingUp style={{ width: '12px', height: '12px', color: '#64748b' }} />
            <span>Ritmo Promedio</span>
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', marginTop: '4px', fontVariantNumeric: 'tabular-nums' }}>
            {promedioDiario} <span style={{ fontSize: '11px', fontWeight: 500, color: '#64748b' }}>paquetes/día</span>
          </div>
        </div>

        <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 600, color: '#7c3aed' }}>
            <DollarSign style={{ width: '12px', height: '12px', color: '#7c3aed' }} />
            <span>Recaudado Período</span>
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', marginTop: '4px', fontVariantNumeric: 'tabular-nums' }}>
            S/ {totalRecaudacion.toLocaleString('es-PE')}
          </div>
        </div>
      </div>

      {/* Canvas del Gráfico SVG Interactivo */}
      <div style={{ position: 'relative', width: '100%', height: `${height}px`, overflow: 'hidden' }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: '100%', height: '100%', overflow: 'visible' }}
          preserveAspectRatio="none"
        >
          <defs>
            {/* Gradiente para Área de Ingresos */}
            <linearGradient id="ingresoGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0284c7" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0.0" />
            </linearGradient>

            {/* Gradiente para Área de Entregas */}
            <linearGradient id="entregaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.20" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Líneas de cuadrícula horizontal */}
          {yGridLines.map(yVal => {
            const yPos = getY(yVal);
            return (
              <g key={yVal}>
                <line
                  x1={padding.left}
                  y1={yPos}
                  x2={width - padding.right}
                  y2={yPos}
                  stroke="#f1f5f9"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <text
                  x={padding.left - 8}
                  y={yPos + 4}
                  fill="#94a3b8"
                  fontSize="10"
                  textAnchor="end"
                  fontFamily="monospace"
                >
                  {yVal}
                </text>
              </g>
            );
          })}

          {/* Área y Línea: Ingresos (Azul) */}
          {(activeSeries === 'ALL' || activeSeries === 'INGRESOS') && (
            <>
              <polygon points={ingresoAreaPoints} fill="url(#ingresoGradient)" />
              <polyline
                fill="none"
                stroke="#0284c7"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={ingresoPoints}
              />
            </>
          )}

          {/* Área y Línea: Entregas (Verde) */}
          {(activeSeries === 'ALL' || activeSeries === 'ENTREGAS') && (
            <>
              <polygon points={entregaAreaPoints} fill="url(#entregaGradient)" />
              <polyline
                fill="none"
                stroke="#10b981"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={entregaPoints}
              />
            </>
          )}

          {/* Puntos y Columnas Interactivas de Hover */}
          {data.map((d, i) => {
            const x = getX(i);
            const isHovered = hoveredIdx === i;

            return (
              <g key={d.date}>
                {/* Línea guía vertical si está en hover */}
                {isHovered && (
                  <line
                    x1={x}
                    y1={padding.top}
                    x2={x}
                    y2={height - padding.bottom}
                    stroke="#cbd5e1"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                  />
                )}

                {/* Punto Ingresos */}
                {(activeSeries === 'ALL' || activeSeries === 'INGRESOS') && (
                  <circle
                    cx={x}
                    cy={getY(d.ingresos)}
                    r={isHovered ? 6 : 4}
                    fill="#0284c7"
                    stroke="#ffffff"
                    strokeWidth="2"
                    style={{ transition: 'r 0.15s ease' }}
                  />
                )}

                {/* Punto Entregas */}
                {(activeSeries === 'ALL' || activeSeries === 'ENTREGAS') && (
                  <circle
                    cx={x}
                    cy={getY(d.entregas)}
                    r={isHovered ? 6 : 4}
                    fill="#10b981"
                    stroke="#ffffff"
                    strokeWidth="2"
                    style={{ transition: 'r 0.15s ease' }}
                  />
                )}

                {/* Etiqueta del eje X */}
                <text
                  x={x}
                  y={height - padding.bottom + 18}
                  fill={isHovered ? '#0f172a' : '#64748b'}
                  fontSize="11"
                  fontWeight={isHovered ? '700' : '500'}
                  textAnchor="middle"
                >
                  {d.shortLabel}
                </text>

                {/* Rectángulo invisible para capturar hover de toda la columna */}
                <rect
                  x={x - chartWidth / (data.length * 2)}
                  y={padding.top}
                  width={chartWidth / data.length}
                  height={chartHeight}
                  fill="transparent"
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHoveredIdx(i)}
                  onMouseLeave={() => setHoveredIdx(null)}
                />
              </g>
            );
          })}
        </svg>

        {/* Floating Tooltip HTML Overlay */}
        {activePoint && hoveredIdx !== null && (
          <div
            style={{
              position: 'absolute',
              top: '8px',
              left: `${Math.min(
                Math.max(10, (hoveredIdx / (data.length - 1)) * 100),
                80
              )}%`,
              transform: 'translateX(-50%)',
              background: '#0f172a',
              color: '#ffffff',
              padding: '8px 12px',
              borderRadius: '8px',
              fontSize: '11px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              pointerEvents: 'none',
              zIndex: 10,
              minWidth: '150px'
            }}
          >
            <div style={{ fontWeight: 700, borderBottom: '1px solid #334155', paddingBottom: '4px', marginBottom: '6px' }}>
              {activePoint.label}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', color: '#38bdf8' }}>
              <span>Ingresos:</span>
              <strong>{activePoint.ingresos} bultos</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', color: '#4ade80' }}>
              <span>Entregas:</span>
              <strong>{activePoint.entregas} bultos</strong>
            </div>
            {activePoint.recaudacionSoles > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', color: '#facc15', marginTop: '2px' }}>
                <span>Recaudado:</span>
                <strong>S/ {activePoint.recaudacionSoles}</strong>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
