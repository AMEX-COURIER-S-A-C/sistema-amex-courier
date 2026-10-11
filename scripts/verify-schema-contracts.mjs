import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile(
  new URL('../supabase/migrations/20261016_harden_contracts_and_schema.sql', import.meta.url),
  'utf8'
);
const generatedTypes = await readFile(
  new URL('../types/supabase.ts', import.meta.url),
  'utf8'
);

assert.match(migration, /ADD COLUMN IF NOT EXISTS archivo_url text/i);
assert.match(migration, /ADD COLUMN IF NOT EXISTS fotos text\[\]/i);
assert.match(migration, /REVOKE EXECUTE[\s\S]*FROM anon/i);
const rpcHardeningMigration = await readFile(
  new URL('../supabase/migrations/20261017_revoke_public_scanner_rpc.sql', import.meta.url),
  'utf8'
);
assert.match(rpcHardeningMigration, /REVOKE EXECUTE[\s\S]*FROM PUBLIC/i);
const rlsPerformanceMigration = await readFile(
  new URL('../supabase/migrations/20261018_optimize_owner_rls_policies.sql', import.meta.url),
  'utf8'
);
assert.match(rlsPerformanceMigration, /select lower\(coalesce\(auth\.jwt\(\)/i);

for (const table of [
  'actas_entrega_borradores',
  'despacho_paradas',
  'despachos_rutas',
  'dni_matrix_borradores',
  'invoices_borradores',
  'manifiestos_tib',
  'rotulos_borradores',
  'scanner_staging_queue',
  'hojas_cotejo_items',
]) {
  assert.match(generatedTypes, new RegExp(`\\b${table}: \\{`), `Missing generated table type: ${table}`);
}

console.log('Schema and contract invariants verified.');
