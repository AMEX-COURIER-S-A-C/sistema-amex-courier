'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabasePortal } from '@/lib/supabase/portal-client';
import { 
  Search, 
  RotateCw, 
  Camera, 
  X, 
  LogOut, 
  ChevronDown, 
  ExternalLink,
  Package,
  ShieldCheck,
  FilterX,
  UserPlus,
  Users,
  RefreshCw,
  Mail,
  Lock,
  Phone,
  FileText,
  Tag,
  CheckCircle2,
  AlertCircle,
  Settings
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
  estado_visible?: string | null;
  tib_imagen_url: string | null;
  tib_ticket_pdf_url: string | null;
  creado_en: string;
  actualizado_en: string | null;
}

interface ClientePortalItem {
  id: string;
  nombre_completo: string;
  email: string;
  telefono: string | null;
  documento_identidad: string | null;
  casillero_codigo: string | null;
  alias_palabras_clave: string[] | null;
  activo: boolean;
  creado_en: string;
}

export default function ClienteDashboardTIB() {
  const router = useRouter();

  const [user, setUser] = useState<any | null>(null);
  const [paquetes, setPaquetes] = useState<PaqueteTIB[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Navegación entre vistas principales para Superadmin
  const [activeTab, setActiveTab] = useState<'warehouse' | 'configuracion'>('warehouse');
  const [clientSearchQuery, setClientSearchQuery] = useState('');

  // Filtros individuales estilo TIB
  const [filterWr, setFilterWr] = useState('');
  const [filterTracking, setFilterTracking] = useState('');
  const [filterConsignatario, setFilterConsignatario] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [filterEstado, setFilterEstado] = useState('');

  // Modal para ver foto
  const [selectedPhoto, setSelectedPhoto] = useState<{ url: string; wr: string } | null>(null);

  // Estados de los Módulos de Superadmin: Agregar Cliente y Lista de Clientes
  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  const [isClientsListOpen, setIsClientsListOpen] = useState(false);
  const [clientsList, setClientsList] = useState<ClientePortalItem[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);

  // Formulario de nuevo cliente
  const [newClientNombre, setNewClientNombre] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientPassword, setNewClientPassword] = useState('');
  const [newClientTelefono, setNewClientTelefono] = useState('');
  const [newClientDni, setNewClientDni] = useState('');
  const [newClientKeywords, setNewClientKeywords] = useState('');
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [createClientSuccess, setCreateClientSuccess] = useState<string | null>(null);
  const [createClientError, setCreateClientError] = useState<string | null>(null);

  // Sincronización masiva de inventario
  const [isSyncingAll, setIsSyncingAll] = useState(false);

  // Paginación estilo TIB
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // 1. Garantizar scroll vertical libre y nativo en el navegador
  useEffect(() => {
    document.documentElement.classList.add('amex-client-portal');
    document.body.classList.add('amex-client-portal');
    document.documentElement.style.overflowY = 'auto';
    document.body.style.overflowY = 'auto';
    document.body.style.height = 'auto';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedPhoto(null);
        setUserMenuOpen(false);
        setIsAddClientOpen(false);
        setIsClientsListOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.documentElement.classList.remove('amex-client-portal');
      document.body.classList.remove('amex-client-portal');
      document.documentElement.style.overflowY = '';
      document.body.style.overflowY = '';
      document.body.style.height = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const fetchPaquetes = useCallback(async (email?: string | null) => {
    if (!email) return;
    setIsLoading(true);
    try {
      let query = supabasePortal
        .from('paquetes_portal')
        .select(`
          id, 
          numero_recibo_bodega, 
          tracking, 
          nombre_consignatario,
          tipo_empaque,
          peso_kg, 
          estado_tib, 
          estado_amex, 
          estado_visible,
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
  }, []);

  // Cargar lista de clientes registrados en el portal
  const fetchClientsList = useCallback(async () => {
    setIsLoadingClients(true);
    try {
      const { data, error } = await supabasePortal
        .from('clientes_portal')
        .select('*')
        .order('creado_en', { ascending: false });

      if (error) throw error;
      setClientsList(data || []);
    } catch (err) {
      console.error('Error al cargar clientes_portal:', err);
    } finally {
      setIsLoadingClients(false);
    }
  }, []);

  // Cargar sesión del usuario
  useEffect(() => {
    async function loadSession() {
      const { data: { session } } = await supabasePortal.auth.getSession();
      if (!session) {
        router.push('/clientes/login');
        return;
      }
      setUser(session.user);
      fetchPaquetes(session.user.email);
      if (session.user.email?.toLowerCase() === 'sistemaamexcourier@gmail.com') {
        fetchClientsList();
      }
    }
    loadSession();

    const { data: { subscription } } = supabasePortal.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.push('/clientes/login');
      } else {
        setUser(session.user);
        fetchPaquetes(session.user.email);
        if (session.user.email?.toLowerCase() === 'sistemaamexcourier@gmail.com') {
          fetchClientsList();
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, fetchPaquetes, fetchClientsList]);

  // Manejo de refresh manual
  const handleManualRefresh = () => {
    setIsRefreshing(true);
    fetchPaquetes(user?.email);
    if (user?.email?.toLowerCase() === 'sistemaamexcourier@gmail.com') {
      fetchClientsList();
    }
  };

  const handleLogout = async () => {
    await supabasePortal.auth.signOut();
    router.push('/clientes/login');
  };

  // Sincronizar todos los paquetes aprobados desde el ERP hacia la base de clientes
  const handleSyncAllFromErp = async () => {
    if (!user?.email) return;
    setIsSyncingAll(true);
    try {
      const res = await fetch('/api/clientes/sync-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al sincronizar');
      
      alert(`Sincronización completa: ${data.sincronizados} paquetes sincronizados a la base de datos de clientes.`);
      fetchPaquetes(user.email);
    } catch (err: any) {
      alert(`Error en sincronización: ${err.message}`);
    } finally {
      setIsSyncingAll(false);
    }
  };

  // Crear nuevo usuario cliente
  const handleCreateClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingClient(true);
    setCreateClientError(null);
    setCreateClientSuccess(null);

    try {
      const keywordsArray = newClientKeywords
        .split(',')
        .map(k => k.trim())
        .filter(Boolean);

      const res = await fetch('/api/clientes/crear-usuario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre_completo: newClientNombre,
          email: newClientEmail,
          password: newClientPassword,
          telefono: newClientTelefono,
          documento_identidad: newClientDni,
          alias_palabras_clave: keywordsArray,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al crear el usuario cliente');
      }

      setCreateClientSuccess(
        `¡Cliente ${data.user.nombre_completo} creado con éxito! Se vincularon ${data.paquetes_vinculados} paquetes de almacén a su cuenta.`
      );

      // Limpiar formulario
      setNewClientNombre('');
      setNewClientEmail('');
      setNewClientPassword('');
      setNewClientTelefono('');
      setNewClientDni('');
      setNewClientKeywords('');

      // Recargar listas
      fetchClientsList();
      if (user?.email) {
        fetchPaquetes(user.email);
      }
    } catch (err: any) {
      setCreateClientError(err.message || 'Error al crear cliente');
    } finally {
      setIsCreatingClient(false);
    }
  };

  // Filtrado de paquetes en memoria
  const filteredPaquetes = useMemo(() => {
    return paquetes.filter(p => {
      if (filterWr && !p.numero_recibo_bodega.toLowerCase().includes(filterWr.toLowerCase())) {
        return false;
      }
      if (filterTracking && !p.tracking.toLowerCase().includes(filterTracking.toLowerCase())) {
        return false;
      }
      if (filterConsignatario && !(p.nombre_consignatario || '').toLowerCase().includes(filterConsignatario.toLowerCase())) {
        return false;
      }
      if (filterTipo && p.tipo_empaque !== filterTipo) {
        return false;
      }
      if (filterEstado) {
        const textEstado = (p.estado_visible || p.estado_amex || p.estado_tib || '').toUpperCase();
        if (!textEstado.includes(filterEstado.toUpperCase())) {
          return false;
        }
      }
      return true;
    });
  }, [paquetes, filterWr, filterTracking, filterConsignatario, filterTipo, filterEstado]);

  // Filtrado de clientes para el Panel de Configuración
  const filteredClientsList = useMemo(() => {
    if (!clientSearchQuery.trim()) return clientsList;
    const q = clientSearchQuery.toLowerCase();
    return clientsList.filter(c => 
      c.nombre_completo.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      (c.casillero_codigo && c.casillero_codigo.toLowerCase().includes(q)) ||
      (c.telefono && c.telefono.includes(q)) ||
      (c.documento_identidad && c.documento_identidad.includes(q))
    );
  }, [clientsList, clientSearchQuery]);

  // Opciones únicas de tipos y estados
  const tiposUnicos = useMemo(() => {
    const set = new Set<string>();
    paquetes.forEach(p => {
      if (p.tipo_empaque) set.add(p.tipo_empaque);
    });
    return Array.from(set);
  }, [paquetes]);

  const estadosUnicos = useMemo(() => {
    const set = new Set<string>();
    paquetes.forEach(p => {
      if (p.estado_visible) set.add(p.estado_visible);
      else if (p.estado_amex === 'entregado') set.add('ENTREGADO');
      else if (p.estado_amex === 'en_almacen') set.add('EN ALMACÉN LINCE');
      else if (p.estado_tib === 'Enviado') set.add('EN VUELO');
      else set.add('RECIBIDO MIAMI');
    });
    return Array.from(set);
  }, [paquetes]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filterWr) count++;
    if (filterTracking) count++;
    if (filterConsignatario) count++;
    if (filterTipo) count++;
    if (filterEstado) count++;
    return count;
  }, [filterWr, filterTracking, filterConsignatario, filterTipo, filterEstado]);

  const handleClearFilters = () => {
    setFilterWr('');
    setFilterTracking('');
    setFilterConsignatario('');
    setFilterTipo('');
    setFilterEstado('');
    setCurrentPage(1);
  };

  // Paginación
  const totalPages = Math.ceil(filteredPaquetes.length / itemsPerPage) || 1;
  const paginatedPaquetes = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredPaquetes.slice(start, start + itemsPerPage);
  }, [filteredPaquetes, currentPage, itemsPerPage]);

  // Cálculo de páginas visibles
  const paginationPages = useMemo(() => {
    const maxVisible = 5;
    if (totalPages <= maxVisible) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const half = Math.floor(maxVisible / 2);
    let start = currentPage - half;
    let end = currentPage + half;

    if (start < 1) {
      start = 1;
      end = maxVisible;
    } else if (end > totalPages) {
      end = totalPages;
      start = totalPages - maxVisible + 1;
    }

    const pages: number[] = [];
    for (let p = start; p <= end; p++) {
      pages.push(p);
    }
    return pages;
  }, [currentPage, totalPages]);

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

  // Texto exacto del estado (solo texto plano)
  const getEstadoTexto = (pkg: PaqueteTIB) => {
    if (pkg.estado_visible) return pkg.estado_visible;
    if (pkg.estado_amex === 'entregado') return 'ENTREGADO';
    if (pkg.estado_amex === 'en_almacen' || pkg.estado_amex === 'recibido') return 'EN ALMACÉN LINCE';
    if (pkg.estado_tib === 'Enviado') return 'EN VUELO';
    return 'RECIBIDO MIAMI';
  };

  const isSuperadmin = user?.email?.toLowerCase() === 'sistemaamexcourier@gmail.com';

  return (
    <div 
      className="amex-client-portal w-full flex-1 flex flex-col"
      data-portal="client"
      data-lenis-prevent
      style={{ 
        minHeight: '100vh', 
        backgroundColor: '#f1f3f6', 
        color: '#2c323f', 
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' 
      }}
    >
      
      {/* 1. Header superior estilo TIB */}
      <header style={{ backgroundColor: '#1e2229', color: '#ffffff', height: '56px', display: 'flex', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.15)', position: 'sticky', top: 0, zIndex: 40 }}>
        <div style={{ maxWidth: '1720px', width: '100%', margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          
          {/* Logo y título + Tabs de Navegación Superadmin */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px', fontWeight: 900, letterSpacing: '-0.5px', color: '#ffffff' }}>
                Amex<span style={{ color: '#ff5722' }}>+</span>
              </span>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#e5e7eb', borderLeft: '1px solid #4b5563', paddingLeft: '10px' }}>
                Gestor de Almacén
              </span>
            </div>
            
            {isSuperadmin && (
              <span style={{ backgroundColor: '#ff5722', color: '#ffffff', fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '4px', letterSpacing: '0.4px', textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <ShieldCheck style={{ width: '12px', height: '12px' }} />
                <span>Superadmin</span>
              </span>
            )}

            {/* Pestañas de Vista para Superadmin (Aísla Configuración de Listado WR) */}
            {isSuperadmin && (
              <nav style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'rgba(255,255,255,0.08)', padding: '3px', borderRadius: '8px', marginLeft: '12px' }}>
                <button
                  type="button"
                  onClick={() => setActiveTab('warehouse')}
                  style={{
                    backgroundColor: activeTab === 'warehouse' ? '#ff5722' : 'transparent',
                    color: activeTab === 'warehouse' ? '#ffffff' : '#9ca3af',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '5px 12px',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Package style={{ width: '14px', height: '14px' }} />
                  <span>Listado Warehouse</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('configuracion');
                    fetchClientsList();
                  }}
                  style={{
                    backgroundColor: activeTab === 'configuracion' ? '#ff5722' : 'transparent',
                    color: activeTab === 'configuracion' ? '#ffffff' : '#9ca3af',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '5px 12px',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Settings style={{ width: '14px', height: '14px' }} />
                  <span>Configuración</span>
                  <span style={{
                    fontSize: '10px',
                    backgroundColor: activeTab === 'configuracion' ? 'rgba(0,0,0,0.25)' : '#374151',
                    color: '#ffffff',
                    padding: '1px 6px',
                    borderRadius: '10px',
                    fontWeight: 800
                  }}>
                    {clientsList.length}
                  </span>
                </button>
              </nav>
            )}
          </div>

          {/* Usuario / Dropdown a la derecha */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, color: '#f3f4f6', cursor: 'pointer', padding: '6px 12px', borderRadius: '6px' }}
            >
              <span>Hola! {user?.user_metadata?.nombre_completo || user?.email?.split('@')[0]?.toUpperCase() || 'USUARIO'}</span>
              <ChevronDown style={{ width: '14px', height: '14px', color: '#9ca3af' }} />
            </button>

            {userMenuOpen && (
              <div style={{ position: 'absolute', right: 0, marginTop: '6px', width: '250px', backgroundColor: '#ffffff', borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', border: '1px solid #e5e7eb', padding: '6px 0', zIndex: 50 }}>
                <div style={{ padding: '8px 14px', borderBottom: '1px solid #f3f4f6', fontSize: '12px', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <div style={{ fontWeight: 700, color: '#111827', fontSize: '13px' }}>Cuenta Conectada</div>
                  <div>{user?.email}</div>
                  <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
                    Servidor: us-west-2 (Oregon)
                  </div>
                </div>

                {isSuperadmin && (
                  <div style={{ padding: '6px 0', borderBottom: '1px solid #f3f4f6' }}>
                    <div style={{ padding: '4px 14px', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: '#9ca3af', letterSpacing: '0.5px' }}>
                      Configuración
                    </div>

                    <button
                      onClick={() => {
                        setActiveTab('configuracion');
                        setUserMenuOpen(false);
                        fetchClientsList();
                      }}
                      style={{ width: '100%', textAlign: 'left', padding: '8px 14px', background: 'none', border: 'none', color: '#1f2937', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                      <Settings style={{ width: '14px', height: '14px', color: '#ff5722' }} />
                      <span>Panel de Configuración</span>
                    </button>

                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        setCreateClientSuccess(null);
                        setCreateClientError(null);
                        setIsAddClientOpen(true);
                      }}
                      style={{ width: '100%', textAlign: 'left', padding: '8px 14px', background: 'none', border: 'none', color: '#1f2937', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                      <UserPlus style={{ width: '14px', height: '14px', color: '#ff5722' }} />
                      <span>+ Agregar Cliente</span>
                    </button>

                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        handleSyncAllFromErp();
                      }}
                      style={{ width: '100%', textAlign: 'left', padding: '8px 14px', background: 'none', border: 'none', color: '#1f2937', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                      <RefreshCw style={{ width: '14px', height: '14px', color: '#6b7280' }} />
                      <span>Sincronizar con ERP</span>
                    </button>
                  </div>
                )}

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
        
        {/* ================= VISTA 1: LISTADO WAREHOUSE (LIMPIO, SIN BOTONES DE CONFIGURACIÓN) ================= */}
        {activeTab === 'warehouse' ? (
          <>
            {/* Título de la sección estilo TIB */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#ff5722', margin: 0, letterSpacing: '-0.3px' }}>
                  Listado Warehouse
                </h1>
                <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: '#6b7280' }}>
                  Control y seguimiento de paquetes recibidos en el almacén de Miami y despachos a Lima.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <span style={{ fontSize: '13px', color: '#6b7280', backgroundColor: '#ffffff', padding: '8px 14px', borderRadius: '6px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
                  Total en sistema: <strong style={{ color: '#111827', fontWeight: 800 }}>{paquetes.length}</strong>
                </span>

                {activeFiltersCount > 0 && (
                  <span style={{ fontSize: '12px', color: '#ff5722', backgroundColor: '#fff3e0', border: '1px solid #ffccbc', padding: '8px 12px', borderRadius: '6px', fontWeight: 700 }}>
                    {filteredPaquetes.length} coincidencia(s)
                  </span>
                )}

                <button
                  type="button"
                  onClick={handleManualRefresh}
                  disabled={isRefreshing}
                  style={{
                    backgroundColor: '#ffffff',
                    color: '#374151',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    padding: '8px 14px',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                  }}
                  title="Refrescar lista de paquetes"
                >
                  <RotateCw style={{ width: '13px', height: '13px', color: '#ff5722', animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
                  <span>Actualizar Lista</span>
                </button>
              </div>
            </div>

            {/* Tarjeta de Filtros Estilo TIB */}
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
                    style={{
                      width: '100%',
                      height: '42px',
                      paddingLeft: '38px',
                      paddingRight: '12px',
                      borderRadius: '6px',
                      border: '1px solid #d1d5db',
                      fontSize: '13px',
                      color: '#111827',
                      outline: 'none',
                      backgroundColor: '#ffffff',
                      transition: 'border-color 0.15s ease'
                    }}
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
                    style={{
                      width: '100%',
                      height: '42px',
                      paddingLeft: '38px',
                      paddingRight: '12px',
                      borderRadius: '6px',
                      border: '1px solid #d1d5db',
                      fontSize: '13px',
                      color: '#111827',
                      outline: 'none',
                      backgroundColor: '#ffffff',
                      transition: 'border-color 0.15s ease'
                    }}
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
                    placeholder="CONSIGNATARIO"
                    style={{
                      width: '100%',
                      height: '42px',
                      paddingLeft: '38px',
                      paddingRight: '12px',
                      borderRadius: '6px',
                      border: '1px solid #d1d5db',
                      fontSize: '13px',
                      color: '#111827',
                      outline: 'none',
                      backgroundColor: '#ffffff',
                      transition: 'border-color 0.15s ease'
                    }}
                  />
                </div>
              </div>

              {/* Fila 2: Selects de Tipo y Estado */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                
                {/* Select Tipo de Paquete */}
                <div>
                  <select
                    value={filterTipo}
                    onChange={(e) => {
                      setFilterTipo(e.target.value);
                      setCurrentPage(1);
                    }}
                    style={{
                      width: '100%',
                      height: '42px',
                      padding: '0 12px',
                      borderRadius: '6px',
                      border: '1px solid #d1d5db',
                      fontSize: '13px',
                      color: '#374151',
                      outline: 'none',
                      backgroundColor: '#ffffff',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="">Tipo de Paquete (Todos)</option>
                    {tiposUnicos.map(tipo => (
                      <option key={tipo} value={tipo}>{tipo}</option>
                    ))}
                  </select>
                </div>

                {/* Select Estado */}
                <div>
                  <select
                    value={filterEstado}
                    onChange={(e) => {
                      setFilterEstado(e.target.value);
                      setCurrentPage(1);
                    }}
                    style={{
                      width: '100%',
                      height: '42px',
                      padding: '0 12px',
                      borderRadius: '6px',
                      border: '1px solid #d1d5db',
                      fontSize: '13px',
                      color: '#374151',
                      outline: 'none',
                      backgroundColor: '#ffffff',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="">Estado (Todos)</option>
                    {estadosUnicos.map(estado => (
                      <option key={estado} value={estado}>{estado}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Fila 3: Botones de Acción TIB */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '4px' }}>
                <button
                  type="button"
                  style={{
                    backgroundColor: '#1e2229',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '9px 24px',
                    fontSize: '13px',
                    fontWeight: 700,
                    letterSpacing: '0.4px',
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  BUSCAR
                </button>

                {activeFiltersCount > 0 && (
                  <button
                    type="button"
                    onClick={handleClearFilters}
                    style={{
                      backgroundColor: '#ffffff',
                      color: '#4b5563',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      padding: '8px 18px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <FilterX style={{ width: '14px', height: '14px', color: '#6b7280' }} />
                    <span>LIMPIAR FILTROS</span>
                  </button>
                )}
              </div>
            </div>

            {/* 4. Tabla Principal Estilo TIB */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto', width: '100%' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                  
                  {/* Encabezado estilo TIB */}
                  <thead>
                    <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '1px solid #e5e7eb', color: '#4b5563', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      <th style={{ padding: '14px 16px', minWidth: '130px' }}>WR</th>
                      <th style={{ padding: '14px 16px', minWidth: '150px' }}># TRACKING</th>
                      <th style={{ padding: '14px 16px', minWidth: '220px' }}>CLIENTE</th>
                      <th style={{ padding: '14px 16px', minWidth: '90px' }}>TIPO</th>
                      <th style={{ padding: '14px 16px', minWidth: '100px' }}>PESO(KG)</th>
                      <th style={{ padding: '14px 16px', minWidth: '150px' }}>ESTADO</th>
                      <th style={{ padding: '14px 16px', minWidth: '120px' }}>REGISTRADO</th>
                      <th style={{ padding: '14px 16px', minWidth: '120px' }}>MODIFICADO</th>
                      <th style={{ padding: '14px 16px', minWidth: '140px', textAlign: 'center' }}>DOCUMENTOS</th>
                    </tr>
                  </thead>

                  {/* Cuerpo de la tabla */}
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td colSpan={9} style={{ padding: '60px 16px', textAlign: 'center', color: '#6b7280' }}>
                          <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '28px', height: '28px', border: '3px solid #ff5722', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                            <span style={{ fontSize: '13px', fontWeight: 600 }}>Cargando paquetes desde almacén...</span>
                          </div>
                        </td>
                      </tr>
                    ) : paginatedPaquetes.length === 0 ? (
                      <tr>
                        <td colSpan={9} style={{ padding: '60px 16px', textAlign: 'center', color: '#6b7280' }}>
                          <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                            <Package style={{ width: '36px', height: '36px', color: '#d1d5db' }} />
                            <span style={{ fontSize: '14px', fontWeight: 700, color: '#374151' }}>No se encontraron paquetes registrados</span>
                            <span style={{ fontSize: '12px', color: '#9ca3af' }}>Intenta ajustar los filtros de búsqueda o consulta tu número de Warehouse.</span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      paginatedPaquetes.map((pkg, idx) => {
                        const creado = formatDateTimeTIB(pkg.creado_en);
                        const modificado = formatDateTimeTIB(pkg.actualizado_en || pkg.creado_en);
                        const estadoTexto = getEstadoTexto(pkg);

                        return (
                          <tr 
                            key={pkg.id || pkg.numero_recibo_bodega} 
                            style={{ 
                              borderBottom: '1px solid #f1f3f6', 
                              backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fafbfc',
                              transition: 'background-color 0.12s ease'
                            }}
                          >
                            {/* WR */}
                            <td style={{ padding: '14px 16px', fontWeight: 700, color: '#111827', fontFamily: 'monospace', fontSize: '13px' }}>
                              {pkg.numero_recibo_bodega}
                            </td>

                            {/* Tracking */}
                            <td style={{ padding: '14px 16px', color: '#374151', fontFamily: 'monospace', fontSize: '12.5px' }}>
                              {pkg.tracking || '—'}
                            </td>

                            {/* Cliente / Consignatario */}
                            <td style={{ padding: '14px 16px', fontWeight: 700, color: '#111827' }}>
                              {pkg.nombre_consignatario || 'CLIENTE AMEX'}
                            </td>

                            {/* Tipo */}
                            <td style={{ padding: '14px 16px', color: '#4b5563', textTransform: 'uppercase', fontSize: '12px', fontWeight: 600 }}>
                              {pkg.tipo_empaque || 'CAJA'}
                            </td>

                            {/* Peso */}
                            <td style={{ padding: '14px 16px', fontWeight: 700, color: '#111827' }}>
                              {pkg.peso_kg != null ? Number(pkg.peso_kg).toFixed(2) : '—'}
                            </td>

                            {/* Estado (Solo Texto Plano, sin fondo ni colores) */}
                            <td style={{ padding: '14px 16px', fontSize: '11.5px', fontWeight: 700, color: '#1f2937', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                              {estadoTexto}
                            </td>

                            {/* Registrado (2 líneas estilo TIB) */}
                            <td style={{ padding: '14px 16px', fontSize: '12px', color: '#4b5563', lineHeight: '1.3' }}>
                              <div style={{ fontWeight: 600, color: '#111827' }}>{creado.date}</div>
                              <div style={{ fontSize: '11px', color: '#9ca3af' }}>{creado.time}</div>
                            </td>

                            {/* Modificado (2 líneas estilo TIB) */}
                            <td style={{ padding: '14px 16px', fontSize: '12px', color: '#4b5563', lineHeight: '1.3' }}>
                              <div style={{ fontWeight: 600, color: '#111827' }}>{modificado.date}</div>
                              <div style={{ fontSize: '11px', color: '#9ca3af' }}>{modificado.time}</div>
                            </td>

                            {/* Documentos / Foto */}
                            <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                              {pkg.tib_imagen_url ? (
                                <button
                                  type="button"
                                  onClick={() => setSelectedPhoto({ url: pkg.tib_imagen_url!, wr: pkg.numero_recibo_bodega })}
                                  style={{
                                    backgroundColor: '#fff7ed',
                                    color: '#c2410c',
                                    border: '1px solid #ffedd5',
                                    borderRadius: '6px',
                                    padding: '6px 12px',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                                  }}
                                  title="Ver foto tomada en bodega Miami"
                                >
                                  <Camera style={{ width: '14px', height: '14px', color: '#ea580c' }} />
                                  <span>Ver imagen</span>
                                </button>
                              ) : (
                                <span style={{ 
                                  backgroundColor: '#f3f4f6', 
                                  color: '#9ca3af', 
                                  border: '1px solid #e5e7eb', 
                                  borderRadius: '6px', 
                                  padding: '6px 12px', 
                                  fontSize: '12px', 
                                  fontWeight: 600, 
                                  display: 'inline-flex', 
                                  alignItems: 'center', 
                                  gap: '6px' 
                                }}>
                                  <Camera style={{ width: '14px', height: '14px', opacity: 0.5 }} />
                                  <span>Sin imagen</span>
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Paginación estilo TIB */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderTop: '1px solid #e5e7eb', backgroundColor: '#f8f9fa', flexWrap: 'wrap', gap: '10px' }}>
                <span style={{ fontSize: '12px', color: '#6b7280' }}>
                  Mostrando del <strong style={{ color: '#111827' }}>{filteredPaquetes.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}</strong> al <strong style={{ color: '#111827' }}>{Math.min(currentPage * itemsPerPage, filteredPaquetes.length)}</strong> de un total de <strong style={{ color: '#111827' }}>{filteredPaquetes.length}</strong> registros
                </span>

                {totalPages > 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button
                      type="button"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      style={{ padding: '6px 12px', borderRadius: '4px', backgroundColor: '#ffffff', border: '1px solid #d1d5db', color: '#374151', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.4 : 1, fontSize: '12px', fontWeight: 600 }}
                    >
                      Anterior
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      {paginationPages.map(page => (
                        <button
                          key={page}
                          type="button"
                          onClick={() => setCurrentPage(page)}
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '4px',
                            border: currentPage === page ? 'none' : '1px solid #d1d5db',
                            backgroundColor: currentPage === page ? '#ff5722' : '#ffffff',
                            color: currentPage === page ? '#ffffff' : '#374151',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          {page}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
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
          </>
        ) : (
          /* ================= VISTA 2: PANEL DE CONFIGURACIÓN Y CLIENTES ================= */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Cabecera del Panel de Configuración */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: '#ff5722', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', boxShadow: '0 2px 6px rgba(255,87,34,0.3)' }}>
                    <Settings style={{ width: '20px', height: '20px' }} />
                  </div>
                  <div>
                    <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#111827', margin: 0, letterSpacing: '-0.3px' }}>
                      Panel de Configuración
                    </h1>
                    <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: '#6b7280' }}>
                      Administración de clientes, asignación de casilleros y sincronización de base de datos Oregon.
                    </p>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setActiveTab('warehouse')}
                  style={{
                    backgroundColor: '#ffffff',
                    color: '#374151',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  }}
                >
                  <Package style={{ width: '14px', height: '14px', color: '#ff5722' }} />
                  <span>Volver a Listado Warehouse</span>
                </button>
              </div>
            </div>

            {/* Fila de Tarjetas de Resumen Técnico */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              
              {/* Tarjeta Servidor */}
              <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', padding: '18px 20px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#6b7280', letterSpacing: '0.5px' }}>
                  Servidor Base de Datos Clientes
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                  <span style={{ fontSize: '15px', fontWeight: 800, color: '#111827' }}>us-west-2 (Oregon, USA)</span>
                </div>
                <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0 0' }}>
                  Base de datos 100% aislada e independiente para el portal de clientes.
                </p>
              </div>

              {/* Tarjeta Clientes */}
              <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', padding: '18px 20px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#6b7280', letterSpacing: '0.5px' }}>
                  Clientes Registrados en Portal
                </span>
                <div style={{ fontSize: '26px', fontWeight: 900, color: '#ff5722', marginTop: '4px' }}>
                  {clientsList.length}
                </div>
                <p style={{ fontSize: '12px', color: '#6b7280', margin: '2px 0 0' }}>
                  Usuarios con acceso activo a su casillero personal.
                </p>
              </div>

              {/* Tarjeta Sincronización ERP */}
              <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', padding: '18px 20px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#6b7280', letterSpacing: '0.5px' }}>
                    Inventario en Portal
                  </span>
                  <div style={{ fontSize: '26px', fontWeight: 900, color: '#111827', marginTop: '4px' }}>
                    {paquetes.length} paquetes
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSyncAllFromErp}
                  disabled={isSyncingAll}
                  style={{
                    marginTop: '10px',
                    backgroundColor: '#1e2229',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px 14px',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    cursor: isSyncingAll ? 'not-allowed' : 'pointer',
                    opacity: isSyncingAll ? 0.7 : 1,
                  }}
                >
                  <RefreshCw style={{ width: '13px', height: '13px', color: '#ff5722', animation: isSyncingAll ? 'spin 1s linear infinite' : 'none' }} />
                  <span>{isSyncingAll ? 'Sincronizando con ERP...' : 'Sincronizar Almacén con ERP'}</span>
                </button>
              </div>

            </div>

            {/* Tarjeta Principal de Directorio de Clientes */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', padding: '22px' }}>
              
              {/* Header de la sección de clientes */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px', marginBottom: '18px' }}>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#111827', margin: 0 }}>
                    Directorio de Clientes
                  </h2>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#6b7280' }}>
                    Crea accesos, asigna códigos de casillero y define alias para matching automático de paquetes.
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {/* Buscador de clientes */}
                  <div style={{ position: 'relative', minWidth: '240px' }}>
                    <Search style={{ width: '14px', height: '14px', color: '#9ca3af', position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="text"
                      value={clientSearchQuery}
                      onChange={(e) => setClientSearchQuery(e.target.value)}
                      placeholder="Buscar cliente, correo, DNI..."
                      style={{
                        width: '100%',
                        height: '38px',
                        paddingLeft: '32px',
                        paddingRight: '10px',
                        borderRadius: '6px',
                        border: '1px solid #d1d5db',
                        fontSize: '12.5px',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setCreateClientSuccess(null);
                      setCreateClientError(null);
                      setIsAddClientOpen(true);
                    }}
                    style={{
                      backgroundColor: '#ff5722',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '8px 18px',
                      fontSize: '13px',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                      boxShadow: '0 2px 4px rgba(255,87,34,0.25)',
                    }}
                  >
                    <UserPlus style={{ width: '15px', height: '15px' }} />
                    <span>+ Agregar Cliente</span>
                  </button>
                </div>
              </div>

              {/* Tabla de Clientes en Configuración */}
              <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '1px solid #e5e7eb' }}>
                      <th style={{ padding: '12px 14px', fontWeight: 700, color: '#4b5563' }}>Consignatario / Nombre</th>
                      <th style={{ padding: '12px 14px', fontWeight: 700, color: '#4b5563' }}>Correo (Login)</th>
                      <th style={{ padding: '12px 14px', fontWeight: 700, color: '#4b5563' }}>Casillero</th>
                      <th style={{ padding: '12px 14px', fontWeight: 700, color: '#4b5563' }}>Teléfono / Documento</th>
                      <th style={{ padding: '12px 14px', fontWeight: 700, color: '#4b5563' }}>Palabras Clave (Matching)</th>
                      <th style={{ padding: '12px 14px', fontWeight: 700, color: '#4b5563' }}>Estado</th>
                      <th style={{ padding: '12px 14px', fontWeight: 700, color: '#4b5563' }}>Fecha Registro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoadingClients ? (
                      <tr>
                        <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: '#6b7280' }}>
                          <div style={{ width: '22px', height: '22px', border: '2px solid #ff5722', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 8px' }} />
                          <span>Cargando directorio de clientes...</span>
                        </td>
                      </tr>
                    ) : filteredClientsList.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                          <Users style={{ width: '36px', height: '36px', color: '#d1d5db', margin: '0 auto 8px' }} />
                          <p style={{ fontWeight: 700, color: '#374151', margin: 0 }}>No hay clientes que coincidan</p>
                          <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>Crea un cliente nuevo con el botón "+ Agregar Cliente".</p>
                        </td>
                      </tr>
                    ) : (
                      filteredClientsList.map((c, idx) => (
                        <tr key={c.id} style={{ borderBottom: '1px solid #f3f4f6', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fafbfc' }}>
                          <td style={{ padding: '12px 14px', fontWeight: 700, color: '#111827' }}>
                            {c.nombre_completo}
                          </td>
                          <td style={{ padding: '12px 14px', color: '#4b5563', fontFamily: 'monospace', fontSize: '12px' }}>
                            {c.email}
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <span style={{ backgroundColor: '#f3f4f6', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, color: '#374151', fontFamily: 'monospace' }}>
                              {c.casillero_codigo || `AMX-${String(idx + 1).padStart(3, '0')}`}
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px', color: '#4b5563' }}>
                            <div>{c.telefono || '—'}</div>
                            {c.documento_identidad && (
                              <div style={{ fontSize: '11px', color: '#9ca3af' }}>Doc: {c.documento_identidad}</div>
                            )}
                          </td>
                          <td style={{ padding: '12px 14px', color: '#6b7280', fontSize: '11.5px', maxWidth: '240px' }}>
                            {Array.isArray(c.alias_palabras_clave) && c.alias_palabras_clave.length > 0 ? (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                {c.alias_palabras_clave.map((k, ki) => (
                                  <span key={ki} style={{ backgroundColor: '#e0f2fe', color: '#0369a1', padding: '1px 6px', borderRadius: '3px', fontSize: '10.5px', fontWeight: 600 }}>
                                    {k}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span>Nombre exacto</span>
                            )}
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <span style={{ backgroundColor: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700 }}>
                              Activo
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px', color: '#6b7280', fontSize: '11.5px' }}>
                            {formatDateTimeTIB(c.creado_en).date}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

            </div>

          </div>
        )}

      </main>

      {/* Modal de Foto Flotante */}
      {selectedPhoto && (
        <div 
          onClick={() => setSelectedPhoto(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', backgroundColor: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(4px)' }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{ backgroundColor: '#ffffff', borderRadius: '10px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)', maxWidth: '720px', width: '100%', padding: '20px', position: 'relative' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid #e5e7eb', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '6px', backgroundColor: '#fff3e0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Camera style={{ width: '18px', height: '18px', color: '#ff5722' }} />
                </div>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#111827', margin: 0 }}>
                    Foto de Recepción Miami — WR {selectedPhoto.wr}
                  </h3>
                  <span style={{ fontSize: '11px', color: '#6b7280' }}>Evidencia fotográfica registrada en bodega Miami</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPhoto(null)}
                style={{ padding: '6px', borderRadius: '6px', border: 'none', backgroundColor: '#f3f4f6', color: '#6b7280', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X style={{ width: '18px', height: '18px' }} />
              </button>
            </div>

            <div style={{ backgroundColor: '#0f172a', borderRadius: '8px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', maxHeight: '65vh', border: '1px solid #e2e8f0' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedPhoto.url}
                alt={`Paquete ${selectedPhoto.wr}`}
                style={{ maxWidth: '100%', maxHeight: '65vh', objectFit: 'contain' }}
              />
            </div>

            <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <span style={{ fontSize: '12px', color: '#6b7280' }}>
                Presiona <kbd style={{ padding: '2px 6px', background: '#e2e8f0', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>ESC</kbd> o haz clic afuera para cerrar
              </span>
              <a
                href={selectedPhoto.url}
                target="_blank"
                rel="noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', backgroundColor: '#ff5722', color: '#ffffff', fontWeight: 700, borderRadius: '6px', fontSize: '12px', textDecoration: 'none', cursor: 'pointer', boxShadow: '0 2px 6px rgba(255,87,34,0.3)' }}
              >
                <span>Ver tamaño original</span>
                <ExternalLink style={{ width: '14px', height: '14px' }} />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Agregar Usuario Cliente (Solo Superadmin) */}
      {isAddClientOpen && (
        <div 
          onClick={() => setIsAddClientOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{ backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)', maxWidth: '580px', width: '100%', padding: '24px', position: 'relative' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '14px', borderBottom: '1px solid #e5e7eb', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#ff5722', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
                  <UserPlus style={{ width: '20px', height: '20px' }} />
                </div>
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#111827', margin: 0 }}>
                    Agregar Usuario Cliente al Portal
                  </h3>
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>
                    Crea el acceso y vincula automáticamente sus paquetes de bodega.
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddClientOpen(false)}
                style={{ padding: '6px', borderRadius: '6px', border: 'none', backgroundColor: '#f3f4f6', color: '#6b7280', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X style={{ width: '18px', height: '18px' }} />
              </button>
            </div>

            {createClientSuccess && (
              <div style={{ marginBottom: '16px', padding: '12px', borderRadius: '8px', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 style={{ width: '18px', height: '18px', flexShrink: 0 }} />
                <span>{createClientSuccess}</span>
              </div>
            )}

            {createClientError && (
              <div style={{ marginBottom: '16px', padding: '12px', borderRadius: '8px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle style={{ width: '18px', height: '18px', flexShrink: 0 }} />
                <span>{createClientError}</span>
              </div>
            )}

            <form onSubmit={handleCreateClientSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              {/* Nombre Completo / Consignatario */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                  Nombre Completo o Empresa (Consignatario en Guías) *
                </label>
                <input
                  type="text"
                  required
                  value={newClientNombre}
                  onChange={(e) => setNewClientNombre(e.target.value)}
                  placeholder="Ej: AMEX JANIRA AMEX o JANIRA PAREDES"
                  style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13px', color: '#111827', outline: 'none' }}
                />
                <span style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px', display: 'block' }}>
                  Debe coincidir con el nombre con el que llegan los paquetes a Miami/Lince.
                </span>
              </div>

              {/* Email y Contraseña en 2 columnas */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                    Correo Electrónico (Login) *
                  </label>
                  <input
                    type="email"
                    required
                    value={newClientEmail}
                    onChange={(e) => setNewClientEmail(e.target.value)}
                    placeholder="cliente@gmail.com"
                    style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13px', color: '#111827', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                    Contraseña de Acceso *
                  </label>
                  <input
                    type="text"
                    required
                    minLength={6}
                    value={newClientPassword}
                    onChange={(e) => setNewClientPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13px', color: '#111827', outline: 'none' }}
                  />
                </div>
              </div>

              {/* Teléfono y DNI en 2 columnas */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                    Teléfono / WhatsApp
                  </label>
                  <input
                    type="tel"
                    value={newClientTelefono}
                    onChange={(e) => setNewClientTelefono(e.target.value)}
                    placeholder="Ej: 987654321"
                    style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13px', color: '#111827', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                    DNI o RUC
                  </label>
                  <input
                    type="text"
                    value={newClientDni}
                    onChange={(e) => setNewClientDni(e.target.value)}
                    placeholder="Ej: 71234567"
                    style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13px', color: '#111827', outline: 'none' }}
                  />
                </div>
              </div>

              {/* Alias / Palabras Clave */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                  Variaciones o Palabras Clave (Opcional, separadas por coma)
                </label>
                <input
                  type="text"
                  value={newClientKeywords}
                  onChange={(e) => setNewClientKeywords(e.target.value)}
                  placeholder="Ej: JANIRA, JANIRA AMEX, AMEX JANIRA"
                  style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13px', color: '#111827', outline: 'none' }}
                />
                <span style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px', display: 'block' }}>
                  Si una caja llega con cualquiera de estas variaciones, se asignará a este correo.
                </span>
              </div>

              <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsAddClientOpen(false)}
                  style={{ padding: '9px 18px', borderRadius: '6px', border: '1px solid #d1d5db', backgroundColor: '#ffffff', color: '#374151', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreatingClient}
                  style={{
                    padding: '9px 22px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#ff5722',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: isCreatingClient ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 4px rgba(255,87,34,0.3)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {isCreatingClient ? (
                    <>
                      <div style={{ width: '14px', height: '14px', border: '2px solid #ffffff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                      <span>Creando cuenta...</span>
                    </>
                  ) : (
                    <span>Guardar y Vincular Paquetes</span>
                  )}
                </button>
              </div>
            </form>
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
