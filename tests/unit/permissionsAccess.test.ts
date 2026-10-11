import { describe, it, expect } from 'vitest';
import {
  SYSTEM_MODULES,
  hasModuleAccess,
  hasModuleAction,
  getAvailableModulesForUser,
  getFirstAvailableTab
} from '@/lib/navigation/registry';

describe('Control de Acceso y Permisos por Módulo (lib/navigation/registry.ts)', () => {
  const adminUser = {
    nombre: 'Administrador AMEX',
    rol: 'Administrador',
    isAdmin: true,
    permisos: {
      cobros: { ver: true, crear: true, editar: true, eliminar: true, exportar: true },
      escaner: { ver: true, crear: true, editar: true, eliminar: true, exportar: true },
      inventario: { ver: true, crear: true, editar: true, eliminar: true, exportar: true }
    }
  };

  const angelUser = {
    nombre: 'Angel',
    rol: 'Operador Logístico',
    isAdmin: false,
    permisos: {
      cobros: false,
      rotulos: false,
      scanner: true,
      invoices: false,
      auditoria: true,
      dashboard: false,
      info_amex: true,
      dni_matrix: false,
      inventario: true,
      live_sheets: false,
      admin_usuarios: false,
      boletas_shalom: false,
      formato_entrega: false,
      directorio_clientes: false,
      completar_inventario: false,
      despacho_rutas: false,
      manifiestos_tib: false
    }
  };

  const cobranzasUser = {
    nombre: 'Auxiliar Cobranzas',
    rol: 'Auxiliar de Cobranzas',
    isAdmin: false,
    permisos: {
      cobros: { ver: true, crear: true, editar: true, eliminar: false, exportar: true },
      escaner: { ver: false, crear: false, editar: false, eliminar: false, exportar: false },
      clientes: { ver: true, crear: true, editar: true, eliminar: false, exportar: true },
      usuarios: { ver: false, gestionar: false },
      auditoria: { ver: false, restaurar: false },
      inventario: { ver: true, crear: false, editar: false, eliminar: false, exportar: true },
      completar_tib: { ver: false, crear: false, editar: false, eliminar: false, exportar: false },
      manifiestos_tib: false
    }
  };

  describe('hasModuleAccess — Validación para Administradores', () => {
    it('el administrador debe tener acceso irrestricto a todos los 18 módulos del sistema', () => {
      SYSTEM_MODULES.forEach(module => {
        expect(hasModuleAccess(adminUser, module.tabId)).toBe(true);
      });
    });

    it('el administrador debe tener acceso a todos los submódulos del escáner', () => {
      expect(hasModuleAccess(adminUser, 'scanner-slotting')).toBe(true);
      expect(hasModuleAccess(adminUser, 'scanner-lookup')).toBe(true);
      expect(hasModuleAccess(adminUser, 'scanner-delivery')).toBe(true);
      expect(hasModuleAccess(adminUser, 'scanner-relocate')).toBe(true);
    });
  });

  describe('hasModuleAccess — Validación del Caso Angel (Operador con Permisos Selectivos)', () => {
    it('Angel debe tener acceso ÚNICAMENTE a los 4 módulos asignados', () => {
      // Módulos asignados: inventario (mm-lince), escáner (mobile-scanner), info_amex, auditoria
      expect(hasModuleAccess(angelUser, 'mm-lince')).toBe(true);
      expect(hasModuleAccess(angelUser, 'mobile-scanner')).toBe(true);
      expect(hasModuleAccess(angelUser, 'info-amex')).toBe(true);
      expect(hasModuleAccess(angelUser, 'auditoria')).toBe(true);
    });

    it('Angel debe tener acceso a los submódulos del escáner porque scanner está activo', () => {
      expect(hasModuleAccess(angelUser, 'scanner-slotting')).toBe(true);
      expect(hasModuleAccess(angelUser, 'scanner-lookup')).toBe(true);
      expect(hasModuleAccess(angelUser, 'scanner-delivery')).toBe(true);
      expect(hasModuleAccess(angelUser, 'scanner-relocate')).toBe(true);
    });

    it('Angel debe tener acceso a dashboard como su home adaptativo (Mi Estación de Trabajo)', () => {
      expect(hasModuleAccess(angelUser, 'dashboard')).toBe(true);
    });

    it('Angel NO debe tener acceso a los 13 módulos operativos no asignados', () => {
      const tabsBloqueados = [
        'live-sheets',
        'fico-cobros',
        'directorio-clientes',
        'dni-matrix',
        'rotulos-a4',
        'boletas-shalom',
        'formato-entrega',
        'invoices-usa',
        'completar-inventario',
        'admin-usuarios',
        'despacho-rutas',
        'manifiestos-tib',
        'configuracion'
      ];

      tabsBloqueados.forEach(tabId => {
        expect(hasModuleAccess(angelUser, tabId)).toBe(false);
      });
    });

    it('debe otorgar acceso a 17. Manifiestos TIB cuando el permiso manifiestos_tib está activo', () => {
      const manifestUser = {
        nombre: 'Digitador TIB',
        rol: 'Operador Manifiestos',
        permisos: { manifiestos_tib: true }
      };
      expect(hasModuleAccess(manifestUser, 'manifiestos-tib')).toBe(true);
    });

    it('getAvailableModulesForUser debe retornar los módulos autorizados más dashboard para Angel', () => {
      const modulosAngel = getAvailableModulesForUser(angelUser);
      const idsAngel = modulosAngel.map(m => m.id);
      expect(idsAngel).toEqual(['dashboard', 'mm-lince', 'scanner', 'info-amex', 'auditoria']);
      expect(modulosAngel.length).toBe(5);
    });

    it('getFirstAvailableTab debe retornar dashboard como el home adaptativo de inicio', () => {
      expect(getFirstAvailableTab(angelUser)).toBe('dashboard');
    });
  });

  describe('hasModuleAccess — Compatibilidad con permisos anidados en formato objeto ({ver: true})', () => {
    it('debe reconocer permisos booleanos y permisos estructurados tipo {ver: true}', () => {
      expect(hasModuleAccess(cobranzasUser, 'fico-cobros')).toBe(true);
      expect(hasModuleAccess(cobranzasUser, 'directorio-clientes')).toBe(true);
      expect(hasModuleAccess(cobranzasUser, 'mm-lince')).toBe(true);

      // Bloqueados con ver: false
      expect(hasModuleAccess(cobranzasUser, 'mobile-scanner')).toBe(false);
      expect(hasModuleAccess(cobranzasUser, 'auditoria')).toBe(false);
      expect(hasModuleAccess(cobranzasUser, 'admin-usuarios')).toBe(false);
    });
  });

  describe('hasModuleAction — Evaluación Granular de Permisos (Ver, Crear, Editar, Eliminar, Exportar)', () => {
    it('el administrador tiene permiso irrestricto para todas las 5 acciones en cualquier módulo', () => {
      expect(hasModuleAction(adminUser, 'inventario', 'ver')).toBe(true);
      expect(hasModuleAction(adminUser, 'inventario', 'crear')).toBe(true);
      expect(hasModuleAction(adminUser, 'inventario', 'editar')).toBe(true);
      expect(hasModuleAction(adminUser, 'inventario', 'eliminar')).toBe(true);
      expect(hasModuleAction(adminUser, 'inventario', 'exportar')).toBe(true);
    });

    it('un usuario con permisos granulares específicos respeta las restricciones de crear, editar, eliminar y exportar', () => {
      // cobranzasUser en cobros: { ver: true, crear: true, editar: true, eliminar: false, exportar: true }
      expect(hasModuleAction(cobranzasUser, 'cobros', 'ver')).toBe(true);
      expect(hasModuleAction(cobranzasUser, 'cobros', 'crear')).toBe(true);
      expect(hasModuleAction(cobranzasUser, 'cobros', 'editar')).toBe(true);
      expect(hasModuleAction(cobranzasUser, 'cobros', 'eliminar')).toBe(false);
      expect(hasModuleAction(cobranzasUser, 'cobros', 'exportar')).toBe(true);

      // cobranzasUser en inventario: { ver: true, crear: false, editar: false, eliminar: false, exportar: true }
      expect(hasModuleAction(cobranzasUser, 'inventario', 'ver')).toBe(true);
      expect(hasModuleAction(cobranzasUser, 'inventario', 'crear')).toBe(false);
      expect(hasModuleAction(cobranzasUser, 'inventario', 'editar')).toBe(false);
      expect(hasModuleAction(cobranzasUser, 'inventario', 'eliminar')).toBe(false);
      expect(hasModuleAction(cobranzasUser, 'inventario', 'exportar')).toBe(true);
    });

    it('si el módulo está desactivado (ver: false o no asignado), ninguna acción está permitida', () => {
      expect(hasModuleAction(cobranzasUser, 'scanner', 'ver')).toBe(false);
      expect(hasModuleAction(cobranzasUser, 'scanner', 'crear')).toBe(false);
      expect(hasModuleAction(cobranzasUser, 'scanner', 'editar')).toBe(false);
      expect(hasModuleAction(cobranzasUser, 'scanner', 'eliminar')).toBe(false);
      expect(hasModuleAction(cobranzasUser, 'scanner', 'exportar')).toBe(false);
    });

    it('en formato booleano legacy (true), otorga todas las acciones cuando el módulo está activo', () => {
      // angelUser tiene scanner: true
      expect(hasModuleAction(angelUser, 'scanner', 'ver')).toBe(true);
      expect(hasModuleAction(angelUser, 'scanner', 'crear')).toBe(true);
      expect(hasModuleAction(angelUser, 'scanner', 'editar')).toBe(true);
      expect(hasModuleAction(angelUser, 'scanner', 'eliminar')).toBe(true);
      expect(hasModuleAction(angelUser, 'scanner', 'exportar')).toBe(true);

      // angelUser tiene cobros: false
      expect(hasModuleAction(angelUser, 'cobros', 'ver')).toBe(false);
      expect(hasModuleAction(angelUser, 'cobros', 'crear')).toBe(false);
    });
  });
});
