'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { 
  Package, 
  Search, 
  RotateCw, 
  Plane, 
  Building2, 
  CheckCircle2, 
  Clock, 
  Image as ImageIcon, 
  X, 
  LogOut, 
  ShieldCheck, 
  ChevronLeft, 
  ChevronRight,
  ExternalLink,
  Layers
} from 'lucide-react';

interface PaqueteCliente {
  id: string;
  numero_recibo_bodega: string;
  tracking: string;
  peso_kg: number | null;
  estado_tib: string | null;
  estado_amex: string | null;
  tib_imagen_url: string | null;
  nombre_consignatario: string | null;
  creado_en: string;
}

export default function ClienteDashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState<any | null>(null);
  const [paquetes, setPaquetes] = useState<PaqueteCliente[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');

  // Modal para ver foto
  const [selectedPhoto, setSelectedPhoto] = useState<{ url: string; wr: string } | null>(null);

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Cargar usuario autenticado
  useEffect(() => {
    async function loadSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // Redirigir a login si no hay sesión
        router.push('/clientes/login');
        return;
      }
      setUser(session.user);
      fetchPaquetes(session.user.email);
    }
    loadSession();
  }, [router]);

  // Cargar paquetes asignados al correo del cliente
  const fetchPaquetes = async (email?: string | null) => {
    if (!email) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('paquetes')
        .select('id, numero_recibo_bodega, tracking, peso_kg, estado_tib, estado_amex, tib_imagen_url, nombre_consignatario, creado_en')
        .eq('usuario_email', email)
        .order('creado_en', { ascending: false });

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/clientes/login');
  };

  // Filtrado
  const filteredPaquetes = useMemo(() => {
    return paquetes.filter((pkg) => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery = !q ||
        pkg.numero_recibo_bodega?.toLowerCase().includes(q) ||
        pkg.tracking?.toLowerCase().includes(q) ||
        pkg.nombre_consignatario?.toLowerCase().includes(q);

      if (!matchQuery) return false;

      if (statusFilter === 'miami') {
        return pkg.estado_amex !== 'en_almacen' && pkg.estado_tib !== 'Enviado';
      }
      if (statusFilter === 'vuelo') {
        return pkg.estado_tib === 'Enviado' && pkg.estado_amex !== 'en_almacen';
      }
      if (statusFilter === 'lince') {
        return pkg.estado_amex === 'en_almacen';
      }

      return true;
    });
  }, [paquetes, searchQuery, statusFilter]);

  // Paginación calculada
  const totalPages = Math.ceil(filteredPaquetes.length / itemsPerPage) || 1;
  const paginatedPaquetes = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredPaquetes.slice(start, start + itemsPerPage);
  }, [filteredPaquetes, currentPage, itemsPerPage]);

  // Función para determinar el estado visual amigable
  const getEstadoBadge = (pkg: PaqueteCliente) => {
    if (pkg.estado_amex === 'en_almacen' || pkg.estado_amex === 'recibido') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
          <Building2 className="w-3.5 h-3.5" />
          En Almacén Lince
        </span>
      );
    }
    if (pkg.estado_tib === 'Enviado') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-400 text-xs font-semibold">
          <Plane className="w-3.5 h-3.5" />
          En Vuelo Miami ➔ Lima
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-semibold">
        <Clock className="w-3.5 h-3.5" />
        En Almacén Miami
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col selection:bg-amber-500 selection:text-white">
      {/* Background Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-amber-500/10 rounded-full blur-[140px]" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-blue-600/10 rounded-full blur-[160px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center font-black text-slate-950 text-xl shadow-lg shadow-amber-500/20">
              A
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-wider text-white">AMEX <span className="text-amber-400">COURIER</span></span>
              <span className="block text-[11px] font-medium text-slate-400 tracking-wider">PORTAL DE CLIENTES</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-semibold text-white">{user?.user_metadata?.nombre_completo || 'Cliente'}</span>
              <span className="text-[11px] text-slate-400">{user?.email}</span>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors"
              title="Cerrar Sesión"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        
        {/* Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Total Paquetes</span>
              <Package className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-2xl font-black text-white">{paquetes.length}</p>
          </div>
          <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>En Miami</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-2xl font-black text-amber-400">
              {paquetes.filter(p => p.estado_amex !== 'en_almacen' && p.estado_tib !== 'Enviado').length}
            </p>
          </div>
          <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>En Vuelo</span>
              <Plane className="w-4 h-4 text-blue-400" />
            </div>
            <p className="text-2xl font-black text-blue-400">
              {paquetes.filter(p => p.estado_tib === 'Enviado' && p.estado_amex !== 'en_almacen').length}
            </p>
          </div>
          <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>En Lince (Listos)</span>
              <Building2 className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-black text-emerald-400">
              {paquetes.filter(p => p.estado_amex === 'en_almacen').length}
            </p>
          </div>
        </div>

        {/* Action Bar: Search, Filters & Refresh Button */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-6 backdrop-blur-xl space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Buscar por WR (ej: WR000486257) o Tracking USA..."
                className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors uppercase"
              />
            </div>

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="px-4 py-2.5 bg-slate-950/80 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-200 font-semibold rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95 disabled:opacity-50"
            >
              <RotateCw className={`w-4 h-4 text-amber-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Actualizando...' : 'Actualizar Lista'}</span>
            </button>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto rounded-2xl border border-slate-800/80 bg-slate-950/60">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-900/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Warehouse (WR)</th>
                  <th className="py-3 px-4">Tracking USA</th>
                  <th className="py-3 px-4">Peso</th>
                  <th className="py-3 px-4">Estado del Envío</th>
                  <th className="py-3 px-4">Fecha Miami</th>
                  <th className="py-3 px-4 text-center">Foto Miami</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      <span>Cargando tus paquetes...</span>
                    </td>
                  </tr>
                ) : paginatedPaquetes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      <Package className="w-10 h-10 text-slate-700 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-slate-400">No hay paquetes para mostrar</p>
                      <p className="text-xs text-slate-600 mt-1">Los paquetes recibidos en Miami aparecerán automáticamente aquí.</p>
                    </td>
                  </tr>
                ) : (
                  paginatedPaquetes.map((pkg) => (
                    <tr key={pkg.id} className="hover:bg-slate-900/50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-amber-400">
                        {pkg.numero_recibo_bodega}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300">
                        {pkg.tracking || '—'}
                      </td>
                      <td className="py-3 px-4 text-slate-200">
                        {pkg.peso_kg ? `${pkg.peso_kg} kg` : '—'}
                      </td>
                      <td className="py-3 px-4">
                        {getEstadoBadge(pkg)}
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-xs">
                        {pkg.creado_en ? new Date(pkg.creado_en).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {pkg.tib_imagen_url ? (
                          <button
                            onClick={() => setSelectedPhoto({ url: pkg.tib_imagen_url!, wr: pkg.numero_recibo_bodega })}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/60 text-slate-200 hover:text-white text-xs font-medium transition-colors"
                          >
                            <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                            <span>Ver Foto</span>
                          </button>
                        ) : (
                          <span className="text-slate-600 text-xs">Sin foto</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2 text-xs text-slate-400">
              <span>
                Mostrando {(currentPage - 1) * itemsPerPage + 1} a {Math.min(currentPage * itemsPerPage, filteredPaquetes.length)} de {filteredPaquetes.length} paquetes
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-semibold text-white px-2">
                  {currentPage} de {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modal Visor de Foto Miami */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-white text-sm sm:text-base">Foto de Recepción en Miami — WR {selectedPhoto.wr}</span>
              </div>
              <button
                onClick={() => setSelectedPhoto(null)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center max-h-[70vh]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedPhoto.url}
                alt={`Foto de paquete ${selectedPhoto.wr}`}
                className="w-full h-full object-contain"
              />
            </div>

            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-slate-500">Fotografía tomada al ingresar a la bodega de Miami</span>
              <a
                href={selectedPhoto.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition-colors"
              >
                <span>Abrir en tamaño original</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800/60 py-4 px-6 text-center text-xs text-slate-500">
        <p>© {new Date().getFullYear()} AMEX COURIER PERÚ — Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}
