'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  ExternalLink,
  Download,
  ChevronLeft,
  ChevronRight,
  Camera,
  Trash2
} from 'lucide-react';

export interface EvidenciaPhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  photos: string[];
  initialIndex?: number;
  onDeletePhoto?: (photoUrl: string) => void | Promise<void>;
}

export default function EvidenciaPhotoModal({
  isOpen,
  onClose,
  title,
  subtitle,
  photos = [],
  initialIndex = 0,
  onDeletePhoto
}: EvidenciaPhotoModalProps) {
  const [mounted, setMounted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sincronizar índice actual al abrir o cuando cambie initialIndex
  useEffect(() => {
    if (isOpen && photos.length > 0) {
      const validIndex = Math.max(0, Math.min(initialIndex, photos.length - 1));
      setCurrentIndex(validIndex);
    }
  }, [isOpen, initialIndex, photos.length]);

  const handleNext = useCallback(() => {
    if (currentIndex < photos.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  }, [currentIndex, photos.length]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  }, [currentIndex]);

  // Manejo de teclado (Esc, Flechas) y bloqueo del scroll del fondo
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, handleNext, handlePrev]);

  if (!isOpen || !mounted || photos.length === 0) {
    return null;
  }

  const currentPhotoUrl = photos[currentIndex] || photos[0];

  const handleDelete = async () => {
    if (!onDeletePhoto) return;
    await onDeletePhoto(currentPhotoUrl);
    if (photos.length <= 1) {
      onClose();
    } else if (currentIndex >= photos.length - 1) {
      setCurrentIndex(photos.length - 2);
    }
  };

  const modalContent = (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.92)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 999999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px'
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '1000px',
          height: '92vh',
          maxHeight: '92vh',
          background: '#0f172a',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.14)',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75)',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* 1. Header del Modal */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            background: '#1e293b',
            color: '#f8fafc',
            borderBottom: '1px solid #334155',
            flexShrink: 0,
            gap: '10px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <Camera className="w-4 h-4 text-white" />
            </div>
            <div style={{ minWidth: 0, overflow: 'hidden' }}>
              <div
                style={{
                  fontSize: '13.5px',
                  fontWeight: 800,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {title}
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                {subtitle || 'Evidencia fotográfica en alta resolución'}
                {photos.length > 1 && (
                  <span style={{ marginLeft: '6px', color: '#38bdf8', fontWeight: 700 }}>
                    · Foto {currentIndex + 1} de {photos.length}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Acciones del Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            {/* Abrir original en pestaña */}
            <a
              href={currentPhotoUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#cbd5e1',
                padding: '6px 10px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '11.5px',
                fontWeight: 700,
                textDecoration: 'none',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}
              title="Abrir imagen original"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hide-mobile">Original</span>
            </a>

            {/* Descargar imagen */}
            <a
              href={currentPhotoUrl}
              download={`evidencia_${currentIndex + 1}.jpg`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#cbd5e1',
                padding: '6px 10px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '11.5px',
                fontWeight: 700,
                textDecoration: 'none',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}
              title="Descargar fotografía"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hide-mobile">Descargar</span>
            </a>

            {/* Eliminar (si corresponde) */}
            {onDeletePhoto && (
              <button
                type="button"
                onClick={handleDelete}
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#f87171',
                  padding: '6px 9px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
                title="Eliminar esta foto"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Cerrar modal */}
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.12)',
                border: 'none',
                color: '#ffffff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                borderRadius: '8px'
              }}
              title="Cerrar (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2. Visualizador Central de la Imagen */}
        <div
          style={{
            position: 'relative',
            flex: 1,
            minHeight: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '12px',
            background: '#020617',
            overflow: 'hidden'
          }}
        >
          {/* Flecha Anterior (si hay más de 1 foto) */}
          {photos.length > 1 && (
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentIndex === 0}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'rgba(15, 23, 42, 0.75)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#ffffff',
                borderRadius: '50%',
                width: '42px',
                height: '42px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
                opacity: currentIndex === 0 ? 0.25 : 1,
                zIndex: 10,
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
              }}
              title="Foto anterior"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {/* Imagen Escalada */}
          <img
            src={currentPhotoUrl}
            alt={`${title} - Foto ${currentIndex + 1}`}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              width: 'auto',
              height: 'auto',
              objectFit: 'contain',
              borderRadius: '8px',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.8)',
              userSelect: 'none'
            }}
          />

          {/* Flecha Siguiente (si hay más de 1 foto) */}
          {photos.length > 1 && (
            <button
              type="button"
              onClick={handleNext}
              disabled={currentIndex === photos.length - 1}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'rgba(15, 23, 42, 0.75)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#ffffff',
                borderRadius: '50%',
                width: '42px',
                height: '42px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: currentIndex === photos.length - 1 ? 'not-allowed' : 'pointer',
                opacity: currentIndex === photos.length - 1 ? 0.25 : 1,
                zIndex: 10,
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
              }}
              title="Foto siguiente"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}
        </div>

        {/* 3. Tira de Miniaturas Inferior (si hay más de 1 foto) */}
        {photos.length > 1 && (
          <div
            style={{
              display: 'flex',
              gap: '8px',
              padding: '8px 12px',
              background: '#0f172a',
              borderTop: '1px solid #1e293b',
              overflowX: 'auto',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            {photos.map((foto, idx) => {
              const isSelected = idx === currentIndex;
              return (
                <div
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '6px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    border: isSelected ? '2px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.2)',
                    opacity: isSelected ? 1 : 0.6,
                    transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                    transition: 'all 0.15s ease',
                    flexShrink: 0,
                    position: 'relative',
                    background: '#020617'
                  }}
                >
                  <img
                    src={foto}
                    alt={`Miniatura ${idx + 1}`}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      bottom: '2px',
                      right: '2px',
                      background: 'rgba(0,0,0,0.7)',
                      color: '#ffffff',
                      fontSize: '9px',
                      fontWeight: 800,
                      padding: '1px 3px',
                      borderRadius: '3px'
                    }}
                  >
                    #{idx + 1}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
