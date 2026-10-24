'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabasePortal } from '@/lib/supabase/portal-client';
import { getLoginThemeTokens } from '@/lib/themes/seasonalConfig';
import { HalloweenBackdrop, HalloweenCornerWebs } from '@/components/themes/HalloweenBackdrop';
import { 
  Package, 
  Search, 
  Lock, 
  Mail, 
  ArrowRight, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  ShieldCheck,
  Building2,
  Plane,
  Clock,
  Camera,
  ExternalLink
} from 'lucide-react';

export default function ClienteLoginPage() {
  const router = useRouter();
  const theme = getLoginThemeTokens();

  const [activeTab, setActiveTab] = useState<'login' | 'tracking'>('login');

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isCapsLockOn, setIsCapsLockOn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTransitioningIn, setIsTransitioningIn] = useState(false);
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
    if (isLoading || isTransitioningIn) return;
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
        await supabasePortal.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });

        setIsTransitioningIn(true);
        setTimeout(() => {
          router.push('/clientes');
        }, 450);
        return;
      }

      throw new Error('No se pudo establecer la sesión.');
    } catch (err: any) {
      try {
        const { data: directAuth, error: directError } = await supabasePortal.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (!directError && directAuth.session) {
          setIsTransitioningIn(true);
          setTimeout(() => {
            router.push('/clientes');
          }, 450);
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

  // Cortina de entrada tras login exitoso
  if (isTransitioningIn) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: theme.pageBackground,
          color: '#f8fafc',
          fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
          padding: 24,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {theme.isHalloween && <HalloweenBackdrop />}
        <style>{`
          @keyframes amexEntryCardIn {
            from { opacity: 0; transform: scale(0.97) translateY(6px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
          }
          @keyframes amexProgressSlide {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(250%); }
          }
        `}</style>
        <div
          style={{
            position: 'relative',
            zIndex: 2,
            padding: '28px 36px',
            borderRadius: 20,
            background: 'rgba(15, 23, 42, 0.88)',
            backdropFilter: 'blur(16px)',
            border: theme.shellBorder,
            boxShadow: theme.shellShadow,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            maxWidth: 400,
            width: '100%',
            textAlign: 'center',
            animation: 'amexEntryCardIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          }}
        >
          <div
            style={{
              padding: '12px 22px',
              borderRadius: 14,
              background: 'rgba(9, 13, 22, 0.9)',
              border: theme.logoBoxBorder,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 18,
            }}
          >
            <img
              src="/images/logo-amex-clean.png"
              alt="AMEX Courier"
              style={{ height: 38, width: 'auto', objectFit: 'contain', filter: theme.logoDropShadow }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 6 }}>
            <i className="fa-solid fa-ghost fa-bounce" style={{ color: theme.spinnerColor, fontSize: 16 }} />
            <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.2px', color: '#f8fafc' }}>
              Abriendo tu Casillero AMEX
            </span>
          </div>
          <p style={{ fontSize: 12, color: '#94a3b8', margin: '0 0 18px 0', lineHeight: 1.45 }}>
            Sincronizando estado de paquetes y guías...
          </p>

          <div
            style={{
              width: '100%',
              height: 4,
              borderRadius: 999,
              background: 'rgba(255, 255, 255, 0.08)',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <div
              style={{
                width: '45%',
                height: '100%',
                borderRadius: 999,
                background: theme.progressGradient,
                animation: 'amexProgressSlide 1.1s cubic-bezier(0.4, 0, 0.2, 1) infinite',
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="amex-client-portal min-h-screen text-slate-100 flex flex-col justify-between selection:bg-orange-500 selection:text-slate-950 font-sans relative overflow-x-hidden"
      data-portal="client" 
      data-lenis-prevent
      style={{
        background: theme.pageBackground,
        minHeight: '100dvh',
      }}
    >
      {/* Escena Dinámica Halloween (Luna de cosecha, brujas, murciélagos, calabazas, chispas) */}
      {theme.isHalloween && <HalloweenBackdrop />}

      <style>{`
        @keyframes amexShellIn {
          from { opacity: 0; transform: translateY(12px) scale(0.99); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .amex-portal-shell {
          position: relative;
          z-index: 2;
          width: 100%;
          max-width: 960px;
          border-radius: 24px;
          overflow: hidden;
          background: rgba(15, 23, 42, 0.82);
          backdrop-filter: blur(20px);
          border: ${theme.shellBorder};
          box-shadow: ${theme.shellShadow};
          animation: amexShellIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          --spot-x: 50%;
          --spot-y: 50%;
          --spot-opacity: 0;
        }
        .amex-portal-shell::before {
          content: '';
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 4;
          background: radial-gradient(
            440px circle at var(--spot-x) var(--spot-y),
            rgba(249, 115, 22, 0.12),
            transparent 65%
          );
          opacity: var(--spot-opacity);
          transition: opacity 0.25s ease;
        }
        .amex-portal-input {
          width: 100%;
          padding: 12px 14px 12px 40px;
          border-radius: 12px;
          background: rgba(9, 13, 22, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #f8fafc;
          font-size: 13.5px;
          outline: none;
          box-sizing: border-box;
          transition: all 0.18s ease;
        }
        .amex-portal-input:focus {
          border-color: ${theme.inputFocusBorder};
          box-shadow: ${theme.inputFocusShadow};
          background: rgba(9, 13, 22, 0.94);
        }
        .amex-halloween-btn {
          background: ${theme.submitBtnBackground};
          border: ${theme.submitBtnBorder};
          box-shadow: ${theme.submitBtnShadow};
          transition: all 0.18s ease;
        }
        .amex-halloween-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: ${theme.submitBtnHoverShadow};
          filter: brightness(1.08);
        }
      `}</style>

      {/* Top Header - Limpio con Logo Oficial */}
      <header className="relative z-10 border-b border-orange-500/20 bg-slate-950/75 backdrop-blur-xl px-5 sm:px-8 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/images/logo-amex-clean.png"
              alt="AMEX Courier"
              className="h-8 w-auto object-contain drop-shadow-[0_2px_8px_rgba(249,115,22,0.35)]"
            />
          </div>

          <div className="flex items-center gap-3">
            <a
              href="https://wa.me/51924811106?text=Hola%20AMEX%20Courier,%20necesito%20asistencia%20con%20mi%20casillero"
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-orange-400 bg-slate-900/90 hover:bg-slate-800/90 px-3.5 py-1.5 rounded-full border border-orange-500/30 transition-colors"
            >
              <i className="fa-brands fa-whatsapp text-emerald-400 text-sm" />
              <span>Soporte WhatsApp</span>
            </a>

            <div className="flex items-center gap-1.5 text-xs text-slate-300 bg-slate-900/90 px-3 py-1.5 rounded-full border border-slate-800">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden xs:inline">Conexión</span> Segura
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8 my-auto">
        <div 
          className="amex-portal-shell grid grid-cols-1 lg:grid-cols-12 min-h-[520px]"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            e.currentTarget.style.setProperty('--spot-x', `${e.clientX - rect.left}px`);
            e.currentTarget.style.setProperty('--spot-y', `${e.clientY - rect.top}px`);
            e.currentTarget.style.setProperty('--spot-opacity', '1');
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.setProperty('--spot-opacity', '0');
          }}
        >
          {/* Telarañas de esquina */}
          {theme.isHalloween && <HalloweenCornerWebs />}
          
          {/* ================= LEFT COLUMN: CLEAN BRANDING ================= */}
          <div 
            className="lg:col-span-5 p-8 sm:p-12 border-b lg:border-b-0 lg:border-r border-orange-500/25 flex flex-col justify-center relative overflow-hidden"
            style={{ background: theme.leftPanelBackground }}
          >
            <div className="space-y-6 max-w-sm mx-auto lg:mx-0">
              {/* Logo Box Oficial */}
              <div 
                className="rounded-2xl p-6 flex items-center justify-center"
                style={{
                  background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.9) 0%, rgba(7, 4, 15, 0.95) 100%)',
                  border: theme.logoBoxBorder,
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 12px 30px rgba(0,0,0,0.5)',
                }}
              >
                <img
                  src="/images/logo-amex-clean.png"
                  alt="AMEX Courier Logo Oficial"
                  className="w-full max-w-[240px] h-auto object-contain"
                  style={{ filter: theme.logoDropShadow }}
                />
              </div>

              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug">
                  Tu Casillero en Miami & Lima
                </h2>
                <p className="text-xs sm:text-sm text-slate-300/80 mt-2 leading-relaxed">
                  Rastrea tus compras en tiempo real y revisa la evidencia fotográfica registrada en bodega.
                </p>
              </div>
            </div>
          </div>

          {/* ================= RIGHT COLUMN: INTERACTIVE FORM & TABS ================= */}
          <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-center bg-slate-900/60 relative z-10">
            
            {/* Elegant Tab Switcher */}
            <div className="grid grid-cols-2 gap-1.5 bg-slate-950/85 p-1.5 rounded-2xl border border-orange-500/25 mb-8 max-w-md mx-auto w-full shadow-lg">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('login');
                  setErrorMessage(null);
                }}
                className={`py-2.5 px-4 text-xs sm:text-sm font-extrabold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 ${
                  activeTab === 'login'
                    ? 'amex-halloween-btn text-white'
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
                className={`py-2.5 px-4 text-xs sm:text-sm font-extrabold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 ${
                  activeTab === 'tracking'
                    ? 'amex-halloween-btn text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                <span>Rastreo Rápido</span>
              </button>
            </div>

            {/* -------------------- TAB 1: LOGIN -------------------- */}
            {activeTab === 'login' && (
              <div className="max-w-md mx-auto w-full">
                <div className="mb-6 text-center sm:text-left">
                  <h1 className="text-2xl font-black text-white tracking-tight">
                    Iniciar Sesión
                  </h1>
                </div>

                {errorMessage && (
                  <div className="mb-5 p-3.5 rounded-2xl bg-red-500/15 border border-red-500/40 text-red-300 text-xs flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <span className="leading-relaxed font-semibold">{errorMessage}</span>
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
                        className="amex-portal-input"
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
                        className="text-[11px] text-orange-400 hover:text-orange-300 font-semibold transition-colors"
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
                        className="amex-portal-input pr-11"
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
                      <div className="mt-1.5 text-[11px] text-amber-400 flex items-center gap-1.5 bg-amber-500/15 px-2.5 py-1 rounded-lg border border-amber-500/30">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>Bloq Mayús está activado</span>
                      </div>
                    )}
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full mt-3 amex-halloween-btn text-white font-black py-3.5 rounded-xl text-sm transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer uppercase tracking-wider"
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
                <div className="mt-6 pt-5 border-t border-slate-800/80 text-center">
                  <p className="text-xs text-slate-400">
                    ¿Aún no tienes casillero en Miami?{' '}
                    <a 
                      href="https://wa.me/51924811106?text=Hola%20AMEX%20Courier,%20deseo%20abrir%20un%20casillero%20postal%20en%20Miami"
                      target="_blank"
                      rel="noreferrer"
                      className="text-orange-400 font-bold hover:underline"
                    >
                      Solicítalo gratis aquí
                    </a>
                  </p>
                </div>
              </div>
            )}

            {/* -------------------- TAB 2: QUICK TRACKING -------------------- */}
            {activeTab === 'tracking' && (
              <div className="max-w-md mx-auto w-full">
                <div className="mb-6 text-center sm:text-left">
                  <h2 className="text-2xl font-black text-white tracking-tight">
                    Consulta tu Envío
                  </h2>
                </div>

                <form onSubmit={handleQuickTracking} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                      Número de Guía o Tracking USA
                    </label>
                    <div className="relative">
                      <Package className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        required
                        value={searchWr}
                        onChange={(e) => setSearchWr(e.target.value)}
                        placeholder="Ej: WR000486257 o TBA..."
                        className="amex-portal-input uppercase font-mono font-semibold"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSearching}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3.5 rounded-xl text-sm transition-all border border-orange-500/30 shadow-md flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {isSearching ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Buscando en bodega...</span>
                      </div>
                    ) : (
                      <>
                        <Search className="w-4 h-4 text-orange-400" />
                        <span>Consultar Estado del Paquete</span>
                      </>
                    )}
                  </button>
                </form>

                {trackingError && (
                  <div className="mt-5 p-4 rounded-2xl bg-orange-500/10 border border-orange-500/35 text-orange-300 text-xs flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-orange-400" />
                    <span className="leading-relaxed">{trackingError}</span>
                  </div>
                )}

                {trackingResult && (
                  <div className="mt-6 p-5 rounded-2xl bg-slate-950/90 border border-orange-500/30 shadow-2xl space-y-4">
                    
                    {/* Header info */}
                    <div className="flex items-center justify-between border-b border-slate-800/90 pb-3">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Recibo Warehouse</span>
                        <p className="text-lg font-black text-orange-400 font-mono tracking-tight">
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
                          <span>¡En Almacén Lince! (Listo para entrega)</span>
                        </div>
                      ) : trackingResult.estado_tib === 'Enviado' ? (
                        <div className="p-3 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 text-xs font-bold flex items-center gap-2.5">
                          <Plane className="w-4 h-4 shrink-0" />
                          <span>En Vuelo Internacional Miami ➔ Lima</span>
                        </div>
                      ) : (
                        <div className="p-3 rounded-xl bg-orange-500/15 border border-orange-500/35 text-orange-300 text-xs font-bold flex items-center gap-2.5">
                          <Clock className="w-4 h-4 shrink-0 text-orange-400" />
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
                          className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 border border-orange-500/40 rounded-xl text-xs font-bold text-orange-300 flex items-center justify-center gap-2 transition-colors cursor-pointer"
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
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setPreviewPhoto(null)}
        >
          <div 
            className="relative bg-slate-900 border border-orange-500/30 rounded-3xl p-4 max-w-lg w-full max-h-[90vh] flex flex-col items-center shadow-2xl"
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
              className="text-xs text-orange-400 hover:underline flex items-center gap-1 font-semibold"
            >
              <span>Abrir imagen en alta resolución</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}

      {/* Footer Limpio */}
      <footer className="relative z-10 border-t border-orange-500/20 py-4 px-6 text-center text-xs text-slate-400 bg-slate-950/60">
        <p>© {new Date().getFullYear()} AMEX COURIER PERÚ — Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}
