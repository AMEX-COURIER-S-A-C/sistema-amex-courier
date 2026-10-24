import fs from 'fs';

const data = JSON.parse(fs.readFileSync('scripts/clientes_tib_extraidos.json', 'utf-8'));
const list = data.clientes;

const containAmex = list.filter(c => c.nombre.toUpperCase().includes('AMEX'));
const notContainAmex = list.filter(c => !c.nombre.toUpperCase().includes('AMEX'));

console.log('Total registros de clientes con ID en TIB:', list.length);
console.log('Que CONTIENEN la palabra "AMEX":', containAmex.length);
console.log('Que NO contienen la palabra "AMEX":', notContainAmex.length);

function cleanName(n) {
  return n
    .replace(/^AMEX\s*[\/\-:]?\s*/i, '')
    .replace(/^FR\s*[\/\-:]?\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

const cleanedMap = new Map();
for (const c of list) {
  const cleaned = cleanName(c.nombre);
  if (!cleanedMap.has(cleaned)) {
    cleanedMap.set(cleaned, []);
  }
  cleanedMap.get(cleaned).push(c);
}

console.log('Personas / Clientes reales únicos (sin prefijo AMEX):', cleanedMap.size);

const duplicates = Array.from(cleanedMap.entries()).filter(([name, arr]) => arr.length > 1);
console.log('Nombres que tienen más de 1 cuenta/ID en TIB:', duplicates.length);

console.log('\n--- Ejemplos de clientes con más de 1 ID o cuenta registrada en TIB ---');
for (const [name, arr] of duplicates.slice(0, 8)) {
  console.log(`* ${name} (${arr.length} registros en TIB):`);
  for (const a of arr) {
    console.log(`    -> ID TIB: ${a.iclient.padStart(5, ' ')} | Nombre: "${a.nombre}" | Paquetes: ${a.totalPaquetes}`);
  }
}
