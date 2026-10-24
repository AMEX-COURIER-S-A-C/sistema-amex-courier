import fs from 'fs';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const env = dotenv.parse(fs.readFileSync('.env.local'));
const url = env.NEXT_PUBLIC_PORTAL_SUPABASE_URL || 'https://zftkbolgcnnkkdfzmtix.supabase.co';
const serviceKey = env.PORTAL_SUPABASE_SERVICE_ROLE_KEY;

if (!serviceKey) {
  console.error('No se encontró PORTAL_SUPABASE_SERVICE_ROLE_KEY en .env.local');
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

async function main() {
  console.log('Cargando clientes extraídos de TIB...');
  const json = JSON.parse(fs.readFileSync('scripts/clientes_tib_extraidos.json', 'utf-8'));
  const clients = json.clientes;
  console.log(`Total clientes a insertar: ${clients.length}`);

  // Limpiar registros previos si los hubiera
  const { error: truncateErr } = await supabase.from('amex_portal_clientes').delete().neq('id', 0);
  if (truncateErr) {
    console.warn('Aviso al limpiar tabla previa:', truncateErr.message);
  }

  const batchSize = 250;
  let insertedCount = 0;

  for (let i = 0; i < clients.length; i += batchSize) {
    const batch = clients.slice(i, i + batchSize).map(c => ({
      nombre: c.nombre || 'SIN NOMBRE',
      iclient: c.iclient || null,
      total_paquetes: c.totalPaquetes || 0,
      recibidos: c.recibidos || 0,
      enviados: c.enviados || 0,
      entregados: c.entregados || 0,
      ultimo_wr: c.ultimoWr || null,
      ultimo_tracking: c.ultimoTracking || null,
      ultima_fecha: c.ultimoPaqueteFecha || null,
      email: c.emails && c.emails[0] ? c.emails[0] : null
    }));

    const { error } = await supabase.from('amex_portal_clientes').insert(batch);
    if (error) {
      console.error(`Error en lote ${i} - ${i + batch.length}:`, error.message);
      throw error;
    }

    insertedCount += batch.length;
    process.stdout.write(`\rInsertados: ${insertedCount} / ${clients.length}`);
  }

  console.log('\n\n¡Inserción completada con éxito!');

  // Verificar recuento en la base de datos
  const { count, error: countErr } = await supabase
    .from('amex_portal_clientes')
    .select('*', { count: 'exact', head: true });

  if (countErr) {
    console.error('Error al verificar conteo:', countErr.message);
  } else {
    console.log(`Verificación en Supabase: ${count} registros confirmados en 'amex_portal_clientes'.`);
  }
}

main().catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});
