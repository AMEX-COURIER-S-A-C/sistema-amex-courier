'use client';

import React from 'react';
import {
  Plane,
  Building2,
  Boxes,
  Truck,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import type { PipelineStageStat, PackageStatusFilter } from '../types';

interface LogisticsPipelineSectionProps {
  stages: PipelineStageStat[];
  activeFilter?: PackageStatusFilter;
  onSelectFilter?: (filter: PackageStatusFilter) => void;
  onNavigateTab: (tabId: string) => void;
}

export function LogisticsPipelineSection({
  stages,
  activeFilter,
  onSelectFilter,
  onNavigateTab
}: LogisticsPipelineSectionProps) {
  const getStageIcon = (id: string) => {
    switch (id) {
      case 'miami':
        return <Building2 style={{ width: '18px', height: '18px' }} />;
      case 'transito':
        return <Plane style={{ width: '18px', height: '18px' }} />;
      case 'lince':
        return <Boxes style={{ width: '18px', height: '18px' }} />;
      case 'reparto':
        return <Truck style={{ width: '18px', height: '18px' }} />;
      case 'entregado':
        return <CheckCircle2 style={{ width: '18px', height: '18px' }} />;
      default:
        return <Boxes style={{ width: '18px', height: '18px' }} />;
    }
  };

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
      {/* Header del Pipeline */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.01em' }}>
              Pipeline Operativo de Carga
            </span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#2563eb',
                background: '#eff6ff',
                padding: '2px 8px',
                borderRadius: '9999px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Sparkles style={{ width: '12px', height: '12px' }} />
              End-to-End
            </span>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
            Flujo cronológico de bultos: desde recepción en Miami Hub (TIB) hasta liquidación final en Perú
          </p>
        </div>

        {activeFilter && activeFilter !== 'ALL' && onSelectFilter && (
          <button
            type="button"
            onClick={() => onSelectFilter('ALL')}
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: '#2563eb',
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 12px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>Ver todo el flujo</span>
          </button>
        )}
      </div>

      {/* Grid horizontal de etapas con conectores */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '12px',
          alignItems: 'stretch'
        }}
      >
        {stages.map((stage, idx) => {
          const isSelected = stage.statusFilterKey && activeFilter === stage.statusFilterKey;

          return (
            <div
              key={stage.id}
              onClick={() => {
                if (stage.statusFilterKey && onSelectFilter) {
                  onSelectFilter(isSelected ? 'ALL' : stage.statusFilterKey);
                } else if (stage.targetTab) {
                  onNavigateTab(stage.targetTab);
                }
              }}
              style={{
                background: isSelected ? '#f8fafc' : '#ffffff',
                border: isSelected ? `2px solid ${stage.color}` : '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '12px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                position: 'relative'
              }}
              className="hover:border-slate-400 hover:shadow-sm"
            >
              {/* Top: Icon + Stage Indicator */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '8px',
                    background: `${stage.color}15`,
                    color: stage.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {getStageIcon(stage.id)}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: stage.color,
                      fontFamily: 'monospace'
                    }}
                  >
                    PASO {idx + 1}
                  </span>
                  {idx < stages.length - 1 && (
                    <ChevronRight style={{ width: '14px', height: '14px', color: '#94a3b8' }} />
                  )}
                </div>
              </div>

              {/* Middle: Count & Label */}
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span
                    style={{
                      fontSize: '28px',
                      fontWeight: 800,
                      color: '#0f172a',
                      fontVariantNumeric: 'tabular-nums',
                      lineHeight: 1
                    }}
                  >
                    {stage.count}
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>
                    ({stage.percentage}%)
                  </span>
                </div>

                <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', marginTop: '6px' }}>
                  {stage.label}
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', lineHeight: 1.3 }}>
                  {stage.sublabel}
                </div>
              </div>

              {/* Bottom: Badge / Progress bar */}
              <div>
                <div style={{ width: '100%', background: '#f1f5f9', borderRadius: '9999px', height: '4px', overflow: 'hidden', marginBottom: '8px' }}>
                  <div
                    style={{
                      width: `${Math.max(5, stage.percentage)}%`,
                      height: '100%',
                      background: stage.color,
                      borderRadius: '9999px',
                      transition: 'width 0.3s ease'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px' }}>
                  {stage.badge ? (
                    <span
                      style={{
                        padding: '1px 6px',
                        borderRadius: '4px',
                        background: '#fef2f2',
                        color: '#dc2626',
                        fontWeight: 600
                      }}
                    >
                      {stage.badge}
                    </span>
                  ) : (
                    <span style={{ color: '#94a3b8' }}>
                      {stage.statusFilterKey ? 'Click para filtrar' : 'Ver módulo'}
                    </span>
                  )}

                  <span style={{ color: stage.color, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                    <ArrowRight style={{ width: '10px', height: '10px' }} />
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
