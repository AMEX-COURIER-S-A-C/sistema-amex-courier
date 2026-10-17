'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { SYSTEM_MODULES, ModulePermissionActions } from '@/lib/navigation/registry';
import { useSmoothScroll } from '@/components/providers/SmoothScrollProvider';
import { confirmDialog } from '@/lib/dialog';

/* ──── Types ──── */
interface UserRow {
  id: string;
  email: string;
  nombre_completo: string;
  rol_id: string | null;
  rol_nombre: string;
  permisos: Record<string, unknown>;
  permisos_personalizados?: boolean;
  activo: boolean;
  creado_en: string;
  ultimo_ingreso: string | null;
}

interface RolRow {
  id: string;
  nombre: string;
  descripcion: string | null;
  permisos: Record<string, unknown>;
}

type View = 'usuarios' | 'roles';

/* ──── Módulos del Sistema sincronizados con el registro central ──── */
const MODULE_COLORS: Record<string, string> = {
  dashboard: '#0284c7',
  live_sheets: '#8b5cf6',
  inventario: '#ea580c',
  cobros: '#16a34a',
  directorio_clientes: '#0284c7',
  scanner: '#db2777',
  dni_matrix: '#d97706',
  rotulos: '#059669',
  boletas_shalom: '#2563eb',
  formato_entrega: '#9333ea',
  invoices: '#059669',
  info_amex: '#e11d48',
  completar_inventario: '#0284c7',
  auditoria: '#7c3aed',
  admin_usuarios: '#ea580c',
  despacho_rutas: '#0284c7',
  manifiestos_tib: '#0891b2',
  configuracion: '#475569',
};

const MODULOS = SYSTEM_MODULES.map((m) => ({
  key: m.permissionKey,
  number: m.number,
  label: m.label,
  shortLabel: m.shortLabel,
  category: m.category,
  icon: m.icon.replace(/^fa-solid\s+/, ''),
  color: MODULE_COLORS[m.permissionKey] || '#0284c7',
}));

export const CATEGORY_LABELS: Record<'operaciones' | 'documentacion' | 'sistema', { label: string; icon: string; color: string }> = {
  operaciones: { label: 'Operaciones Principales', icon: 'fa-truck-fast', color: '#0284c7' },
  documentacion: { label: 'Documentación & Despacho', icon: 'fa-file-invoice', color: '#059669' },
  sistema: { label: 'Sistema, Gobernanza & Archivos', icon: 'fa-gears', color: '#7c3aed' },
};

function isModuleEnabledForRole(
  permisos: Record<string, unknown> | undefined,
  moduleKey: string
): boolean {
  if (!permisos) return false;
  const val = permisos[moduleKey];
  if (typeof val === 'boolean') return val;
  if (typeof val === 'object' && val !== null) {
    const obj = val as Record<string, unknown>;
    if (obj.ver === true) return true;
    return Object.values(obj).some((v) => v === true);
  }
  const sysMod = SYSTEM_MODULES.find((sm) => sm.permissionKey === moduleKey);
  if (sysMod?.permissionAliases) {
    for (const alias of sysMod.permissionAliases) {
      const aVal = permisos[alias];
      if (typeof aVal === 'boolean' && aVal) return true;
      if (typeof aVal === 'object' && aVal !== null) {
        const obj = aVal as Record<string, unknown>;
        if (obj.ver === true || Object.values(obj).some((v) => v === true)) return true;
      }
    }
  }
  return false;
}

function normalizeUserPermissions(raw: Record<string, unknown> | undefined): Record<string, ModulePermissionActions> {
  const result: Record<string, ModulePermissionActions> = {};
  MODULOS.forEach((m) => {
    const val = raw ? raw[m.key] : undefined;
    if (typeof val === 'boolean') {
      result[m.key] = {
        ver: val,
        crear: val,
        editar: val,
        eliminar: val,
        exportar: val,
      };
    } else if (typeof val === 'object' && val !== null) {
      const obj = val as Record<string, unknown>;
      result[m.key] = {
        ver: Boolean(obj.ver),
        crear: Boolean(obj.crear),
        editar: Boolean(obj.editar),
        eliminar: Boolean(obj.eliminar),
        exportar: Boolean(obj.exportar),
      };
    } else {
      // Verificar si hay aliases legacy
      const sysMod = SYSTEM_MODULES.find((sm) => sm.permissionKey === m.key);
      let aliasMatched = false;
      if (sysMod?.permissionAliases && raw) {
        for (const alias of sysMod.permissionAliases) {
          const aVal = raw[alias];
          if (typeof aVal === 'boolean' && aVal) {
            result[m.key] = { ver: true, crear: true, editar: true, eliminar: true, exportar: true };
            aliasMatched = true;
            break;
          }
          if (typeof aVal === 'object' && aVal !== null) {
            const obj = aVal as Record<string, unknown>;
            result[m.key] = {
              ver: Boolean(obj.ver),
              crear: Boolean(obj.crear),
              editar: Boolean(obj.editar),
              eliminar: Boolean(obj.eliminar),
              exportar: Boolean(obj.exportar),
            };
            aliasMatched = true;
            break;
          }
        }
      }
      if (!aliasMatched) {
        result[m.key] = {
          ver: false,
          crear: false,
          editar: false,
          eliminar: false,
          exportar: false,
        };
      }
    }
  });
  return result;
}

function countActiveModules(permisos: Record<string, unknown> | undefined): number {
  if (!permisos) return 0;
  return MODULOS.filter((m) => isModuleEnabledForRole(permisos, m.key)).length;
}

/* ──── Colores distintivos de los 7 Roles Oficiales ──── */
const ROL_PALETTES: Record<string, { bg: string; text: string; border: string; grad: string }> = {
  Administrador: {
    bg: '#f3e8ff',
    text: '#7e22ce',
    border: '#d8b4fe',
    grad: 'linear-gradient(135deg, #7e22ce, #9333ea)',
  },
  'Gerente General': {
    bg: '#ede9fe',
    text: '#4338ca',
    border: '#c7d2fe',
    grad: 'linear-gradient(135deg, #3730a3, #4f46e5)',
  },
  'Asistente de Gerencia': {
    bg: '#e0f2fe',
    text: '#0284c7',
    border: '#bae6fd',
    grad: 'linear-gradient(135deg, #0284c7, #38bdf8)',
  },
  'Cobranzas & Gestión de Entregas': {
    bg: '#dcfce7',
    text: '#15803d',
    border: '#86efac',
    grad: 'linear-gradient(135deg, #16a34a, #15803d)',
  },
  'Almacenero / Operador Logístico': {
    bg: '#fff7ed',
    text: '#c2410c',
    border: '#fed7aa',
    grad: 'linear-gradient(135deg, #ea580c, #f97316)',
  },
  'Chofer / Repartidor': {
    bg: '#ffe4e6',
    text: '#be123c',
    border: '#fecdd3',
    grad: 'linear-gradient(135deg, #e11d48, #f43f5e)',
  },
  'Atención WhatsApp / Auxiliar al Cliente': {
    bg: '#ecfdf5',
    text: '#047857',
    border: '#a7f3d0',
    grad: 'linear-gradient(135deg, #059669, #10b981)',
  },
  _default: {
    bg: '#f1f5f9',
    text: '#334155',
    border: '#cbd5e1',
    grad: 'linear-gradient(135deg, #2563eb, #3b82f6)',
  },
};

function getRolStyle(rolNombre: string) {
  if (!rolNombre) return ROL_PALETTES._default;
  if (ROL_PALETTES[rolNombre]) return ROL_PALETTES[rolNombre];

  const lower = rolNombre.toLowerCase();
  if (lower.includes('admin')) return ROL_PALETTES['Administrador'];
  if (lower.includes('gerente general')) return ROL_PALETTES['Gerente General'];
  if (lower.includes('asistente')) return ROL_PALETTES['Asistente de Gerencia'];
  if (lower.includes('cobranza')) return ROL_PALETTES['Cobranzas & Gestión de Entregas'];
  if (lower.includes('almacen') || lower.includes('logístic') || lower.includes('logistic')) {
    return ROL_PALETTES['Almacenero / Operador Logístico'];
  }
  if (lower.includes('chofer') || lower.includes('repart')) return ROL_PALETTES['Chofer / Repartidor'];
  if (lower.includes('whatsapp') || lower.includes('atenci')) {
    return ROL_PALETTES['Atención WhatsApp / Auxiliar al Cliente'];
  }

  return ROL_PALETTES._default;
}

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #2563eb, #1d4ed8)',
  'linear-gradient(135deg, #0891b2, #0e7490)',
  'linear-gradient(135deg, #059669, #047857)',
  'linear-gradient(135deg, #d97706, #b45309)',
  'linear-gradient(135deg, #7c3aed, #6d28d9)',
  'linear-gradient(135deg, #dc2626, #b91c1c)',
  'linear-gradient(135deg, #db2777, #be185d)',
];

function getAvatarGrad(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_GRADIENTS[h % AVATAR_GRADIENTS.length];
}

function getAvatarInitials(name: string): string {
  if (!name) return 'US';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function formatRelativeDate(iso: string | null | undefined): string {
  if (!iso) return 'Sin ingresos aún';
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return 'Hace un momento';
  if (diffMinutes < 60) return `Hace ${diffMinutes} min`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `Hace ${diffHours} h`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) return `Hace ${diffDays} días`;

  return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* ──── Componente StatCard con alto contraste ──── */
function StatCard({
  label,
  value,
  icon,
  color,
  sub,
  bgSoft,
}: {
  label: string;
  value: number;
  icon: string;
  color: string;
  sub?: string;
  bgSoft: string;
}) {
  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '18px 20px',
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div>
        <p
          style={{
            margin: 0,
            fontSize: '11.5px',
            fontWeight: 800,
            color: '#64748b',
            textTransform: 'uppercase',
            letterSpacing: '0.6px',
          }}
        >
          {label}
        </p>
        <div
          style={{
            fontSize: '32px',
            fontWeight: 900,
            color: '#0f172a',
            lineHeight: 1.1,
            marginTop: '4px',
          }}
        >
          {value}
        </div>
        {sub && (
          <p style={{ margin: '6px 0 0', fontSize: '11.5px', fontWeight: 600, color: '#64748b' }}>
            {sub}
          </p>
        )}
      </div>
      <div
        style={{
          width: '46px',
          height: '46px',
          borderRadius: '12px',
          background: bgSoft,
          border: `1.5px solid ${color}33`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <i className={`fa-solid ${icon}`} style={{ color, fontSize: '20px' }} />
      </div>
    </div>
  );
}

/* ──── Modal estándar del sistema con Scroll Seguro y Aislamiento Lenis ──── */
function CleanModal({
  title,
  subtitle,
  onClose,
  children,
  width = 560,
  footer,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  width?: number;
  footer?: React.ReactNode;
}) {
  return (
    <div
      className="modal-backdrop"
      data-lenis-prevent=""
      onWheel={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(5px)',
        padding: '16px',
        overflow: 'hidden',
      }}
      onClick={onClose}
    >
      <div
        data-lenis-prevent=""
        onWheel={(e) => e.stopPropagation()}
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '18px',
          width: '100%',
          maxWidth: width,
          maxHeight: '92vh',
          height: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER FIJO — Siempre visible y centrado */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexShrink: 0,
            background: '#ffffff',
          }}
        >
          <div>
            <h3 style={{ margin: 0, color: '#0f172a', fontSize: '17px', fontWeight: 900 }}>
              {title}
            </h3>
            {subtitle && (
              <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: '#64748b' }}>
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#f1f5f9',
              border: 'none',
              color: '#64748b',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
            }}
          >
            ×
          </button>
        </div>

        {/* CUERPO DEL MODAL CON SCROLL NATIVO Y FLUIDO */}
        <div
          data-lenis-prevent=""
          onWheel={(e) => e.stopPropagation()}
          style={{
            padding: '24px',
            overflowY: 'auto',
            flex: 1,
            overscrollBehavior: 'contain',
          }}
        >
          {children}
        </div>

        {/* FOOTER FIJO OPCIONAL */}
        {footer && (
          <div
            style={{
              padding: '14px 24px',
              borderTop: '1px solid #e2e8f0',
              background: '#ffffff',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '12px',
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export interface AdminUsersTabProps {
  currentUser?: {
    id?: string;
    nombre?: string;
    email?: string;
    rol?: string;
  } | null;
}

/* ══════════════ COMPONENTE PRINCIPAL ══════════════ */
export default function AdminUsersTab({ currentUser }: AdminUsersTabProps = {}) {
  const [view, setView] = useState<View>('usuarios');
  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<RolRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [search, setSearch] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'activos' | 'inactivos'>('todos');

  // Modal Usuario
  const [showUM, setShowUM] = useState(false);
  const [editU, setEditU] = useState<UserRow | null>(null);
  const [uModalCategory, setUModalCategory] = useState<'todos' | 'operaciones' | 'documentacion' | 'sistema'>('todos');
  const [uForm, setUForm] = useState({
    nombre_completo: '',
    email: '',
    password: '',
    rol_id: '',
    activo: true,
    permisos: {} as Record<string, ModulePermissionActions>,
  });
  const [savingU, setSavingU] = useState(false);

  // Modal Rol
  const [showRM, setShowRM] = useState(false);
  const [editR, setEditR] = useState<RolRow | null>(null);
  const [rForm, setRForm] = useState({
    nombre: '',
    descripcion: '',
    permisos: {} as Record<string, boolean>,
  });
  const [savingR, setSavingR] = useState(false);
  const smoothScroll = useSmoothScroll();

  // Asegurar que el scroller principal de la vista esté activo y con dimensiones actualizadas
  useEffect(() => {
    smoothScroll.syncModalLockState();
    const mainLenis = smoothScroll.getMain();
    if (mainLenis) {
      mainLenis.resize();
    }
  }, [smoothScroll, view, users.length, roles.length]);

  // Al abrir/cerrar modales, sincronizar el bloqueo de fondo
  useEffect(() => {
    smoothScroll.syncModalLockState();
    const mainLenis = smoothScroll.getMain();
    if (mainLenis) {
      mainLenis.resize();
    }
  }, [showUM, showRM, smoothScroll]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/admin/users');
      if (!r.ok) throw new Error('Error al cargar la lista de usuarios');
      const j = await r.json();
      setUsers(j.users || []);
      setRoles(j.roles || []);
    } catch (e) {
      showToast((e as Error).message, false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
  }

  function openNewUser() {
    setEditU(null);
    const defaultRol = roles[0];
    const initialPerms = defaultRol
      ? normalizeUserPermissions(defaultRol.permisos)
      : normalizeUserPermissions({});
    setUForm({
      nombre_completo: '',
      email: '',
      password: '',
      rol_id: defaultRol?.id || '',
      activo: true,
      permisos: initialPerms,
    });
    setUModalCategory('todos');
    setShowUM(true);
  }

  function openEditUser(u: UserRow) {
    setEditU(u);
    setUForm({
      nombre_completo: u.nombre_completo,
      email: u.email,
      password: '',
      rol_id: u.rol_id || '',
      activo: u.activo,
      permisos: normalizeUserPermissions(u.permisos),
    });
    setUModalCategory('todos');
    setShowUM(true);
  }

  function handleUserRoleChange(newRolId: string) {
    const selectedRol = roles.find((r) => r.id === newRolId);
    setUForm((prev) => ({
      ...prev,
      rol_id: newRolId,
      // Si cambia de rol y no tenía permisos guardados o el usuario desea predeterminados
      permisos: selectedRol ? normalizeUserPermissions(selectedRol.permisos) : prev.permisos,
    }));
  }

  function copyRolePermissionsToUser(roleId: string) {
    const selectedRol = roles.find((r) => r.id === roleId);
    if (!selectedRol) return;
    setUForm((prev) => ({
      ...prev,
      permisos: normalizeUserPermissions(selectedRol.permisos),
    }));
    showToast(`✓ Permisos restablecidos a la plantilla oficial de "${selectedRol.nombre}"`, true);
  }

  function enableAllUserPermissions() {
    const all: Record<string, ModulePermissionActions> = {};
    MODULOS.forEach((m) => {
      all[m.key] = { ver: true, crear: true, editar: true, eliminar: true, exportar: true };
    });
    setUForm((p) => ({ ...p, permisos: all }));
    showToast('✓ Acceso total otorgado en los 18 módulos (todas las acciones activas)', true);
  }

  function setReadOnlyUserPermissions() {
    const ro: Record<string, ModulePermissionActions> = {};
    MODULOS.forEach((m) => {
      ro[m.key] = { ver: true, crear: false, editar: false, eliminar: false, exportar: false };
    });
    setUForm((p) => ({ ...p, permisos: ro }));
    showToast('✓ Permisos fijados en Solo Lectura (Ver) para todos los módulos', true);
  }

  function disableAllUserPermissions() {
    const none: Record<string, ModulePermissionActions> = {};
    MODULOS.forEach((m) => {
      none[m.key] = { ver: false, crear: false, editar: false, eliminar: false, exportar: false };
    });
    setUForm((p) => ({ ...p, permisos: none }));
    showToast('Todos los módulos han sido desactivados para este usuario', false);
  }

  function toggleUserModuleVer(moduleKey: string) {
    setUForm((prev) => {
      const current = prev.permisos[moduleKey] || { ver: false, crear: false, editar: false, eliminar: false, exportar: false };
      const nextVer = !current.ver;
      return {
        ...prev,
        permisos: {
          ...prev.permisos,
          [moduleKey]: {
            ...current,
            ver: nextVer,
            crear: nextVer ? current.crear : false,
            editar: nextVer ? current.editar : false,
            eliminar: nextVer ? current.eliminar : false,
            exportar: nextVer ? current.exportar : false,
          },
        },
      };
    });
  }

  function toggleUserModuleAction(moduleKey: string, action: 'crear' | 'editar' | 'eliminar' | 'exportar') {
    setUForm((prev) => {
      const current = prev.permisos[moduleKey] || { ver: false, crear: false, editar: false, eliminar: false, exportar: false };
      const nextVal = !current[action];
      return {
        ...prev,
        permisos: {
          ...prev.permisos,
          [moduleKey]: {
            ...current,
            ver: nextVal ? true : current.ver,
            [action]: nextVal,
          },
        },
      };
    });
  }

  function setUserModuleAllActions(moduleKey: string, enable: boolean) {
    setUForm((prev) => ({
      ...prev,
      permisos: {
        ...prev.permisos,
        [moduleKey]: {
          ver: enable,
          crear: enable,
          editar: enable,
          eliminar: enable,
          exportar: enable,
        },
      },
    }));
  }

  async function saveUser() {
    if (!uForm.nombre_completo.trim()) {
      showToast('Ingresa el nombre completo del usuario.', false);
      return;
    }
    if (!editU && (!uForm.email.trim() || !uForm.password.trim())) {
      showToast('Correo y contraseña son obligatorios al crear usuario.', false);
      return;
    }

    setSavingU(true);
    try {
      const isEdit = !!editU;
      const targetUserId = editU?.id;
      const targetUserNombre = editU?.nombre_completo || 'el usuario';
      const isSelf = isEdit && currentUser?.id && targetUserId === currentUser.id;

      const body = isEdit
        ? {
            action: 'update_user',
            user_id: targetUserId,
            nombre_completo: uForm.nombre_completo.trim(),
            rol_id: uForm.rol_id || null,
            activo: uForm.activo,
            permisos: uForm.permisos,
            ...(uForm.password && { password: uForm.password }),
          }
        : {
            action: 'create_user',
            email: uForm.email.trim().toLowerCase(),
            password: uForm.password,
            nombre_completo: uForm.nombre_completo.trim(),
            rol_id: uForm.rol_id || null,
            permisos: uForm.permisos,
          };

      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Error al guardar usuario');

      if (isSelf) {
        showToast('✓ Has actualizado tus propios permisos. Reiniciando tu sesión para aplicar los cambios...', true);
        setShowUM(false);
        setTimeout(() => {
          window.location.href = '/login?error=permissions-updated';
        }, 1200);
        return;
      }

      showToast(
        isEdit
          ? `✓ Permisos guardados con éxito. Se reinició la sesión de ${targetUserNombre} para aplicar los cambios inmediatamente.`
          : j.welcome_sent
          ? `✓ Usuario creado con éxito. Se envió el correo de bienvenida a ${uForm.email} para definir su contraseña.`
          : '✓ Usuario creado con accesos exitosamente.',
        true
      );
      setShowUM(false);
      void load();
    } catch (e) {
      showToast((e as Error).message, false);
    } finally {
      setSavingU(false);
    }
  }

  async function handleResendInvite(u: UserRow) {
    if (!u.email) return;
    const ok = await confirmDialog({
      title: '📧 Reenviar Correo de Bienvenida',
      message: `¿Deseas enviar un correo de bienvenida y activación a ${u.nombre_completo} (${u.email})?\n\nEl colaborador recibirá un enlace seguro con acceso institucional para definir o actualizar su contraseña por primera vez.`,
      confirmText: 'Sí, Enviar Correo',
      cancelText: 'Cancelar',
    });
    if (!ok) return;

    try {
      showToast('Enviando correo formal de bienvenida...', true);
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resend_invite',
          email: u.email,
          nombre_completo: u.nombre_completo,
          rol_nombre: u.rol_nombre,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al enviar correo de bienvenida');
      showToast(`✓ Correo de bienvenida enviado exitosamente a ${u.email}`, true);
    } catch (err) {
      showToast((err as Error).message, false);
    }
  }

  async function toggleActivo(u: UserRow) {
    const nuevoEstado = !u.activo;
    const confirmMsg = nuevoEstado
      ? `¿Deseas activar el acceso para ${u.nombre_completo}?`
      : `¿Deseas suspender el acceso de ${u.nombre_completo}? No podrá iniciar sesión.`;

    const confirmed = await confirmDialog({
      title: nuevoEstado ? 'Activar acceso de usuario' : 'Suspender acceso de usuario',
      message: confirmMsg,
      confirmText: nuevoEstado ? 'Sí, activar' : 'Sí, suspender acceso',
      variant: nuevoEstado ? 'info' : 'danger'
    });

    if (!confirmed) return;

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_user',
          user_id: u.id,
          activo: nuevoEstado,
        }),
      });
      if (!res.ok) throw new Error('Error al cambiar estado del usuario');
      showToast(`Usuario ${nuevoEstado ? 'activado' : 'suspendido'} correctamente.`, true);
      void load();
    } catch (e) {
      showToast((e as Error).message, false);
    }
  }

  function openNewRole() {
    setEditR(null);
    const p: Record<string, boolean> = {};
    MODULOS.forEach((m) => {
      p[m.key] = false;
    });
    setRForm({ nombre: '', descripcion: '', permisos: p });
    setShowRM(true);
  }

  function openEditRole(r: RolRow) {
    setEditR(r);
    const p: Record<string, boolean> = {};
    MODULOS.forEach((m) => {
      p[m.key] = isModuleEnabledForRole(r.permisos, m.key);
    });
    setRForm({
      nombre: r.nombre,
      descripcion: r.descripcion || '',
      permisos: p,
    });
    setShowRM(true);
  }

  async function saveRole() {
    if (!rForm.nombre.trim()) {
      showToast('Ingresa un nombre para el rol.', false);
      return;
    }
    setSavingR(true);
    try {
      const isEdit = !!editR;
      const body = isEdit
        ? {
            action: 'update_role',
            id: editR!.id,
            permisos: rForm.permisos,
            descripcion: rForm.descripcion,
          }
        : {
            action: 'create_role',
            nombre: rForm.nombre.trim(),
            descripcion: rForm.descripcion,
            permisos: rForm.permisos,
          };
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Error al guardar rol');

      showToast(isEdit ? '✓ Rol actualizado.' : '✓ Rol creado.', true);
      setShowRM(false);
      void load();
    } catch (e) {
      showToast((e as Error).message, false);
    } finally {
      setSavingR(false);
    }
  }

  // Filtrado de usuarios
  const q = search.toLowerCase().trim();
  const filteredUsers = users.filter((u) => {
    const matchesQuery =
      !q ||
      u.nombre_completo.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.rol_nombre.toLowerCase().includes(q);

    if (!matchesQuery) return false;

    if (filtroEstado === 'activos') return u.activo;
    if (filtroEstado === 'inactivos') return !u.activo;
    return true;
  });

  const activosCount = users.filter((u) => u.activo).length;
  const inactivosCount = users.filter((u) => !u.activo).length;

  return (
    <div
      style={{
        padding: '12px 16px 40px',
        color: '#0f172a',
        fontFamily: "'Inter', system-ui, sans-serif",
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}
    >
      {/* ──── HERO HEADER ──── */}
      <div
        style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '20px 24px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '50px',
              height: '50px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 20px rgba(37, 99, 235, 0.25)',
              color: '#ffffff',
              fontSize: '22px',
            }}
          >
            <i className="fa-solid fa-user-gear" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: '#0f172a' }}>
                15. Gestión de Usuarios y Roles
              </h1>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background: '#e0f2fe',
                  color: '#0369a1',
                }}
              >
                Seguridad &amp; Accesos
              </span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
              Administra usuarios, contraseñas, roles asignados y permisos de acceso para cada módulo de la plataforma.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            style={{
              padding: '9px 16px',
              borderRadius: '10px',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#334155',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '12.5px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.15s ease',
            }}
          >
            <i className={`fa-solid fa-arrows-rotate ${loading ? 'fa-spin' : ''}`} style={{ color: '#0284c7' }} />
            <span>Actualizar</span>
          </button>

          <button
            type="button"
            onClick={openNewUser}
            style={{
              padding: '9px 18px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #16a34a, #15803d)',
              color: '#ffffff',
              border: 'none',
              fontWeight: 800,
              fontSize: '12.5px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 2px 6px rgba(22, 163, 74, 0.25)',
              transition: 'all 0.15s ease',
            }}
          >
            <i className="fa-solid fa-user-plus" />
            <span>Nuevo Usuario</span>
          </button>
        </div>
      </div>

      {/* ──── TOAST DE NOTIFICACIÓN ──── */}
      {toast && (
        <div
          style={{
            padding: '12px 18px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '13px',
            fontWeight: 700,
            background: toast.ok ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${toast.ok ? '#bbf7d0' : '#fecaca'}`,
            color: toast.ok ? '#15803d' : '#b91c1c',
          }}
        >
          <i className={`fa-solid ${toast.ok ? 'fa-circle-check' : 'fa-circle-xmark'}`} style={{ fontSize: '16px' }} />
          <span>{toast.msg}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              color: 'inherit',
              cursor: 'pointer',
              fontSize: '18px',
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* ──── TARJETAS DE ESTADÍSTICAS (STAT CARDS) ──── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '14px',
        }}
      >
        <StatCard
          label="Total Usuarios"
          value={users.length}
          icon="fa-users"
          color="#0284c7"
          bgSoft="#e0f2fe"
          sub={`${activosCount} activos · ${inactivosCount} inactivos`}
        />
        <StatCard
          label="Usuarios Activos"
          value={activosCount}
          icon="fa-user-check"
          color="#16a34a"
          bgSoft="#dcfce7"
          sub="Con acceso habilitado al sistema"
        />
        <StatCard
          label="Usuarios Inactivos"
          value={inactivosCount}
          icon="fa-user-xmark"
          color="#dc2626"
          bgSoft="#fee2e2"
          sub="Acceso bloqueado o suspendido"
        />
        <StatCard
          label="Roles Creados"
          value={roles.length}
          icon="fa-shield-halved"
          color="#7c3aed"
          bgSoft="#f3e8ff"
          sub="Perfiles de permisos configurados"
        />
      </div>

      {/* ──── PESTAÑAS (USUARIOS / ROLES) ──── */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          background: '#f1f5f9',
          padding: '5px',
          borderRadius: '12px',
          width: 'fit-content',
        }}
      >
        <button
          type="button"
          onClick={() => setView('usuarios')}
          style={{
            padding: '9px 20px',
            borderRadius: '9px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 800,
            fontSize: '13px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: view === 'usuarios' ? '#2563eb' : 'transparent',
            color: view === 'usuarios' ? '#ffffff' : '#475569',
            boxShadow: view === 'usuarios' ? '0 2px 6px rgba(37,99,235,0.3)' : 'none',
            transition: 'all 0.15s ease',
          }}
        >
          <i className="fa-solid fa-users" />
          <span>Usuarios del Sistema</span>
          <span
            style={{
              fontSize: '11px',
              padding: '1px 6px',
              borderRadius: '10px',
              background: view === 'usuarios' ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
              color: view === 'usuarios' ? '#ffffff' : '#64748b',
            }}
          >
            {users.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setView('roles')}
          style={{
            padding: '9px 20px',
            borderRadius: '9px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 800,
            fontSize: '13px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: view === 'roles' ? '#2563eb' : 'transparent',
            color: view === 'roles' ? '#ffffff' : '#475569',
            boxShadow: view === 'roles' ? '0 2px 6px rgba(37,99,235,0.3)' : 'none',
            transition: 'all 0.15s ease',
          }}
        >
          <i className="fa-solid fa-shield-halved" />
          <span>Roles y Permisos</span>
          <span
            style={{
              fontSize: '11px',
              padding: '1px 6px',
              borderRadius: '10px',
              background: view === 'roles' ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
              color: view === 'roles' ? '#ffffff' : '#64748b',
            }}
          >
            {roles.length}
          </span>
        </button>
      </div>

      {/* ──── CONTENIDO DE LA PESTAÑA ──── */}
      {loading ? (
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '60px 0',
            textAlign: 'center',
            color: '#64748b',
          }}
        >
          <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '32px', marginBottom: '12px', color: '#2563eb', display: 'block' }} />
          <p style={{ margin: 0, fontSize: '13.5px', fontWeight: 600 }}>Cargando usuarios y roles del sistema...</p>
        </div>
      ) : (
        <>
          {/* ════════════ VISTA 1: USUARIOS ════════════ */}
          {view === 'usuarios' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Barra de Filtros y Búsqueda */}
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '14px',
                  padding: '14px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                {/* Input de Búsqueda */}
                <div style={{ flex: '1 1 280px', minWidth: '240px', position: 'relative' }}>
                  <i
                    className="fa-solid fa-magnifying-glass"
                    style={{
                      position: 'absolute',
                      left: '14px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#94a3b8',
                      fontSize: '13px',
                      pointerEvents: 'none',
                    }}
                  />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar por nombre, correo electrónico o rol..."
                    style={{
                      width: '100%',
                      padding: '10px 36px 10px 38px',
                      borderRadius: '10px',
                      fontSize: '13px',
                      background: '#f8fafc',
                      border: '1.5px solid #cbd5e1',
                      color: '#0f172a',
                      fontWeight: 600,
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'border-color 0.15s ease',
                    }}
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch('')}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        fontSize: '14px',
                      }}
                    >
                      <i className="fa-solid fa-circle-xmark" />
                    </button>
                  )}
                </div>

                {/* Filtro de Estado Rápido */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', marginRight: '4px' }}>
                    Estado:
                  </span>
                  {[
                    { id: 'todos', label: 'Todos', count: users.length },
                    { id: 'activos', label: 'Activos', count: activosCount },
                    { id: 'inactivos', label: 'Inactivos', count: inactivosCount },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFiltroEstado(f.id as typeof filtroEstado)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        border: '1px solid',
                        borderColor: filtroEstado === f.id ? '#2563eb' : '#cbd5e1',
                        background: filtroEstado === f.id ? '#eff6ff' : '#ffffff',
                        color: filtroEstado === f.id ? '#1d4ed8' : '#64748b',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {f.label} ({f.count})
                    </button>
                  ))}
                </div>

                <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#64748b' }}>
                  Mostrando <strong style={{ color: '#0f172a' }}>{filteredUsers.length}</strong> usuarios
                </div>
              </div>

              {/* Tabla de Usuarios */}
              {filteredUsers.length === 0 ? (
                <div
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '16px',
                    padding: '60px 20px',
                    textAlign: 'center',
                    color: '#64748b',
                  }}
                >
                  <i
                    className="fa-solid fa-users-slash"
                    style={{ fontSize: '40px', marginBottom: '12px', display: 'block', color: '#cbd5e1' }}
                  />
                  <h4 style={{ margin: '0 0 6px', fontSize: '15px', color: '#334155' }}>
                    No se encontraron usuarios
                  </h4>
                  <p style={{ margin: 0, fontSize: '12.5px', color: '#94a3b8' }}>
                    Prueba cambiando los términos de búsqueda o el filtro de estado.
                  </p>
                </div>
              ) : (
                <div
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
                  }}
                >
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr
                          style={{
                            background: '#f8fafc',
                            borderBottom: '1px solid #e2e8f0',
                          }}
                        >
                          <th style={{ padding: '14px 18px', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                            Usuario / Nombre
                          </th>
                          <th style={{ padding: '14px 18px', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                            Correo Electrónico
                          </th>
                          <th style={{ padding: '14px 18px', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                            Rol Asignado
                          </th>
                          <th style={{ padding: '14px 18px', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                            Estado
                          </th>
                          <th style={{ padding: '14px 18px', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                            Último Acceso
                          </th>
                          <th style={{ padding: '14px 18px', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.6px', textAlign: 'right' }}>
                            Acciones
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map((u, i) => {
                          const rStyle = getRolStyle(u.rol_nombre);
                          return (
                            <tr
                              key={u.id}
                              style={{
                                borderBottom: i < filteredUsers.length - 1 ? '1px solid #f1f5f9' : 'none',
                                transition: 'background-color 0.15s ease',
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                            >
                              {/* USUARIO CON NOMBRE Y AVATAR RESALTADO */}
                              <td style={{ padding: '16px 18px', verticalAlign: 'middle' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <div
                                    style={{
                                      width: '42px',
                                      height: '42px',
                                      borderRadius: '12px',
                                      background: getAvatarGrad(u.id),
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontWeight: 900,
                                      fontSize: '14px',
                                      color: '#ffffff',
                                      flexShrink: 0,
                                      boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                                    }}
                                  >
                                    {getAvatarInitials(u.nombre_completo)}
                                  </div>
                                  <div>
                                    <div
                                      style={{
                                        fontWeight: 800,
                                        color: '#0f172a',
                                        fontSize: '13.5px',
                                        lineHeight: 1.25,
                                      }}
                                    >
                                      {u.nombre_completo}
                                    </div>
                                    <div
                                      style={{
                                        fontSize: '11.5px',
                                        color: '#64748b',
                                        marginTop: '3px',
                                        fontWeight: 500,
                                      }}
                                    >
                                      Desde {new Date(u.creado_en).toLocaleDateString('es-PE', { month: 'short', year: 'numeric' })}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* CORREO */}
                              <td style={{ padding: '16px 18px', verticalAlign: 'middle' }}>
                                <span
                                  style={{
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    color: '#334155',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                  }}
                                >
                                  <i className="fa-regular fa-envelope" style={{ color: '#94a3b8', fontSize: '12px' }} />
                                  {u.email}
                                </span>
                              </td>

                              {/* ROL ASIGNADO */}
                              <td style={{ padding: '16px 18px', verticalAlign: 'middle' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '5px' }}>
                                  <span
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      padding: '5px 12px',
                                      borderRadius: '20px',
                                      fontSize: '12px',
                                      fontWeight: 800,
                                      background: rStyle.bg,
                                      color: rStyle.text,
                                      border: `1px solid ${rStyle.border}`,
                                    }}
                                  >
                                    <i
                                      className={`fa-solid ${u.rol_nombre === 'Administrador' ? 'fa-crown' : 'fa-circle-user'}`}
                                      style={{ fontSize: '11px' }}
                                    />
                                    {u.rol_nombre}
                                  </span>

                                  {u.permisos_personalizados ? (
                                    <span
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '5px',
                                        padding: '2px 8px',
                                        borderRadius: '6px',
                                        fontSize: '10.5px',
                                        fontWeight: 800,
                                        background: '#f5f3ff',
                                        color: '#7c3aed',
                                        border: '1px solid #ddd6fe',
                                      }}
                                      title="Matriz de permisos modificada individualmente para este usuario"
                                    >
                                      <i className="fa-solid fa-sliders" style={{ fontSize: '9px' }} />
                                      Personalizado ({countActiveModules(u.permisos)}/18 mód.)
                                    </span>
                                  ) : (
                                    <span
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '5px',
                                        padding: '2px 8px',
                                        borderRadius: '6px',
                                        fontSize: '10.5px',
                                        fontWeight: 600,
                                        color: '#64748b',
                                        background: '#f8fafc',
                                        border: '1px solid #e2e8f0',
                                      }}
                                      title="Utiliza la plantilla oficial estándar de su rol"
                                    >
                                      <i className="fa-solid fa-check" style={{ fontSize: '9px', color: '#16a34a' }} />
                                      Plantilla Rol ({countActiveModules(u.permisos)}/18 mód.)
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* ESTADO */}
                              <td style={{ padding: '16px 18px', verticalAlign: 'middle' }}>
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '5px 12px',
                                    borderRadius: '20px',
                                    fontSize: '12px',
                                    fontWeight: 800,
                                    background: u.activo ? '#dcfce7' : '#fee2e2',
                                    color: u.activo ? '#15803d' : '#b91c1c',
                                    border: `1px solid ${u.activo ? '#86efac' : '#fca5a5'}`,
                                  }}
                                >
                                  <span
                                    style={{
                                      width: '7px',
                                      height: '7px',
                                      borderRadius: '50%',
                                      background: u.activo ? '#16a34a' : '#dc2626',
                                    }}
                                  />
                                  {u.activo ? 'Activo' : 'Inactivo'}
                                </span>
                              </td>

                              {/* ÚLTIMO ACCESO */}
                              <td style={{ padding: '16px 18px', verticalAlign: 'middle' }}>
                                <span style={{ fontSize: '12.5px', color: '#475569', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                  <i className="fa-regular fa-clock" style={{ color: '#94a3b8' }} />
                                  {formatRelativeDate(u.ultimo_ingreso)}
                                </span>
                              </td>

                              {/* ACCIONES */}
                              <td style={{ padding: '16px 18px', verticalAlign: 'middle', textAlign: 'right' }}>
                                <div style={{ display: 'inline-flex', gap: '8px' }}>
                                  <button
                                    type="button"
                                    onClick={() => openEditUser(u)}
                                    title="Editar usuario y permisos"
                                    style={{
                                      width: '36px',
                                      height: '36px',
                                      borderRadius: '9px',
                                      background: '#eff6ff',
                                      border: '1px solid #bfdbfe',
                                      color: '#2563eb',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: '13px',
                                      transition: 'all 0.15s ease',
                                    }}
                                  >
                                    <i className="fa-solid fa-pen" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => void handleResendInvite(u)}
                                    title="Enviar correo formal de bienvenida e invitación para definir contraseña"
                                    style={{
                                      width: '36px',
                                      height: '36px',
                                      borderRadius: '9px',
                                      background: '#ecfdf5',
                                      border: '1px solid #a7f3d0',
                                      color: '#059669',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: '13px',
                                      transition: 'all 0.15s ease',
                                    }}
                                  >
                                    <i className="fa-solid fa-envelope" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => void toggleActivo(u)}
                                    title={u.activo ? 'Suspender acceso del usuario' : 'Habilitar acceso del usuario'}
                                    style={{
                                      width: '36px',
                                      height: '36px',
                                      borderRadius: '9px',
                                      background: u.activo ? '#fef2f2' : '#f0fdf4',
                                      border: `1px solid ${u.activo ? '#fecaca' : '#bbf7d0'}`,
                                      color: u.activo ? '#dc2626' : '#16a34a',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: '13px',
                                      transition: 'all 0.15s ease',
                                    }}
                                  >
                                    <i className={`fa-solid ${u.activo ? 'fa-user-slash' : 'fa-user-check'}`} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ════════════ VISTA 2: ROLES Y PERMISOS ════════════ */}
          {view === 'roles' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                    Roles de Usuario y Matriz de Permisos
                  </h3>
                  <p style={{ margin: '3px 0 0', fontSize: '12.5px', color: '#64748b' }}>
                    Configura a qué módulos específicos tiene acceso cada perfil del sistema.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={openNewRole}
                  style={{
                    padding: '9px 18px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #16a34a, #15803d)',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 800,
                    fontSize: '12.5px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 2px 6px rgba(22, 163, 74, 0.25)',
                  }}
                >
                  <i className="fa-solid fa-plus" />
                  <span>Nuevo Rol</span>
                </button>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
                  gap: '16px',
                }}
              >
                {roles.map((r) => {
                  const rStyle = getRolStyle(r.nombre);
                  const usersR = users.filter((u) => u.rol_id === r.id);
                  const activeP = MODULOS.filter((m) => isModuleEnabledForRole(r.permisos, m.key));
                  const pct = Math.round((activeP.length / MODULOS.length) * 100);

                  return (
                    <div
                      key={r.id}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '16px',
                        padding: '22px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '14px',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {/* Cabecera del Rol */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div
                            style={{
                              width: '46px',
                              height: '46px',
                              borderRadius: '12px',
                              background: rStyle.grad,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#ffffff',
                              fontSize: '18px',
                              boxShadow: '0 4px 10px rgba(0, 0, 0, 0.1)',
                            }}
                          >
                            <i className="fa-solid fa-shield-halved" />
                          </div>
                          <div>
                            <div style={{ fontWeight: 900, color: '#0f172a', fontSize: '15px' }}>
                              {r.nombre}
                            </div>
                            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', fontWeight: 600 }}>
                              {activeP.length} de {MODULOS.length} módulos habilitados
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => openEditRole(r)}
                          style={{
                            padding: '7px 14px',
                            borderRadius: '8px',
                            background: '#eff6ff',
                            border: '1px solid #bfdbfe',
                            color: '#2563eb',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <i className="fa-solid fa-pen" />
                          <span>Editar</span>
                        </button>
                      </div>

                      {r.descripcion && (
                        <p
                          style={{
                            fontSize: '12.5px',
                            color: '#475569',
                            margin: 0,
                            lineHeight: 1.45,
                            borderLeft: `3px solid ${rStyle.border}`,
                            paddingLeft: '10px',
                          }}
                        >
                          {r.descripcion}
                        </p>
                      )}

                      {/* Barra de Progreso */}
                      <div>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            marginBottom: '6px',
                            fontSize: '11.5px',
                          }}
                        >
                          <span style={{ color: '#64748b', fontWeight: 600 }}>Nivel de Acceso</span>
                          <span style={{ color: rStyle.text, fontWeight: 800 }}>{pct}%</span>
                        </div>
                        <div
                          style={{
                            background: '#e2e8f0',
                            borderRadius: '6px',
                            height: '7px',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              height: '100%',
                              background: rStyle.grad,
                              borderRadius: '6px',
                              width: `${pct}%`,
                              transition: 'width 0.4s ease',
                            }}
                          />
                        </div>
                      </div>

                      {/* Módulos Habilitados */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {activeP.length === 0 ? (
                          <span style={{ fontSize: '11.5px', color: '#94a3b8', fontStyle: 'italic' }}>
                            Sin módulos asignados aún
                          </span>
                        ) : (
                          activeP.map((m) => (
                            <span
                              key={m.key}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '4px 10px',
                                borderRadius: '14px',
                                fontSize: '11px',
                                fontWeight: 700,
                                background: `${m.color}15`,
                                color: m.color,
                                border: `1px solid ${m.color}35`,
                              }}
                            >
                              <i className={`fa-solid ${m.icon}`} style={{ fontSize: '10px' }} />
                              {m.label}
                            </span>
                          ))
                        )}
                      </div>

                      {/* Pie de Tarjeta: Usuarios Asignados */}
                      <div
                        style={{
                          paddingTop: '12px',
                          borderTop: '1px solid #f1f5f9',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginTop: 'auto',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ display: 'flex' }}>
                            {usersR.slice(0, 4).map((u, i2) => (
                              <div
                                key={u.id}
                                title={u.nombre_completo}
                                style={{
                                  width: '26px',
                                  height: '26px',
                                  borderRadius: '50%',
                                  background: getAvatarGrad(u.id),
                                  border: '2px solid #ffffff',
                                  marginLeft: i2 > 0 ? -8 : 0,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '9.5px',
                                  fontWeight: 900,
                                  color: '#ffffff',
                                }}
                              >
                                {getAvatarInitials(u.nombre_completo)}
                              </div>
                            ))}
                            {usersR.length > 4 && (
                              <div
                                style={{
                                  width: '26px',
                                  height: '26px',
                                  borderRadius: '50%',
                                  background: '#e2e8f0',
                                  border: '2px solid #ffffff',
                                  marginLeft: -8,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '9px',
                                  fontWeight: 800,
                                  color: '#475569',
                                }}
                              >
                                +{usersR.length - 4}
                              </div>
                            )}
                          </div>
                        </div>

                        <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
                          {usersR.length} {usersR.length === 1 ? 'usuario' : 'usuarios'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* ════════════ MODAL CREAR / EDITAR USUARIO & PERMISOS GRANULARES ════════════ */}
      {showUM && (
        <CleanModal
          title={editU ? 'Editar Usuario y Accesos' : 'Crear Nuevo Usuario y Accesos'}
          subtitle={
            editU
              ? `Modificando credenciales, rol y matriz granular de: ${editU.nombre_completo}`
              : 'Registra un nuevo usuario y define sus permisos específicos para cada módulo'
          }
          onClose={() => setShowUM(false)}
          width={880}
          footer={
            <>
              <button
                type="button"
                onClick={() => setShowUM(false)}
                style={{
                  padding: '10px 22px',
                  borderRadius: '10px',
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  color: '#475569',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={saveUser}
                disabled={savingU}
                style={{
                  padding: '10px 26px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #16a34a, #15803d)',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 800,
                  fontSize: '13px',
                  cursor: savingU ? 'not-allowed' : 'pointer',
                  opacity: savingU ? 0.7 : 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 2px 6px rgba(22, 163, 74, 0.25)',
                }}
              >
                <i className={`fa-solid ${savingU ? 'fa-spinner fa-spin' : 'fa-floppy-disk'}`} />
                <span>{savingU ? 'Guardando Permisos...' : editU ? 'Guardar Cambios y Accesos' : 'Crear Usuario con Accesos'}</span>
              </button>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
            {/* ──── SECCIÓN 1: DATOS DE CUENTA Y CREDENCIALES ──── */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '16px 18px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <i className="fa-solid fa-id-badge" style={{ color: '#2563eb', fontSize: '15px' }} />
                <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  1. Perfil y Credenciales de Acceso
                </h4>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                  gap: '14px',
                }}
              >
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '11.5px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                    Nombre Completo *
                  </label>
                  <input
                    value={uForm.nombre_completo}
                    onChange={(e) => setUForm((p) => ({ ...p, nombre_completo: e.target.value }))}
                    placeholder="Ej: Maria Lopez Rios"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      fontSize: '13px',
                      background: '#ffffff',
                      border: '1.5px solid #cbd5e1',
                      color: '#0f172a',
                      fontWeight: 600,
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '11.5px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                    Correo Electrónico {editU ? '(Solo lectura)' : '*'}
                  </label>
                  <input
                    value={uForm.email}
                    disabled={!!editU}
                    onChange={(e) => setUForm((p) => ({ ...p, email: e.target.value }))}
                    placeholder="usuario@amexcourier.pe"
                    type="email"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      fontSize: '13px',
                      background: editU ? '#f1f5f9' : '#ffffff',
                      border: '1.5px solid #cbd5e1',
                      color: editU ? '#64748b' : '#0f172a',
                      fontWeight: 600,
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '11.5px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                    {editU ? 'Nueva Contraseña (opcional)' : 'Contraseña *'}
                  </label>
                  <input
                    value={uForm.password}
                    onChange={(e) => setUForm((p) => ({ ...p, password: e.target.value }))}
                    placeholder={editU ? 'Mantener contraseña actual' : 'Mínimo 8 caracteres'}
                    type="password"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      fontSize: '13px',
                      background: '#ffffff',
                      border: '1.5px solid #cbd5e1',
                      color: '#0f172a',
                      fontWeight: 600,
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '11.5px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                    Rol Asignado
                  </label>
                  <select
                    value={uForm.rol_id}
                    onChange={(e) => handleUserRoleChange(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      fontSize: '13px',
                      background: '#ffffff',
                      border: '1.5px solid #cbd5e1',
                      color: '#0f172a',
                      fontWeight: 600,
                      outline: 'none',
                      boxSizing: 'border-box',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="">— Sin rol asignado —</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Barra Informativa del Rol y Botón de Copiar Plantilla */}
              {uForm.rol_id &&
                (() => {
                  const r = roles.find((x) => x.id === uForm.rol_id);
                  if (!r) return null;
                  const cnt = MODULOS.filter((m) => isModuleEnabledForRole(r.permisos, m.key)).length;
                  const rStyle = getRolStyle(r.nombre);
                  return (
                    <div
                      style={{
                        marginTop: '12px',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        background: '#ffffff',
                        border: `1px solid ${rStyle.border}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '10px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            padding: '3px 10px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 800,
                            background: rStyle.bg,
                            color: rStyle.text,
                            border: `1px solid ${rStyle.border}`,
                          }}
                        >
                          {r.nombre}
                        </span>
                        <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
                          Plantilla oficial habilita <strong>{cnt}</strong> de {MODULOS.length} módulos.
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => copyRolePermissionsToUser(uForm.rol_id)}
                        style={{
                          padding: '5px 12px',
                          borderRadius: '8px',
                          background: '#f1f5f9',
                          border: '1px solid #cbd5e1',
                          color: '#334155',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <i className="fa-solid fa-arrows-rotate" style={{ color: '#2563eb' }} />
                        <span>Cargar plantilla predeterminada del rol</span>
                      </button>
                    </div>
                  );
                })()}

              {editU && (
                <div style={{ marginTop: '12px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '11.5px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                    Estado de la Cuenta
                  </label>
                  <div style={{ display: 'flex', gap: '10px', maxWidth: '400px' }}>
                    {[
                      { v: true, label: 'Activo (Puede ingresar)', icon: 'fa-circle-check', color: '#16a34a' },
                      { v: false, label: 'Inactivo (Bloqueado)', icon: 'fa-ban', color: '#dc2626' },
                    ].map((opt) => (
                      <button
                        key={String(opt.v)}
                        type="button"
                        onClick={() => setUForm((p) => ({ ...p, activo: opt.v }))}
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          borderRadius: '9px',
                          border: `1.5px solid ${uForm.activo === opt.v ? opt.color : '#e2e8f0'}`,
                          background: uForm.activo === opt.v ? `${opt.color}15` : '#ffffff',
                          color: uForm.activo === opt.v ? opt.color : '#64748b',
                          cursor: 'pointer',
                          fontWeight: 800,
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <i className={`fa-solid ${opt.icon}`} />
                        <span>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ──── SECCIÓN 2: CONTROL GRANULAR DE PERMISOS POR MÓDULO ──── */}
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                  marginBottom: '12px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="fa-solid fa-sliders" style={{ color: '#7c3aed', fontSize: '15px' }} />
                    <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      2. Permisos Granulares por Módulo ({MODULOS.length} Módulos)
                    </h4>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '10px',
                        background: '#f5f3ff',
                        color: '#7c3aed',
                        fontSize: '11px',
                        fontWeight: 800,
                        border: '1px solid #ddd6fe',
                      }}
                    >
                      {MODULOS.filter((m) => !!uForm.permisos[m.key]?.ver).length}/{MODULOS.length} Activos
                    </span>
                  </div>
                  <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#64748b' }}>
                    Activa módulos y define qué puede hacer el usuario: <strong>Ver</strong> (acceso), <strong>Crear</strong>, <strong>Editar</strong>, <strong>Eliminar</strong> o <strong>Exportar</strong> reportes.
                  </p>
                </div>

                {/* Botones de Acción Masiva */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={enableAllUserPermissions}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '7px',
                      background: '#dcfce7',
                      border: '1px solid #86efac',
                      color: '#15803d',
                      fontSize: '11.5px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    <i className="fa-solid fa-circle-check" />
                    <span>Acceso Total (5/5)</span>
                  </button>

                  <button
                    type="button"
                    onClick={setReadOnlyUserPermissions}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '7px',
                      background: '#e0f2fe',
                      border: '1px solid #bae6fd',
                      color: '#0369a1',
                      fontSize: '11.5px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    <i className="fa-solid fa-eye" />
                    <span>Solo Lectura</span>
                  </button>

                  <button
                    type="button"
                    onClick={disableAllUserPermissions}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '7px',
                      background: '#fee2e2',
                      border: '1px solid #fca5a5',
                      color: '#b91c1c',
                      fontSize: '11.5px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    <i className="fa-solid fa-ban" />
                    <span>Desactivar Todos</span>
                  </button>
                </div>
              </div>

              {/* Filtro por Categoría de Módulos (Sticky para acceso continuo) */}
              <div
                style={{
                  display: 'flex',
                  gap: '6px',
                  marginBottom: '10px',
                  background: '#f1f5f9',
                  padding: '5px',
                  borderRadius: '10px',
                  width: 'fit-content',
                  position: 'sticky',
                  top: '-4px',
                  zIndex: 10,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                }}
              >
                {(
                  [
                    { id: 'todos', label: 'Todos', count: MODULOS.length },
                    { id: 'operaciones', label: 'Operaciones', count: MODULOS.filter((m) => m.category === 'operaciones').length },
                    { id: 'documentacion', label: 'Documentación', count: MODULOS.filter((m) => m.category === 'documentacion').length },
                    { id: 'sistema', label: 'Sistema & Auditoría', count: MODULOS.filter((m) => m.category === 'sistema').length },
                  ] as const
                ).map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setUModalCategory(cat.id)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '7px',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: 800,
                      fontSize: '11.5px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: uModalCategory === cat.id ? '#ffffff' : 'transparent',
                      color: uModalCategory === cat.id ? '#0f172a' : '#64748b',
                      boxShadow: uModalCategory === cat.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span>{cat.label}</span>
                    <span
                      style={{
                        fontSize: '10px',
                        padding: '1px 5px',
                        borderRadius: '10px',
                        background: uModalCategory === cat.id ? '#e2e8f0' : '#e2e8f080',
                        color: '#475569',
                      }}
                    >
                      {cat.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Lista de Tarjetas de Módulos (Fluye naturalmente dentro del cuerpo scrollable) */}
              <div
                style={{
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '14px',
                  padding: '10px',
                  background: '#f8fafc',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                {MODULOS.filter((m) => uModalCategory === 'todos' || m.category === uModalCategory).map((m) => {
                  const p = uForm.permisos[m.key] || {
                    ver: false,
                    crear: false,
                    editar: false,
                    eliminar: false,
                    exportar: false,
                  };
                  const isEnabled = !!p.ver;
                  const catInfo = CATEGORY_LABELS[m.category];

                  return (
                    <div
                      key={m.key}
                      style={{
                        background: isEnabled ? '#ffffff' : '#f1f5f980',
                        border: `1.5px solid ${isEnabled ? '#cbd5e1' : '#e2e8f0'}`,
                        borderRadius: '12px',
                        padding: '12px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '12px',
                        transition: 'all 0.15s ease',
                        boxShadow: isEnabled ? '0 1px 3px rgba(0,0,0,0.03)' : 'none',
                      }}
                    >
                      {/* Lado Izquierdo: Toggle Maestro del Módulo + Icono + Nombre */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '240px' }}>
                        {/* Switch / Checkbox Maestro */}
                        <div
                          onClick={() => toggleUserModuleVer(m.key)}
                          title={isEnabled ? 'Desactivar acceso a este módulo' : 'Habilitar acceso a este módulo'}
                          style={{
                            width: '22px',
                            height: '22px',
                            borderRadius: '6px',
                            background: isEnabled ? m.color : '#ffffff',
                            border: `2px solid ${isEnabled ? m.color : '#94a3b8'}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            flexShrink: 0,
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {isEnabled && <i className="fa-solid fa-check" style={{ color: '#ffffff', fontSize: '12px' }} />}
                        </div>

                        {/* Icono del Módulo */}
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '10px',
                            background: `${m.color}15`,
                            border: `1px solid ${m.color}33`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: m.color,
                            fontSize: '15px',
                            flexShrink: 0,
                          }}
                        >
                          <i className={`fa-solid ${m.icon}`} />
                        </div>

                        {/* Etiquetas */}
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span
                              style={{
                                fontSize: '13px',
                                fontWeight: 800,
                                color: isEnabled ? '#0f172a' : '#64748b',
                              }}
                            >
                              {m.label}
                            </span>
                            <span
                              style={{
                                fontSize: '9.5px',
                                fontWeight: 800,
                                padding: '1px 6px',
                                borderRadius: '4px',
                                background: `${catInfo.color}15`,
                                color: catInfo.color,
                                textTransform: 'uppercase',
                              }}
                            >
                              {m.category}
                            </span>
                          </div>
                          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px', fontWeight: 600 }}>
                            {isEnabled ? (
                              <span style={{ color: '#16a34a' }}>
                                <i className="fa-solid fa-circle-check" style={{ fontSize: '10px', marginRight: '4px' }} />
                                Acceso Habilitado
                              </span>
                            ) : (
                              <span style={{ color: '#94a3b8' }}>
                                <i className="fa-solid fa-lock" style={{ fontSize: '10px', marginRight: '4px' }} />
                                Módulo Inactivo
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Lado Derecho: Controles CRUD Granulares */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        {!isEnabled ? (
                          <button
                            type="button"
                            onClick={() => toggleUserModuleVer(m.key)}
                            style={{
                              padding: '6px 14px',
                              borderRadius: '8px',
                              background: '#ffffff',
                              border: '1px solid #cbd5e1',
                              color: '#475569',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            <i className="fa-solid fa-plus" style={{ color: '#16a34a' }} />
                            <span>Habilitar Módulo</span>
                          </button>
                        ) : (
                          <>
                            {/* Pastillas de 4 Acciones Granulares */}
                            <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                              {/* 1. CREAR */}
                              <button
                                type="button"
                                onClick={() => toggleUserModuleAction(m.key, 'crear')}
                                title={p.crear ? 'Permite crear nuevos registros' : 'Creación desactivada'}
                                style={{
                                  padding: '5px 9px',
                                  borderRadius: '7px',
                                  fontSize: '11.5px',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  transition: 'all 0.15s ease',
                                  background: p.crear ? '#dcfce7' : '#ffffff',
                                  color: p.crear ? '#15803d' : '#94a3b8',
                                  border: `1.5px solid ${p.crear ? '#86efac' : '#cbd5e1'}`,
                                }}
                              >
                                <i className={`fa-solid ${p.crear ? 'fa-check' : 'fa-plus'}`} style={{ fontSize: '10px' }} />
                                <span>Crear</span>
                              </button>

                              {/* 2. EDITAR */}
                              <button
                                type="button"
                                onClick={() => toggleUserModuleAction(m.key, 'editar')}
                                title={p.editar ? 'Permite editar registros' : 'Edición desactivada'}
                                style={{
                                  padding: '5px 9px',
                                  borderRadius: '7px',
                                  fontSize: '11.5px',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  transition: 'all 0.15s ease',
                                  background: p.editar ? '#e0f2fe' : '#ffffff',
                                  color: p.editar ? '#0284c7' : '#94a3b8',
                                  border: `1.5px solid ${p.editar ? '#bae6fd' : '#cbd5e1'}`,
                                }}
                              >
                                <i className={`fa-solid ${p.editar ? 'fa-check' : 'fa-pen'}`} style={{ fontSize: '10px' }} />
                                <span>Editar</span>
                              </button>

                              {/* 3. ELIMINAR */}
                              <button
                                type="button"
                                onClick={() => toggleUserModuleAction(m.key, 'eliminar')}
                                title={p.eliminar ? 'Permite anular o eliminar registros' : 'Eliminación desactivada'}
                                style={{
                                  padding: '5px 9px',
                                  borderRadius: '7px',
                                  fontSize: '11.5px',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  transition: 'all 0.15s ease',
                                  background: p.eliminar ? '#fee2e2' : '#ffffff',
                                  color: p.eliminar ? '#b91c1c' : '#94a3b8',
                                  border: `1.5px solid ${p.eliminar ? '#fca5a5' : '#cbd5e1'}`,
                                }}
                              >
                                <i className={`fa-solid ${p.eliminar ? 'fa-check' : 'fa-trash'}`} style={{ fontSize: '10px' }} />
                                <span>Eliminar</span>
                              </button>

                              {/* 4. EXPORTAR */}
                              <button
                                type="button"
                                onClick={() => toggleUserModuleAction(m.key, 'exportar')}
                                title={p.exportar ? 'Permite exportar reportes, Excel y PDF' : 'Exportación desactivada'}
                                style={{
                                  padding: '5px 9px',
                                  borderRadius: '7px',
                                  fontSize: '11.5px',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  transition: 'all 0.15s ease',
                                  background: p.exportar ? '#f3e8ff' : '#ffffff',
                                  color: p.exportar ? '#7c3aed' : '#94a3b8',
                                  border: `1.5px solid ${p.exportar ? '#d8b4fe' : '#cbd5e1'}`,
                                }}
                              >
                                <i className={`fa-solid ${p.exportar ? 'fa-check' : 'fa-file-export'}`} style={{ fontSize: '10px' }} />
                                <span>Exportar</span>
                              </button>
                            </div>

                            {/* Accesos rápidos de módulo */}
                            <div style={{ display: 'flex', gap: '3px', marginLeft: '4px' }}>
                              <button
                                type="button"
                                onClick={() => setUserModuleAllActions(m.key, true)}
                                title="Activar todas las acciones para este módulo"
                                style={{
                                  padding: '4px 7px',
                                  borderRadius: '5px',
                                  background: '#f1f5f9',
                                  border: '1px solid #cbd5e1',
                                  color: '#334155',
                                  fontSize: '10.5px',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                }}
                              >
                                Todo
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setUForm((prev) => ({
                                    ...prev,
                                    permisos: {
                                      ...prev.permisos,
                                      [m.key]: { ver: true, crear: false, editar: false, eliminar: false, exportar: false },
                                    },
                                  }));
                                }}
                                title="Fijar solo lectura para este módulo"
                                style={{
                                  padding: '4px 7px',
                                  borderRadius: '5px',
                                  background: '#f1f5f9',
                                  border: '1px solid #cbd5e1',
                                  color: '#334155',
                                  fontSize: '10.5px',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                }}
                              >
                                Solo Ver
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </CleanModal>
      )}

      {/* ════════════ MODAL CREAR / EDITAR ROL ════════════ */}
      {showRM && (
        <CleanModal
          title={editR ? `Editar Rol: ${editR.nombre}` : 'Crear Nuevo Rol'}
          subtitle="Define qué módulos del sistema estarán disponibles para los usuarios con este rol"
          onClose={() => setShowRM(false)}
          width={640}
          footer={
            <>
              <button
                type="button"
                onClick={() => setShowRM(false)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '10px',
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  color: '#475569',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={saveRole}
                disabled={savingR}
                style={{
                  padding: '10px 22px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 800,
                  fontSize: '13px',
                  cursor: savingR ? 'not-allowed' : 'pointer',
                  opacity: savingR ? 0.7 : 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)',
                }}
              >
                <i className={`fa-solid ${savingR ? 'fa-spinner fa-spin' : 'fa-floppy-disk'}`} />
                <span>{savingR ? 'Guardando...' : editR ? 'Guardar Cambios' : 'Crear Rol'}</span>
              </button>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {!editR && (
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '11.5px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  Nombre del Rol *
                </label>
                <input
                  value={rForm.nombre}
                  onChange={(e) => setRForm((p) => ({ ...p, nombre: e.target.value }))}
                  placeholder="Ej: Supervisor de Almacén"
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: '10px',
                    fontSize: '13px',
                    background: '#ffffff',
                    border: '1.5px solid #cbd5e1',
                    color: '#0f172a',
                    fontWeight: 600,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            )}

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '11.5px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                Descripción del Rol
              </label>
              <input
                value={rForm.descripcion}
                onChange={(e) => setRForm((p) => ({ ...p, descripcion: e.target.value }))}
                placeholder="Funciones y responsabilidades de este perfil..."
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  background: '#ffffff',
                  border: '1.5px solid #cbd5e1',
                  color: '#0f172a',
                  fontWeight: 600,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Matriz de Permisos por Módulo */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <label style={{ margin: 0, fontSize: '11.5px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  Módulos del Sistema Habilitados
                </label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => {
                      const all: Record<string, boolean> = {};
                      MODULOS.forEach((m) => {
                        all[m.key] = true;
                      });
                      setRForm((p) => ({ ...p, permisos: all }));
                    }}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      background: '#dcfce7',
                      border: '1px solid #86efac',
                      color: '#15803d',
                      cursor: 'pointer',
                      fontSize: '11.5px',
                      fontWeight: 700,
                    }}
                  >
                    Seleccionar Todos
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const none: Record<string, boolean> = {};
                      MODULOS.forEach((m) => {
                        none[m.key] = false;
                      });
                      setRForm((p) => ({ ...p, permisos: none }));
                    }}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      background: '#fee2e2',
                      border: '1px solid #fca5a5',
                      color: '#b91c1c',
                      cursor: 'pointer',
                      fontSize: '11.5px',
                      fontWeight: 700,
                    }}
                  >
                    Desmarcar Todos
                  </button>
                  <span style={{ fontSize: '12px', color: '#0284c7', fontWeight: 800, marginLeft: '4px' }}>
                    {Object.values(rForm.permisos).filter(Boolean).length}/{MODULOS.length}
                  </span>
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                  gap: '8px',
                }}
              >
                {MODULOS.map((m) => {
                  const on = !!rForm.permisos[m.key];
                  return (
                    <div
                      key={m.key}
                      onClick={() =>
                        setRForm((p) => ({
                          ...p,
                          permisos: { ...p.permisos, [m.key]: !p.permisos[m.key] },
                        }))
                      }
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 12px',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        userSelect: 'none',
                        transition: 'all 0.15s ease',
                        background: on ? `${m.color}12` : '#f8fafc',
                        border: `1.5px solid ${on ? m.color : '#e2e8f0'}`,
                      }}
                    >
                      <div
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '5px',
                          flexShrink: 0,
                          background: on ? m.color : '#ffffff',
                          border: `1.5px solid ${on ? m.color : '#cbd5e1'}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {on && <i className="fa-solid fa-check" style={{ fontSize: '10px', color: '#ffffff' }} />}
                      </div>
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '8px',
                          background: `${m.color}20`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <i className={`fa-solid ${m.icon}`} style={{ fontSize: '12px', color: m.color }} />
                      </div>
                      <span
                        style={{
                          fontSize: '12px',
                          color: on ? '#0f172a' : '#64748b',
                          fontWeight: on ? 800 : 600,
                        }}
                      >
                        {m.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </CleanModal>
      )}
    </div>
  );
}
