import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Parse .env.local manually
try {
  const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
} catch (e) {
  console.warn('No se pudo leer .env.local:', e.message);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Faltan credenciales de Supabase en .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const OFFICIAL_ROLES = [
  {
    nombre: 'Administrador',
    descripcion: 'Control total de la plataforma, infraestructura, variables técnicas y auditoría',
    permisos: {
      dashboard: true,
      live_sheets: true,
      inventario: true,
      cobros: true,
      directorio_clientes: true,
      scanner: true,
      dni_matrix: true,
      rotulos: true,
      boletas_shalom: true,
      formato_entrega: true,
      invoices: true,
      info_amex: true,
      completar_inventario: true,
      auditoria: true,
      admin_usuarios: true,
      despacho_rutas: true,
      manifiestos_tib: true,
      configuracion: true,
    },
  },
  {
    nombre: 'Gerente General',
    descripcion: 'Dirección estratégica, supervisión integral de finanzas, operaciones, auditoría y personal',
    permisos: {
      dashboard: true,
      live_sheets: true,
      inventario: true,
      cobros: true,
      directorio_clientes: true,
      scanner: true,
      dni_matrix: true,
      rotulos: true,
      boletas_shalom: true,
      formato_entrega: true,
      invoices: true,
      info_amex: true,
      completar_inventario: true,
      auditoria: true,
      admin_usuarios: true,
      despacho_rutas: true,
      manifiestos_tib: true,
      configuracion: false,
    },
  },
  {
    nombre: 'Asistente de Gerencia',
    descripcion: 'Mano derecha operativa de gerencia con control general de operaciones, cobros y logística',
    permisos: {
      dashboard: true,
      live_sheets: true,
      inventario: true,
      cobros: true,
      directorio_clientes: true,
      scanner: true,
      dni_matrix: true,
      rotulos: true,
      boletas_shalom: true,
      formato_entrega: true,
      invoices: true,
      info_amex: true,
      completar_inventario: true,
      auditoria: false,
      admin_usuarios: false,
      despacho_rutas: true,
      manifiestos_tib: true,
      configuracion: false,
    },
  },
  {
    nombre: 'Cobranzas & Gestión de Entregas',
    descripcion: 'Registro de pagos, conciliación de planillas, agencias Shalom, actas y rutas pagadas',
    permisos: {
      dashboard: false,
      live_sheets: false,
      inventario: true,
      cobros: true,
      directorio_clientes: true,
      scanner: false,
      dni_matrix: false,
      rotulos: true,
      boletas_shalom: true,
      formato_entrega: true,
      invoices: false,
      info_amex: false,
      completar_inventario: false,
      auditoria: false,
      admin_usuarios: false,
      despacho_rutas: true,
      manifiestos_tib: false,
      configuracion: false,
    },
  },
  {
    nombre: 'Almacenero / Operador Logístico',
    descripcion: 'Recepción física, pesado, ubicación en racks WMS, rótulos, subida TIB y manifiestos',
    permisos: {
      dashboard: false,
      live_sheets: false,
      inventario: true,
      cobros: false,
      directorio_clientes: false,
      scanner: true,
      dni_matrix: true,
      rotulos: true,
      boletas_shalom: false,
      formato_entrega: true,
      invoices: false,
      info_amex: false,
      completar_inventario: true,
      auditoria: false,
      admin_usuarios: false,
      despacho_rutas: false,
      manifiestos_tib: true,
      configuracion: false,
    },
  },
  {
    nombre: 'Chofer / Repartidor',
    descripcion: 'Hoja de ruta móvil, navegación de entregas, captura de fotos en calle y escaneo de entrega',
    permisos: {
      dashboard: false,
      live_sheets: false,
      inventario: false,
      cobros: false,
      directorio_clientes: false,
      scanner: true,
      dni_matrix: false,
      rotulos: false,
      boletas_shalom: false,
      formato_entrega: false,
      invoices: false,
      info_amex: false,
      completar_inventario: false,
      auditoria: false,
      admin_usuarios: false,
      despacho_rutas: true,
      manifiestos_tib: false,
      configuracion: false,
    },
  },
  {
    nombre: 'Atención WhatsApp / Auxiliar al Cliente',
    descripcion: 'Consultas de tracking, directorio de clientes, fotos con marca de agua, invoices y verificación de pagos',
    permisos: {
      dashboard: false,
      live_sheets: false,
      inventario: true,
      cobros: true,
      directorio_clientes: true,
      scanner: true,
      dni_matrix: true,
      rotulos: false,
      boletas_shalom: false,
      formato_entrega: false,
      invoices: true,
      info_amex: true,
      completar_inventario: false,
      auditoria: false,
      admin_usuarios: false,
      despacho_rutas: false,
      manifiestos_tib: false,
      configuracion: false,
    },
  },
];

async function main() {
  console.log('--- Iniciando configuración de los 7 roles oficiales ---');

  // 1. Obtener roles existentes
  const { data: existingRoles, error: getRolesErr } = await supabase
    .from('roles_sistema')
    .select('id, nombre');

  if (getRolesErr) {
    console.error('Error obteniendo roles existentes:', getRolesErr);
    process.exit(1);
  }

  const roleMap = new Map();
  for (const r of existingRoles || []) {
    roleMap.set(r.nombre.toLowerCase().trim(), r.id);
  }

  const createdOrUpdatedIds = {};

  // 2. Insertar o actualizar cada uno de los 7 roles oficiales
  for (const r of OFFICIAL_ROLES) {
    const key = r.nombre.toLowerCase().trim();
    // Buscar si ya existe por nombre exacto o nombre similar
    let existingId = roleMap.get(key);

    if (!existingId) {
      if (key.includes('cobranza')) {
        for (const [k, id] of roleMap.entries()) {
          if (k.includes('cobranza')) existingId = id;
        }
      } else if (key.includes('almacen') || key.includes('operador log')) {
        for (const [k, id] of roleMap.entries()) {
          if (k.includes('operador log') || k.includes('almacen')) existingId = id;
        }
      }
    }

    if (existingId) {
      console.log(`Actualizando rol existente: "${r.nombre}" (ID: ${existingId})`);
      const { data, error } = await supabase
        .from('roles_sistema')
        .update({
          nombre: r.nombre,
          descripcion: r.descripcion,
          permisos: r.permisos,
        })
        .eq('id', existingId)
        .select()
        .single();

      if (error) console.error(`Error actualizando ${r.nombre}:`, error);
      else createdOrUpdatedIds[r.nombre] = data.id;
    } else {
      console.log(`Insertando nuevo rol: "${r.nombre}"`);
      const { data, error } = await supabase
        .from('roles_sistema')
        .insert({
          nombre: r.nombre,
          descripcion: r.descripcion,
          permisos: r.permisos,
        })
        .select()
        .single();

      if (error) console.error(`Error insertando ${r.nombre}:`, error);
      else createdOrUpdatedIds[r.nombre] = data.id;
    }
  }

  const adminRoleId = createdOrUpdatedIds['Administrador'];
  const asistenteGerenciaId = createdOrUpdatedIds['Asistente de Gerencia'];

  // 3. Reasignar usuarios con Testing 1 a Asistente de Gerencia
  const testingId = roleMap.get('testing 1');
  if (testingId && asistenteGerenciaId) {
    console.log(`Reasignando usuarios de "Testing 1" a "Asistente de Gerencia" (${asistenteGerenciaId})...`);
    const { data: reassigned, error: reassignErr } = await supabase
      .from('perfiles_usuarios')
      .update({ rol_id: asistenteGerenciaId })
      .eq('rol_id', testingId)
      .select('id, email, nombre_completo');

    if (reassignErr) console.error('Error reasignando usuarios:', reassignErr);
    else console.log(`Reasignados ${reassigned?.length || 0} usuarios.`);

    // Eliminar el rol Testing 1
    console.log('Eliminando rol provisional "Testing 1"...');
    const { error: delErr } = await supabase
      .from('roles_sistema')
      .delete()
      .eq('id', testingId);
    if (delErr) console.warn('Aviso eliminando Testing 1:', delErr.message);
    else console.log('Rol Testing 1 eliminado exitosamente.');
  }

  // 4. Asegurar que Administrador AMEX tenga el rol Administrador
  if (adminRoleId) {
    console.log(`Asegurando rol Administrador para sistemaamexcourier@gmail.com...`);
    await supabase
      .from('perfiles_usuarios')
      .update({ rol_id: adminRoleId })
      .eq('email', 'sistemaamexcourier@gmail.com');
  }

  // 5. Listar estado final
  const { data: finalRoles } = await supabase.from('roles_sistema').select('id, nombre').order('nombre');
  console.log('\n--- Roles oficiales en base de datos ---');
  console.table(finalRoles);

  const { data: finalUsers } = await supabase
    .from('perfiles_usuarios')
    .select('email, nombre_completo, rol_id, roles_sistema(nombre)')
    .order('nombre_completo');
  console.log('\n--- Usuarios y roles asignados ---');
  console.table(
    (finalUsers || []).map((u) => ({
      email: u.email,
      nombre: u.nombre_completo,
      rol: u.roles_sistema?.nombre || 'Sin Rol',
    }))
  );
  console.log('--- Configuración finalizada con éxito ---');
}

main().catch((err) => {
  console.error('Error fatal:', err);
  process.exit(1);
});
