'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabasePortal } from '@/lib/supabase/portal-client';
import { 
  Package, 
  Search, 
  Lock, 
  Mail, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  ShieldCheck,
  Plane,
  Building2,
  Clock,
  ExternalLink,
  MessageCircle,
  Camera,
  Sparkles
} from 'lucide-react';

export default function ClienteLoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'login' | 'tracking'>('login');

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isCapsLockOn, setIsCapsLockOn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Quick Tracking state
  const [searchWr, setSearchWr] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [trackingResult, setTrackingResult] = useState<any | null>(null);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  // Si ya tiene sesión activa en el portal, redirigir automáticamente
  useEffect(() => {
    supabasePortal.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push('/clientes');
      }
    });
  }, [router]);

  const handleCapsLockCheck = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (typeof e.getModifierState === 'function') {
      setIsCapsLockOn(e.getModifierState('CapsLock'));
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);
    setErrorMessage(null);

    const cleanEmail = email.trim().toLowerCase();

    try {
      // 1. Iniciar sesión a través de la ruta con puente de sincronización para Superadmin
      const res = await fetch('/api/clientes/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Credenciales incorrectas');
      }

      if (data.session) {
        // Establecer sesión en el cliente de Supabase del navegador
        await supabasePortal.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });

        router.push('/clientes');
        return;
      }

      throw new Error('No se pudo establecer la sesión.');
    } catch (err: any) {
      // Intento de fallback directo con el cliente de Supabase del navegador
      try {
        const { data: directAuth, error: directError } = await supabasePortal.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (!directError && directAuth.session) {
          router.push('/clientes');
          return;
        }
      } catch (_) {}

      setErrorMessage(
        err.message === 'Invalid login credentials'
          ? 'Correo o contraseña incorrectos. Revisa tus datos.'
          : err.message || 'Error al iniciar sesión'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickTracking = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = searchWr.trim().toUpperCase();
    if (!code) return;

    setIsSearching(true);
    setTrackingError(null);
    setTrackingResult(null);

    try {
      // 1. Consultar a través del endpoint blindado de rastreo
      const res = await fetch(`/api/clientes/tracking?code=${encodeURIComponent(code)}`);
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || `No encontramos ningún paquete con el código "${code}".`);
      }

      if (json.paquete) {
        setTrackingResult(json.paquete);
        return;
      }

      throw new Error(`No encontramos ningún paquete con el código "${code}".`);
    } catch (err: any) {
      setTrackingError(err.message || 'Error al consultar tracking');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div 
      className="amex-client-portal min-h-screen bg-[#070b14] text-slate-100 flex flex-col justify-between selection:bg-amber-500 selection:text-slate-950 font-sans"
      data-portal="client" 
      data-lenis-prevent
    >
      {/* Dynamic Background Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-[550px] h-[550px] bg-amber-500/12 rounded-full blur-[140px]" />
        <div className="absolute top-1/3 -right-40 w-[600px] h-[600px] bg-orange-600/10 rounded-full blur-[160px]" />
        <div className="absolute -bottom-40 left-1/3 w-[500px] h-[500px] bg-blue-600/8 rounded-full blur-[150px]" />
      </div>

      {/* Top Header */}
      <header className="relative z-10 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-xl px-5 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center font-black text-slate-950 text-lg shadow-md shadow-amber-500/25">
              A
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-wider text-white">AMEX <span className="text-amber-400">COURIER</span></span>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Portal Clientes
                </span>
              </div>
              <span className="block text-[11px] font-medium text-slate-400 tracking-wide">
                Casillero Internacional Miami • Perú
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="https://wa.me/51924811106?text=Hola%20AMEX%20Courier,%20necesito%20asistencia%20con%20mi%20casillero"
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-amber-400 bg-slate-900/90 hover:bg-slate-800/90 px-3.5 py-1.5 rounded-full border border-slate-700/60 transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>Soporte WhatsApp</span>
            </a>

            <div className="flex items-center gap-1.5 text-xs text-slate-300 bg-slate-900/90 px-3 py-1.5 rounded-full border border-slate-800">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden xs:inline">Conexión</span> Segura
            </div>
          </div>
        </div>
      </header>

      {/* Main Container - Spacious Split Layout */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8 my-auto">
        <div className="w-full max-w-5xl bg-slate-900/80 border border-slate-800/90 rounded-3xl shadow-2xl backdrop-blur-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[580px]">
          
          {/* ================= LEFT COLUMN: BRANDING & FEATURES ================= */}
          <div className="lg:col-span-5 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950/90 p-7 sm:p-10 border-b lg:border-b-0 lg:border-r border-slate-800/90 flex flex-col justify-between relative overflow-hidden">
            {/* Ambient Background Accent */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-[80px] pointer-events-none" />

            <div>
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold tracking-wider uppercase mb-6">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Casillero Postal Miami • Lima</span>
              </div>

              {/* Logo Box */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-6 mb-6 shadow-inner flex items-center justify-center">
                <img
                  src="/images/logo-amex-clean.png"
                  alt="AMEX Courier Logo Oficial"
                  className="w-full max-w-[240px] h-auto object-contain drop-shadow-[0_4px_16px_rgba(245,158,11,0.25)]"
                />
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug">
                Gestiona y rastrea tus compras internacionales
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed">
                Revisa tus paquetes recibidos en nuestra bodega de Miami con foto en alta definición y seguimiento hasta tus manos en Perú.
              </p>

              {/* Value Proposition List */}
              <div className="mt-8 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0 mt-0.5 text-amber-400">
                    <Plane className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-200">Vuelos continuos Miami ➔ Lima</h3>
                    <p className="text-[11px] text-slate-400">Despachos rápidos y alerta inmediata de arribo a almacén.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0 mt-0.5 text-amber-400">
                    <Camera className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-200">Fotografía real de tus paquetes</h3>
                    <p className="text-[11px] text-slate-400">Comprueba el estado de tu carga registrada en bodega.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0 mt-0.5 text-amber-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-200">Privacidad y Seguridad Blindada</h3>
                    <p className="text-[11px] text-slate-400">Base de datos dedicada e independiente para clientes.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Support Callout */}
            <div className="mt-8 pt-6 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <span>AMEX Courier S.A.C.</span>
              <span className="font-mono text-slate-500 text-[11px]">RUC 20607649082</span>
            </div>
          </div>

          {/* ================= RIGHT COLUMN: INTERACTIVE FORM & TABS ================= */}
          <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-center bg-slate-900/60">
            
            {/* Elegant Tab Switcher */}
            <div className="grid grid-cols-2 gap-1.5 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800 mb-8 max-w-md mx-auto w-full">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('login');
                  setErrorMessage(null);
                }}
                className={`py-2.5 px-4 text-xs sm:text-sm font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 ${
                  activeTab === 'login'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 shadow-md shadow-amber-500/25'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Acceso a Casillero</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('tracking');
                  setTrackingError(null);
                }}
                className={`py-2.5 px-4 text-xs sm:text-sm font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 ${
                  activeTab === 'tracking'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 shadow-md shadow-amber-500/25'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                <span>Rastreo Rápido</span>
              </button>
            </div>

            {/* -------------------- TAB 1: LOGIN -------------------- */}
            {activeTab === 'login' && (
              <div className="max-w-md mx-auto w-full animate-fade-in">
                <div className="mb-6 text-center sm:text-left">
                  <h1 className="text-2xl font-black text-white tracking-tight">
                    Iniciar Sesión
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1">
                    Ingresa con tu correo y contraseña asignada a tu casillero.
                  </p>
                </div>

                {errorMessage && (
                  <div className="mb-5 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start gap-2.5 animate-shake">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <span className="leading-relaxed font-medium">{errorMessage}</span>
                  </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                  {/* Field Email */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                      Correo Electrónico
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="tu-correo@ejemplo.com"
                        className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/30 transition-all font-medium"
                      />
                    </div>
                  </div>

                  {/* Field Password */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                        Contraseña
                      </label>
                      <a
                        href="https://wa.me/51924811106?text=Hola%20AMEX%20Courier,%20olvide%20mi%20contraseña%20de%20mi%20casillero"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold transition-colors"
                      >
                        ¿Olvidaste tu contraseña?
                      </a>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyUp={handleCapsLockCheck}
                        onKeyDown={handleCapsLockCheck}
                        placeholder="••••••••"
                        className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl py-3 pl-10 pr-11 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/30 transition-all font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors p-1"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {isCapsLockOn && (
                      <div className="mt-1.5 text-[11px] text-amber-400 flex items-center gap-1.5 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>Bloq Mayús está activado</span>
                      </div>
                    )}
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full mt-3 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black py-3.5 rounded-xl text-sm transition-all shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer uppercase tracking-wider"
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                        <span>Verificando credenciales...</span>
                      </div>
                    ) : (
                      <>
                        <span>Ingresar a mi Casillero</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>

                {/* Additional Guidance */}
                <div className="mt-8 pt-6 border-t border-slate-800/80 text-center space-y-2">
                  <p className="text-xs text-slate-400">
                    ¿Aún no tienes casillero en Miami?{' '}
                    <a 
                      href="https://wa.me/51924811106?text=Hola%20AMEX%20Courier,%20deseo%20abrir%20un%20casillero%20postal%20en%20Miami"
                      target="_blank"
                      rel="noreferrer"
                      className="text-amber-400 font-bold hover:underline"
                    >
                      Solicítalo gratis aquí
                    </a>
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Acceso autorizado únicamente para clientes registrados de AMEX Courier.
                  </p>
                </div>
              </div>
            )}

            {/* -------------------- TAB 2: QUICK TRACKING -------------------- */}
            {activeTab === 'tracking' && (
              <div className="max-w-md mx-auto w-full animate-fade-in">
                <div className="mb-6 text-center sm:text-left">
                  <h2 className="text-2xl font-black text-white tracking-tight">
                    Consulta Rápida de Paquete
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1">
                    Ingresa tu número de Warehouse Receipt (WR) o Tracking USA para ver el estado inmediato sin iniciar sesión.
                  </p>
                </div>

                <form onSubmit={handleQuickTracking} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                      Número de Guía / Tracking
                    </label>
                    <div className="relative">
                      <Package className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        required
                        value={searchWr}
                        onChange={(e) => setSearchWr(e.target.value)}
                        placeholder="Ej: WR000486257 o TBA..."
                        className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/30 transition-all uppercase font-mono font-semibold"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSearching}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3.5 rounded-xl text-sm transition-all border border-slate-700/80 shadow-md flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {isSearching ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Buscando en bodega...</span>
                      </div>
                    ) : (
                      <>
                        <Search className="w-4 h-4 text-amber-400" />
                        <span>Consultar Estado del Paquete</span>
                      </>
                    )}
                  </button>
                </form>

                {trackingError && (
                  <div className="mt-5 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2.5 animate-shake">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                    <span className="leading-relaxed">{trackingError}</span>
                  </div>
                )}

                {trackingResult && (
                  <div className="mt-6 p-5 rounded-2xl bg-slate-950/90 border border-slate-800 shadow-xl space-y-4 animate-fade-in">
                    
                    {/* Header info */}
                    <div className="flex items-center justify-between border-b border-slate-800/90 pb-3">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Recibo Warehouse</span>
                        <p className="text-lg font-black text-amber-400 font-mono tracking-tight">
                          {trackingResult.numero_recibo_bodega}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Peso Registrado</span>
                        <p className="text-sm font-bold text-slate-100">
                          {trackingResult.peso_kg ? `${trackingResult.peso_kg} kg` : 'Por pesar'}
                        </p>
                      </div>
                    </div>

                    {/* Tracking details */}
                    <div className="text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Tracking USA:</span>
                        <span className="text-slate-200 font-mono font-medium truncate max-w-[200px]">
                          {trackingResult.tracking || 'No especificado'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Consignatario:</span>
                        <span className="text-slate-200 font-medium truncate max-w-[200px]">
                          {trackingResult.nombre_consignatario || 'Cliente AMEX'}
                        </span>
                      </div>
                    </div>

                    {/* Status Box */}
                    <div className="pt-2 border-t border-slate-800/80">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block mb-2">Estado Logístico</span>
                      {trackingResult.estado_amex === 'en_almacen' ? (
                        <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2.5">
                          <Building2 className="w-4 h-4 shrink-0" />
                          <span>¡En Almacén Lince! (Listo para retiro o entrega)</span>
                        </div>
                      ) : trackingResult.estado_tib === 'Enviado' ? (
                        <div className="p-3 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 text-xs font-bold flex items-center gap-2.5">
                          <Plane className="w-4 h-4 shrink-0" />
                          <span>En Vuelo Internacional Miami ➔ Lima</span>
                        </div>
                      ) : (
                        <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold flex items-center gap-2.5">
                          <Clock className="w-4 h-4 shrink-0" />
                          <span>Recibido en Bodega Miami (TIB)</span>
                        </div>
                      )}
                    </div>

                    {/* Photo Action */}
                    {trackingResult.tib_imagen_url && (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => setPreviewPhoto(trackingResult.tib_imagen_url)}
                          className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-xl text-xs font-bold text-amber-400 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>📷 Ver Foto Tomada en Miami</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

          </div>

        </div>
      </main>

      {/* Modal para ver Foto del Paquete */}
      {previewPhoto && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewPhoto(null)}
        >
          <div 
            className="relative bg-slate-900 border border-slate-800 rounded-3xl p-4 max-w-lg w-full max-h-[90vh] flex flex-col items-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-bold text-slate-200">Foto registrada en Bodega Miami</span>
              <button 
                type="button"
                onClick={() => setPreviewPhoto(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>
            <div className="my-3 overflow-auto max-h-[65vh] rounded-xl border border-slate-800 bg-slate-950">
              <img
                src={previewPhoto}
                alt="Foto del paquete en bodega"
                className="w-full h-auto object-contain"
              />
            </div>
            <a
              href={previewPhoto}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-amber-400 hover:underline flex items-center gap-1 font-semibold"
            >
              <span>Abrir imagen en alta resolución</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800/60 py-4 px-6 text-center text-xs text-slate-500 bg-slate-950/40">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© {new Date().getFullYear()} AMEX COURIER PERÚ — Todos los derechos reservados.</p>
          <p className="text-[11px] text-slate-600">Servicio de Casillero Postal USA &bull; Sistema Exclusivo de Clientes</p>
        </div>
      </footer>
    </div>
  );
}
