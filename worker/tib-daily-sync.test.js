'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const XLSX = require('xlsx');
const TEST_TIB_PASSWORD = process.env.TIB_TEST_PASSWORD || 'placeholder';

const {
  PUBLISHER_NAME,
  REPORT_HEADERS,
  REPORT_SLOTS,
  createTibDailyScheduler,
  createTibDailySync,
  generateTibXlsxBuffer,
  getLimaDateString,
  millisecondsUntilNextLimaRun,
  normalizeTibWr,
} = require('./tib-daily-sync');

test('normaliza WR y crea reportes con el esquema esperado, incluso sin filas', () => {
  assert.equal(normalizeTibWr('485581'), 'WR000485581');

  const generated = generateTibXlsxBuffer([
    {
      wr: '485581',
      tracking: 'TRACK-1',
      nclient: 'CLIENTE PRUEBA',
      container: 'caja',
      weight: '2,35',
      status: 'ENVIADO',
      fecModify: '2026-11-05 10:00:00',
    },
    { tracking: 'SIN-WR' },
  ], 'ENVIADO');
  const workbook = XLSX.read(generated.buffer, { type: 'buffer' });
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets.Hoja1, { header: 1 });

  assert.deepEqual(rows[0], REPORT_HEADERS);
  assert.deepEqual(rows[1], ['WR000485581', 'TRACK-1', 'CLIENTE PRUEBA', 'CAJA', 2.35, 'ENVIADO', '2026-11-05 10:00:00']);
  assert.equal(generated.rowCount, 1);

  const empty = generateTibXlsxBuffer([], 'RECIBIDO');
  const emptyWorkbook = XLSX.read(empty.buffer, { type: 'buffer' });
  assert.deepEqual(XLSX.utils.sheet_to_json(emptyWorkbook.Sheets.Hoja1, { header: 1 }), [REPORT_HEADERS]);
  assert.equal(empty.rowCount, 0);
});

test('calcula 1:00 a. m. en Lima sin depender de la zona del host', () => {
  const beforeRun = new Date('2026-11-05T05:59:59.000Z'); // 00:59:59 en Lima
  const atRun = new Date('2026-11-05T06:00:00.000Z'); // 01:00:00 en Lima

  assert.equal(getLimaDateString(beforeRun), '2026-11-05');
  assert.equal(millisecondsUntilNextLimaRun(beforeRun), 1000);
  assert.equal(millisecondsUntilNextLimaRun(atRun), 24 * 60 * 60 * 1000);
});

test('publica el conjunto completo solo después de obtener los tres estados', async () => {
  const calls = { statuses: [], uploaded: [], published: [], cached: [], deleted: [], markedDeleted: [] };
  const fetchImpl = async (_url, request) => {
    const status = JSON.parse(request.body).status;
    calls.statuses.push(status);
    return {
      ok: true,
      json: async () => [{ wr: '123', status, tracking: `T-${status}` }],
    };
  };
  const sync = createTibDailySync({
    tibApiUrl: 'https://tib.example/api',
    tibEmail: 'tib@example.test',
    tibPassword: TEST_TIB_PASSWORD,
    fetchImpl,
    now: () => new Date('2026-11-05T12:00:00.000Z'),
    randomId: () => 'run-test',
    putObject: async (key, body, contentType) => calls.uploaded.push({ key, body, contentType }),
    deleteObject: async (key) => calls.deleted.push(key),
    listActiveFiles: async () => [],
    publishFiles: async (date, rows) => {
      calls.published.push({ date, rows });
      return { old_r2_keys: ['FOLDER AMEX/inventario-tib/diario/2026-11-04/received-old.xlsx'] };
    },
    listInactiveKeys: async () => [],
    markHistoryKeysDeleted: async (keys) => calls.markedDeleted.push(...keys),
    syncCache: async (tipo, key, name) => calls.cached.push({ tipo, key, name }),
    withRetry: async (operation) => operation(),
  });

  const result = await sync.runOnce();

  assert.deepEqual(calls.statuses, ['ENTREGADO', 'ENVIADO', 'RECIBIDO']);
  assert.equal(calls.uploaded.length, 3);
  assert.equal(calls.published.length, 1);
  assert.equal(calls.published[0].date, '2026-11-05');
  assert.deepEqual(calls.published[0].rows.map((row) => row.tipo).sort(), ['delivered', 'received', 'sent']);
  assert.equal(calls.published[0].rows.every((row) => row.subido_por_nombre === PUBLISHER_NAME), true);
  assert.equal(calls.cached.length, 3);
  assert.deepEqual(calls.deleted, ['FOLDER AMEX/inventario-tib/diario/2026-11-04/received-old.xlsx']);
  assert.deepEqual(calls.markedDeleted, calls.deleted);
  assert.deepEqual(result.countsBySlot, { delivered: 1, sent: 1, received: 1 });
});

test('si una respuesta TIB es inválida, no sube ni publica ningún archivo', async () => {
  const calls = { uploaded: 0, published: 0, deleted: 0 };
  let requestCount = 0;
  const sync = createTibDailySync({
    tibEmail: 'tib@example.test',
    tibPassword: TEST_TIB_PASSWORD,
    fetchImpl: async () => {
      requestCount++;
      return { ok: true, json: async () => requestCount === 2 ? { error: 'invalid' } : [] };
    },
    putObject: async () => { calls.uploaded++; },
    deleteObject: async () => { calls.deleted++; },
    listActiveFiles: async () => [],
    publishFiles: async () => { calls.published++; },
    listInactiveKeys: async () => [],
    syncCache: async () => {},
    withRetry: async (operation) => operation(),
  });

  await assert.rejects(sync.runOnce(), /formato de lista inválido/);
  assert.deepEqual(calls, { uploaded: 0, published: 0, deleted: 0 });
});

test('informa limpieza pendiente si R2 se limpió pero no pudo marcarse el historial', async () => {
  const sync = createTibDailySync({
    tibEmail: 'tib@example.test',
    tibPassword: TEST_TIB_PASSWORD,
    fetchImpl: async () => ({ ok: true, json: async () => [] }),
    putObject: async () => {},
    deleteObject: async () => {},
    listActiveFiles: async () => [],
    publishFiles: async () => ({ old_r2_keys: ['FOLDER AMEX/inventario-tib/diario/2026-11-04/sent-old.xlsx'] }),
    listInactiveKeys: async () => [],
    markHistoryKeysDeleted: async () => { throw new Error('Supabase no disponible'); },
    syncCache: async () => {},
    withRetry: async (operation) => operation(),
  });

  const result = await sync.runOnce();
  assert.equal(result.cleanupPending, 1);
});

test('al reiniciar después de la 1:00, recupera el día pendiente y reintenta fallos', async () => {
  let attempts = 0;
  let waits = 0;
  const scheduler = createTibDailyScheduler({
    enabled: true,
    now: () => new Date('2026-11-05T07:00:00.000Z'), // 02:00 en Lima
    sync: async () => {
      attempts++;
      if (attempts < 3) throw new Error('TIB temporalmente no disponible');
      return { date: '2026-11-05', cleanupPending: 0 };
    },
    retryDelaysMs: [300000, 900000, 1800000],
    wait: async () => { waits++; },
    setTimer: () => ({ unref() {} }),
    clearTimer: () => {},
  });

  await scheduler.start();
  const state = scheduler.getState();
  assert.equal(attempts, 3);
  assert.equal(waits, 2);
  assert.equal(state.status, 'succeeded');
  assert.equal(state.lastSuccessDate, '2026-11-05');
  assert.equal(state.retries, 2);
  assert.equal(state.nextRunAt, '2026-11-06T06:00:00.000Z');
  scheduler.stop();
});

test('si los tres reportes ya están publicados hoy, reutiliza la publicación y repara la caché', async () => {
  const cached = [];
  let fetches = 0;
  const sync = createTibDailySync({
    tibEmail: 'tib@example.test',
    tibPassword: TEST_TIB_PASSWORD,
    now: () => new Date('2026-11-05T12:00:00.000Z'),
    fetchImpl: async () => { fetches++; throw new Error('no debe consultar TIB'); },
    putObject: async () => { throw new Error('no debe subir'); },
    deleteObject: async () => {},
    listActiveFiles: async () => REPORT_SLOTS.map((slot) => ({
      tipo: slot.tipo,
      r2_key: `FOLDER AMEX/inventario-tib/diario/2026-11-05/${slot.tipo}-run.xlsx`,
      nombre_archivo: slot.nombre,
      subido_por_nombre: PUBLISHER_NAME,
      es_activo: true,
    })),
    publishFiles: async () => { throw new Error('no debe publicar'); },
    listInactiveKeys: async () => [],
    syncCache: async (tipo) => cached.push(tipo),
  });

  const result = await sync.runOnce();
  assert.equal(result.skippedFetch, true);
  assert.equal(fetches, 0);
  assert.deepEqual(cached.sort(), ['delivered', 'received', 'sent']);
});

test('fusiona TIB v2 (prioridad) + TIB v1 (historial) y preserva slots históricos si v2 devuelve 0 registros', async () => {
  const uploaded = [];
  const published = [];
  const deleted = [];
  const cached = [];

  const fetchImpl = async (url, init) => {
    const u = String(url);
    if (u.endsWith('/user/login')) {
      return { ok: true, json: async () => ({ token: 'jwt-v2-test' }) };
    }
    if (u.includes('/warehouse/warehouse/find-all-warehouse')) {
      if (u.includes('status=RECEIVED')) {
        return {
          ok: true,
          json: async () => ({
            data: [
              { id: 506639, tracking: 'TRK-V2', nameClient: 'AMEX CLIENTE V2', container: 'CAJA', weight: '2.10', status: 'RECEIVED', dateRegister: '2026-11-20T19:00:00Z' },
            ],
          }),
        };
      }
      // IN_TRANSIT / TEMP_ASSIGNED / ASSIGNED / DELIVERED vacíos en v2
      return { ok: true, json: async () => ({ data: [] }) };
    }
    // TIB v1: falla en ENTREGADO (debe preservar histórico R2) y responde en ENVIADO y RECIBIDO
    const status = JSON.parse(init.body).status;
    if (status === 'ENTREGADO') {
      return { ok: false, status: 503 };
    }
    if (status === 'ENVIADO') {
      return {
        ok: true,
        json: async () => [{ wr: '480001', tracking: 'TRK-SENT-V1', nclient: 'AMEX HIST SENT', container: 'CAJA', weight: '3.50', status: 'ENVIADO' }],
      };
    }
    return {
      ok: true,
      json: async () => [
        { wr: '506639', tracking: 'TRK-V1-OLD', nclient: 'AMEX CLIENTE V1', container: 'BOLSA', weight: '1.00', status: 'RECIBIDO' },
        { wr: '490001', tracking: 'TRK-REC-V1', nclient: 'AMEX SOLO V1', container: 'CAJA', weight: '0.90', status: 'RECIBIDO' },
      ],
    };
  };

  const sync = createTibDailySync({
    tibV2ApiUrl: 'https://api.tibgrupo.com',
    tibV2Email: 'ops@example.test',
    tibV2Password: TEST_TIB_PASSWORD,
    tibApiUrl: 'https://tib-v1.example/api',
    tibEmail: 'legacy@example.test',
    tibPassword: TEST_TIB_PASSWORD,
    fetchImpl,
    now: () => new Date('2026-11-20T12:00:00.000Z'),
    randomId: () => 'run-v2',
    putObject: async (key, body) => uploaded.push({ key, body }),
    deleteObject: async (key) => deleted.push(key),
    listActiveFiles: async () => [],
    listLatestActiveFiles: async () => [
      {
        tipo: 'delivered',
        r2_key: 'FOLDER AMEX/inventario-tib/diario/2026-11-19/delivered-prev.xlsx',
        nombre_archivo: 'ENTREGADO TIB (API Oficial).xlsx',
        peso_bytes: 999999,
      },
    ],
    publishFiles: async (date, rows) => {
      published.push({ date, rows });
      return {
        old_r2_keys: [
          'FOLDER AMEX/inventario-tib/diario/2026-11-19/delivered-prev.xlsx',
          'FOLDER AMEX/inventario-tib/diario/2026-11-19/received-prev.xlsx',
        ],
      };
    },
    listInactiveKeys: async () => [],
    syncCache: async (tipo, key) => cached.push({ tipo, key }),
    withRetry: async (op) => op(),
  });

  const result = await sync.runOnce();

  // Solo subió sent y received (delivered preservó el archivo histórico en R2)
  assert.equal(uploaded.length, 2);
  assert.equal(result.countsBySlot.received, 2);
  assert.equal(result.countsBySlot.sent, 1);
  assert.equal(result.countsBySlot.delivered, 0);

  // Verificar que WR000506639 en received conservó datos de TIB v2 (no sobrescrito por v1)
  const receivedUpload = uploaded.find((u) => u.key.includes('/received-run-v2.xlsx'));
  const wb = XLSX.read(receivedUpload.body, { type: 'buffer' });
  const rows = XLSX.utils.sheet_to_json(wb.Sheets.Hoja1, { header: 1 });
  const rowV2 = rows.find((r) => r[0] === 'WR000506639');
  assert.equal(rowV2[1], 'TRK-V2');
  assert.equal(rowV2[2], 'AMEX CLIENTE V2');
  assert.equal(rowV2[4], 2.1);

  // Verificar que el archivo preservado de delivered NO fue eliminado en cleanup
  assert.deepEqual(deleted, ['FOLDER AMEX/inventario-tib/diario/2026-11-19/received-prev.xlsx']);
  assert.equal(
    cached.find((c) => c.tipo === 'delivered')?.key,
    'FOLDER AMEX/inventario-tib/diario/2026-11-19/delivered-prev.xlsx'
  );
});
