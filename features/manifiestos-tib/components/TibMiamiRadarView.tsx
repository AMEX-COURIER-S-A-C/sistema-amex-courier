'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Radio,
  Calendar,
  Search,
  RefreshCw,
  Download,
  Copy,
  Check,
  ExternalLink,
  Package,
  Weight,
  Clock,
  ShieldCheck,
  AlertCircle,
  FileSpreadsheet,
  Image as ImageIcon,
  FileText,
  MapPin,
  X
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { alertDialog } from '@/lib/dialog';

interface TibPackage {
  index: number;
  id: string;
  wr: string;
  rawWr: string;
  cliente: string;
  tracking: string;
  peso: number;
  tipoEmpaque: string;
  rackMiami: string;
  postal: string;
  fechaRegistro: string;
  horaRegistro: string;
  timestampCompleto: string;
  operador: string;
  fotoUrl: string | null;
  ticketUrl: string | null;
  estado: string;
}

interface TibResponse {
  success: boolean;
  fechaConsultada: string;
  filtroCliente: string;
  metricas: {
    totalPaquetes: number;
    totalPeso: number;
    primeraHora: string | null;
    ultimaHora: string | null;
    operadores: string[];
  };
  fechasDisponibles: Array<{
    date: string;
    amexCount: number;
    totalCount: number;
  }>;
  paquetes: TibPackage[];
}

export default function TibMiamiRadarView() {
  // Helper para calcular fecha de "Ayer"
  const getYesterdayIso = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  };

  const getTodayIso = () => {
    return new Date().toISOString().split('T')[0];
  };

  const [selectedDate, setSelectedDate] = useState<string>(getYesterdayIso());
  const [clientFilter, setClientFilter] = useState('AMEX');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [data, setData] = useState<TibResponse | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedWrs, setCopiedWrs] = useState(false);
  const [copiedTracking, setCopiedTracking] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  // Cargar datos desde la API
  const fetchTibData = useCallback(async (dateToQuery: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(
        `/api/tib/recepcion-diaria?date=${encodeURIComponent(dateToQuery)}&client=${encodeURIComponent(clientFilter)}`
      );
      const json: TibResponse = await res.json();
      if (!res.ok || !json.success) {
        throw new Error((json as any).error || 'Error al conectar con TIBCARGO');
      }
      setData(json);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error inesperado';
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  }, [clientFilter]);

  // Carga inicial automática al montar (diseñado para las 7:30 AM)
  useEffect(() => {
    fetchTibData(selectedDate);
  }, [fetchTibData, selectedDate]);

  // Filtrado reactivo en memoria con el buscador
  const filteredPackages = useMemo(() => {
    if (!data?.paquetes) return [];
    if (!searchTerm.trim()) return data.paquetes;

    const term = searchTerm.toLowerCase().trim();
    return data.paquetes.filter((p) => {
      return (
        p.wr.toLowerCase().includes(term) ||
        p.cliente.toLowerCase().includes(term) ||
        p.tracking.toLowerCase().includes(term) ||
        p.rackMiami.toLowerCase().includes(term) ||
        p.tipoEmpaque.toLowerCase().includes(term)
      );
    });
  }, [data?.paquetes, searchTerm]);

  // Copiar todas las guías WR al portapapeles
  const handleCopyAllWrs = async () => {
    if (!data?.paquetes || data.paquetes.length === 0) return;
    const wrList = data.paquetes.map((p) => p.wr).join('\n');
    await navigator.clipboard.writeText(wrList);
    setCopiedWrs(true);
    setTimeout(() => setCopiedWrs(false), 2200);
  };

  // Copiar tracking individual
  const handleCopyTracking = async (trk: string) => {
    await navigator.clipboard.writeText(trk);
    setCopiedTracking(trk);
    setTimeout(() => setCopiedTracking(null), 2000);
  };

  // Exportar reporte formal a Excel
  const handleExportExcel = () => {
    if (!data?.paquetes || data.paquetes.length === 0) return;

    const rows = data.paquetes.map((p, idx) => ({
      '#': idx + 1,
      'Guía WR': p.wr,
      'Consignatario': p.cliente,
      'Tracking USA': p.tracking,
      'Peso (KG/LB)': p.peso,
      'Tipo de Empaque': p.tipoEmpaque,
      'Rack / Ubicación Miami': p.rackMiami,
      'Postal / Carrier': p.postal,
      'Fecha Registro': p.fechaRegistro,
      'Hora Registro': p.horaRegistro,
      'Operador TIB': p.operador,
      'Enlace Foto': p.fotoUrl || 'Sin foto',
      'Enlace Ticket': p.ticketUrl || 'Sin ticket',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Recepcion_Miami');

    const fileName = `Recepcion_Miami_AMEX_${data.fechaConsultada}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '1440px', margin: '0 auto' }}>
      
      {/* 1. Cabecera Hero */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #064e3b 100%)',
          borderRadius: '16px',
          padding: '22px 26px',
          color: '#ffffff',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.4)',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '14px',
              background: 'rgba(16, 185, 129, 0.2)',
              border: '1.5px solid rgba(16, 185, 129, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#34d399'
            }}
          >
            <Radio className="w-7 h-7 animate-pulse" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 900, letterSpacing: '-0.3px' }}>
                17.2 📡 Recepción Diaria en Miami (TIB CARGO en Vivo)
              </h2>
              <span
                style={{
                  background: 'rgba(16, 185, 129, 0.25)',
                  color: '#6ee7b7',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  fontSize: '11px',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: '6px'
                }}
              >
                ● TIB Miami Online
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '13px', lineHeight: '1.4' }}>
              Monitoreo matutino de paquetes ingresados en el almacén de Miami. Diseñado para consultar a las <strong>7:30 AM (Lima)</strong> el cierre completo del día anterior.
            </p>
          </div>
        </div>

        {/* Acciones principales del Hero */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleCopyAllWrs}
            disabled={!data || data.paquetes.length === 0}
            style={{
              background: copiedWrs ? '#15803d' : 'rgba(255, 255, 255, 0.12)',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              padding: '9px 14px',
              borderRadius: '8px',
              fontSize: '12.5px',
              fontWeight: 800,
              cursor: (!data || data.paquetes.length === 0) ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
          >
            {copiedWrs ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
            {copiedWrs ? '¡Guías Copiadas!' : 'Copiar WRs (Columna)'}
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            disabled={!data || data.paquetes.length === 0}
            style={{
              background: '#059669',
              color: '#ffffff',
              border: 'none',
              padding: '9px 16px',
              borderRadius: '8px',
              fontSize: '12.5px',
              fontWeight: 900,
              cursor: (!data || data.paquetes.length === 0) ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(5, 150, 105, 0.35)',
              transition: 'all 0.15s ease'
            }}
          >
            <Download className="w-4 h-4" /> Exportar a Excel
          </button>
        </div>
      </div>

      {/* 2. Barra de Control Matutino y Filtros Rápidos */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          padding: '16px 20px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '14px'
        }}
      >
        {/* Selector de Fechas Rápidas */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#475569', marginRight: '4px' }}>
            Fecha de Recepción:
          </span>

          <button
            type="button"
            onClick={() => setSelectedDate(getYesterdayIso())}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: selectedDate === getYesterdayIso() ? '2px solid #059669' : '1px solid #cbd5e1',
              background: selectedDate === getYesterdayIso() ? '#ecfdf5' : '#f8fafc',
              color: selectedDate === getYesterdayIso() ? '#065f46' : '#334155',
              fontWeight: 800,
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <Clock className="w-3.5 h-3.5 text-emerald-600" /> 📅 Ayer (Recomendado 7:30 AM)
          </button>

          <button
            type="button"
            onClick={() => setSelectedDate(getTodayIso())}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: selectedDate === getTodayIso() ? '2px solid #059669' : '1px solid #cbd5e1',
              background: selectedDate === getTodayIso() ? '#ecfdf5' : '#f8fafc',
              color: selectedDate === getTodayIso() ? '#065f46' : '#334155',
              fontWeight: 800,
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            Hoy en Vivo
          </button>

          {/* Chips con fechas disponibles detectadas en TIB */}
          {data?.fechasDisponibles?.slice(0, 3).map((f) => {
            const isSelected = selectedDate === f.date;
            if (f.date === getYesterdayIso() || f.date === getTodayIso()) return null;
            return (
              <button
                key={f.date}
                type="button"
                onClick={() => setSelectedDate(f.date)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: isSelected ? '2px solid #059669' : '1px solid #e2e8f0',
                  background: isSelected ? '#ecfdf5' : '#ffffff',
                  color: isSelected ? '#065f46' : '#64748b',
                  fontWeight: 700,
                  fontSize: '11.5px',
                  cursor: 'pointer'
                }}
              >
                {f.date} ({f.amexCount})
              </button>
            );
          })}

          {/* Selector de Fecha Personalizado */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '4px' }}>
            <Calendar className="w-4 h-4 text-slate-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
              style={{
                border: '1px solid #cbd5e1',
                padding: '5px 10px',
                borderRadius: '6px',
                fontSize: '12.5px',
                fontWeight: 700,
                color: '#0f172a',
                outline: 'none',
                background: '#f8fafc'
              }}
            />
          </div>
        </div>

        {/* Buscador & Refrescar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ position: 'relative', width: '240px' }}>
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar WR, cliente, tracking..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px 6px 32px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '12.5px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <button
            type="button"
            onClick={() => fetchTibData(selectedDate)}
            disabled={isLoading}
            style={{
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              color: '#334155',
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 800,
              cursor: isLoading ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
            {isLoading ? 'Consultando...' : 'Actualizar'}
          </button>
        </div>
      </div>

      {/* 3. Mensaje de Error si falla la conexión */}
      {errorMsg && (
        <div
          style={{
            background: '#fef2f2',
            border: '1.5px solid #f87171',
            borderRadius: '12px',
            padding: '14px 18px',
            color: '#991b1b',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '13px',
            fontWeight: 700
          }}
        >
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <span>Error al consultar el servidor de TIBCARGO: {errorMsg}</span>
        </div>
      )}

      {/* 4. Tarjetas KPI de Métricas Diarias */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
        
        {/* KPI 1: Total Paquetes */}
        <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '10px', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Package className="w-6 h-6" />
          </div>
          <div>
            <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
              Paquetes AMEX Recibidos
            </span>
            <div style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.5px', marginTop: '2px' }}>
              {isLoading ? '...' : data?.metricas.totalPaquetes ?? 0}
            </div>
            <span style={{ fontSize: '11px', color: '#059669', fontWeight: 700 }}>
              Fecha: {selectedDate}
            </span>
          </div>
        </div>

        {/* KPI 2: Peso Acumulado */}
        <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '10px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Weight className="w-6 h-6" />
          </div>
          <div>
            <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
              Peso Total Estimado
            </span>
            <div style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.5px', marginTop: '2px' }}>
              {isLoading ? '...' : `${data?.metricas.totalPeso ?? 0} kg/lb`}
            </div>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
              Promedio: {data && data.metricas.totalPaquetes > 0 ? (data.metricas.totalPeso / data.metricas.totalPaquetes).toFixed(2) : 0} por bulto
            </span>
          </div>
        </div>

        {/* KPI 3: Hora de Corte Miami (El dato clave para el usuario) */}
        <div style={{ background: '#ffffff', borderRadius: '12px', border: '1.5px solid #cbd5e1', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '10px', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#b45309', textTransform: 'uppercase' }}>
                🚨 Hora de Última Recepción
              </span>
            </div>
            <div style={{ fontSize: '22px', fontWeight: 900, color: '#0f172a', fontFamily: 'monospace', marginTop: '2px' }}>
              {isLoading ? '...' : data?.metricas.ultimaHora ?? 'Sin recepciones'}
            </div>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
              Corte de turno de Miami
            </span>
          </div>
        </div>

        {/* KPI 4: Primera Recepción */}
        <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '10px', background: '#f5f3ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
              Primera Recepción
            </span>
            <div style={{ fontSize: '22px', fontWeight: 900, color: '#0f172a', fontFamily: 'monospace', marginTop: '2px' }}>
              {isLoading ? '...' : data?.metricas.primeraHora ?? 'Sin recepciones'}
            </div>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
              Apertura de recepción
            </span>
          </div>
        </div>
      </div>

      {/* 5. Tabla Detallada de Paquetes Recibidos */}
      <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
        
        {/* Cabecera de la tabla */}
        <div style={{ padding: '14px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#1e293b' }}>
              Listado de Bultos Recibidos en Miami
            </span>
            <span style={{ background: '#e2e8f0', color: '#475569', fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '10px' }}>
              {filteredPackages.length} de {data?.metricas.totalPaquetes ?? 0}
            </span>
          </div>

          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
            Fecha consultada: <strong>{selectedDate}</strong>
          </span>
        </div>

        {/* Cuerpo de la tabla */}
        {isLoading ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
            <RefreshCw className="w-8 h-8 animate-spin text-emerald-600" style={{ margin: '0 auto 12px auto' }} />
            <p style={{ margin: 0, fontWeight: 800, fontSize: '14px', color: '#0f172a' }}>
              Consultando servidor de TIBCARGO en Miami...
            </p>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px' }}>
              Filtrando paquetes con consignatario AMEX.
            </p>
          </div>
        ) : filteredPackages.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#94a3b8' }}>
            <Package className="w-10 h-10 text-slate-300" style={{ margin: '0 auto 10px auto' }} />
            <p style={{ margin: '0 0 4px 0', fontWeight: 800, fontSize: '14px', color: '#0f172a' }}>
              No se encontraron paquetes de AMEX para el {selectedDate}
            </p>
            <p style={{ margin: 0, fontSize: '12.5px' }}>
              El almacén de Miami pudo estar cerrado o no se registró carga para AMEX en esta fecha.
            </p>
          </div>
        ) : (
          <div style={{ maxHeight: '540px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f8fafc' }}>
                <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 800, fontSize: '11.5px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '10px 14px', width: '40px' }}>#</th>
                  <th style={{ padding: '10px 14px' }}>Guía WR</th>
                  <th style={{ padding: '10px 14px' }}>Consignatario AMEX</th>
                  <th style={{ padding: '10px 14px' }}>Tracking USA</th>
                  <th style={{ padding: '10px 14px' }}>Peso</th>
                  <th style={{ padding: '10px 14px' }}>Empaque</th>
                  <th style={{ padding: '10px 14px' }}>Rack Miami</th>
                  <th style={{ padding: '10px 14px' }}>Hora Miami</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center' }}>Foto / Ticket</th>
                </tr>
              </thead>
              <tbody>
                {filteredPackages.map((p, idx) => (
                  <tr
                    key={p.id || idx}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      background: idx % 2 === 0 ? '#ffffff' : '#fcfdfe'
                    }}
                  >
                    <td style={{ padding: '10px 14px', color: '#94a3b8', fontWeight: 700 }}>
                      {idx + 1}
                    </td>

                    {/* WR */}
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 900, color: '#1e40af', fontSize: '12.5px' }}>
                        {p.wr}
                      </span>
                    </td>

                    {/* Cliente */}
                    <td style={{ padding: '10px 14px', color: '#0f172a', fontWeight: 700, maxWidth: '200px' }}>
                      {p.cliente}
                    </td>

                    {/* Tracking */}
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <span style={{ fontFamily: 'monospace', color: '#334155', fontSize: '11.5px' }}>
                          {p.tracking}
                        </span>
                        {p.tracking && p.tracking !== '—' && (
                          <button
                            type="button"
                            onClick={() => handleCopyTracking(p.tracking)}
                            title="Copiar Tracking"
                            style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer', color: '#64748b' }}
                          >
                            {copiedTracking === p.tracking ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3 hover:text-slate-900" />
                            )}
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Peso */}
                    <td style={{ padding: '10px 14px', color: '#0f172a', fontWeight: 800 }}>
                      {p.peso > 0 ? `${p.peso} kg` : '—'}
                    </td>

                    {/* Empaque */}
                    <td style={{ padding: '10px 14px' }}>
                      <span
                        style={{
                          background: '#f1f5f9',
                          color: '#475569',
                          border: '1px solid #cbd5e1',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '10.5px',
                          fontWeight: 700
                        }}
                      >
                        {p.tipoEmpaque || 'CAJA'}
                      </span>
                    </td>

                    {/* Rack */}
                    <td style={{ padding: '10px 14px' }}>
                      <span
                        style={{
                          background: '#ecfdf5',
                          color: '#065f46',
                          border: '1px solid #a7f3d0',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 800,
                          fontFamily: 'monospace'
                        }}
                      >
                        {p.rackMiami || 'S/U'}
                      </span>
                    </td>

                    {/* Hora */}
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 800, color: '#334155' }}>
                      {p.horaRegistro}
                    </td>

                    {/* Foto / Ticket */}
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        {p.fotoUrl ? (
                          <button
                            type="button"
                            onClick={() => setPreviewImage({ url: p.fotoUrl!, title: `Foto ${p.wr} - ${p.cliente}` })}
                            style={{
                              background: '#eff6ff',
                              border: '1px solid #bfdbfe',
                              color: '#1d4ed8',
                              padding: '3px 6px',
                              borderRadius: '4px',
                              fontSize: '10.5px',
                              fontWeight: 800,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px'
                            }}
                          >
                            <ImageIcon className="w-3 h-3" /> Foto
                          </button>
                        ) : (
                          <span style={{ color: '#cbd5e1', fontSize: '10.5px' }}>—</span>
                        )}

                        {p.ticketUrl && (
                          <a
                            href={p.ticketUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              background: '#fef3c7',
                              border: '1px solid #fde68a',
                              color: '#b45309',
                              padding: '3px 6px',
                              borderRadius: '4px',
                              fontSize: '10.5px',
                              fontWeight: 800,
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px'
                            }}
                          >
                            <FileText className="w-3 h-3" /> PDF
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 6. Modal de Vista Previa de Foto de Paquete */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '680px',
              width: '100%',
              overflow: 'hidden',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div style={{ padding: '14px 18px', background: '#0f172a', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13px', fontWeight: 800 }}>
                {previewImage.title}
              </span>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '18px' }}
              >
                <X className="w-5 h-5 hover:text-white" />
              </button>
            </div>
            <div style={{ padding: '16px', background: '#f8fafc', textAlign: 'center' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewImage.url}
                alt="Foto Paquete TIB"
                style={{
                  maxWidth: '100%',
                  maxHeight: '65vh',
                  borderRadius: '8px',
                  objectFit: 'contain',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                }}
              />
            </div>
            <div style={{ padding: '10px 18px', background: '#ffffff', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0' }}>
              <a
                href={previewImage.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  background: '#2563eb',
                  color: '#ffffff',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 700,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                Abrir imagen original <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
