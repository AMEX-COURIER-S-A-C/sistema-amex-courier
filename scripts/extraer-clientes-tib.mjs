import fs from 'fs';
import dotenv from 'dotenv';

const env = dotenv.parse(fs.readFileSync('.env.local'));
const email = env.TIB_API_EMAIL;
const password = env.TIB_API_PASSWORD;
const url = env.TIB_API_URL || 'https://www.tibcourier.com/api/list-warehouse';

async function fetchStatus(st) {
  const t0 = Date.now();
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, status: st })
  });
  if (!res.ok) {
    throw new Error(`Error HTTP ${res.status} al consultar ${st}`);
  }
  const json = await res.json();
  const list = (json.data || []).map(item => ({ ...item, _fetchedStatus: st }));
  console.log(`[TIB API] Estado ${st.padEnd(10)}: ${String(list.length).padStart(6)} registros (${((Date.now() - t0)/1000).toFixed(2)}s)`);
  return list;
}

async function main() {
  console.log('================================================================');
  console.log('CONECTANDO A LA API DE TIB COURIER Y DESCARGANDO REGISTROS...');
  console.log('Usuario:', email);
  console.log('================================================================');

  const [recibidos, enviados, entregados] = await Promise.all([
    fetchStatus('RECIBIDO'),
    fetchStatus('ENVIADO'),
    fetchStatus('ENTREGADO')
  ]);

  const all = [...recibidos, ...enviados, ...entregados];

  // Agrupación de clientes
  const clientsById = new Map();
  const clientsByName = new Map();
  const emailsFound = new Set();

  for (const item of all) {
    const rawName = (item.nclient || '').trim();
    const iclient = (item.iclient || '').trim();
    const emailClient = (item.emailClient || '').trim().toLowerCase();
    const status = item._fetchedStatus;

    if (emailClient) {
      emailsFound.add(emailClient);
    }

    // Usaremos iclient como identificador principal si existe, de lo contrario el nombre en mayúsculas
    const key = iclient ? `ID_${iclient}` : `NAME_${rawName.toUpperCase()}`;

    if (!clientsById.has(key)) {
      clientsById.set(key, {
        iclient: iclient || null,
        nombre: rawName,
        nombresVariantes: new Set([rawName].filter(Boolean)),
        emails: new Set([emailClient].filter(Boolean)),
        totalPaquetes: 0,
        recibidos: 0,
        enviados: 0,
        entregados: 0,
        ultimoPaqueteFecha: item.fecRegister || item.fecModify || '',
        ultimoWr: item.wr,
        ultimoTracking: item.tracking
      });
    }

    const client = clientsById.get(key);
    if (rawName) client.nombresVariantes.add(rawName);
    if (emailClient) client.emails.add(emailClient);
    client.totalPaquetes++;
    if (status === 'RECIBIDO') client.recibidos++;
    else if (status === 'ENVIADO') client.enviados++;
    else if (status === 'ENTREGADO') client.entregados++;

    const itemDate = item.fecRegister || item.fecModify || '';
    if (itemDate && (!client.ultimoPaqueteFecha || itemDate > client.ultimoPaqueteFecha)) {
      client.ultimoPaqueteFecha = itemDate;
      client.ultimoWr = item.wr;
      client.ultimoTracking = item.tracking;
    }
  }

  const clientList = Array.from(clientsById.values()).map(c => ({
    iclient: c.iclient,
    nombre: c.nombre || 'SIN NOMBRE',
    variantes: Array.from(c.nombresVariantes),
    emails: Array.from(c.emails),
    totalPaquetes: c.totalPaquetes,
    recibidos: c.recibidos,
    enviados: c.enviados,
    entregados: c.entregados,
    ultimoPaqueteFecha: c.ultimoPaqueteFecha,
    ultimoWr: c.ultimoWr,
    ultimoTracking: c.ultimoTracking
  })).sort((a, b) => b.totalPaquetes - a.totalPaquetes);

  // Clientes con paquetes activos en tránsito o bodega (recibidos o enviados)
  const clientesActivos = clientList.filter(c => c.recibidos > 0 || c.enviados > 0);

  console.log('\n================================================================');
  console.log('RESULTADOS OFICIALES DE LA API TIB');
  console.log('================================================================');
  console.log(`Total paquetes procesados : ${all.length.toLocaleString('es-PE')}`);
  console.log(`  - Recibidos (Bodega Miami) : ${recibidos.length.toLocaleString('es-PE')}`);
  console.log(`  - Enviados (En tránsito)   : ${enviados.length.toLocaleString('es-PE')}`);
  console.log(`  - Entregados (Histórico)   : ${entregados.length.toLocaleString('es-PE')}`);
  console.log('----------------------------------------------------------------');
  console.log(`TOTAL CLIENTES / CONSIGNATARIOS ÚNICOS: ${clientList.length.toLocaleString('es-PE')}`);
  console.log(`Clientes con paquetes activos hoy (Bodega / Tránsito): ${clientesActivos.length.toLocaleString('es-PE')}`);
  console.log(`Correos únicos detectados en TIB: ${emailsFound.size.toLocaleString('es-PE')}`);
  console.log('================================================================\n');

  console.log('--- TOP 30 CLIENTES CON MÁS ENVÍOS ---');
  clientList.slice(0, 30).forEach((c, idx) => {
    const num = String(idx + 1).padStart(2, ' ');
    const idStr = c.iclient ? `[ID: ${c.iclient.padStart(5, ' ')}]` : '[S/ID     ]';
    const emailStr = c.emails.length > 0 ? `(${c.emails[0]})` : '';
    console.log(`${num}. ${idStr} ${c.nombre.padEnd(35)} | Paquetes: ${String(c.totalPaquetes).padStart(4)} (Rec: ${c.recibidos}, Env: ${c.enviados}, Ent: ${c.entregados}) ${emailStr}`);
  });

  // Guardar archivo JSON estructurado para el sistema
  const outputData = {
    fechaConsulta: new Date().toISOString(),
    servidor: 'TIB Courier API (https://www.tibcourier.com/api/list-warehouse)',
    cuenta: email,
    estadisticas: {
      totalPaquetes: all.length,
      paquetesRecibidos: recibidos.length,
      paquetesEnviados: enviados.length,
      paquetesEntregados: entregados.length,
      totalClientesUnicos: clientList.length,
      clientesConPaquetesActivos: clientesActivos.length,
      correosUnicos: emailsFound.size
    },
    top30Clientes: clientList.slice(0, 30),
    clientes: clientList
  };

  fs.writeFileSync('scripts/clientes_tib_extraidos.json', JSON.stringify(outputData, null, 2));
  console.log('\n[Guardado] Archivo generado: scripts/clientes_tib_extraidos.json');

  // Guardar también un CSV simplificado para visualización o importación rápida en Excel
  const csvRows = [
    'ID_CLIENTE,NOMBRE_CONSIGNATARIO,TOTAL_PAQUETES,RECIBIDOS,ENVIADOS,ENTREGADOS,ULTIMO_WR,ULTIMO_TRACKING,ULTIMA_FECHA,EMAIL'
  ];

  for (const c of clientList) {
    const safeName = `"${c.nombre.replace(/"/g, '""')}"`;
    const safeEmail = c.emails[0] ? `"${c.emails[0]}"` : '""';
    csvRows.push([
      c.iclient || '',
      safeName,
      c.totalPaquetes,
      c.recibidos,
      c.enviados,
      c.entregados,
      c.ultimoWr || '',
      c.ultimoTracking || '',
      c.ultimoPaqueteFecha || '',
      safeEmail
    ].join(','));
  }

  fs.writeFileSync('scripts/clientes_tib_listado.csv', csvRows.join('\n'), 'utf-8');
  console.log('[Guardado] Archivo CSV generado: scripts/clientes_tib_listado.csv');
}

main().catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});
