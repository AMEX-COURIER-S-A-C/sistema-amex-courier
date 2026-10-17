import fs from 'fs';

// 1. Read .env.local to get Vercel credentials
const localEnv = fs.readFileSync('.env.local', 'utf-8');
const getLocalVal = (k) => {
  const m = localEnv.match(new RegExp(`${k}=([^\\r\\n]+)`));
  return m ? m[1].trim() : '';
};

const token = getLocalVal('VERCEL_TOKEN');
const teamId = getLocalVal('VERCEL_ORG_ID');
const projectId = getLocalVal('VERCEL_PROJECT_ID');

if (!token || !teamId || !projectId) {
  console.error('Faltan credenciales de Vercel en .env.local');
  process.exit(1);
}

// 2. Read .env.vercel to get all variables that should be in Vercel
const vercelEnvContent = fs.readFileSync('.env.vercel', 'utf-8');
const lines = vercelEnvContent.split('\n');
const envsToSync = [];

for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx > 0) {
    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();
    // Remove surrounding quotes if any
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    envsToSync.push({ key, value });
  }
}

console.log(`Leídas ${envsToSync.length} variables desde .env.vercel para sincronizar con Vercel.\n`);

async function syncEnvs() {
  // Fetch existing envs from Vercel
  const res = await fetch(`https://api.vercel.com/v9/projects/${projectId}/env?teamId=${teamId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  const existingEnvs = new Map();
  if (data.envs) {
    data.envs.forEach(e => existingEnvs.set(e.key, e));
  }

  console.log(`Variables ya existentes en Vercel: ${existingEnvs.size}`);

  let added = 0;
  let skipped = 0;
  let errors = 0;

  for (const { key, value } of envsToSync) {
    if (existingEnvs.has(key)) {
      console.log(`⏩ [Saltado] ${key} ya existe en Vercel.`);
      skipped++;
      continue;
    }

    console.log(`➕ [Agregando] ${key}...`);

    const createRes = await fetch(`https://api.vercel.com/v10/projects/${projectId}/env?teamId=${teamId}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        key,
        value,
        type: 'encrypted',
        target: ['production', 'preview', 'development']
      })
    });

    const createData = await createRes.json();
    if (createRes.ok) {
      console.log(`   ✅ ${key} agregada exitosamente.`);
      added++;
    } else {
      console.error(`   ❌ Error agregando ${key}:`, createData.error?.message || createData);
      errors++;
    }
  }

  console.log('\n======================================================');
  console.log(`Resumen de sincronización con Vercel:`);
  console.log(` - Agregadas: ${added}`);
  console.log(` - Ya existentes: ${skipped}`);
  console.log(` - Errores: ${errors}`);
  console.log('======================================================');
}

syncEnvs().catch(console.error);
