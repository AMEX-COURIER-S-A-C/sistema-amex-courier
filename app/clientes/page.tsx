'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { 
  Search, 
  RotateCw, 
  FileText, 
  Camera, 
  X, 
  LogOut, 
  ChevronDown, 
  Menu,
  ExternalLink,
  Package
} from 'lucide-react';

interface PaqueteTIB {
  id: string;
  numero_recibo_bodega: string;
  tracking: string;
  nombre_consignatario: string | null;
  tipo_empaque: string | null;
  peso_kg: number | null;
  estado_tib: string | null;
  estado_amex: string | null;
  tib_imagen_url: string | null;
  tib_ticket_pdf_url: string | null;
  creado_en: string;
  actualizado_en: string | null;
}

export default function ClienteDashboardTIB() {
  const router = useRouter();

  const [user, setUser] = useState<any | null>(null);
  const [paquetes, setPaquetes] = useState<PaqueteTIB[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Filtros individuales estilo TIB
  const [filterWr, setFilterWr] = useState('');
  const [filterTracking, setFilterTracking] = useState('');
  const [filterConsignatario, setFilterConsignatario] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [filterEstado, setFilterEstado] = useState('');

  // Modal para ver foto
  const [selectedPhoto, setSelectedPhoto] = useState<{ url: string; wr: string } | null>(null);

  // Paginación estilo TIB
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Cargar sesión del usuario
  useEffect(() => {
    async function loadSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/clientes/login');
        return;
      }
      setUser(session.user);
      fetchPaquetes(session.user.email);
    }
    loadSession();
  }, [router]);

  const fetchPaquetes = async (email?: string | null) => {
    if (!email) return;
    setIsLoading(true);
    try {
      let query = supabase
        .from('paquetes')
        .select(`
          id, 
          numero_recibo_bodega, 
          tracking, 
          nombre_consignatario,
          tipo_empaque,
          peso_kg, 
          estado_tib, 
          estado_amex, 
          tib_imagen_url, 
          tib_ticket_pdf_url,
          creado_en, 
          actualizado_en
        `)
        .order('creado_en', { ascending: false });

      // Si es cliente regular, filtrar solo los suyos; si es superadmin AMEX, permitir ver todo para supervisión
      if (email.toLowerCase() !== 'sistemaamexcourier@gmail.com') {
        query = query.eq('usuario_email', email);
      }

      const { data, error } = await query;
      if (error) throw error;
      setPaquetes(data || []);
    } catch (err) {
      console.error('Error fetching paquetes cliente:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    if (user?.email) {
      fetchPaquetes(user.email);
    }
  };

  const handleClearFilters = () => {
    setFilterWr('');
    setFilterTracking('');
    setFilterConsignatario('');
    setFilterTipo('');
    setFilterEstado('');
    setCurrentPage(1);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/clientes/login');
  };

  // Filtrado multicriterio exacto como TIB
  const filteredPaquetes = useMemo(() => {
    return paquetes.filter((pkg) => {
      if (filterWr && !pkg.numero_recibo_bodega?.toLowerCase().includes(filterWr.toLowerCase().trim())) {
        return false;
      }
      if (filterTracking && !pkg.tracking?.toLowerCase().includes(filterTracking.toLowerCase().trim())) {
        return false;
      }
      if (filterConsignatario && !pkg.nombre_consignatario?.toLowerCase().includes(filterConsignatario.toLowerCase().trim())) {
        return false;
      }
      if (filterTipo && pkg.tipo_empaque?.toUpperCase() !== filterTipo.toUpperCase()) {
        return false;
      }
      if (filterEstado) {
        if (filterEstado === 'LINCE' && pkg.estado_amex !== 'en_almacen') return false;
        if (filterEstado === 'VUELO' && (pkg.estado_tib !== 'Enviado' || pkg.estado_amex === 'en_almacen')) return false;
        if (filterEstado === 'MIAMI' && (pkg.estado_amex === 'en_almacen' || pkg.estado_tib === 'Enviado')) return false;
        if (filterEstado === 'ENTREGADO' && pkg.estado_amex !== 'entregado') return false;
      }
      return true;
    });
  }, [paquetes, filterWr, filterTracking, filterConsignatario, filterTipo, filterEstado]);

  // Paginación
  const totalPages = Math.ceil(filteredPaquetes.length / itemsPerPage) || 1;
  const paginatedPaquetes = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredPaquetes.slice(start, start + itemsPerPage);
  }, [filteredPaquetes, currentPage, itemsPerPage]);

  // Formato de fecha en dos líneas como TIB
  const formatDateTimeTIB = (isoString?: string | null) => {
    if (!isoString) return { date: '—', time: '' };
    try {
      const d = new Date(isoString);
      const pad = (n: number) => String(n).padStart(2, '0');
      const date = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
      const time = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
      return { date, time };
    } catch {
      return { date: '—', time: '' };
    }
  };

  // Texto exacto de TIB con ubicación
  const getEstadoTexto = (pkg: PaqueteTIB) => {
    if (pkg.estado_amex === 'entregado') {
      return { texto: 'ENTREGADO', color: 'text-gray-700 font-bold' };
    }
    if (pkg.estado_amex === 'en_almacen' || pkg.estado_amex === 'recibido') {
      return { texto: 'EN ALMACÉN LINCE', color: 'text-emerald-700 font-extrabold' };
    }
    if (pkg.estado_tib === 'Enviado') {
      return { texto: 'EN VUELO', color: 'text-blue-700 font-extrabold' };
    }
    return { texto: 'RECIBIDO MIAMI', color: 'text-amber-600 font-extrabold' };
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f1f3f6', color: '#2c323f', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* 1. Header superior estilo TIB */}
      <header style={{ backgroundColor: '#1e2229', color: '#ffffff', height: '56px', display: 'flex', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.12)', position: 'sticky', top: 0, zIndex: 40 }}>
        <div style={{ maxWidth: '1720px', width: '100%', margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          
          {/* Logo y título */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <Menu style={{ width: '20px', height: '20px', color: '#9ca3af', cursor: 'pointer' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px', fontWeight: 900, letterSpacing: '-0.5px', color: '#ffffff' }}>
                Amex<span style={{ color: '#f59e0b' }}>+</span>
              </span>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#e5e7eb', borderLeft: '1px solid #4b5563', paddingLeft: '10px' }}>
                Gestor de Almacén
              </span>
            </div>
          </div>

          {/* Usuario / Dropdown a la derecha */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, color: '#f3f4f6', cursor: 'pointer', padding: '6px 10px', borderRadius: '4px' }}
            >
              <span>Hola! {user?.user_metadata?.nombre_completo || user?.email?.split('@')[0]?.toUpperCase() || 'USUARIO'}</span>
              <ChevronDown style={{ width: '14px', height: '14px', color: '#9ca3af' }} />
            </button>

            {userMenuOpen && (
              <div style={{ position: 'absolute', right: 0, marginTop: '6px', width: '220px', backgroundColor: '#ffffff', borderRadius: '6px', boxShadow: '0 10px 25px rgba(0,0,0,0.15)', border: '1px solid #e5e7eb', padding: '6px 0', zIndex: 50 }}>
                <div style={{ padding: '8px 14px', borderBottom: '1px solid #f3f4f6', fontSize: '12px', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user?.email}
                </div>
                <button
                  onClick={handleLogout}
                  style={{ width: '100%', textAlign: 'left', padding: '10px 14px', background: 'none', border: 'none', color: '#dc2626', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <LogOut style={{ width: '14px', height: '14px' }} />
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 2. Contenedor de Contenido Principal */}
      <main style={{ maxWidth: '1720px', width: '100%', margin: '0 auto', padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', gap: '18px' }}>
        
        {/* Título de la sección estilo TIB */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#ff5722', margin: 0, letterSpacing: '-0.3px' }}>
            Listado Warehouse
          </h1>
          <span style={{ fontSize: '13px', color: '#6b7280' }}>
            Total en sistema: <strong style={{ color: '#111827', fontWeight: 800 }}>{paquetes.length}</strong>
          </span>
        </div>

        {/* 3. Tarjeta de Filtros Estilo TIB */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Fila 1: 3 inputs amplios e independientes */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            
            {/* Input # Warehouse */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search style={{ position: 'absolute', left: '12px', width: '16px', height: '16px', color: '#9ca3af' }} />
              <input
                type="text"
                value={filterWr}
                onChange={(e) => {
                  setFilterWr(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="# Warehouse"
                style={{ width: '100%', height: '42px', paddingLeft: '38px', paddingRight: '12px', backgroundColor: '#ffffff', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13.5px', color: '#1f2937', outline: 'none' }}
              />
            </div>

            {/* Input # Tracking */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search style={{ position: 'absolute', left: '12px', width: '16px', height: '16px', color: '#9ca3af' }} />
              <input
                type="text"
                value={filterTracking}
                onChange={(e) => {
                  setFilterTracking(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="# Tracking"
                style={{ width: '100%', height: '42px', paddingLeft: '38px', paddingRight: '12px', backgroundColor: '#ffffff', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13.5px', color: '#1f2937', outline: 'none' }}
              />
            </div>

            {/* Input Consignatario */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search style={{ position: 'absolute', left: '12px', width: '16px', height: '16px', color: '#9ca3af' }} />
              <input
                type="text"
                value={filterConsignatario}
                onChange={(e) => {
                  setFilterConsignatario(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Consignatario"
                style={{ width: '100%', height: '42px', paddingLeft: '38px', paddingRight: '12px', backgroundColor: '#ffffff', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13.5px', color: '#1f2937', outline: 'none', textTransform: 'uppercase' }}
              />
            </div>
          </div>

          {/* Fila 2: Selects de Tipo de Paquete y Estado */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', maxWidth: '640px', gap: '16px' }}>
            <select
              value={filterTipo}
              onChange={(e) => {
                setFilterTipo(e.target.value);
                setCurrentPage(1);
              }}
              style={{ width: '100%', height: '42px', padding: '0 12px', backgroundColor: '#ffffff', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13.5px', color: '#374151', outline: 'none' }}
            >
              <option value="">Tipo de Paquete (Todos)</option>
              <option value="CAJA">CAJA</option>
              <option value="SOBRE">SOBRE</option>
              <option value="SACA">SACA</option>
              <option value="BULTO">BULTO</option>
            </select>

            <select
              value={filterEstado}
              onChange={(e) => {
                setFilterEstado(e.target.value);
                setCurrentPage(1);
              }}
              style={{ width: '100%', height: '42px', padding: '0 12px', backgroundColor: '#ffffff', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13.5px', color: '#374151', outline: 'none' }}
            >
              <option value="">Estado (Todos)</option>
              <option value="MIAMI">RECIBIDO MIAMI</option>
              <option value="VUELO">EN VUELO</option>
              <option value="LINCE">EN ALMACÉN LINCE</option>
              <option value="ENTREGADO">ENTREGADO</option>
            </select>
          </div>

          {/* Fila 3: Botones de Acción Estilo TIB */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', paddingTop: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                style={{ backgroundColor: '#2b303c', color: '#ffffff', padding: '10px 24px', borderRadius: '6px', fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px', border: 'none', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}
              >
                Buscar
              </button>
              <button
                type="button"
                onClick={handleClearFilters}
                style={{ backgroundColor: '#2b303c', color: '#ffffff', padding: '10px 24px', borderRadius: '6px', fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px', border: 'none', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}
              >
                Limpiar Filtros
              </button>
            </div>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              style={{ backgroundColor: '#ffffff', border: '1px solid #d1d5db', color: '#374151', padding: '9px 18px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
            >
              <RotateCw style={{ width: '15px', height: '15px', color: '#ff5722', animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
              <span>{isRefreshing ? 'Actualizando...' : 'Actualizar Lista'}</span>
            </button>
          </div>
        </div>

        {/* 4. Tabla de Datos Réplica Exacta de TIB */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '14px 16px', fontWeight: 800, color: '#4b5563', textTransform: 'uppercase', fontSize: '11.5px', letterSpacing: '0.5px' }}>WR</th>
                  <th style={{ padding: '14px 16px', fontWeight: 800, color: '#4b5563', textTransform: 'uppercase', fontSize: '11.5px', letterSpacing: '0.5px' }}># Tracking</th>
                  <th style={{ padding: '14px 16px', fontWeight: 800, color: '#4b5563', textTransform: 'uppercase', fontSize: '11.5px', letterSpacing: '0.5px' }}>Cliente</th>
                  <th style={{ padding: '14px 16px', fontWeight: 800, color: '#4b5563', textTransform: 'uppercase', fontSize: '11.5px', letterSpacing: '0.5px' }}>Tipo</th>
                  <th style={{ padding: '14px 16px', fontWeight: 800, color: '#4b5563', textTransform: 'uppercase', fontSize: '11.5px', letterSpacing: '0.5px' }}>Peso(Kg)</th>
                  <th style={{ padding: '14px 16px', fontWeight: 800, color: '#4b5563', textTransform: 'uppercase', fontSize: '11.5px', letterSpacing: '0.5px' }}>Estado</th>
                  <th style={{ padding: '14px 16px', fontWeight: 800, color: '#4b5563', textTransform: 'uppercase', fontSize: '11.5px', letterSpacing: '0.5px' }}>Registrado</th>
                  <th style={{ padding: '14px 16px', fontWeight: 800, color: '#4b5563', textTransform: 'uppercase', fontSize: '11.5px', letterSpacing: '0.5px' }}>Modificado</th>
                  <th style={{ padding: '14px 16px', fontWeight: 800, color: '#4b5563', textTransform: 'uppercase', fontSize: '11.5px', letterSpacing: '0.5px', textAlign: 'center' }}>Documentos</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={9} style={{ padding: '60px 16px', textAlign: 'center', color: '#6b7280' }}>
                      <div style={{ width: '28px', height: '28px', border: '3px solid #ff5722', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
                      <span style={{ fontWeight: 600 }}>Cargando almacén...</span>
                    </td>
                  </tr>
                ) : paginatedPaquetes.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: '60px 16px', textAlign: 'center', color: '#6b7280' }}>
                      <Package style={{ width: '42px', height: '42px', color: '#d1d5db', margin: '0 auto 12px' }} />
                      <p style={{ fontSize: '14px', fontWeight: 700, color: '#374151', margin: '0 0 4px' }}>No se encontraron registros de Warehouse</p>
                      <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>Verifica los filtros o espera a que se registren nuevas cajas en Miami.</p>
                    </td>
                  </tr>
                ) : (
                  paginatedPaquetes.map((pkg, idx) => {
                    const reg = formatDateTimeTIB(pkg.creado_en);
                    const mod = formatDateTimeTIB(pkg.actualizado_en || pkg.creado_en);
                    const estado = getEstadoTexto(pkg);

                    return (
                      <tr 
                        key={pkg.id} 
                        style={{ borderBottom: '1px solid #f1f3f6', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fafbfc' }}
                      >
                        {/* WR */}
                        <td style={{ padding: '14px 16px', fontWeight: 800, fontFamily: 'monospace', fontSize: '13.5px', color: '#111827', whiteSpace: 'nowrap' }}>
                          {pkg.numero_recibo_bodega}
                        </td>

                        {/* Tracking */}
                        <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: '12.5px', color: '#4b5563', whiteSpace: 'nowrap' }}>
                          {pkg.tracking || '—'}
                        </td>

                        {/* Cliente / Consignatario */}
                        <td style={{ padding: '14px 16px', fontWeight: 700, textTransform: 'uppercase', color: '#1f2937', whiteSpace: 'nowrap' }}>
                          {pkg.nombre_consignatario || 'SIN ASIGNAR'}
                        </td>

                        {/* Tipo */}
                        <td style={{ padding: '14px 16px', fontWeight: 600, textTransform: 'uppercase', color: '#4b5563', whiteSpace: 'nowrap' }}>
                          {pkg.tipo_empaque || 'CAJA'}
                        </td>

                        {/* Peso */}
                        <td style={{ padding: '14px 16px', fontWeight: 800, color: '#111827', whiteSpace: 'nowrap' }}>
                          {pkg.peso_kg != null ? Number(pkg.peso_kg).toFixed(2) : '—'}
                        </td>

                        {/* Estado */}
                        <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                          <span className={estado.color} style={{ fontSize: '12px', letterSpacing: '0.3px' }}>
                            {estado.texto}
                          </span>
                        </td>

                        {/* Registrado (dos líneas como TIB) */}
                        <td style={{ padding: '14px 16px', color: '#374151', fontSize: '12px', whiteSpace: 'nowrap', lineHeight: 1.35 }}>
                          <div style={{ fontWeight: 600 }}>{reg.date}</div>
                          <div style={{ color: '#9ca3af', fontFamily: 'monospace', fontSize: '11px' }}>{reg.time}</div>
                        </td>

                        {/* Modificado (dos líneas como TIB) */}
                        <td style={{ padding: '14px 16px', color: '#374151', fontSize: '12px', whiteSpace: 'nowrap', lineHeight: 1.35 }}>
                          <div style={{ fontWeight: 600 }}>{mod.date}</div>
                          <div style={{ color: '#9ca3af', fontFamily: 'monospace', fontSize: '11px' }}>{mod.time}</div>
                        </td>

                        {/* Documentos (Ticket + Foto en botones cuadrados grises idénticos a TIB) */}
                        <td style={{ padding: '14px 16px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                            
                            {/* Ticket PDF */}
                            {pkg.tib_ticket_pdf_url ? (
                              <a
                                href={pkg.tib_ticket_pdf_url}
                                target="_blank"
                                rel="noreferrer"
                                title="Ver Ticket PDF"
                                style={{ width: '34px', height: '34px', borderRadius: '4px', border: '1px solid #ced4da', backgroundColor: '#e9ecef', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#495057', textDecoration: 'none', cursor: 'pointer' }}
                              >
                                <FileText style={{ width: '16px', height: '16px' }} />
                              </a>
                            ) : (
                              <button
                                disabled
                                title="Sin Ticket PDF"
                                style={{ width: '34px', height: '34px', borderRadius: '4px', border: '1px solid #e9ecef', backgroundColor: '#f8f9fa', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#adb5bd', cursor: 'not-allowed' }}
                              >
                                <FileText style={{ width: '16px', height: '16px' }} />
                              </button>
                            )}

                            {/* Foto Cámara */}
                            {pkg.tib_imagen_url ? (
                              <button
                                onClick={() => setSelectedPhoto({ url: pkg.tib_imagen_url!, wr: pkg.numero_recibo_bodega })}
                                title="Ver Foto Miami"
                                style={{ width: '34px', height: '34px', borderRadius: '4px', border: '1px solid #ffccbc', backgroundColor: '#fff3e0', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#e65100', cursor: 'pointer' }}
                              >
                                <Camera style={{ width: '16px', height: '16px' }} />
                              </button>
                            ) : (
                              <button
                                disabled
                                title="Sin Foto"
                                style={{ width: '34px', height: '34px', borderRadius: '4px', border: '1px solid #e9ecef', backgroundColor: '#f8f9fa', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#adb5bd', cursor: 'not-allowed' }}
                              >
                                <Camera style={{ width: '16px', height: '16px' }} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* 5. Paginación idéntica a TIB */}
          <div style={{ padding: '16px 20px', backgroundColor: '#f8f9fa', borderTop: '1px solid #e2e8f0', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', fontSize: '13px', color: '#4b5563' }}>
            <div>
              Mostrando <strong style={{ color: '#111827' }}>{(currentPage - 1) * itemsPerPage + 1}</strong> a <strong style={{ color: '#111827' }}>{Math.min(currentPage * itemsPerPage, filteredPaquetes.length)}</strong> de <strong style={{ color: '#111827' }}>{filteredPaquetes.length}</strong> registros
            </div>

            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  style={{ padding: '6px 12px', borderRadius: '4px', backgroundColor: '#ffffff', border: '1px solid #d1d5db', color: '#374151', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.4 : 1, fontSize: '12px', fontWeight: 600 }}
                >
                  Anterior
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '0 4px' }}>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum = i + 1;
                    if (totalPages > 5 && currentPage > 3) {
                      pageNum = currentPage - 3 + i + 1;
                      if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                    }
                    const isSelected = currentPage === pageNum;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: 800,
                          backgroundColor: isSelected ? '#ff5722' : '#ffffff',
                          color: isSelected ? '#ffffff' : '#374151',
                          border: isSelected ? 'none' : '1px solid #d1d5db',
                          cursor: 'pointer'
                        }}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  style={{ padding: '6px 12px', borderRadius: '4px', backgroundColor: '#ffffff', border: '1px solid #d1d5db', color: '#374151', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.4 : 1, fontSize: '12px', fontWeight: 600 }}
                >
                  Siguiente
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* 6. Modal de Foto Flotante */}
      {selectedPhoto && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', boxShadow: '0 20px 40px rgba(0,0,0,0.25)', maxWidth: '680px', width: '100%', padding: '20px', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid #e5e7eb', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Camera style={{ width: '20px', height: '20px', color: '#ff5722' }} />
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#111827', margin: 0 }}>
                  Foto de Recepción Miami — WR {selectedPhoto.wr}
                </h3>
              </div>
              <button
                onClick={() => setSelectedPhoto(null)}
                style={{ padding: '4px', borderRadius: '4px', border: 'none', background: 'none', color: '#9ca3af', cursor: 'pointer' }}
              >
                <X style={{ width: '20px', height: '20px' }} />
              </button>
            </div>

            <div style={{ backgroundColor: '#f3f4f6', borderRadius: '6px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', maxHeight: '65vh', border: '1px solid #e5e7eb' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedPhoto.url}
                alt={`Paquete ${selectedPhoto.wr}`}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>

            <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', color: '#6b7280' }}>Fotografía tomada al ingresar a la bodega de Miami</span>
              <a
                href={selectedPhoto.url}
                target="_blank"
                rel="noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', backgroundColor: '#ff5722', color: '#ffffff', fontWeight: 700, borderRadius: '4px', fontSize: '12px', textDecoration: 'none', cursor: 'pointer' }}
              >
                <span>Abrir tamaño original</span>
                <ExternalLink style={{ width: '14px', height: '14px' }} />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Footer minimalista */}
      <footer style={{ borderTop: '1px solid #e5e7eb', backgroundColor: '#ffffff', padding: '14px 24px', textAlign: 'center', fontSize: '12px', color: '#6b7280' }}>
        © {new Date().getFullYear()} AMEX COURIER PERÚ — Todos los derechos reservados.
      </footer>
    </div>
  );
}
