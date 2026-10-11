import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import process from 'node:process';

const root = process.cwd();
const envPath = `${root}/.env.local`;

function commandAvailable(command) {
  try {
    execFileSync(command, ['--version'], { stdio: 'ignore', windowsHide: true });
    return true;
  } catch {
    return false;
  }
}

function localCommandAvailable(command) {
  if (commandAvailable(command)) return true;
  const localName = process.platform === 'win32' ? `${command}.cmd` : command;
  const localPath = `${root}/node_modules/.bin/${localName}`;
  if (existsSync(localPath)) return true;
  try {
    execFileSync(localPath, ['--version'], { stdio: 'ignore', windowsHide: true });
    return true;
  } catch {
    return false;
  }
}

if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separator = trimmed.indexOf('=');
    if (separator <= 0) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!process.env[key]) process.env[key] = value;
  }
}

const checks = [
  ['Node.js >= 20.9', Number(process.versions.node.split('.')[0]) >= 20, true],
  ['.env.local', existsSync(envPath), true],
  ['NEXT_PUBLIC_SUPABASE_URL', Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL), true],
  ['NEXT_PUBLIC_SUPABASE_ANON_KEY', Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY), true],
  ['SUPABASE_URL', Boolean(process.env.SUPABASE_URL), true],
  ['SUPABASE_SERVICE_ROLE_KEY', Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY), true],
  ['R2 configuration for worker', Boolean(
    process.env.CLOUDFLARE_R2_ACCOUNT_ID &&
    process.env.CLOUDFLARE_R2_ACCESS_KEY_ID &&
    process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY &&
    process.env.CLOUDFLARE_R2_BUCKET_NAME
  ), false],
  ['Supabase CLI', localCommandAvailable('supabase'), false],
  ['Docker', commandAvailable('docker'), false],
];

let failed = false;
for (const [label, ok, required] of checks) {
  const status = ok ? 'OK' : required ? 'FALTA' : 'opcional';
  console.log(`${status.padEnd(8)} ${label}`);
  if (required && !ok) failed = true;
}

console.log('\nNo se imprimen valores secretos.');
console.log('El worker no debe iniciarse contra una base remota compartida sin usar un entorno aislado.');

if (failed) process.exitCode = 1;
