'use client';

import React from 'react';
import {
  AlertCircle,
  Receipt,
  Boxes,
  Store,
  Car,
  ClipboardList,
  CheckCircle2,
  ArrowRight,
  ChevronRight
} from 'lucide-react';
import { DailyTaskItem } from '../types';

interface DailyTasksSectionProps {
  tasks: DailyTaskItem[];
  onNavigateTab: (tabId: string, params?: any) => void;
}

export function DailyTasksSection({ tasks, onNavigateTab }: DailyTasksSectionProps) {
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Receipt':
        return <Receipt style={{ width: '16px', height: '16px' }} />;
      case 'Boxes':
        return <Boxes style={{ width: '16px', height: '16px' }} />;
      case 'Store':
        return <Store style={{ width: '16px', height: '16px' }} />;
      case 'Car':
        return <Car style={{ width: '16px', height: '16px' }} />;
      case 'ClipboardList':
        return <ClipboardList style={{ width: '16px', height: '16px' }} />;
      default:
        return <AlertCircle style={{ width: '16px', height: '16px' }} />;
    }
  };

  const getUrgencyDotColor = (urgency: DailyTaskItem['urgency']) => {
    switch (urgency) {
      case 'critical':
        return '#ef4444';
      case 'warning':
        return '#f59e0b';
      case 'info':
        return '#2563eb';
      default:
        return '#10b981';
    }
  };

  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        padding: '20px 24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        flexShrink: 0
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: tasks.length === 0 ? '12px' : '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Prioridades Operativas del Turno
            </span>
            <span
              style={{
                padding: '2px 8px',
                borderRadius: '9999px',
                fontSize: '11px',
                fontWeight: 600,
                background: tasks.length > 0 ? '#fef3c7' : '#f0fdf4',
                color: tasks.length > 0 ? '#b45309' : '#15803d',
                border: tasks.length > 0 ? '1px solid #fde68a' : '1px solid #bbf7d0',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: tasks.length > 0 ? '#f59e0b' : '#16a34a'
                }}
              />
              {tasks.length} {tasks.length === 1 ? 'pendiente' : 'pendientes'}
            </span>
          </div>
          <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
            Acciones clave que requieren validación, reubicación de bultos o despacho inmediato
          </p>
        </div>
      </div>

      {tasks.length === 0 ? (
        /* Banner Compacto y Elegante cuando todo está al día */
        <div
          style={{
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#f0fdf4',
            borderRadius: '8px',
            border: '1px solid #bbf7d0',
            flexWrap: 'wrap',
            gap: '8px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CheckCircle2 style={{ width: '18px', height: '18px', color: '#16a34a', flexShrink: 0 }} />
            <div style={{ fontSize: '13px', color: '#14532d' }}>
              <strong>Operación completamente al día:</strong>
              <span style={{ color: '#166534', marginLeft: '6px' }}>
                Sin cobros por conciliar, bultos sin anaquel ni órdenes rezagadas en piso.
              </span>
            </div>
          </div>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: '#15803d',
              background: '#dcfce7',
              padding: '2px 8px',
              borderRadius: '6px'
            }}
          >
            Sede Lince Conforme
          </span>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '16px'
          }}
        >
          {tasks.map(task => {
            const dotColor = getUrgencyDotColor(task.urgency);
            return (
              <div
                key={task.id}
                onClick={() => onNavigateTab(task.targetTab, task.targetParams)}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                className="hover:border-slate-400 hover:shadow-sm"
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: dotColor
                        }}
                      />
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a' }}>
                        {task.title}
                      </span>
                    </div>

                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '6px',
                        background: '#f1f5f9',
                        color: '#475569',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {getIcon(task.icon)}
                    </div>
                  </div>

                  <p style={{ fontSize: '12px', color: '#64748b', margin: 0, lineHeight: 1.4 }}>
                    {task.description}
                  </p>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: '8px',
                    borderTop: '1px solid #f1f5f9',
                    fontSize: '12px'
                  }}
                >
                  <span style={{ fontWeight: 600, color: dotColor }}>
                    {task.badgeText || `${task.count} pendientes`}
                  </span>

                  <span style={{ color: '#2563eb', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <span>{task.actionLabel}</span>
                    <ChevronRight style={{ width: '12px', height: '12px' }} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
