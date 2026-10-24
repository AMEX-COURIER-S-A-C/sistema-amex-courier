const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const net = require('net');

// Parse .env.local
function parseEnv(filePath) {
  const env = {};
  if (!fs.existsSync(filePath)) return env;
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
  }
  return env;
}

const env = parseEnv(path.resolve(process.cwd(), '.env.local'));

function mask(str, visibleChars = 4) {
  if (!str) return '(no configurado)';
  if (str.length <= visibleChars * 2) return '***';
  return str.slice(0, visibleChars) + '...' + str.slice(-visibleChars);
}

const results = [];

function recordResult(service, keyName, status, message, details = null) {
  results.push({ service, keyName, status, message, details });
  const icon = status === 'OK' ? '✅' : status === 'WARN' ? '⚠️' : '❌';
  console.log(`${icon} [${service}] ${keyName}: ${message}`);
}

// Helper fetch via standard node https
function requestJson(urlStr, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const mod = url.protocol === 'https:' ? https : http;
    const req = mod.request(
      url,
      {
        method: options.method || 'GET',
        headers: options.headers || {},
        timeout: options.timeout || 10000,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve({ statusCode: res.statusCode, headers: res.headers, data: parsed, raw: data });
          } catch {
            resolve({ statusCode: res.statusCode, headers: res.headers, data: null, raw: data });
          }
        });
      }
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function testSupabase() {
  const url = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const mgmtToken = env.SUPABASE_ACCESS_TOKEN;

  // 1. Supabase Anon Key & URL
  if (!url || !anonKey) {
    recordResult('Supabase', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'FAIL', 'Falta URL o Anon Key');
  } else {
    try {
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(url, anonKey);
      
      // Probar auth
      const authRes = await supabase.auth.getSession();
      
      // Probar consulta pública o tablas
      const { data, error } = await supabase.from('paquetes').select('id').limit(1);
      
      if (!error) {
        recordResult('Supabase', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'OK', `Anon Key válida y funcional. Consulta exitosa a paquetes.`);
      } else {
        // Podría ser RLS esperado si paquetes requiere estar autenticado
        // Probemos si el error es de autenticación de API key o sólo de permisos RLS
        if (error.code === 'PGRST301' || error.message.includes('JWT') || error.message.includes('API key')) {
          recordResult('Supabase', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'FAIL', `Error de clave: ${error.message}`);
        } else {
          recordResult('Supabase', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'OK', `Anon Key válida y autenticada (RLS activo: ${error.message})`);
        }
      }
    } catch (err) {
      recordResult('Supabase', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'FAIL', `Error conectando a Supabase: ${err.message}`);
    }
  }

  // 2. Supabase Service Role Key
  if (!url || !serviceKey) {
    recordResult('Supabase', 'SUPABASE_SERVICE_ROLE_KEY', 'FAIL', 'Falta SUPABASE_SERVICE_ROLE_KEY');
  } else {
    try {
      const res = await requestJson(`${url.replace(/\/+$/, '')}/rest/v1/paquetes?select=id&limit=1`, {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
      });
      if (res.statusCode === 200) {
        recordResult('Supabase', 'SUPABASE_SERVICE_ROLE_KEY', 'OK', `Acceso Service Role confirmado a tablas de base de datos (HTTP 200).`);
      } else {
        recordResult('Supabase', 'SUPABASE_SERVICE_ROLE_KEY', 'FAIL', `Respuesta HTTP ${res.statusCode}: ${res.raw.slice(0, 100)}`);
      }
    } catch (err) {
      recordResult('Supabase', 'SUPABASE_SERVICE_ROLE_KEY', 'FAIL', `Error: ${err.message}`);
    }
  }

  // 3. Supabase Access Token (Management API)
  if (mgmtToken) {
    try {
      const res = await requestJson('https://api.supabase.com/v1/projects', {
        headers: { Authorization: `Bearer ${mgmtToken}` },
      });
      if (res.statusCode === 200 && Array.isArray(res.data)) {
        recordResult('Supabase', 'SUPABASE_ACCESS_TOKEN', 'OK', `Token de gestión Supabase válido. Proyectos vinculados: ${res.data.length}`);
      } else {
        recordResult('Supabase', 'SUPABASE_ACCESS_TOKEN', 'FAIL', `HTTP ${res.statusCode}: ${res.raw.slice(0, 100)}`);
      }
    } catch (err) {
      recordResult('Supabase', 'SUPABASE_ACCESS_TOKEN', 'FAIL', `Error: ${err.message}`);
    }
  }
}

async function testCloudflare() {
  const accountId = env.CLOUDFLARE_R2_ACCOUNT_ID;
  const accessKeyId = env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const secretAccessKey = env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
  const bucket = env.CLOUDFLARE_R2_BUCKET_NAME;
  const apiToken = env.CLOUDFLARE_API_TOKEN;

  // Cloudflare API Token
  if (apiToken) {
    try {
      // 1. Probar como Bearer Token (API Token)
      const resBearer = await requestJson('https://api.cloudflare.com/client/v4/user/tokens/verify', {
        headers: { Authorization: `Bearer ${apiToken}` },
      });
      if (resBearer.statusCode === 200 && resBearer.data?.success) {
        recordResult('Cloudflare', 'CLOUDFLARE_API_TOKEN', 'OK', `Token API Bearer válido (Estado: ${resBearer.data.result?.status})`);
      } else {
        // 2. Probar si es una Global API Key usando el email configurado
        const email = env.correo || env.TIB_API_EMAIL;
        let globalWorked = false;
        if (email) {
          const resGlobal = await requestJson('https://api.cloudflare.com/client/v4/user', {
            headers: {
              'X-Auth-Email': email,
              'X-Auth-Key': apiToken,
            },
          });
          if (resGlobal.statusCode === 200 && resGlobal.data?.success) {
            recordResult('Cloudflare', 'CLOUDFLARE_API_TOKEN', 'OK', `Clave API Global Cloudflare válida (Email: ${email})`);
            globalWorked = true;
          }
        }
        if (!globalWorked) {
          recordResult('Cloudflare', 'CLOUDFLARE_API_TOKEN', 'FAIL', `Token inválido o expirado (HTTP ${resBearer.statusCode}: ${resBearer.raw.slice(0, 100)})`);
        }
      }
    } catch (err) {
      recordResult('Cloudflare', 'CLOUDFLARE_API_TOKEN', 'FAIL', err.message);
    }
  }

  // Cloudflare R2
  if (accountId && accessKeyId && secretAccessKey && bucket) {
    try {
      const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
      const s3 = new S3Client({
        region: 'auto',
        endpoint: `https://${accountId.trim()}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: accessKeyId.trim(),
          secretAccessKey: secretAccessKey.trim(),
        },
      });
      const cmd = new ListObjectsV2Command({
        Bucket: bucket.trim(),
        MaxKeys: 2,
      });
      const out = await s3.send(cmd);
      recordResult('Cloudflare R2', 'CLOUDFLARE_R2_*', 'OK', `Bucket "${bucket}" accesible. Conexión S3/R2 verificada.`);
    } catch (err) {
      recordResult('Cloudflare R2', 'CLOUDFLARE_R2_*', 'FAIL', `Error accediendo a R2: ${err.message}`);
    }
  } else {
    recordResult('Cloudflare R2', 'CLOUDFLARE_R2_*', 'WARN', 'Variables R2 incompletas');
  }
}

async function testOpenAI() {
  const key = env.OPENAI_API_KEY;
  if (!key) {
    recordResult('OpenAI', 'OPENAI_API_KEY', 'FAIL', 'No configurado');
    return;
  }
  try {
    const res = await requestJson('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (res.statusCode === 200 && Array.isArray(res.data?.data)) {
      recordResult('OpenAI', 'OPENAI_API_KEY', 'OK', `API Key válida. Modelos disponibles: ${res.data.data.length}`);
    } else {
      recordResult('OpenAI', 'OPENAI_API_KEY', 'FAIL', `HTTP ${res.statusCode}: ${res.raw.slice(0, 120)}`);
    }
  } catch (err) {
    recordResult('OpenAI', 'OPENAI_API_KEY', 'FAIL', err.message);
  }
}

async function testGemini() {
  const key = env.GEMINI_API_KEY;
  if (!key) {
    recordResult('Google Gemini', 'GEMINI_API_KEY', 'WARN', 'No configurada');
    return;
  }
  try {
    const res = await requestJson(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
    if (res.statusCode === 200 && Array.isArray(res.data?.models)) {
      recordResult('Google Gemini', 'GEMINI_API_KEY', 'OK', `API Key válida. Modelos Gemini disponibles: ${res.data.models.length}`);
    } else {
      recordResult('Google Gemini', 'GEMINI_API_KEY', 'FAIL', `HTTP ${res.statusCode}: ${res.raw.slice(0, 120)}`);
    }
  } catch (err) {
    recordResult('Google Gemini', 'GEMINI_API_KEY', 'FAIL', err.message);
  }
}

async function testGitHub() {
  const token = env.GITHUB_TOKEN || env.GITHUB_PERSONAL_ACCESS_TOKEN;
  if (!token) {
    recordResult('GitHub', 'GITHUB_TOKEN', 'WARN', 'No configurado');
    return;
  }
  try {
    const res = await requestJson('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': 'NodeJS-Verification-Script',
      },
    });
    if (res.statusCode === 200 && res.data?.login) {
      const scopes = res.headers['x-oauth-scopes'] || 'sin detalle de scopes';
      recordResult('GitHub', 'GITHUB_TOKEN', 'OK', `Token válido. Usuario autenticado: @${res.data.login} (Scopes: ${scopes})`);
    } else {
      recordResult('GitHub', 'GITHUB_TOKEN', 'FAIL', `HTTP ${res.statusCode}: ${res.raw.slice(0, 120)}`);
    }
  } catch (err) {
    recordResult('GitHub', 'GITHUB_TOKEN', 'FAIL', err.message);
  }
}

async function testResend() {
  const key = env.RESEND_API_KEY || env.API_KEY_RESEND;
  if (!key) {
    recordResult('Resend', 'RESEND_API_KEY', 'WARN', 'No configurada');
    return;
  }
  try {
    const res = await requestJson('https://api.resend.com/domains', {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (res.statusCode === 200) {
      const domains = Array.isArray(res.data?.data) ? res.data.data.map(d => d.name).join(', ') : '';
      recordResult('Resend', 'RESEND_API_KEY', 'OK', `API Key válida. Dominios registrados: ${domains || 'Ninguno listado'}`);
    } else {
      recordResult('Resend', 'RESEND_API_KEY', 'FAIL', `HTTP ${res.statusCode}: ${res.raw.slice(0, 120)}`);
    }
  } catch (err) {
    recordResult('Resend', 'RESEND_API_KEY', 'FAIL', err.message);
  }
}

async function testVercel() {
  const token = env.VERCEL_TOKEN || env.TOKEN_VERCEL;
  const projectId = env.VERCEL_PROJECT_ID;
  if (!token) {
    recordResult('Vercel', 'VERCEL_TOKEN', 'WARN', 'No configurado');
    return;
  }
  try {
    const res = await requestJson('https://api.vercel.com/v2/user', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.statusCode === 200 && res.data?.user) {
      let extra = `Usuario: ${res.data.user.username || res.data.user.email}`;
      if (projectId) {
        const teamParam = env.VERCEL_TEAM_ID ? `?teamId=${env.VERCEL_TEAM_ID}` : '';
        const prjRes = await requestJson(`https://api.vercel.com/v9/projects/${projectId}${teamParam}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (prjRes.statusCode === 200) {
          extra += ` | Proyecto "${prjRes.data.name}" verificado`;
        }
      }
      recordResult('Vercel', 'VERCEL_TOKEN', 'OK', `Token válido. ${extra}`);
    } else {
      recordResult('Vercel', 'VERCEL_TOKEN', 'FAIL', `HTTP ${res.statusCode}: ${res.raw.slice(0, 120)}`);
    }
  } catch (err) {
    recordResult('Vercel', 'VERCEL_TOKEN', 'FAIL', err.message);
  }
}

async function testTibApi() {
  const url = env.TIB_API_URL || 'https://www.tibcourier.com/api/list-warehouse';
  const email = env.TIB_API_EMAIL;
  const password = env.TIB_API_PASSWORD;

  if (!email || !password) {
    recordResult('TIB Courier API', 'TIB_API_CREDENTIALS', 'FAIL', 'Faltan TIB_API_EMAIL o TIB_API_PASSWORD');
    return;
  }
  try {
    const res = await requestJson(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'AMEX-Courier-Verification/1.0',
      },
      body: {
        email,
        password,
        status: 'RECIBIDO',
      },
      timeout: 15000,
    });
    if (res.statusCode === 200) {
      const isArr = Array.isArray(res.data);
      const count = isArr ? res.data.length : (res.data ? Object.keys(res.data).length : 0);
      recordResult('TIB Courier API', 'TIB_API_*', 'OK', `Autenticación exitosa en ${url}. Registros recibidos: ${count}`);
    } else {
      recordResult('TIB Courier API', 'TIB_API_*', 'FAIL', `HTTP ${res.statusCode}: ${res.raw.slice(0, 120)}`);
    }
  } catch (err) {
    recordResult('TIB Courier API', 'TIB_API_*', 'FAIL', `Error conectando con TIB: ${err.message}`);
  }
}

async function testSentry() {
  const dsn = env.SENTRY_DSN || env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) {
    recordResult('Sentry', 'SENTRY_DSN', 'WARN', 'No configurado');
    return;
  }
  try {
    const match = dsn.match(/^https:\/\/([a-f0-9]+)@([^/]+)\/(\d+)$/);
    if (!match) {
      recordResult('Sentry', 'SENTRY_DSN', 'FAIL', 'Formato DSN no válido');
      return;
    }
    const [, key, host, projectId] = match;
    // Ping host
    const res = await requestJson(`https://${host}/api/${projectId}/store/`, {
      method: 'OPTIONS',
      timeout: 5000,
    });
    recordResult('Sentry', 'SENTRY_DSN', 'OK', `DSN válido y endpoint de ingesta accesible (${host}, project: ${projectId})`);
  } catch (err) {
    recordResult('Sentry', 'SENTRY_DSN', 'WARN', `DSN sintácticamente correcto, endpoint ping: ${err.message}`);
  }
}

function testVpsTcp() {
  return new Promise((resolve) => {
    const host = env.VPS_HOST;
    const port = parseInt(env.VPS_SSH_PORT || '22', 10);
    if (!host) {
      recordResult('VPS SSH', 'VPS_HOST', 'WARN', 'VPS_HOST no configurado');
      return resolve();
    }
    const socket = new net.Socket();
    socket.setTimeout(4000);
    socket.on('connect', () => {
      recordResult('VPS SSH', 'VPS_HOST:PORT', 'OK', `Puerto SSH ${port} abierto y alcanzable en ${host}`);
      socket.destroy();
      resolve();
    });
    socket.on('timeout', () => {
      recordResult('VPS SSH', 'VPS_HOST:PORT', 'WARN', `Timeout conectando al puerto SSH ${port} en ${host} (posible firewall o IP restringida)`);
      socket.destroy();
      resolve();
    });
    socket.on('error', (err) => {
      recordResult('VPS SSH', 'VPS_HOST:PORT', 'WARN', `No se pudo conectar al puerto SSH ${port} en ${host}: ${err.message}`);
      socket.destroy();
      resolve();
    });
    socket.connect(port, host);
  });
}

async function main() {
  console.log('=== INICIANDO PRUEBAS DE CREDENCIALES .env.local ===\n');
  await testSupabase();
  await testCloudflare();
  await testOpenAI();
  await testGemini();
  await testGitHub();
  await testResend();
  await testVercel();
  await testTibApi();
  await testSentry();
  await testVpsTcp();
  console.log('\n=== PRUEBAS FINALIZADAS ===');
  fs.writeFileSync(
    path.resolve(__dirname, 'test-results.json'),
    JSON.stringify(results, null, 2)
  );
}

main().catch(err => {
  console.error('Error fatal durante la prueba:', err);
  process.exit(1);
});
