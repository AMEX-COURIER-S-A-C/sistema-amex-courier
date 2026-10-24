'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
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
  Clock
} from 'lucide-react';

export default function ClienteLoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'login' | 'tracking'>('login');

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Quick Tracking state
  const [searchWr, setSearchWr] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [trackingResult, setTrackingResult] = useState<any | null>(null);
  const [trackingError, setTrackingError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        throw new Error(error.message === 'Invalid login credentials' 
          ? 'Correo o contraseña incorrectos. Revisa tus datos.' 
          : error.message);
      }

      if (data.session) {
        router.push('/clientes');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al iniciar sesión');
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
      // Buscar paquete por WR o Tracking
      const { data, error } = await supabase
        .from('paquetes')
        .select('id, numero_recibo_bodega, tracking, peso_kg, estado_tib, estado_amex, tib_imagen_url, creado_en')
        .or(`numero_recibo_bodega.ilike.%${code}%,tracking.ilike.%${code}%`)
        .order('creado_en', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setTrackingError(`No encontramos ningún paquete con el código "${code}". Verifica el número.`);
      } else {
        setTrackingResult(data);
      }
    } catch (err: any) {
      setTrackingError(err.message || 'Error al consultar tracking');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col justify-between selection:bg-amber-500 selection:text-white">
      {/* Background Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-amber-500/10 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 -right-40 w-96 h-96 bg-blue-600/10 rounded-full blur-[140px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center font-black text-slate-950 text-xl shadow-lg shadow-amber-500/20">
              A
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-wider text-white">AMEX <span className="text-amber-400">COURIER</span></span>
              <span className="block text-[11px] font-medium text-slate-400 tracking-wider">PORTAL DE CLIENTES</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-900/80 px-3 py-1.5 rounded-full border border-slate-800">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Acceso Seguro Encriptado</span>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 my-6">
        <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          
          {/* Switch Tabs */}
          <div className="grid grid-cols-2 gap-1 bg-slate-950/80 p-1 rounded-2xl border border-slate-800 mb-6">
            <button
              type="button"
              onClick={() => setActiveTab('login')}
              className={`py-2.5 text-xs sm:text-sm font-semibold rounded-xl transition-all duration-200 ${
                activeTab === 'login'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Iniciar Sesión
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('tracking')}
              className={`py-2.5 text-xs sm:text-sm font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 ${
                activeTab === 'tracking'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              Rastreo Rápido
            </button>
          </div>

          {/* TAB 1: LOGIN */}
          {activeTab === 'login' && (
            <div>
              <div className="mb-6">
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Bienvenido a tu Casillero
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  Ingresa para ver el estado de tus compras en Miami y Lima.
                </p>
              </div>

              {errorMessage && (
                <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Correo Electrónico
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tu-correo@ejemplo.com"
                      className="w-full bg-slate-950/70 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Contraseña
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-950/70 border border-slate-800 rounded-xl py-2.5 pl-10 pr-10 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold py-3 rounded-xl text-sm transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Entrar a mi Panel</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 pt-5 border-t border-slate-800/80 text-center">
                <p className="text-xs text-slate-400">
                  ¿Eres cliente nuevo y recibiste invitación?{' '}
                  <Link href="/clientes/registro" className="text-amber-400 font-semibold hover:underline">
                    Activa tu cuenta aquí
                  </Link>
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: QUICK TRACKING */}
          {activeTab === 'tracking' && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Consulta tu Envío
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  Ingresa tu número de Warehouse (WR) o Tracking USA.
                </p>
              </div>

              <form onSubmit={handleQuickTracking} className="space-y-4">
                <div>
                  <div className="relative">
                    <Package className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={searchWr}
                      onChange={(e) => setSearchWr(e.target.value)}
                      placeholder="Ej: WR000486257 o TBA..."
                      className="w-full bg-slate-950/70 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors uppercase"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSearching}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold py-2.5 rounded-xl text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSearching ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      <span>Buscar Paquete</span>
                    </>
                  )}
                </button>
              </form>

              {trackingError && (
                <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{trackingError}</span>
                </div>
              )}

              {trackingResult && (
                <div className="mt-5 p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500">Warehouse</span>
                      <p className="text-base font-extrabold text-amber-400 font-mono">
                        {trackingResult.numero_recibo_bodega}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-500">Peso</span>
                      <p className="text-sm font-semibold text-slate-200">
                        {trackingResult.peso_kg ? `${trackingResult.peso_kg} kg` : 'Por registrar'}
                      </p>
                    </div>
                  </div>

                  {/* Visual Status Indicator */}
                  <div className="py-2">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1.5">Estado Actual</span>
                    {trackingResult.estado_amex === 'en_almacen' ? (
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                        <Building2 className="w-3.5 h-3.5" />
                        <span>En Almacén Lince (Listo para retiro)</span>
                      </div>
                    ) : trackingResult.estado_tib === 'Enviado' ? (
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-400 text-xs font-semibold">
                        <Plane className="w-3.5 h-3.5" />
                        <span>En Vuelo Miami ➔ Lima</span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-semibold">
                        <Clock className="w-3.5 h-3.5" />
                        <span>En Bodega Miami (TIB)</span>
                      </div>
                    )}
                  </div>

                  {trackingResult.tib_imagen_url && (
                    <div className="pt-2">
                      <a
                        href={trackingResult.tib_imagen_url}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700/60 rounded-xl text-xs font-semibold text-slate-200 flex items-center justify-center gap-2 transition-colors"
                      >
                        <span>📷 Ver Foto tomada en Miami</span>
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800/60 py-4 px-6 text-center text-xs text-slate-500">
        <p>© {new Date().getFullYear()} AMEX COURIER PERÚ — Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}
