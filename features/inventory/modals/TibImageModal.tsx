'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Camera,
  Download,
  FileText,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  X,
  MapPin,
  Scale,
  User,
  Box,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  Tag,
} from 'lucide-react';
import { Paquete } from '@/types';

export interface TibImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  paquete: Paquete | null;
  onImageLoaded?: (wr: string, imageUrl: string, ticketUrl?: string) => void;
}

interface TibData {
  wr?: string;
  seqwr?: string;
  tracking?: string;
  cliente?: string;
  pesoKg?: string;
  estado?: string;
  fecha?: string;
  rack?: string;
  empaque?: string;
}

export default function TibImageModal({
  isOpen,
  onClose,
  paquete,
  onImageLoaded,
}: TibImageModalProps) {
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [ticketUrl, setTicketUrl] = useState<string | null>(null);
  const [tibData, setTibData] = useState<TibData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copiedTracking, setCopiedTracking] = useState(false);

  const onImageLoadedRef = useRef(onImageLoaded);
  useEffect(() => {
    onImageLoadedRef.current = onImageLoaded;
  }, [onImageLoaded]);

  const paqueteRef = useRef(paquete);
  useEffect(() => {
    paqueteRef.current = paquete;
  }, [paquete]);

  const fetchTibImage = useCallback(async (wr: string, id?: string, forceRefresh = false) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/paquetes/tib-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wr, id, forceRefresh }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al conectar con el servidor.');
      }

      if (data.found && data.tibImagenUrl) {
        setImageUrl(data.tibImagenUrl);
        setTicketUrl(data.tibTicketPdfUrl || null);
        if (data.tibData) {
          setTibData(data.tibData);
        }
        // Notificar al padre únicamente si la imagen es nueva o cambió
        if (onImageLoadedRef.current && paqueteRef.current?.tibImagenUrl !== data.tibImagenUrl) {
          onImageLoadedRef.current(wr, data.tibImagenUrl, data.tibTicketPdfUrl || undefined);
        }
      } else {
        setImageUrl((prev) => {
          if (!prev && !paqueteRef.current?.tibImagenUrl) {
            setErrorMsg(data.message || `No se encontró evidencia fotográfica en TIB para la guía ${wr}.`);
          }
          return prev;
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al obtener la imagen de TIB';
      setImageUrl((prev) => {
        if (!prev && !paqueteRef.current?.tibImagenUrl) {
          setErrorMsg(msg);
        }
        return prev;
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen || !paquete) {
      setImageUrl(null);
      setTicketUrl(null);
      setTibData(null);
      setErrorMsg(null);
      setZoomLevel(1);
      setRotation(0);
      setIsFullscreen(false);
      setCopiedTracking(false);
      setLoading(false);
      return;
    }

    setZoomLevel(1);
    setRotation(0);
    setIsFullscreen(false);
    setCopiedTracking(false);

    // Si el paquete ya tiene la URL cargada en BD, mostrarla directo y NO llamar a la API
    if (paquete.tibImagenUrl) {
      setImageUrl(paquete.tibImagenUrl);
      setTicketUrl(paquete.tibTicketPdfUrl || null);
      setLoading(false);
      setErrorMsg(null);
      return;
    }

    // Si NO tiene imagen en BD, entonces sí consultamos a TIB
    setImageUrl(null);
    setTicketUrl(null);
    void fetchTibImage(paquete.numeroReciboBodega, paquete.id, false);
  }, [
    isOpen,
    paquete?.id,
    paquete?.numeroReciboBodega,
    paquete?.tibImagenUrl,
    paquete?.tibTicketPdfUrl,
    fetchTibImage,
  ]);

  const handleDownload = async () => {
    if (!imageUrl || !paquete) return;
    setDownloading(true);
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `TIB_${paquete.numeroReciboBodega}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Error al descargar:', err);
      window.open(imageUrl, '_blank');
    } finally {
      setDownloading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    if (!text || text === '—') return;
    navigator.clipboard.writeText(text);
    setCopiedTracking(true);
    setTimeout(() => setCopiedTracking(false), 2000);
  };

  if (!isOpen || !paquete) return null;

  const clienteNombre = paquete.nombreConsignatario || tibData?.cliente || '—';
  const trackingNumber = paquete.tracking || tibData?.tracking || '—';
  const pesoFinalKg = paquete.pesoKg ?? (tibData?.pesoKg ? Number(tibData.pesoKg) : 0);
  const pesoFinalLb = (pesoFinalKg * 2.20462).toFixed(2);
  const tipoCaja = paquete.tipoEmpaque || tibData?.empaque || 'CAJA';

  const posicionWms =
    paquete.posicionEstante ||
    (paquete.anaquel && paquete.piso ? `${paquete.anaquel}-${paquete.piso}` : 'REC-P1');
  const almacenAmex = paquete.ubicacionActual || 'Almacén Central Lince';

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      style={{
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(6px)',
      }}
    >
      <div
        className="modal-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '1240px',
          width: '96vw',
          height: '88vh',
          maxHeight: '860px',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '18px',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.4)',
          overflow: 'hidden',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
        }}
      >
        {/* HEADER COMPACTO */}
        <div
          style={{
            padding: '14px 22px',
            borderBottom: '1px solid #e2e8f0',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(59, 130, 246, 0.2)',
                border: '1px solid rgba(96, 165, 250, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#60a5fa',
              }}
            >
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: '#ffffff' }}>
                Ficha y Evidencia Fotográfica TIB
              </h3>
              <div style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#60a5fa' }}>
                  {paquete.numeroReciboBodega}
                </span>
                <span>•</span>
                <span>Tracking: {trackingNumber}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              title="Refrescar imagen desde TIB"
              disabled={loading}
              onClick={() => fetchTibImage(paquete.numeroReciboBodega, paquete.id, true)}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#f8fafc',
                borderRadius: '8px',
                padding: '6px 10px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Consultando...' : 'Refrescar'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                cursor: 'pointer',
                color: '#94a3b8',
                padding: '6px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                transition: 'background 0.15s ease',
              }}
            >
              <X className="w-5 h-5 text-slate-300 hover:text-white" />
            </button>
          </div>
        </div>

        {/* CONTENIDO PRINCIPAL: DOS COLUMNAS (IZQUIERDA: DATOS | DERECHA: IMAGEN) */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'row',
            overflow: 'hidden',
            background: '#f8fafc',
          }}
        >
          {/* =========================================================================
              COLUMNA IZQUIERDA: FICHA TÉCNICA Y DATOS LOGÍSTICOS
             ========================================================================= */}
          <div
            style={{
              width: '390px',
              flexShrink: 0,
              background: '#ffffff',
              borderRight: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              overflowY: 'auto',
              padding: '18px 20px',
              gap: '14px',
            }}
          >
            {/* 1. Cliente / Consignatario */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '12px 14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#2563eb', marginBottom: '4px' }}>
                <User className="w-4 h-4" />
                <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  Cliente / Consignatario
                </span>
              </div>
              <div style={{ fontSize: '14px', fontWeight: 900, color: '#0f172a', wordBreak: 'break-word', lineHeight: 1.3 }}>
                {clienteNombre}
              </div>
            </div>

            {/* 2. Código Guía WR & Tracking */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div
                style={{
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: '10px',
                  padding: '10px 12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#1e40af', marginBottom: '3px' }}>
                  <Tag className="w-3.5 h-3.5" />
                  <span style={{ fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase' }}>Guía WR</span>
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: '13.5px', fontWeight: 900, color: '#1d4ed8' }}>
                  {paquete.numeroReciboBodega}
                </div>
              </div>

              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '10px 12px',
                  position: 'relative',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#64748b', marginBottom: '3px' }}>
                  <span style={{ fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase' }}>Tracking</span>
                  {trackingNumber !== '—' && (
                    <button
                      type="button"
                      onClick={() => copyToClipboard(trackingNumber)}
                      title="Copiar tracking"
                      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#2563eb' }}
                    >
                      {copiedTracking ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
                <div
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#334155',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  title={trackingNumber}
                >
                  {trackingNumber}
                </div>
              </div>
            </div>

            {/* 3. Peso & Tipo de Caja */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div
                style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '10px',
                  padding: '10px 12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#166534', marginBottom: '3px' }}>
                  <Scale className="w-3.5 h-3.5" />
                  <span style={{ fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase' }}>Peso Físico</span>
                </div>
                <div style={{ fontSize: '15px', fontWeight: 900, color: '#15803d' }}>
                  {pesoFinalKg.toFixed(2)} kg
                </div>
                <div style={{ fontSize: '10.5px', color: '#16a34a', fontWeight: 600 }}>
                  ≈ {pesoFinalLb} lb
                </div>
              </div>

              <div
                style={{
                  background: '#faf5ff',
                  border: '1px solid #e9d5ff',
                  borderRadius: '10px',
                  padding: '10px 12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#7e22ce', marginBottom: '3px' }}>
                  <Box className="w-3.5 h-3.5" />
                  <span style={{ fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase' }}>Tipo Empaque</span>
                </div>
                <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#6b21a8', textTransform: 'uppercase' }}>
                  {tipoCaja}
                </div>
                {tibData?.fecha && (
                  <div style={{ fontSize: '10px', color: '#9333ea', fontWeight: 600 }}>
                    {tibData.fecha.split(' ')[0]}
                  </div>
                )}
              </div>
            </div>

            {/* 4. Ubicación AMEX (Almacén Lince) */}
            <div
              style={{
                background: '#fffbeb',
                border: '1.5px solid #fde68a',
                borderRadius: '12px',
                padding: '12px 14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#b45309' }}>
                  <MapPin className="w-4 h-4 text-amber-600" />
                  <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    Ubicación Almacén AMEX
                  </span>
                </div>
                <span
                  style={{
                    background: '#d97706',
                    color: '#ffffff',
                    fontSize: '11.5px',
                    fontWeight: 900,
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontFamily: 'monospace',
                  }}
                >
                  {posicionWms}
                </span>
              </div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#78350f' }}>
                {almacenAmex}
              </div>
              {tibData?.rack && (
                <div style={{ marginTop: '4px', fontSize: '11px', color: '#92400e' }}>
                  Rack previo en Miami: <strong>{tibData.rack}</strong>
                </div>
              )}
            </div>

            {/* 5. Estados Logísticos (TIB y AMEX) */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: '#64748b', fontWeight: 600 }}>Estado Logístico TIB:</span>
                <span
                  style={{
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    background:
                      paquete.estadoTib === 'Entregado'
                        ? '#dcfce7'
                        : paquete.estadoTib === 'Enviado'
                        ? '#dbeafe'
                        : '#fef3c7',
                    color:
                      paquete.estadoTib === 'Entregado'
                        ? '#15803d'
                        : paquete.estadoTib === 'Enviado'
                        ? '#1e40af'
                        : '#b45309',
                  }}
                >
                  {paquete.estadoTib || tibData?.estado || 'Recibido'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: '#64748b', fontWeight: 600 }}>Estado Operativo AMEX:</span>
                <span
                  style={{
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    background: '#f1f5f9',
                    color: '#334155',
                    textTransform: 'uppercase',
                  }}
                >
                  {paquete.estadoAmex === 'en_almacen' ? 'En Almacén Lince' : (paquete.estadoAmex || 'En Almacén')}
                </span>
              </div>
            </div>

            {/* 6. Botones de Acción de Documentos */}
            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '8px' }}>
              {ticketUrl && (
                <a
                  href={ticketUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    background: '#ffffff',
                    border: '1.5px solid #0891b2',
                    color: '#0891b2',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    fontSize: '12.5px',
                    fontWeight: 800,
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <FileText className="w-4 h-4" />
                  <span>Ver Ticket PDF TIB</span>
                </a>
              )}

              {imageUrl && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={handleDownload}
                    disabled={downloading}
                    style={{
                      background: '#2563eb',
                      border: 'none',
                      color: '#ffffff',
                      borderRadius: '10px',
                      padding: '9px 12px',
                      fontSize: '12px',
                      fontWeight: 800,
                      cursor: downloading ? 'wait' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)',
                    }}
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{downloading ? 'Descargando...' : 'Descargar Foto'}</span>
                  </button>

                  <a
                    href={imageUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      color: '#334155',
                      borderRadius: '10px',
                      padding: '9px 12px',
                      fontSize: '12px',
                      fontWeight: 800,
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Pestaña Nueva</span>
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* =========================================================================
              COLUMNA DERECHA: SOLO LA IMAGEN CON HERRAMIENTAS FLOTANTES
             ========================================================================= */}
          <div
            style={{
              flex: 1,
              position: 'relative',
              background: '#090d16',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            {loading && !imageUrl ? (
              <div
                style={{
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '14px',
                  color: '#ffffff',
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    border: '3px solid rgba(255, 255, 255, 0.1)',
                    borderTopColor: '#38bdf8',
                    animation: 'spin 1s linear infinite',
                  }}
                />
                <div>
                  <p style={{ margin: 0, fontWeight: 800, fontSize: '15px', color: '#f8fafc' }}>
                    Conectando con TIB Courier...
                  </p>
                  <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '12px' }}>
                    Extrayendo foto de bodega para {paquete.numeroReciboBodega}
                  </p>
                </div>
              </div>
            ) : imageUrl ? (
              <>
                {/* Contenedor Interactivo con Zoom y Rotación */}
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: zoomLevel > 1 ? 'auto' : 'hidden',
                    padding: '16px',
                  }}
                >
                  <img
                    src={imageUrl}
                    alt={`Paquete ${paquete.numeroReciboBodega}`}
                    style={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      objectFit: 'contain',
                      display: 'block',
                      borderRadius: '8px',
                      boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8)',
                      transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                      transformOrigin: 'center center',
                      transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                      cursor: zoomLevel === 1 ? 'zoom-in' : 'zoom-out',
                    }}
                    onClick={() => setZoomLevel((prev) => (prev === 1 ? 1.6 : 1))}
                  />
                </div>

                {/* Barra de Herramientas Superior Derecha */}
                <div
                  style={{
                    position: 'absolute',
                    top: '16px',
                    right: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: 'rgba(15, 23, 42, 0.85)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    padding: '4px 8px',
                    borderRadius: '10px',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
                    zIndex: 10,
                  }}
                >
                  <button
                    type="button"
                    title="Acercar (Zoom In)"
                    onClick={(e) => {
                      e.stopPropagation();
                      setZoomLevel((prev) => Math.min(prev + 0.3, 3));
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#ffffff',
                      cursor: 'pointer',
                      padding: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      borderRadius: '6px',
                    }}
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    title="Alejar (Zoom Out)"
                    onClick={(e) => {
                      e.stopPropagation();
                      setZoomLevel((prev) => Math.max(prev - 0.3, 1));
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#ffffff',
                      cursor: 'pointer',
                      padding: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      borderRadius: '6px',
                    }}
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    title="Rotar 90°"
                    onClick={(e) => {
                      e.stopPropagation();
                      setRotation((prev) => (prev + 90) % 360);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#ffffff',
                      cursor: 'pointer',
                      padding: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      borderRadius: '6px',
                    }}
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>

                  <div style={{ width: '1px', height: '18px', background: 'rgba(255,255,255,0.2)', margin: '0 4px' }} />

                  <button
                    type="button"
                    title="Pantalla Completa"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsFullscreen(true);
                    }}
                    style={{
                      background: 'rgba(59, 130, 246, 0.3)',
                      border: '1px solid rgba(96, 165, 250, 0.4)',
                      color: '#60a5fa',
                      cursor: 'pointer',
                      padding: '5px 10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontSize: '11px',
                      fontWeight: 800,
                      borderRadius: '6px',
                    }}
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>Ampliar</span>
                  </button>
                </div>

                {/* Badge Inferior Derecho de Zoom */}
                {zoomLevel > 1 && (
                  <span
                    style={{
                      position: 'absolute',
                      bottom: '16px',
                      right: '16px',
                      background: 'rgba(15, 23, 42, 0.85)',
                      color: '#cbd5e1',
                      padding: '3px 10px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 800,
                      pointerEvents: 'none',
                    }}
                  >
                    Zoom: {Math.round(zoomLevel * 100)}%
                  </span>
                )}
              </>
            ) : (
              <div
                style={{
                  padding: '40px 24px',
                  textAlign: 'center',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px dashed rgba(255, 255, 255, 0.2)',
                  borderRadius: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px',
                  color: '#ffffff',
                  maxWidth: '380px',
                }}
              >
                <AlertCircle className="w-10 h-10 text-rose-400" />
                <div>
                  <h4 style={{ margin: 0, color: '#f87171', fontWeight: 800, fontSize: '15px' }}>
                    Sin foto disponible en TIB
                  </h4>
                  <p style={{ margin: '6px 0 0 0', color: '#94a3b8', fontSize: '12.5px', lineHeight: 1.4 }}>
                    {errorMsg || 'No se encontró archivo fotográfico registrado en Miami para este WR.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => fetchTibImage(paquete.numeroReciboBodega, paquete.id, true)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#ffffff',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Reintentar Búsqueda
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* LIGHTBOX / PANTALLA COMPLETA TOTAL */}
      {isFullscreen && imageUrl && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100000,
            background: 'rgba(5, 8, 15, 0.97)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '16px',
          }}
          onClick={() => setIsFullscreen(false)}
        >
          {/* Barra Superior Lightbox */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              color: '#ffffff',
              padding: '10px 18px',
              background: 'rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{ fontWeight: 800, fontSize: '15px', color: '#60a5fa', fontFamily: 'monospace' }}>
                {paquete.numeroReciboBodega}
              </span>
              <span style={{ color: '#64748b' }}>•</span>
              <span style={{ fontSize: '13px', color: '#e2e8f0' }}>
                {clienteNombre}
              </span>
              <span style={{ color: '#64748b' }}>•</span>
              <span style={{ fontSize: '12px', color: '#38bdf8', fontWeight: 700, background: 'rgba(56, 189, 248, 0.15)', padding: '2px 8px', borderRadius: '4px' }}>
                Resolución Original TIB
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setZoomLevel((prev) => Math.min(prev + 0.3, 3.5))}
                style={{
                  background: 'rgba(255, 255, 255, 0.12)',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  color: '#ffffff',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '12px',
                  fontWeight: 700,
                }}
              >
                <ZoomIn className="w-4 h-4" /> Zoom +
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel((prev) => Math.max(prev - 0.3, 1))}
                style={{
                  background: 'rgba(255, 255, 255, 0.12)',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  color: '#ffffff',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '12px',
                  fontWeight: 700,
                }}
              >
                <ZoomOut className="w-4 h-4" /> Zoom -
              </button>
              <button
                type="button"
                onClick={() => setRotation((prev) => (prev + 90) % 360)}
                style={{
                  background: 'rgba(255, 255, 255, 0.12)',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  color: '#ffffff',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '12px',
                  fontWeight: 700,
                }}
              >
                <RotateCw className="w-4 h-4" /> Rotar
              </button>
              <button
                type="button"
                onClick={() => setIsFullscreen(false)}
                style={{
                  background: '#dc2626',
                  border: 'none',
                  color: '#ffffff',
                  padding: '7px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  fontWeight: 800,
                }}
              >
                <Minimize2 className="w-4 h-4" /> Salir de Pantalla Completa
              </button>
            </div>
          </div>

          {/* Imagen en Pantalla Completa */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'auto',
              padding: '16px',
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsFullscreen(false);
            }}
          >
            <img
              src={imageUrl}
              alt={`Paquete ${paquete.numeroReciboBodega}`}
              style={{
                maxWidth: '94vw',
                maxHeight: '82vh',
                objectFit: 'contain',
                borderRadius: '8px',
                boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8)',
                transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                transformOrigin: 'center center',
                transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                cursor: zoomLevel === 1 ? 'zoom-in' : 'zoom-out',
              }}
              onClick={(e) => {
                e.stopPropagation();
                setZoomLevel((prev) => (prev === 1 ? 1.8 : 1));
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
