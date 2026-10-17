import fs from 'fs';
import path from 'path';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import XLSX from 'xlsx';

const envPath = path.resolve('.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = (match[2] || '').trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    env[match[1]] = value;
  }
});

const r2AccountId = env.CLOUDFLARE_R2_ACCOUNT_ID?.replace(/^https?:\/\//i, '').replace(/\.r2\.cloudflarestorage\.com.*$/i, '').trim();
const r2AccessKey = env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const r2SecretKey = env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
const r2Bucket = env.CLOUDFLARE_R2_BUCKET_NAME || 'amex-courier-cloud';

if (!r2AccountId || !r2AccessKey || !r2SecretKey) {
  console.error('Missing R2 credentials in .env.local');
  process.exit(1);
}

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: r2AccessKey,
    secretAccessKey: r2SecretKey,
  },
});

async function downloadR2Buffer(key) {
  console.log(`Downloading from R2: ${key}...`);
  const cmd = new GetObjectCommand({ Bucket: r2Bucket, Key: key });
  const res = await s3.send(cmd);
  const chunks = [];
  for await (const chunk of res.Body) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function run() {
  try {
    // 1. Download received 12-10 and received 14-10
    const buf12 = await downloadR2Buffer('FOLDER AMEX/inventario-tib/diario/2026-10-12/received.xlsx');
    const wb12 = XLSX.read(buf12, { type: 'buffer' });
    const ws12 = wb12.Sheets[wb12.SheetNames[0]];
    const rows12 = XLSX.utils.sheet_to_json(ws12);
    console.log(`Total rows in received 12-10: ${rows12.length}`);

    let rows14 = [];
    try {
      const buf14 = await downloadR2Buffer('FOLDER AMEX/inventario-tib/diario/2026-10-14/received.xlsx');
      const wb14 = XLSX.read(buf14, { type: 'buffer' });
      const ws14 = wb14.Sheets[wb14.SheetNames[0]];
      rows14 = XLSX.utils.sheet_to_json(ws14);
      console.log(`Total rows in received 14-10: ${rows14.length}`);
    } catch (e) {
      console.log('No received 14-10 or error:', e.message);
    }

    // Combine rows avoiding duplicates by WR
    const allRowsMap = new Map();
    [...rows12, ...rows14].forEach(r => {
      const wr = r['WR'] || r['wr'] || r['Numero'] || '';
      if (wr) allRowsMap.set(wr, r);
    });

    const allRows = Array.from(allRowsMap.values());
    console.log(`Unique packages combined: ${allRows.length}`);

    // Filter between 2026-10-05 and 2026-10-11
    const targetDates = [
      '2026-10-05', // Lunes
      '2026-10-06', // Martes
      '2026-10-07', // Miércoles
      '2026-10-08', // Jueves
      '2026-10-09', // Viernes
      '2026-10-10', // Sábado
      '2026-10-11', // Domingo
    ];

    const dayNames = {
      '2026-10-05': 'Lunes 05/10/2026',
      '2026-10-06': 'Martes 06/10/2026',
      '2026-10-07': 'Miércoles 07/10/2026',
      '2026-10-08': 'Jueves 08/10/2026',
      '2026-10-09': 'Viernes 09/10/2026',
      '2026-10-10': 'Sábado 10/10/2026',
      '2026-10-11': 'Domingo 11/10/2026',
    };

    // Filter by AMEX
    const amexRows = allRows.filter(r => {
      const client = String(r['Cliente'] || r['cliente'] || r['nclient'] || '').toUpperCase();
      return client.includes('AMEX');
    });

    console.log(`Total AMEX packages in files: ${amexRows.length}`);

    const reportByDay = {};
    targetDates.forEach(d => {
      reportByDay[d] = {
        dateStr: dayNames[d],
        total: 0,
        times: [],
        firstTime: null,
        lastTime: null,
        operators: new Set(),
        packages: []
      };
    });

    amexRows.forEach(r => {
      const reg = String(r['Registrado'] || r['fecRegister'] || '');
      if (!reg) return;
      const [d, t] = reg.split(' ');
      if (reportByDay[d]) {
        reportByDay[d].total++;
        if (t) {
          reportByDay[d].times.push(t);
        }
        const op = r['Usuario Registro'] || r['seqUser'] || '';
        if (op) reportByDay[d].operators.add(op);
        reportByDay[d].packages.push({
          wr: r['WR'],
          cliente: r['Cliente'],
          hora: t,
          operador: op
        });
      }
    });

    console.log('\n======================================================');
    console.log('ANÁLISIS DE RECEPCIÓN TIBCARGO MIAMI (AMEX) - SEMANA 5 AL 11 OCT');
    console.log('======================================================\n');

    targetDates.forEach(d => {
      const rep = reportByDay[d];
      rep.times.sort();
      rep.firstTime = rep.times[0] || 'N/A';
      rep.lastTime = rep.times[rep.times.length - 1] || 'N/A';

      console.log(`📅 ${rep.dateStr}:`);
      console.log(`   - Total Paquetes AMEX: ${rep.total}`);
      console.log(`   - Primera Recepción: ${rep.firstTime}`);
      console.log(`   - ÚLTIMA RECEPCIÓN:  ${rep.lastTime} ⏰`);
      console.log(`   - Operadores TIB: ${Array.from(rep.operators).join(', ') || 'N/A'}`);
      if (rep.packages.length > 0) {
        const lastPkg = rep.packages.sort((a,b) => a.hora.localeCompare(b.hora)).slice(-1)[0];
        console.log(`   - Último paquete ingresado: ${lastPkg.wr} (${lastPkg.cliente}) a las ${lastPkg.hora}`);
      }
      console.log('------------------------------------------------------');
    });

  } catch (err) {
    console.error('Error in run:', err);
  }
}

run();
