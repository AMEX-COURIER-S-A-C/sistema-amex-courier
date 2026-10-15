'use client';

import React from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { ToastItem, ToastVariant, dismissToast } from '@/lib/toast';

interface ToastContainerProps {
  toasts: ToastItem[];
}

const VARIANT_CONFIG: Record<
  ToastVariant,
  {
    icon: React.ComponentType<{ className?: string }>;
    accentColor: string;
    bgColor: string;
    borderColor: string;
    iconBg: string;
    iconColor: string;
  }
> = {
  success: {
    icon: CheckCircle2,
    accentColor: '#10b981',
    bgColor: 'rgba(15, 23, 42, 0.95)',
    borderColor: 'rgba(16, 185, 129, 0.4)',
    iconBg: 'rgba(16, 185, 129, 0.15)',
    iconColor: '#34d399'
  },
  error: {
    icon: AlertCircle,
    accentColor: '#f43f5e',
    bgColor: 'rgba(15, 23, 42, 0.95)',
    borderColor: 'rgba(244, 63, 94, 0.4)',
    iconBg: 'rgba(244, 63, 94, 0.15)',
    iconColor: '#fb7185'
  },
  info: {
    icon: Info,
    accentColor: '#3b82f6',
    bgColor: 'rgba(15, 23, 42, 0.95)',
    borderColor: 'rgba(59, 130, 246, 0.4)',
    iconBg: 'rgba(59, 130, 246, 0.15)',
    iconColor: '#60a5fa'
  },
  warning: {
    icon: AlertTriangle,
    accentColor: '#f59e0b',
    bgColor: 'rgba(15, 23, 42, 0.95)',
    borderColor: 'rgba(245, 158, 11, 0.4)',
    iconBg: 'rgba(245, 158, 11, 0.15)',
    iconColor: '#fbbf24'
  }
};

export default function ToastContainer({ toasts }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        maxWidth: '420px',
        width: 'calc(100% - 40px)',
        pointerEvents: 'none'
      }}
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map(toast => {
        const config = VARIANT_CONFIG[toast.variant];
        const IconComponent = config.icon;

        return (
          <div
            key={toast.id}
            style={{
              pointerEvents: 'auto',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              padding: '12px 14px',
              borderRadius: '12px',
              background: config.bgColor,
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: `1px solid ${config.borderColor}`,
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
              color: '#ffffff',
              position: 'relative',
              overflow: 'hidden',
              animation: 'toastSlideIn 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards',
              transition: 'all 0.2s ease'
            }}
          >
            {/* Barra lateral de acento */}
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: '4px',
                background: config.accentColor
              }}
            />

            {/* Icono */}
            <div
              style={{
                flexShrink: 0,
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: config.iconBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: config.iconColor
              }}
            >
              <IconComponent className="w-4 h-4" />
            </div>

            {/* Contenido */}
            <div style={{ flex: 1, minWidth: 0, paddingTop: '1px' }}>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#f8fafc',
                  lineHeight: '1.3',
                  wordBreak: 'break-word'
                }}
              >
                {toast.title}
              </div>

              {toast.description && (
                <div
                  style={{
                    fontSize: '11.5px',
                    color: '#94a3b8',
                    marginTop: '3px',
                    lineHeight: '1.4',
                    wordBreak: 'break-word'
                  }}
                >
                  {toast.description}
                </div>
              )}

              {toast.action && (
                <button
                  type="button"
                  onClick={toast.action.onClick}
                  style={{
                    marginTop: '8px',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: config.iconColor,
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    padding: '3px 8px',
                    borderRadius: '5px',
                    cursor: 'pointer'
                  }}
                >
                  {toast.action.label}
                </button>
              )}
            </div>

            {/* Botón Cerrar */}
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              title="Cerrar notificación"
              style={{
                flexShrink: 0,
                background: 'none',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
                padding: '3px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '4px',
                transition: 'color 0.15s ease'
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#cbd5e1')}
              onMouseLeave={e => (e.currentTarget.style.color = '#64748b')}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}

      <style jsx global>{`
        @keyframes toastSlideIn {
          from {
            opacity: 0;
            transform: translateX(30px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}
