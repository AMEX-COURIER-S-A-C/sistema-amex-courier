'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { SESSION_START_COOKIE, SESSION_MAX_AGE_SECONDS } from '@/lib/auth/constants';
import { getLoginThemeTokens } from '@/lib/themes/seasonalConfig';
import { HalloweenBackdrop, HalloweenCornerWebs } from '@/components/themes/HalloweenBackdrop';

export default function LoginPage() {
  const theme = getLoginThemeTokens();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTransitioningIn, setIsTransitioningIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [recoverySent, setRecoverySent] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [recoveryAccessToken, setRecoveryAccessToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Estados para mostrar / ocultar contraseñas (botón de ojo) y detector de Bloq Mayús
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isCapsLockOn, setIsCapsLockOn] = useState(false);

  const handleCapsLockCheck = (
    e: React.KeyboardEvent<HTMLInputElement> | React.MouseEvent<HTMLInputElement>
  ) => {
    if (typeof e.getModifierState === 'function') {
      setIsCapsLockOn(e.getModifierState('CapsLock'));
    }
  };

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.classList.add('login-page');
    }
    return () => {
      if (typeof document !== 'undefined') {
        document.body.classList.remove('login-page');
      }
    };
  }, []);

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  useEffect(() => {
    if (!successMessage) return;
    const timer = setTimeout(() => {
      setSuccessMessage(null);
    }, 3000);
    return () => clearTimeout(timer);
  }, [successMessage]);

  useEffect(() => {
    let tokenFromHash: string | null = null;
    let refreshTokenFromHash: string | null = null;

    if (typeof window !== 'undefined' && window.location.hash) {
      const hashStr = window.location.hash.startsWith('#')
        ? window.location.hash.substring(1)
        : window.location.hash;
      const hashParams = new URLSearchParams(hashStr);
      tokenFromHash = hashParams.get('access_token');
      refreshTokenFromHash = hashParams.get('refresh_token');
    }

    const params = new URLSearchParams(window.location.search);
    const isRecoveredFlag = params.get('recovered') === 'true';

    // Capturar y preservar el token de recuperación
    if (tokenFromHash) {
      setIsRecoveryMode(true);
      setRecoveryAccessToken(tokenFromHash);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('amex_recovery_token', tokenFromHash);
      }

      // Activar la sesión en el cliente Supabase
      supabase.auth.setSession({
        access_token: tokenFromHash,
        refresh_token: refreshTokenFromHash || '',
      }).catch(() => {});

      // Limpiar hash de la URL para estética y seguridad
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
      }, 400);
    } else if (isRecoveredFlag) {
      setIsRecoveryMode(true);
      if (typeof window !== 'undefined') {
        const stored = sessionStorage.getItem('amex_recovery_token');
        if (stored) setRecoveryAccessToken(stored);
      }
    }

    const errorParam = params.get('error');
    const logoutParam = params.get('logout');
    if (errorParam === 'session-expired') {
      setErrorMessage('Tu sesión ha caducado automáticamente tras 8 horas de jornada por motivos de seguridad. Por favor, inicia sesión nuevamente.');
    } else if (errorParam === 'permissions-updated') {
      setErrorMessage('Tus permisos y accesos han sido actualizados por el Administrador. Por favor, inicia sesión nuevamente para ingresar con tus nuevos accesos.');
    } else if (errorParam === 'account-disabled') {
      setErrorMessage('Tu cuenta ha sido desactivada por el Administrador. Comunícate con gerencia para más información.');
    } else if (logoutParam === '1') {
      setSuccessMessage('Has cerrado sesión correctamente. Tu estación de trabajo ha quedado protegida.');
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', '/login');
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveryMode(true);
        if (session?.access_token) {
          setRecoveryAccessToken(session.access_token);
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('amex_recovery_token', session.access_token);
          }
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || isTransitioningIn) return;
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const { data: signInData, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });

      if (error) {
        throw error;
      }

      // Grabar marca de inicio de sesión con vigencia estricta de 8 horas
      if (typeof document !== 'undefined') {
        const secureFlag = window.location.protocol === 'https:' ? 'Secure;' : '';
        document.cookie = `${SESSION_START_COOKIE}=${Date.now()}; path=/; max-age=${SESSION_MAX_AGE_SECONDS}; SameSite=Lax; ${secureFlag}`;
      }

      // Pre-hidratar sesión en sessionStorage para apertura instantánea (0ms) en el panel
      if (typeof window !== 'undefined' && signInData?.user) {
        try {
          const authUser = signInData.user;
          const metadata = authUser.user_metadata || {};
          const appMetadata = authUser.app_metadata || {};
          const emailLower = (authUser.email || '').trim().toLowerCase();
          const rol =
            (appMetadata.rol as string) ||
            (metadata.rol as string) ||
            (emailLower === 'sistemaamexcourier@gmail.com' ? 'Administrador' : 'Operador Logístico');
          const normRole = rol.trim().toLowerCase();
          const isAdmin =
            normRole === 'admin' ||
            normRole === 'administrador' ||
            emailLower === 'sistemaamexcourier@gmail.com';

          sessionStorage.setItem(
            'amex_cached_session_user',
            JSON.stringify({
              id: authUser.id,
              nombre:
                (metadata.nombre_completo as string) ||
                (metadata.nombre as string) ||
                authUser.email?.split('@')[0] ||
                'Administrador AMEX',
              email: authUser.email || '',
              rol,
              permisos: {},
              isAdmin,
            })
          );
        } catch {}
      }

      // Activar cortina de entrada fluida (manteniendo el estado ocupado hasta completar la navegación)
      setIsTransitioningIn(true);
      const nextPath = new URLSearchParams(window.location.search).get('next');
      const targetPath = nextPath?.startsWith('/') ? nextPath : '/dashboard';

      setTimeout(() => {
        window.location.replace(targetPath);
      }, 60);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al iniciar sesión';
      setErrorMessage(msg === 'Invalid login credentials' ? 'Correo o contraseña incorrectos.' : msg);
      setIsLoading(false);
    }
  };

  const handlePasswordRecovery = async () => {
    if (!email.trim()) {
      setErrorMessage('Ingresa tu correo electrónico corporativo para enviarte el enlace de recuperación.');
      return;
    }
    if (cooldownSeconds > 0) {
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await fetch('/api/auth/recuperar-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 429 && data.retryAfter) {
          setCooldownSeconds(data.retryAfter);
        }
        throw new Error(data.error || 'Error al enviar recuperación');
      }
      setRecoverySent(true);
      setCooldownSeconds(45);
      setErrorMessage(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al enviar recuperación';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || isTransitioningIn) return;
    if (newPassword.length < 8) {
      setErrorMessage('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('Las contraseñas no coinciden.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const token = recoveryAccessToken || (typeof window !== 'undefined' ? sessionStorage.getItem('amex_recovery_token') : null);

    try {
      // 1. Intento primario: Usar el endpoint backend blindado con el token de recuperación
      if (token) {
        const res = await fetch('/api/auth/cambiar-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessToken: token, newPassword }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'No se pudo actualizar la contraseña.');
        }

        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('amex_recovery_token');
        }

        setSuccessMessage('¡Contraseña actualizada con éxito! Ingresando al sistema...');
        setTimeout(() => {
          setIsTransitioningIn(true);
          window.history.replaceState({}, '', '/login');
          window.location.replace('/dashboard');
        }, 800);
        return;
      }

      // 2. Fallback estándar cliente Supabase
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      setSuccessMessage('¡Contraseña actualizada con éxito! Ingresando al sistema...');
      setTimeout(() => {
        setIsTransitioningIn(true);
        window.history.replaceState({}, '', '/login');
        window.location.replace('/dashboard');
      }, 800);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'No se pudo actualizar la contraseña.';
      if (msg === 'Auth session missing!') {
        setErrorMessage('El enlace de recuperación ha caducado o no se detectó el token. Por favor, solicita un nuevo enlace de recuperación.');
      } else {
        setErrorMessage(msg);
      }
      setIsLoading(false);
    }
  };

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
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(16px)',
            border: theme.shellBorder,
            boxShadow: theme.shellShadow,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            maxWidth: 380,
            width: '100%',
            textAlign: 'center',
            animation: 'amexEntryCardIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          }}
        >
          <div
            style={{
              padding: '12px 20px',
              borderRadius: 14,
              background: 'rgba(9, 13, 22, 0.88)',
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
              style={{ height: 40, width: 'auto', objectFit: 'contain', filter: theme.logoDropShadow }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 6 }}>
            <i className="fa-solid fa-circle-notch fa-spin" style={{ color: theme.spinnerColor, fontSize: 15 }} />
            <span style={{ fontSize: 14.5, fontWeight: 800, letterSpacing: '-0.2px', color: '#f8fafc' }}>
              Preparando estación de trabajo
            </span>
          </div>
          <p style={{ fontSize: 12, color: '#94a3b8', margin: '0 0 18px 0', lineHeight: 1.45 }}>
            Sincronizando credenciales y módulos operativos...
          </p>

          <div
            style={{
              width: '100%',
              height: 4,
              borderRadius: 999,
              background: 'rgba(255, 255, 255, 0.07)',
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
                animation: 'amexProgressSlide 1.15s cubic-bezier(0.4, 0, 0.2, 1) infinite',
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="amex-login-viewport"
      style={{
        minHeight: '100dvh',
        width: '100%',
        background: theme.pageBackground,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        position: 'relative',
        overflowY: 'auto',
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {theme.isHalloween && <HalloweenBackdrop />}

      <style>{`
        @keyframes amexLoginShellIn {
          from { opacity: 0; transform: translateY(10px) scale(0.992); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .amex-login-shell {
          position: relative;
          z-index: 2;
          width: 100%;
          max-width: 980px;
          display: grid;
          grid-template-columns: 1.08fr 1fr;
          border-radius: 22px;
          overflow: hidden;
          background: rgba(15, 23, 42, 0.8);
          backdrop-filter: blur(20px);
          border: ${theme.shellBorder};
          box-shadow: ${theme.shellShadow};
          animation: amexLoginShellIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          --spot-x: 50%;
          --spot-y: 50%;
          --spot-opacity: 0;
        }
        .amex-login-shell::before {
          content: '';
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 4;
          background: radial-gradient(
            420px circle at var(--spot-x) var(--spot-y),
            ${theme.isHalloween ? 'rgba(249, 115, 22, 0.11)' : 'rgba(56, 189, 248, 0.08)'},
            transparent 65%
          );
          opacity: var(--spot-opacity);
          transition: opacity 0.25s ease;
        }
        .amex-login-left {
          position: relative;
          padding: 42px 38px;
          background: ${theme.leftPanelBackground};
          border-right: 1px solid rgba(255, 255, 255, 0.07);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 28px;
        }
        .amex-login-right {
          position: relative;
          padding: 42px 38px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          background: rgba(15, 23, 42, 0.58);
          color: #f8fafc;
        }
        .amex-input-field {
          width: 100%;
          padding: 12px 14px 12px 38px;
          border-radius: 10px;
          background: rgba(9, 13, 22, 0.72);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #f8fafc;
          font-size: 13.5px;
          outline: none;
          box-sizing: border-box;
          transition: all 0.18s ease;
        }
        .amex-input-field:focus {
          border-color: ${theme.inputFocusBorder};
          box-shadow: ${theme.inputFocusShadow};
          background: rgba(9, 13, 22, 0.92);
        }
        .amex-submit-btn {
          margin-top: 6px;
          padding: 13px 16px;
          min-height: 48px;
          border-radius: 10px;
          background: ${theme.submitBtnBackground};
          color: #ffffff;
          border: ${theme.submitBtnBorder};
          font-weight: 800;
          font-size: 14px;
          letter-spacing: 0.2px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          box-shadow: ${theme.submitBtnShadow};
          transition: all 0.18s ease;
          width: 100%;
          touch-action: manipulation;
        }
        .amex-submit-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: ${theme.submitBtnHoverShadow};
          filter: brightness(1.06);
        }
        .amex-submit-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }
        @media (max-width: 860px) {
          .amex-login-viewport {
            padding: 16px 12px 32px 12px !important;
            align-items: center !important;
          }
          .amex-login-shell {
            grid-template-columns: 1fr;
            max-width: 480px;
            margin: auto;
          }
          .amex-login-left {
            padding: 22px 20px;
            border-right: none;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            gap: 16px;
          }
          .amex-login-right {
            padding: 24px 20px 28px 20px;
          }
        }
        @media (max-width: 640px) {
          .amex-login-viewport {
            padding: 10px 8px 36px 8px !important;
            min-height: 100dvh !important;
            display: flex !important;
            align-items: flex-start !important;
          }
          .amex-login-shell {
            border-radius: 16px !important;
            max-width: 100% !important;
            margin-top: 6px !important;
            margin-bottom: 20px !important;
          }
          .amex-login-left {
            padding: 14px 16px 10px 16px !important;
            gap: 8px !important;
          }
          .amex-login-left-badge {
            margin-bottom: 8px !important;
            font-size: 10px !important;
            padding: 4px 10px !important;
          }
          .amex-login-left-logo-box {
            padding: 10px 14px !important;
            margin-bottom: 8px !important;
            border-radius: 12px !important;
          }
          .amex-login-left-logo-img {
            max-width: 190px !important;
            max-height: 36px !important;
          }
          .amex-login-left-desc {
            display: none !important;
          }
          .amex-login-left-footer {
            display: none !important;
          }
          .amex-login-right {
            padding: 16px 16px 22px 16px !important;
          }
          .amex-login-right-head {
            margin-bottom: 14px !important;
          }
          .amex-login-right-title {
            font-size: 19px !important;
          }
          .amex-login-right-desc {
            font-size: 11.5px !important;
            margin-top: 3px !important;
          }
          .amex-input-field {
            font-size: 14px !important;
            padding: 11px 12px 11px 36px !important;
          }
          .amex-submit-btn {
            min-height: 48px !important;
            padding: 13px 16px !important;
            font-size: 14px !important;
            margin-top: 10px !important;
            margin-bottom: 4px !important;
          }
          .amex-login-mobile-footer {
            display: block !important;
            margin-top: 14px;
            text-align: center;
            font-size: 11px;
            color: #64748b;
          }
        }
      `}</style>

      <div
        className="amex-login-shell"
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
        {theme.isHalloween && <HalloweenCornerWebs />}

        {/* ==================== PANEL CORPORATIVO IZQUIERDO ==================== */}
        <div className="amex-login-left">
          {/* Top Badge & Logo Oficial */}
          <div>
            <div
              className="amex-login-left-badge"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '5px 12px',
                borderRadius: '999px',
                background: theme.badgeBackground,
                border: theme.badgeBorder,
                color: theme.badgeColor,
                fontSize: '11px',
                fontWeight: 800,
                letterSpacing: '0.7px',
                textTransform: 'uppercase',
                marginBottom: '22px',
              }}
            >
              <i className={theme.badgeIcon} style={{ fontSize: '11px' }} />
              <span>{theme.badgeText}</span>
            </div>

            {/* Contenedor del Logo Oficial AMEX Courier */}
            <div
              className="amex-login-left-logo-box"
              style={{
                background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.9) 0%, rgba(7, 11, 20, 0.95) 100%)',
                border: theme.logoBoxBorder,
                borderRadius: '16px',
                padding: '22px 24px',
                marginBottom: '18px',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 12px 30px rgba(0,0,0,0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <img
                className="amex-login-left-logo-img"
                src="/images/logo-amex-clean.png"
                alt="AMEX Courier Logo Oficial"
                style={{
                  width: '100%',
                  maxWidth: '290px',
                  height: 'auto',
                  objectFit: 'contain',
                  filter: theme.logoDropShadow,
                }}
              />
            </div>

            <p
              className="amex-login-left-desc"
              style={{
                fontSize: '13.5px',
                color: '#94a3b8',
                margin: 0,
                lineHeight: 1.55,
              }}
            >
              Plataforma integral para control de almacén WMS, manifiestos TIB, despacho de rutas y facturación internacional USA – Perú.
            </p>
          </div>

          {/* Pie Institucional */}
          <div
            className="amex-login-left-footer"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '8px',
              paddingTop: '14px',
              borderTop: '1px solid rgba(255, 255, 255, 0.07)',
              fontSize: '11.5px',
              color: '#64748b',
            }}
          >
            <span>AMEX Courier S.A.C. • RUC 20607649082</span>
          </div>
        </div>

        {/* ==================== PANEL DE AUTENTICACIÓN DERECHO ==================== */}
        <div className="amex-login-right">
          {/* Cabecera del Formulario */}
          <div className="amex-login-right-head" style={{ marginBottom: '26px' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11.5px',
                fontWeight: 700,
                color: theme.portalLabelColor,
                marginBottom: '6px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              <i className={theme.portalIcon} />
              <span>{isRecoveryMode ? 'Restablecimiento de Credenciales' : 'Portal de Operaciones'}</span>
            </div>
            <h1
              className="amex-login-right-title"
              style={{
                fontSize: '23px',
                fontWeight: 900,
                margin: 0,
                letterSpacing: '-0.3px',
                color: '#ffffff',
              }}
            >
              {isRecoveryMode ? 'Actualizar Contraseña' : 'Iniciar Sesión'}
            </h1>
            <p className="amex-login-right-desc" style={{ fontSize: '13px', color: '#94a3b8', marginTop: '6px', marginBottom: 0 }}>
              {isRecoveryMode
                ? 'Ingresa y confirma tu nueva clave corporativa de acceso.'
                : 'Ingresa tus credenciales autorizadas de AMEX Courier.'}
            </p>
          </div>

          {errorMessage && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                color: '#fca5a5',
                padding: '12px 14px',
                borderRadius: '10px',
                fontSize: '13px',
                marginBottom: '18px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <i className="fa-solid fa-circle-exclamation" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div
              style={{
                background: 'rgba(16, 185, 129, 0.2)',
                border: '1px solid rgba(16, 185, 129, 0.45)',
                color: '#86efac',
                padding: '12px 14px',
                borderRadius: '10px',
                fontSize: '13px',
                marginBottom: '18px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <i className="fa-solid fa-circle-check" style={{ color: '#34d399' }} />
              <span>{successMessage}</span>
            </div>
          )}

          {recoverySent && (
            <div
              style={{
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                color: '#86efac',
                padding: '14px 16px',
                borderRadius: '10px',
                fontSize: '13px',
                marginBottom: '18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800 }}>
                <i className="fa-solid fa-circle-check" style={{ color: '#34d399' }} />
                <span>Enlace enviado a tu correo</span>
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: '#cbd5e1', lineHeight: 1.5 }}>
                Hemos enviado un enlace seguro a <strong>{email}</strong>. Revisa tu bandeja de entrada o spam. El enlace caduca en 60 minutos.
              </p>
            </div>
          )}

          <form
            onSubmit={isRecoveryMode ? handlePasswordUpdate : handleLogin}
            style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}
          >
            <div style={{ display: isRecoveryMode ? 'none' : 'block' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#cbd5e1',
                  marginBottom: '6px',
                }}
              >
                Correo Corporativo
              </label>
              <div style={{ position: 'relative' }}>
                <i
                  className="fa-solid fa-envelope"
                  style={{
                    position: 'absolute',
                    left: '13px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#64748b',
                    fontSize: '14px',
                  }}
                />
                <input
                  type="email"
                  required={!isRecoveryMode}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="sistemaamexcourier@gmail.com"
                  className="amex-input-field"
                />
              </div>
            </div>

            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '6px',
                }}
              >
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#cbd5e1' }}>
                  {isRecoveryMode ? 'Nueva contraseña (mínimo 8 caracteres)' : 'Contraseña'}
                </label>
                {!isRecoveryMode && (
                  <button
                    type="button"
                    onClick={handlePasswordRecovery}
                    disabled={isLoading || cooldownSeconds > 0}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: cooldownSeconds > 0 ? '#94a3b8' : '#fbbf24',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      cursor: cooldownSeconds > 0 ? 'not-allowed' : 'pointer',
                      padding: 0,
                      transition: 'color 0.2s ease',
                    }}
                  >
                    {cooldownSeconds > 0 ? `Reenviar en ${cooldownSeconds}s` : '¿Olvidaste tu contraseña?'}
                  </button>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <i
                  className="fa-solid fa-lock"
                  style={{
                    position: 'absolute',
                    left: '13px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#64748b',
                    fontSize: '14px',
                  }}
                />
                <input
                  type={
                    isRecoveryMode
                      ? showNewPassword
                        ? 'text'
                        : 'password'
                      : showPassword
                      ? 'text'
                      : 'password'
                  }
                  required
                  value={isRecoveryMode ? newPassword : password}
                  onChange={(e) =>
                    isRecoveryMode ? setNewPassword(e.target.value) : setPassword(e.target.value)
                  }
                  onKeyDown={handleCapsLockCheck}
                  onKeyUp={handleCapsLockCheck}
                  onClick={handleCapsLockCheck}
                  onBlur={() => setIsCapsLockOn(false)}
                  placeholder="••••••••"
                  className="amex-input-field"
                  style={{ paddingRight: '40px' }}
                />
                <button
                  type="button"
                  onClick={() =>
                    isRecoveryMode ? setShowNewPassword(!showNewPassword) : setShowPassword(!showPassword)
                  }
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: (isRecoveryMode ? showNewPassword : showPassword) ? '#fbbf24' : '#64748b',
                    cursor: 'pointer',
                    fontSize: '14px',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  tabIndex={-1}
                  title={
                    (isRecoveryMode ? showNewPassword : showPassword)
                      ? 'Ocultar contraseña'
                      : 'Ver contraseña'
                  }
                >
                  <i
                    className={
                      (isRecoveryMode ? showNewPassword : showPassword)
                        ? 'fa-solid fa-eye-slash'
                        : 'fa-solid fa-eye'
                    }
                  />
                </button>
              </div>

              {/* Aviso de Bloq Mayús (Caps Lock) Activo */}
              {isCapsLockOn && (
                <div
                  role="status"
                  style={{
                    marginTop: '8px',
                    padding: '7px 11px',
                    borderRadius: '8px',
                    background: 'rgba(245, 158, 11, 0.14)',
                    border: '1px solid rgba(245, 158, 11, 0.35)',
                    color: '#fcd34d',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '7px',
                  }}
                >
                  <i className="fa-solid fa-triangle-exclamation" style={{ color: '#f59e0b' }} />
                  <span>Bloq Mayús (Caps Lock) está activado</span>
                </div>
              )}
            </div>

            {isRecoveryMode && (
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#cbd5e1',
                    marginBottom: '6px',
                  }}
                >
                  Confirmar nueva contraseña
                </label>
                <div style={{ position: 'relative' }}>
                  <i
                    className="fa-solid fa-lock"
                    style={{
                      position: 'absolute',
                      left: '13px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#64748b',
                      fontSize: '14px',
                    }}
                  />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onKeyDown={handleCapsLockCheck}
                    onKeyUp={handleCapsLockCheck}
                    onClick={handleCapsLockCheck}
                    onBlur={() => setIsCapsLockOn(false)}
                    placeholder="••••••••"
                    className="amex-input-field"
                    style={{ paddingRight: '40px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: showConfirmPassword ? '#fbbf24' : '#64748b',
                      cursor: 'pointer',
                      fontSize: '14px',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    tabIndex={-1}
                    title={showConfirmPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  >
                    <i className={showConfirmPassword ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'} />
                  </button>
                </div>
              </div>
            )}

            <button type="submit" disabled={isLoading} className="amex-submit-btn">
              {isLoading ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin" />
                  <span>{isRecoveryMode ? 'Guardando...' : 'Validando credenciales...'}</span>
                </>
              ) : (
                <>
                  <i
                    className={
                      isRecoveryMode ? 'fa-solid fa-key' : 'fa-solid fa-arrow-right-to-bracket'
                    }
                  />
                  <span>{isRecoveryMode ? 'Guardar nueva contraseña' : 'Ingresar al Sistema'}</span>
                </>
              )}
            </button>
          </form>

          {/* Pie Institucional visible solo en Móviles al final del formulario */}
          <div className="amex-login-mobile-footer" style={{ display: 'none' }}>
            <span>AMEX Courier S.A.C. • RUC 20607649082</span>
          </div>
        </div>
      </div>
    </div>
  );
}
