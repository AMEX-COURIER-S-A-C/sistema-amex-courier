'use strict';

const crypto = require('node:crypto');
const XLSX = require('xlsx');
const { DeleteObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');

const TIB_API_DEFAULT_URL = 'https://www.tibcourier.com/api/list-warehouse';
const TIB_V2_API_DEFAULT_URL = 'https://api.tibgrupo.com';
const LIMA_TIME_ZONE = 'America/Lima';
const PUBLISHER_NAME = 'Worker Hostinger (API TIB)';
const XLSX_CONTENT_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const REPORT_HEADERS = ['WR', 'TRACKING', 'CLIENTE', 'TIPO PAQUETE', 'PESO', 'ESTADO', 'MODIFICADO'];
const REPORT_SLOTS = [
  { tipo: 'delivered', tibStatus: 'ENTREGADO', cargoStatuses: ['DELIVERED'], nombre: 'ENTREGADO TIB (API Oficial).xlsx' },
  { tipo: 'sent', tibStatus: 'ENVIADO', cargoStatuses: ['IN_TRANSIT', 'TEMP_ASSIGNED', 'ASSIGNED'], nombre: 'ENVIADO TIB (API Oficial).xlsx' },
  { tipo: 'received', tibStatus: 'RECIBIDO', cargoStatuses: ['RECEIVED'], nombre: 'RECIBIDO TIB (API Oficial).xlsx' },
];

function getLimaParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: LIMA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type) => Number(parts.find((part) => part.type === type)?.value || 0);
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    second: get('second'),
  };
}

function getLimaDateString(date = new Date()) {
  const { year, month, day } = getLimaParts(date);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function isPastLimaRunTime(date = new Date(), hour = 1, minute = 0) {
  const parts = getLimaParts(date);
  return parts.hour * 60 + parts.minute >= hour * 60 + minute;
}

function millisecondsUntilNextLimaRun(date = new Date(), hour = 1, minute = 0) {
  const parts = getLimaParts(date);
  const currentLocal = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
    date.getMilliseconds()
  );
  let nextLocal = Date.UTC(parts.year, parts.month - 1, parts.day, hour, minute, 0, 0);
  if (nextLocal <= currentLocal) nextLocal += 24 * 60 * 60 * 1000;
  return nextLocal - currentLocal;
}

function normalizeTibWr(rawWr, seqwr) {
  const value = String(rawWr || seqwr || '').trim().replace(/\s+/g, '').toUpperCase();
  if (!value) return '';
  if (/^WR[A-Z0-9]{9}$/.test(value)) return value;

  const digits = value.replace(/\D/g, '');
  if (digits.length > 0 && digits.length <= 9) return `WR${digits.padStart(9, '0')}`;

  if (value.startsWith('WR')) {
    const suffix = value.slice(2);
    if (suffix.length > 0 && suffix.length < 9 && /^\d+$/.test(suffix)) {
      return `WR${suffix.padStart(9, '0')}`;
    }
    return value;
  }

  return value;
}

function cleanNullableText(value) {
  if (value === null || value === undefined) return '';
  const trimmed = String(value).replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
  if (!trimmed) return '';
  const lower = trimmed.toLowerCase();
  if (lower === 'null' || lower === 'undefined') return '';
  return trimmed;
}

function normalizeTibStatus(rawStatus, fallbackStatus) {
  const status = String(rawStatus || fallbackStatus || '').trim().toUpperCase();
  if (status === 'ENTREGADO' || status === 'DELIVERED') return 'ENTREGADO';
  if (
    status === 'ENVIADO' ||
    status === 'IN_TRANSIT' ||
    status === 'TEMP_ASSIGNED' ||
    status === 'ASSIGNED' ||
    status === 'SHIPPED'
  ) {
    return 'ENVIADO';
  }
  return 'RECIBIDO';
}

function normalizeTibRow(raw, fallbackStatus) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const isV2Shape = raw.id !== undefined && raw.wr === undefined && raw.seqwr === undefined;
  const wr = isV2Shape ? normalizeTibWr(raw.id) : normalizeTibWr(raw.wr, raw.seqwr);
  if (!wr || !wr.startsWith('WR')) return null;

  let peso = '';
  const rawWeight = isV2Shape ? cleanNullableText(raw.weight) : raw.weight;
  if (rawWeight !== null && rawWeight !== undefined && rawWeight !== '') {
    const parsed = Number(String(rawWeight).replace(',', '.'));
    if (Number.isFinite(parsed) && parsed > 0) peso = Math.round(parsed * 100) / 100;
  }

  const tracking = isV2Shape
    ? cleanNullableText(raw.tracking) || cleanNullableText(raw.secondTracking)
    : String(raw.tracking || '').trim();
  const cliente = isV2Shape
    ? cleanNullableText(raw.nameClient) || cleanNullableText(raw.nameConsignee)
    : String(raw.nclient || '').trim();
  const empaque = isV2Shape
    ? (cleanNullableText(raw.container) || cleanNullableText(raw.description) || 'CAJA').toUpperCase()
    : String(raw.container || 'CAJA').trim().toUpperCase() || 'CAJA';
  const modified = isV2Shape
    ? cleanNullableText(raw.dateModify) || cleanNullableText(raw.dateRegister)
    : String(raw.fecModify || raw.fecRegister || '').trim();

  return [
    wr,
    tracking,
    cliente,
    empaque,
    peso,
    normalizeTibStatus(raw.status, fallbackStatus),
    modified,
  ];
}

function mergeSlotItemsV2First(v2Items, v1Items, fallbackStatus) {
  const byWr = new Map();
  for (const item of Array.isArray(v2Items) ? v2Items : []) {
    const row = normalizeTibRow(item, fallbackStatus);
    if (row && !byWr.has(row[0])) byWr.set(row[0], row);
  }
  for (const item of Array.isArray(v1Items) ? v1Items : []) {
    const row = normalizeTibRow(item, fallbackStatus);
    if (row && !byWr.has(row[0])) byWr.set(row[0], row);
  }
  return Array.from(byWr.values());
}

function generateTibXlsxBuffer(items, fallbackStatus) {
  const rows = [REPORT_HEADERS];
  for (const item of items) {
    if (Array.isArray(item) && item.length >= REPORT_HEADERS.length) {
      rows.push(item);
      continue;
    }
    const normalized = normalizeTibRow(item, fallbackStatus);
    if (normalized) rows.push(normalized);
  }

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Hoja1');
  const output = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  return { buffer: Buffer.isBuffer(output) ? output : Buffer.from(output), rowCount: rows.length - 1 };
}

async function fetchTibV2Token({ baseUrl, email, password, fetchImpl = fetch, timeoutMs = 20000 }) {
  const cleanBase = String(baseUrl || TIB_V2_API_DEFAULT_URL).trim().replace(/\/+$/, '');
  const response = await fetchImpl(`${cleanBase}/user/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    signal: AbortSignal.timeout(timeoutMs),
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(`TIB v2 respondió HTTP ${response.status} al autenticar (/user/login).`);
  }
  const payload = await response.json().catch(() => null);
  if (!payload || !payload.token) {
    throw new Error('TIB v2 no devolvió token JWT en /user/login.');
  }
  return payload.token;
}

async function fetchTibV2SlotItems({ baseUrl, token, cargoStatuses, fetchImpl = fetch, timeoutMs = 30000 }) {
  const cleanBase = String(baseUrl || TIB_V2_API_DEFAULT_URL).trim().replace(/\/+$/, '');
  const collected = [];
  for (const st of cargoStatuses) {
    const response = await fetchImpl(
      `${cleanBase}/warehouse/warehouse/find-all-warehouse?status=${encodeURIComponent(st)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'User-Agent': 'AMEX-Courier-Daily-Reports/2.0',
        },
        signal: AbortSignal.timeout(timeoutMs),
        cache: 'no-store',
      }
    );
    if (!response.ok) {
      throw new Error(`TIB v2 respondió HTTP ${response.status} para el estado ${st}.`);
    }
    const payload = await response.json().catch(() => null);
    if (!payload || typeof payload !== 'object' || !Array.isArray(payload.data)) {
      throw new Error(`TIB v2 devolvió un formato inválido para el estado ${st}.`);
    }
    collected.push(...payload.data);
  }
  return collected;
}

async function fetchTibStatus({ url, email, password, status, fetchImpl = fetch, timeoutMs = 30000 }) {
  const response = await fetchImpl(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'AMEX-Courier-Daily-Reports/1.0',
    },
    body: JSON.stringify({ email, password, status }),
    signal: AbortSignal.timeout(timeoutMs),
    cache: 'no-store',
  });

  if (!response.ok) throw new Error(`TIB respondió HTTP ${response.status} para el estado ${status}.`);

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error(`TIB devolvió una respuesta JSON inválida para el estado ${status}.`);
  }

  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === 'object' && Array.isArray(payload.data)) return payload.data;
  throw new Error(`TIB devolvió un formato de lista inválido para el estado ${status}.`);
}

function buildR2Key(root, date, tipo, runId) {
  const cleanRoot = String(root || 'FOLDER AMEX').replace(/^\/+|\/+$/g, '');
  return `${cleanRoot}/inventario-tib/diario/${date}/${tipo}-${runId}.xlsx`;
}

function isManagedReportKey(key, root) {
  const prefix = `${String(root || 'FOLDER AMEX').replace(/^\/+|\/+$/g, '')}/inventario-tib/diario/`;
  return typeof key === 'string' && key.startsWith(prefix) && !key.includes('/_backups/');
}

function createTibDailySync(options) {
  const {
    tibApiUrl = TIB_API_DEFAULT_URL,
    tibEmail = '',
    tibPassword = '',
    tibV2ApiUrl = TIB_V2_API_DEFAULT_URL,
    tibV2Email = '',
    tibV2Password = '',
    r2Root = 'FOLDER AMEX',
    fetchImpl = fetch,
    putObject,
    deleteObject,
    listActiveFiles,
    listLatestActiveFiles = null,
    publishFiles,
    listInactiveKeys,
    markHistoryKeysDeleted = async () => {},
    syncCache,
    withRetry = (operation) => operation(),
    now = () => new Date(),
    randomId = () => crypto.randomUUID(),
    log = () => {},
  } = options || {};

  for (const [name, dependency] of Object.entries({ putObject, deleteObject, listActiveFiles, publishFiles, listInactiveKeys, syncCache })) {
    if (typeof dependency !== 'function') throw new Error(`Falta la dependencia de sincronización ${name}.`);
  }

  let runningPromise = null;

  async function cleanupOldObjects(extraKeys = []) {
    let inactiveKeys = [];
    try {
      inactiveKeys = await listInactiveKeys();
    } catch (error) {
      log('warn', 'No se pudo consultar las claves R2 inactivas para limpieza.', { error: error.message });
    }

    const keys = new Set([
      ...extraKeys,
      ...(Array.isArray(inactiveKeys) ? inactiveKeys : []),
    ].filter((key) => isManagedReportKey(key, r2Root)));

    const failed = [];
    const deletedKeys = [];
    for (const key of keys) {
      try {
        await withRetry(
          () => deleteObject(key),
          { maxRetries: 3, initialDelayMs: 1500, operationName: `Limpieza R2 (${key})` }
        );
        deletedKeys.push(key);
      } catch (error) {
        failed.push(key);
        log('warn', `No se pudo eliminar un reporte TIB anterior de R2: ${key}`, { error: error.message });
      }
    }

    if (deletedKeys.length > 0) {
      try {
        await markHistoryKeysDeleted(deletedKeys);
      } catch (error) {
        failed.push(...deletedKeys);
        log('warn', 'No se pudo registrar en Supabase la limpieza de versiones TIB históricas.', {
          error: error.message,
        });
      }
    }

    return { deleted: keys.size - failed.length, failed };
  }

  async function syncCacheForRows(rows) {
    for (const slot of REPORT_SLOTS) {
      const row = rows.find((candidate) => candidate.tipo === slot.tipo);
      if (!row?.r2_key) throw new Error(`No hay archivo activo para el estado ${slot.tipo}.`);
      await syncCache(slot.tipo, row.r2_key, row.nombre_archivo || slot.nombre);
    }
  }

  async function performSync() {
    const hasV2 = Boolean(tibV2Email && tibV2Password);
    const hasV1 = Boolean(tibEmail && tibPassword);
    if (!hasV2 && !hasV1) {
      throw new Error('Faltan credenciales TIB_V2_EMAIL/TIB_V2_PASSWORD (o TIB_API_EMAIL/TIB_API_PASSWORD) en la configuración del Worker.');
    }

    const date = getLimaDateString(now());
    const currentRows = await listActiveFiles(date);
    const current = Array.isArray(currentRows) ? currentRows : [];
    const alreadyPublished = REPORT_SLOTS.every((slot) =>
      current.some((row) =>
        row.tipo === slot.tipo &&
        row.es_activo === true &&
        row.subido_por_nombre === PUBLISHER_NAME &&
        isManagedReportKey(row.r2_key, r2Root) &&
        row.r2_key.includes(`/diario/${date}/`)
      )
    );

    if (alreadyPublished) {
      await syncCacheForRows(current);
      const cleanup = await cleanupOldObjects();
      return { date, skippedFetch: true, cleanupPending: cleanup.failed.length, countsBySlot: {} };
    }

    // Autenticar una sola vez en TIB v2 si está configurado
    let v2Token = null;
    if (hasV2) {
      try {
        v2Token = await fetchTibV2Token({
          baseUrl: tibV2ApiUrl,
          email: tibV2Email,
          password: tibV2Password,
          fetchImpl,
        });
      } catch (v2AuthErr) {
        if (!hasV1) throw v2AuthErr;
        log('warn', 'No se pudo autenticar en TIB v2; usando respaldo TIB v1.', {
          error: v2AuthErr.message,
        });
      }
    }

    // Fetch/parse all 3 reports before creating any R2 object, so a bad TIB response
    // never replaces part of the previously published set.
    const latestActive = typeof listLatestActiveFiles === 'function'
      ? await listLatestActiveFiles().catch(() => [])
      : [];
    const latestByTipo = new Map(
      (Array.isArray(latestActive) ? latestActive : []).map((row) => [row.tipo, row])
    );

    const reports = [];
    for (const slot of REPORT_SLOTS) {
      let v2Items = [];
      let v1Items = [];
      let v2SlotErr = null;
      let v1SlotErr = null;

      if (v2Token) {
        try {
          v2Items = await fetchTibV2SlotItems({
            baseUrl: tibV2ApiUrl,
            token: v2Token,
            cargoStatuses: slot.cargoStatuses,
            fetchImpl,
          });
        } catch (err) {
          v2SlotErr = err;
          log('warn', `Error consultando TIB v2 para slot ${slot.tipo}.`, { error: err.message });
        }
      }

      if (hasV1) {
        try {
          v1Items = await fetchTibStatus({
            url: tibApiUrl,
            email: tibEmail,
            password: tibPassword,
            status: slot.tibStatus,
            fetchImpl,
          });
        } catch (err) {
          v1SlotErr = err;
          if (!v2Token || v2SlotErr) {
            throw err;
          }
          log('warn', `Aviso consultando historial TIB v1 para slot ${slot.tipo}; se continúa con TIB v2.`, {
            error: err.message,
          });
        }
      }

      if (v2Token && v2SlotErr && (!hasV1 || v1SlotErr)) {
        throw v2SlotErr;
      }

      const rawTotal = v2Items.length + v1Items.length;
      const mergedRows = mergeSlotItemsV2First(v2Items, v1Items, slot.tibStatus);
      const workbook = generateTibXlsxBuffer(mergedRows, slot.tibStatus);
      if (rawTotal > 0 && workbook.rowCount === 0) {
        throw new Error(`TIB devolvió filas sin WR válido para el estado ${slot.tibStatus}.`);
      }

      // Guardia anti-sobrescritura vacía: si un slot viene con 0 filas y ya hay histórico activo, preservarlo
      const preservedRow = workbook.rowCount === 0 ? latestByTipo.get(slot.tipo) : null;
      reports.push({
        ...slot,
        buffer: workbook.buffer,
        rowCount: workbook.rowCount,
        preservedRow: preservedRow && preservedRow.r2_key ? preservedRow : null,
      });
    }

    const runId = randomId();
    const uploaded = [];
    const newlyUploadedKeys = [];
    let publishAttempted = false;
    let committed = false;
    try {
      for (const report of reports) {
        if (report.preservedRow) {
          log('warn', `Slot ${report.tipo} devolvió 0 registros; se preserva el archivo histórico activo (${report.preservedRow.r2_key}).`);
          uploaded.push({
            ...report,
            r2_key: report.preservedRow.r2_key,
            nombre: report.preservedRow.nombre_archivo || report.nombre,
            preservedBytes: Number(report.preservedRow.peso_bytes || 0),
          });
          continue;
        }

        const r2Key = buildR2Key(r2Root, date, report.tipo, runId);
        uploaded.push({ ...report, r2_key: r2Key });
        newlyUploadedKeys.push(r2Key);
        await withRetry(
          () => putObject(r2Key, report.buffer, XLSX_CONTENT_TYPE),
          { maxRetries: 3, initialDelayMs: 1500, operationName: `Subida reporte TIB (${report.tipo})` }
        );
      }

      const subidoEn = now().toISOString();
      const dbRows = uploaded.map((report) => ({
        tipo: report.tipo,
        r2_key: report.r2_key,
        nombre_archivo: report.nombre,
        peso_bytes: report.preservedRow ? report.preservedBytes : report.buffer.byteLength,
        subido_por_nombre: PUBLISHER_NAME,
        subido_en: subidoEn,
      }));

      publishAttempted = true;
      const publication = await publishFiles(date, dbRows);
      committed = true;

      const preservedKeySet = new Set(
        uploaded.filter((r) => r.preservedRow).map((r) => r.r2_key)
      );
      const oldKeys = (Array.isArray(publication?.old_r2_keys) ? publication.old_r2_keys : [])
        .filter((k) => !preservedKeySet.has(k));
      await syncCacheForRows(dbRows.map((row) => ({ ...row, es_activo: true })));
      const cleanup = await cleanupOldObjects(oldKeys);
      const countsBySlot = Object.fromEntries(uploaded.map((report) => [report.tipo, report.rowCount]));
      return { date, skippedFetch: false, cleanupPending: cleanup.failed.length, countsBySlot };
    } catch (error) {
      // RPC errors can be ambiguous if the database committed but the response was
      // lost. Confirm before deleting candidate objects that might now be referenced.
      if (publishAttempted && !committed) {
        try {
          const rowsAfterRpc = await listActiveFiles(date);
          const activeKeys = new Set((Array.isArray(rowsAfterRpc) ? rowsAfterRpc : []).map((row) => row.r2_key));
          committed = uploaded.length === REPORT_SLOTS.length && uploaded.every((row) => activeKeys.has(row.r2_key));
        } catch (checkError) {
          log('error', 'No se pudo confirmar el resultado de la publicación TIB; se conservan los candidatos R2 por seguridad.', {
            error: checkError.message,
          });
          committed = true;
        }
      }

      if (!committed) {
        await Promise.allSettled(newlyUploadedKeys.map((key) => deleteObject(key)));
      }
      throw error;
    }
  }

  return {
    runOnce() {
      if (runningPromise) return runningPromise;
      const run = performSync();
      runningPromise = run;
      return run.finally(() => {
        if (runningPromise === run) runningPromise = null;
      });
    },
  };
}

function createTibDailyScheduler({
  enabled,
  sync,
  now = () => new Date(),
  retryDelaysMs = [5 * 60 * 1000, 15 * 60 * 1000, 30 * 60 * 1000],
  wait = (ms) => new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    timer.unref?.();
  }),
  setTimer = setTimeout,
  clearTimer = clearTimeout,
  log = () => {},
} = {}) {
  if (typeof sync !== 'function') throw new Error('Falta la función de sincronización diaria TIB.');

  const state = {
    enabled: Boolean(enabled),
    timeZone: LIMA_TIME_ZONE,
    schedule: '01:00',
    status: enabled ? 'scheduled' : 'disabled_missing_credentials',
    nextRunAt: null,
    lastAttemptAt: null,
    lastSuccessAt: null,
    lastSuccessDate: null,
    lastError: null,
    retries: 0,
    cleanupPending: 0,
  };
  let timer = null;
  let activeRun = null;
  let stopped = false;

  function getState() {
    return { ...state };
  }

  function scheduleNextRun() {
    if (!state.enabled || stopped) return;
    if (timer) clearTimer(timer);
    const reference = now();
    const delay = millisecondsUntilNextLimaRun(reference);
    state.nextRunAt = new Date(reference.getTime() + delay).toISOString();
    timer = setTimer(() => {
      timer = null;
      void runWithRetries().catch(() => {}).finally(scheduleNextRun);
    }, delay);
    timer.unref?.();
  }

  async function runWithRetries() {
    if (!state.enabled) return null;
    if (activeRun) return activeRun;

    const task = (async () => {
      for (let attempt = 0; attempt <= retryDelaysMs.length; attempt++) {
        if (stopped) return null;
        state.status = attempt === 0 ? 'running' : 'retrying';
        state.retries = attempt;
        state.lastAttemptAt = now().toISOString();
        try {
          const result = await sync();
          state.lastSuccessAt = now().toISOString();
          state.lastSuccessDate = result?.date || getLimaDateString(now());
          state.lastError = null;
          state.cleanupPending = Number(result?.cleanupPending || 0);
          state.status = state.cleanupPending > 0 ? 'succeeded_cleanup_pending' : 'succeeded';
          log('info', 'Sincronización diaria TIB completada.', {
            date: state.lastSuccessDate,
            skippedFetch: Boolean(result?.skippedFetch),
            countsBySlot: result?.countsBySlot || {},
            cleanupPending: state.cleanupPending,
          });
          return result;
        } catch (error) {
          state.lastError = String(error?.message || error).slice(0, 500);
          if (attempt >= retryDelaysMs.length) {
            state.status = 'failed';
            log('error', 'Fallaron los reintentos de sincronización diaria TIB.', {
              date: getLimaDateString(now()),
              attempts: attempt + 1,
              error: state.lastError,
            });
            throw error;
          }
          const delayMs = retryDelaysMs[attempt];
          log('warn', `Falló la sincronización diaria TIB; reintento ${attempt + 1}/${retryDelaysMs.length} en ${Math.round(delayMs / 60000)} minutos.`, {
            error: state.lastError,
          });
          await wait(delayMs);
        }
      }
      return null;
    })();

    activeRun = task;
    try {
      return await task;
    } finally {
      if (activeRun === task) activeRun = null;
    }
  }

  async function start() {
    if (!state.enabled) return getState();
    stopped = false;
    scheduleNextRun();
    if (isPastLimaRunTime(now())) {
      log('info', 'Worker iniciado después de la hora TIB; comprobando si falta la publicación de hoy.');
      await runWithRetries();
    }
    return getState();
  }

  function stop() {
    stopped = true;
    if (timer) clearTimer(timer);
    timer = null;
  }

  return { start, stop, runNow: runWithRetries, getState };
}

module.exports = {
  LIMA_TIME_ZONE,
  PUBLISHER_NAME,
  REPORT_HEADERS,
  REPORT_SLOTS,
  TIB_API_DEFAULT_URL,
  TIB_V2_API_DEFAULT_URL,
  XLSX_CONTENT_TYPE,
  buildR2Key,
  createTibDailyScheduler,
  createTibDailySync,
  fetchTibStatus,
  fetchTibV2SlotItems,
  fetchTibV2Token,
  generateTibXlsxBuffer,
  getLimaDateString,
  isManagedReportKey,
  isPastLimaRunTime,
  mergeSlotItemsV2First,
  millisecondsUntilNextLimaRun,
  normalizeTibRow,
  normalizeTibWr,
};
