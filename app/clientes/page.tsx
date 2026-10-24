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
  Package,
  Eye,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight
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

  // Modal para ver foto y detalles
  const [selectedPhoto, setSelectedPhoto] = useState<{ url: string; wr: string } | null>(null);
  const [selectedDetails, setSelectedDetails] = useState<PaqueteTIB | null>(null);

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

      // Si es cliente regular, filtrar solo los suyos; si es superadmin AMEX, permitir ver todo para supervisión y pruebas
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

  const renderEstadoBadge = (pkg: PaqueteTIB) => {
    if (pkg.estado_amex === 'en_almacen' || pkg.estado_amex === 'recibido') {
      return (
        <span className="inline-block px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wide bg-emerald-50 text-emerald-700 border border-emerald-200">
          EN ALMACÉN LINCE
        </span>
      );
    }
    if (pkg.estado_tib === 'Enviado') {
      return (
        <span className="inline-block px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wide bg-blue-50 text-blue-700 border border-blue-200">
          EN VUELO A LIMA
        </span>
      );
    }
    return (
      <span className="inline-block px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wide bg-amber-50 text-amber-700 border border-amber-200">
        RECIBIDO MIAMI
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#f1f3f6] text-[#2c323f] flex flex-col font-sans antialiased">
      
      {/* 1. Header superior estilo TIB */}
      <header className="bg-[#1f242d] text-white shadow sticky top-0 z-40">
        <div className="max-w-[1760px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          
          {/* Logo y título */}
          <div className="flex items-center gap-3">
            <button className="text-gray-400 hover:text-white p-1 rounded transition-colors">
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black tracking-tight text-white">
                Amex<span className="text-[#f59e0b]">+</span>
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-300 border-l border-gray-600 pl-2.5">
                Gestor de Almacén
              </span>
            </div>
          </div>

          {/* Usuario / Dropdown a la derecha */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 text-xs font-medium text-gray-200 hover:text-white py-1.5 px-3 rounded hover:bg-gray-800 transition-colors"
            >
              <span>Hola! {user?.user_metadata?.nombre_completo || user?.email?.split('@')[0]?.toUpperCase() || 'USUARIO'}</span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 mt-1 w-52 bg-white rounded shadow-lg border border-gray-200 py-1 text-gray-700 text-xs z-50">
                <div className="px-3 py-2 border-b border-gray-100 text-gray-500 font-medium truncate">
                  {user?.email}
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 text-red-600 flex items-center gap-2 font-semibold"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 2. Contenedor de Contenido Principal */}
      <main className="flex-1 max-w-[1760px] w-full mx-auto px-4 sm:px-6 py-6 space-y-4">
        
        {/* Título de la sección en Naranja TIB */}
        <div className="flex items-center justify-between">
          <h1 className="text-[22px] font-bold text-[#e65100] tracking-tight">
            Listado Warehouse
          </h1>
          <div className="text-xs text-gray-500">
            Total en sistema: <strong className="text-gray-800 font-bold">{paquetes.length}</strong>
          </div>
        </div>

        {/* 3. Tarjeta de Filtros Exacta a TIB */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200/90 p-5 space-y-4">
          
          {/* Fila 1: Tres inputs de búsqueda */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Input # Warehouse */}
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={filterWr}
                onChange={(e) => {
                  setFilterWr(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="# Warehouse"
                className="w-full h-10 bg-white border border-gray-300 rounded pl-9 pr-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#e65100] focus:ring-1 focus:ring-[#e65100] transition-colors"
              />
            </div>

            {/* Input # Tracking */}
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={filterTracking}
                onChange={(e) => {
                  setFilterTracking(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="# Tracking"
                className="w-full h-10 bg-white border border-gray-300 rounded pl-9 pr-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#e65100] focus:ring-1 focus:ring-[#e65100] transition-colors"
              />
            </div>

            {/* Input Consignatario */}
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={filterConsignatario}
                onChange={(e) => {
                  setFilterConsignatario(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Consignatario"
                className="w-full h-10 bg-white border border-gray-300 rounded pl-9 pr-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#e65100] focus:ring-1 focus:ring-[#e65100] transition-colors uppercase"
              />
            </div>
          </div>

          {/* Fila 2: Selects de Tipo de Paquete y Estado */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl">
            <div>
              <select
                value={filterTipo}
                onChange={(e) => {
                  setFilterTipo(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full h-10 bg-white border border-gray-300 rounded px-3 text-sm text-gray-700 focus:outline-none focus:border-[#e65100] transition-colors"
              >
                <option value="">Tipo de Paquete (Todos)</option>
                <option value="CAJA">CAJA</option>
                <option value="SOBRE">SOBRE</option>
                <option value="SACA">SACA</option>
                <option value="BULTO">BULTO</option>
              </select>
            </div>

            <div>
              <select
                value={filterEstado}
                onChange={(e) => {
                  setFilterEstado(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full h-10 bg-white border border-gray-300 rounded px-3 text-sm text-gray-700 focus:outline-none focus:border-[#e65100] transition-colors"
              >
                <option value="">Estado (Todos)</option>
                <option value="MIAMI">RECIBIDO MIAMI</option>
                <option value="VUELO">EN VUELO A LIMA</option>
                <option value="LINCE">EN ALMACÉN LINCE</option>
              </select>
            </div>
          </div>

          {/* Fila 3: Botones de Acción idénticos a TIB */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                className="bg-[#242b35] hover:bg-[#181d24] text-white px-6 py-2.5 rounded text-xs font-bold uppercase tracking-wider transition-colors shadow-sm"
              >
                Buscar
              </button>
              <button
                type="button"
                onClick={handleClearFilters}
                className="bg-[#242b35] hover:bg-[#181d24] text-white px-6 py-2.5 rounded text-xs font-bold uppercase tracking-wider transition-colors shadow-sm"
              >
                Limpiar Filtros
              </button>
            </div>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 px-4 py-2.5 rounded text-xs font-semibold flex items-center gap-2 transition-colors shadow-sm disabled:opacity-50"
            >
              <RotateCw className={`w-3.5 h-3.5 text-[#e65100] ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Actualizando...' : 'Actualizar Lista'}</span>
            </button>
          </div>
        </div>

        {/* 4. Tabla de Datos Réplica Exacta de TIB */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#f8f9fa] border-b border-gray-200 text-gray-600 font-bold uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 font-bold text-gray-700">WR</th>
                  <th className="py-3.5 px-4 font-bold text-gray-700"># Tracking</th>
                  <th className="py-3.5 px-4 font-bold text-gray-700">Cliente</th>
                  <th className="py-3.5 px-4 font-bold text-gray-700">Tipo</th>
                  <th className="py-3.5 px-4 font-bold text-gray-700">Peso(Kg)</th>
                  <th className="py-3.5 px-4 font-bold text-gray-700">Estado</th>
                  <th className="py-3.5 px-4 font-bold text-gray-700">Registrado</th>
                  <th className="py-3.5 px-4 font-bold text-gray-700">Modificado</th>
                  <th className="py-3.5 px-4 font-bold text-gray-700 text-center">Documentos</th>
                  <th className="py-3.5 px-4 font-bold text-gray-700 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {isLoading ? (
                  <tr>
                    <td colSpan={10} className="py-16 text-center text-gray-500">
                      <div className="w-6 h-6 border-2 border-[#e65100] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      <span className="font-medium text-xs">Cargando almacén...</span>
                    </td>
                  </tr>
                ) : paginatedPaquetes.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-16 text-center text-gray-500">
                      <Package className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-gray-600">No se encontraron registros de Warehouse</p>
                      <p className="text-xs text-gray-400 mt-1">Verifica los filtros o espera a que se registren nuevas cajas en Miami.</p>
                    </td>
                  </tr>
                ) : (
                  paginatedPaquetes.map((pkg) => {
                    const reg = formatDateTimeTIB(pkg.creado_en);
                    const mod = formatDateTimeTIB(pkg.actualizado_en || pkg.creado_en);

                    return (
                      <tr key={pkg.id} className="hover:bg-amber-50/30 transition-colors">
                        
                        {/* WR */}
                        <td className="py-3.5 px-4 font-extrabold font-mono text-gray-900 whitespace-nowrap text-[13px]">
                          {pkg.numero_recibo_bodega}
                        </td>

                        {/* Tracking */}
                        <td className="py-3.5 px-4 font-mono text-gray-600 whitespace-nowrap">
                          {pkg.tracking || '—'}
                        </td>

                        {/* Cliente / Consignatario */}
                        <td className="py-3.5 px-4 font-semibold uppercase text-gray-800 whitespace-nowrap">
                          {pkg.nombre_consignatario || 'SIN ASIGNAR'}
                        </td>

                        {/* Tipo */}
                        <td className="py-3.5 px-4 font-medium text-gray-600 uppercase whitespace-nowrap">
                          {pkg.tipo_empaque || 'CAJA'}
                        </td>

                        {/* Peso */}
                        <td className="py-3.5 px-4 font-bold text-gray-800 whitespace-nowrap">
                          {pkg.peso_kg != null ? Number(pkg.peso_kg).toFixed(2) : '—'}
                        </td>

                        {/* Estado */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {renderEstadoBadge(pkg)}
                        </td>

                        {/* Registrado (dos líneas como TIB) */}
                        <td className="py-3.5 px-4 text-gray-600 text-xs whitespace-nowrap leading-tight">
                          <div>{reg.date}</div>
                          <div className="text-gray-400 text-[11px] font-mono">{reg.time}</div>
                        </td>

                        {/* Modificado (dos líneas como TIB) */}
                        <td className="py-3.5 px-4 text-gray-600 text-xs whitespace-nowrap leading-tight">
                          <div>{mod.date}</div>
                          <div className="text-gray-400 text-[11px] font-mono">{mod.time}</div>
                        </td>

                        {/* Documentos (Ticket + Foto en botones cuadrados grises como TIB) */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5 justify-center">
                            
                            {/* Ticket PDF */}
                            {pkg.tib_ticket_pdf_url ? (
                              <a
                                href={pkg.tib_ticket_pdf_url}
                                target="_blank"
                                rel="noreferrer"
                                title="Ver Ticket PDF"
                                className="w-8 h-8 rounded border border-gray-300 bg-[#f8f9fa] hover:bg-gray-200 inline-flex items-center justify-center text-gray-700 transition shadow-xs"
                              >
                                <FileText className="w-4 h-4 text-gray-600" />
                              </a>
                            ) : (
                              <button
                                disabled
                                title="Sin Ticket PDF"
                                className="w-8 h-8 rounded border border-gray-200 bg-gray-50 inline-flex items-center justify-center text-gray-300 cursor-not-allowed"
                              >
                                <FileText className="w-4 h-4" />
                              </button>
                            )}

                            {/* Foto Cámara */}
                            {pkg.tib_imagen_url ? (
                              <button
                                onClick={() => setSelectedPhoto({ url: pkg.tib_imagen_url!, wr: pkg.numero_recibo_bodega })}
                                title="Ver Foto Miami"
                                className="w-8 h-8 rounded border border-amber-300 bg-amber-50 hover:bg-amber-100 inline-flex items-center justify-center text-[#e65100] transition shadow-xs"
                              >
                                <Camera className="w-4 h-4" />
                              </button>
                            ) : (
                              <button
                                disabled
                                title="Sin Foto"
                                className="w-8 h-8 rounded border border-gray-200 bg-gray-50 inline-flex items-center justify-center text-gray-300 cursor-not-allowed"
                              >
                                <Camera className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Acciones */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <button
                            onClick={() => setSelectedDetails(pkg)}
                            title="Ver Detalle del Warehouse"
                            className="w-8 h-8 rounded border border-gray-300 bg-[#f8f9fa] hover:bg-gray-200 inline-flex items-center justify-center text-gray-700 transition shadow-xs"
                          >
                            <Eye className="w-4 h-4 text-gray-600" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* 5. Paginación estilo TIB */}
          <div className="p-4 bg-[#f8f9fa] border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-600">
            <div>
              Mostrando <strong className="text-gray-800">{(currentPage - 1) * itemsPerPage + 1}</strong> a <strong className="text-gray-800">{Math.min(currentPage * itemsPerPage, filteredPaquetes.length)}</strong> de <strong className="text-gray-800">{filteredPaquetes.length}</strong> registros
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-xs shadow-xs"
                >
                  Anterior
                </button>

                <div className="flex items-center gap-1 px-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum = i + 1;
                    if (totalPages > 5 && currentPage > 3) {
                      pageNum = currentPage - 3 + i + 1;
                      if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-7 h-7 rounded text-xs font-bold transition-colors ${
                          currentPage === pageNum
                            ? 'bg-[#e65100] text-white shadow-xs'
                            : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 shadow-xs'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-xs shadow-xs"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full p-5 border border-gray-300 relative">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 mb-3">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-[#e65100]" />
                <h3 className="font-bold text-gray-900 text-base">
                  Foto de Recepción Miami — WR {selectedPhoto.wr}
                </h3>
              </div>
              <button
                onClick={() => setSelectedPhoto(null)}
                className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-gray-100 rounded-md overflow-hidden flex items-center justify-center max-h-[65vh] border border-gray-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedPhoto.url}
                alt={`Paquete ${selectedPhoto.wr}`}
                className="w-full h-full object-contain"
              />
            </div>

            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-gray-500">Fotografía original tomada al recepcionar en bodega</span>
              <a
                href={selectedPhoto.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#e65100] hover:bg-[#cf3e00] text-white font-bold rounded text-xs transition-colors shadow-sm"
              >
                <span>Abrir tamaño original</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* 7. Modal de Detalle Completo del Paquete */}
      {selectedDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full p-5 border border-gray-300 relative">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 mb-4">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-[#e65100]" />
                <h3 className="font-bold text-gray-900 text-base">
                  Detalle del Warehouse {selectedDetails.numero_recibo_bodega}
                </h3>
              </div>
              <button
                onClick={() => setSelectedDetails(null)}
                className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-gray-50 p-3 rounded border border-gray-200">
                <div>
                  <span className="text-gray-400 block font-semibold uppercase text-[10px]">Warehouse</span>
                  <span className="font-mono font-bold text-gray-900 text-sm">{selectedDetails.numero_recibo_bodega}</span>
                </div>
                <div>
                  <span className="text-gray-400 block font-semibold uppercase text-[10px]">Tracking USA</span>
                  <span className="font-mono text-gray-700">{selectedDetails.tracking || '—'}</span>
                </div>
              </div>

              <div className="p-3 bg-gray-50 rounded border border-gray-200 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-gray-500">Consignatario:</span>
                  <span className="font-bold text-gray-800 uppercase">{selectedDetails.nombre_consignatario || 'SIN ASIGNAR'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Tipo de Empaque:</span>
                  <span className="font-medium text-gray-800">{selectedDetails.tipo_empaque || 'CAJA'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Peso Registrado:</span>
                  <span className="font-bold text-gray-900">{selectedDetails.peso_kg != null ? `${Number(selectedDetails.peso_kg).toFixed(2)} kg` : '—'}</span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-gray-200">
                  <span className="text-gray-500">Estado Logístico:</span>
                  <span>{renderEstadoBadge(selectedDetails)}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setSelectedDetails(null)}
                className="px-4 py-2 bg-[#242b35] hover:bg-[#181d24] text-white font-bold rounded text-xs transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer minimalista */}
      <footer className="border-t border-gray-200 bg-white py-3 px-6 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} AMEX COURIER PERÚ — Todos los derechos reservados.
      </footer>
    </div>
  );
}
