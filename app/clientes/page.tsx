'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
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
  ChevronLeft, 
  ChevronRight,
  Menu,
  ExternalLink,
  Package,
  Plane,
  Building2,
  CheckCircle2,
  Clock,
  Eye,
  Filter
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

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    } catch {
      return '—';
    }
  };

  const renderEstadoBadge = (pkg: PaqueteTIB) => {
    if (pkg.estado_amex === 'en_almacen' || pkg.estado_amex === 'recibido') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
          <Building2 className="w-3 h-3 text-emerald-600" />
          EN ALMACÉN LINCE
        </span>
      );
    }
    if (pkg.estado_tib === 'Enviado') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold uppercase bg-blue-100 text-blue-800 border border-blue-300">
          <Plane className="w-3 h-3 text-blue-600" />
          EN VUELO A LIMA
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-300">
        <Clock className="w-3 h-3 text-amber-600" />
        RECIBIDO MIAMI
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#f3f4f6] text-gray-800 flex flex-col font-sans">
      
      {/* 1. Header superior estilo TIB con identidad AMEX */}
      <header className="bg-[#1f242d] text-white shadow-md sticky top-0 z-40 border-b border-gray-700">
        <div className="max-w-[1700px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          
          {/* Logo y título */}
          <div className="flex items-center gap-4">
            <button className="text-gray-400 hover:text-white p-1 rounded transition-colors">
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2.5">
              <span className="text-xl font-black tracking-tight text-white">
                Amex<span className="text-[#f59e0b]">+</span>
              </span>
              <span className="hidden sm:inline-block text-xs font-semibold uppercase tracking-wider text-gray-300 border-l border-gray-600 pl-2.5">
                Gestor de Almacén — Clientes
              </span>
            </div>
          </div>

          {/* Usuario / Dropdown a la derecha */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 text-xs font-semibold text-gray-200 hover:text-white py-1 px-2.5 rounded transition-colors"
            >
              <span>Hola! {user?.user_metadata?.nombre_completo || user?.email?.split('@')[0]?.toUpperCase() || 'CLIENTE'}</span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-xl border border-gray-200 py-1 text-gray-700 text-xs z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="px-3 py-2 border-b border-gray-100 text-gray-500 font-medium">
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

      {/* 2. Cuerpo Principal */}
      <main className="flex-1 max-w-[1700px] w-full mx-auto p-4 sm:p-6 space-y-4">
        
        {/* Título de la sección estilo TIB */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[#e65100] tracking-tight">
            Listado Warehouse
          </h1>
          <div className="text-xs text-gray-500 font-medium">
            Total en sistema: <strong className="text-gray-800">{paquetes.length}</strong>
          </div>
        </div>

        {/* 3. Panel de Filtros estilo TIB */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 space-y-4">
          
          {/* Fila 1 de inputs: Warehouse, Tracking, Consignatario */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">Q</span>
              <input
                type="text"
                value={filterWr}
                onChange={(e) => {
                  setFilterWr(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="# Warehouse"
                className="w-full bg-white border border-gray-300 rounded-md py-2 pl-8 pr-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#e65100] focus:ring-1 focus:ring-[#e65100] transition-colors"
              />
            </div>

            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">Q</span>
              <input
                type="text"
                value={filterTracking}
                onChange={(e) => {
                  setFilterTracking(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="# Tracking"
                className="w-full bg-white border border-gray-300 rounded-md py-2 pl-8 pr-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#e65100] focus:ring-1 focus:ring-[#e65100] transition-colors"
              />
            </div>

            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">Q</span>
              <input
                type="text"
                value={filterConsignatario}
                onChange={(e) => {
                  setFilterConsignatario(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Consignatario"
                className="w-full bg-white border border-gray-300 rounded-md py-2 pl-8 pr-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#e65100] focus:ring-1 focus:ring-[#e65100] transition-colors uppercase"
              />
            </div>
          </div>

          {/* Fila 2 de filtros: Tipo de Paquete y Estado */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl">
            <div>
              <select
                value={filterTipo}
                onChange={(e) => {
                  setFilterTipo(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-white border border-gray-300 rounded-md py-2 px-3 text-sm text-gray-700 focus:outline-none focus:border-[#e65100] transition-colors"
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
                className="w-full bg-white border border-gray-300 rounded-md py-2 px-3 text-sm text-gray-700 focus:outline-none focus:border-[#e65100] transition-colors"
              >
                <option value="">Estado (Todos)</option>
                <option value="MIAMI">RECIBIDO MIAMI</option>
                <option value="VUELO">EN VUELO A LIMA</option>
                <option value="LINCE">EN ALMACÉN LINCE</option>
              </select>
            </div>
          </div>

          {/* Botones de acción estilo TIB */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                className="bg-[#242b35] hover:bg-[#181d24] text-white px-5 py-2 rounded text-xs font-bold uppercase tracking-wider transition-colors shadow-sm"
              >
                Buscar
              </button>
              <button
                type="button"
                onClick={handleClearFilters}
                className="bg-[#242b35] hover:bg-[#181d24] text-white px-5 py-2 rounded text-xs font-bold uppercase tracking-wider transition-colors shadow-sm"
              >
                Limpiar Filtros
              </button>
            </div>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 px-4 py-2 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
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
                  <th className="py-3 px-3.5">WR</th>
                  <th className="py-3 px-3.5"># Tracking</th>
                  <th className="py-3 px-3.5">Cliente</th>
                  <th className="py-3 px-3.5">Tipo</th>
                  <th className="py-3 px-3.5">Peso(Kg)</th>
                  <th className="py-3 px-3.5">Estado</th>
                  <th className="py-3 px-3.5">Registrado</th>
                  <th className="py-3 px-3.5">Modificado</th>
                  <th className="py-3 px-3.5 text-center">Documentos</th>
                  <th className="py-3 px-3.5 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 font-normal text-gray-700">
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
                  paginatedPaquetes.map((pkg) => (
                    <tr key={pkg.id} className="hover:bg-amber-50/40 transition-colors">
                      {/* WR */}
                      <td className="py-3 px-3.5 font-bold font-mono text-gray-900 whitespace-nowrap">
                        {pkg.numero_recibo_bodega}
                      </td>

                      {/* Tracking */}
                      <td className="py-3 px-3.5 font-mono text-gray-600 whitespace-nowrap">
                        {pkg.tracking || '—'}
                      </td>

                      {/* Cliente / Consignatario */}
                      <td className="py-3 px-3.5 font-medium uppercase text-gray-800 whitespace-nowrap">
                        {pkg.nombre_consignatario || 'SIN ASIGNAR'}
                      </td>

                      {/* Tipo */}
                      <td className="py-3 px-3.5 font-semibold text-gray-600 uppercase whitespace-nowrap">
                        {pkg.tipo_empaque || 'CAJA'}
                      </td>

                      {/* Peso */}
                      <td className="py-3 px-3.5 font-medium text-gray-800 whitespace-nowrap">
                        {pkg.peso_kg != null ? Number(pkg.peso_kg).toFixed(2) : '—'}
                      </td>

                      {/* Estado */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        {renderEstadoBadge(pkg)}
                      </td>

                      {/* Registrado */}
                      <td className="py-3 px-3.5 text-gray-500 text-[11px] whitespace-nowrap">
                        {formatDate(pkg.creado_en)}
                      </td>

                      {/* Modificado */}
                      <td className="py-3 px-3.5 text-gray-500 text-[11px] whitespace-nowrap">
                        {formatDate(pkg.actualizado_en || pkg.creado_en)}
                      </td>

                      {/* Documentos (Ticket + Foto) estilo botones TIB */}
                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 justify-center">
                          {/* Ticket PDF */}
                          {pkg.tib_ticket_pdf_url ? (
                            <a
                              href={pkg.tib_ticket_pdf_url}
                              target="_blank"
                              rel="noreferrer"
                              title="Ver Ticket PDF"
                              className="p-1.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 transition-colors"
                            >
                              <FileText className="w-4 h-4 text-gray-600" />
                            </a>
                          ) : (
                            <button
                              disabled
                              title="Sin Ticket"
                              className="p-1.5 rounded bg-gray-50 text-gray-300 border border-gray-200 cursor-not-allowed"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                          )}

                          {/* Foto Cámara */}
                          {pkg.tib_imagen_url ? (
                            <button
                              onClick={() => setSelectedPhoto({ url: pkg.tib_imagen_url!, wr: pkg.numero_recibo_bodega })}
                              title="Ver Foto Miami"
                              className="p-1.5 rounded bg-amber-50 hover:bg-amber-100 text-[#e65100] border border-amber-300 transition-colors"
                            >
                              <Camera className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              disabled
                              title="Sin Foto"
                              className="p-1.5 rounded bg-gray-50 text-gray-300 border border-gray-200 cursor-not-allowed"
                            >
                              <Camera className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Acciones */}
                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        <button
                          onClick={() => {
                            if (pkg.tib_imagen_url) {
                              setSelectedPhoto({ url: pkg.tib_imagen_url, wr: pkg.numero_recibo_bodega });
                            }
                          }}
                          title="Detalles"
                          className="p-1.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 transition-colors"
                        >
                          <Eye className="w-4 h-4 text-gray-600" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* 5. Paginación estilo TIB */}
          <div className="p-3.5 bg-[#f8f9fa] border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-600">
            <div>
              Mostrando <strong className="text-gray-800">{(currentPage - 1) * itemsPerPage + 1}</strong> a <strong className="text-gray-800">{Math.min(currentPage * itemsPerPage, filteredPaquetes.length)}</strong> de <strong className="text-gray-800">{filteredPaquetes.length}</strong> registros
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1 rounded bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium"
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
                            ? 'bg-[#e65100] text-white shadow-sm'
                            : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
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
                  className="px-2.5 py-1 rounded bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium"
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
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full p-4 sm:p-5 border border-gray-300 relative">
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

      {/* Footer minimalista */}
      <footer className="border-t border-gray-200 bg-white py-3 px-6 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} AMEX COURIER PERÚ — Todos los derechos reservados.
      </footer>
    </div>
  );
}
