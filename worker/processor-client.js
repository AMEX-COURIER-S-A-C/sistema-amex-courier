'use strict';

const { spawn } = require('node:child_process');

/**
 * Boundary between the queue worker and the C# processor.
 * It owns daemon lifecycle, HTTP transport and CLI fallback.
 */
function createProcessorClient({ processor, port, timeoutMs, sourcePaths, log = console }) {
  const daemonUrl = `http://127.0.0.1:${port}`;
  let daemonProcess = null;
  let daemonReady = false;

  function startDaemon() {
    if (daemonProcess && !daemonProcess.killed) return;
    log.log(`[worker] [DAEMON 🚀] Iniciando AmexInventoryProcessor en modo daemon (puerto ${port})...`);

    try {
      daemonProcess = spawn(processor, ['--daemon', String(port)], {
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      daemonProcess.stdout.setEncoding('utf8');
      daemonProcess.stderr.setEncoding('utf8');
      daemonProcess.stdout.on('data', data => forwardLines(data, line => log.log(`[daemon] ${line}`)));
      daemonProcess.stderr.on('data', data => forwardLines(data, line => log.warn(`[daemon] ${line}`)));

      daemonProcess.on('error', error => {
        log.warn(`[daemon] Error al iniciar daemon C#: ${error.message}`);
        daemonProcess = null;
        daemonReady = false;
      });
      daemonProcess.on('exit', (code, signal) => {
        log.warn(`[daemon] Proceso daemon C# finalizó (code=${code}, signal=${signal}).`);
        daemonProcess = null;
        daemonReady = false;
      });
    } catch (error) {
      log.warn(`[daemon] No se pudo lanzar el daemon C#: ${error.message}`);
    }
  }

  async function checkReady(retries = 2) {
    for (let attempt = 0; attempt < retries; attempt += 1) {
      try {
        const response = await fetch(`${daemonUrl}/health`, {
          signal: AbortSignal.timeout(1000),
        });
        if (response.ok) {
          daemonReady = true;
          return true;
        }
      } catch {
        if (attempt < retries - 1) await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    daemonReady = false;
    return false;
  }

  async function warmup() {
    try {
      const response = await fetch(`${daemonUrl}/warmup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourcePaths }),
        signal: AbortSignal.timeout(60000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      log.warn(`[worker] Aviso warmup daemon C#: ${error.message}`);
      return null;
    }
  }

  async function run(args, onProgress) {
    try {
      if (await checkReady(2)) {
        log.log('[worker] [DAEMON ⚡] Procesando inventario directamente en RAM (Zero Cold-Start)...');
        onProgress?.({ stage: 'matching', message: 'Cruzando inventario directamente en memoria RAM...' });
        const startedAt = Date.now();
        const response = await fetch(`${daemonUrl}/process`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            inventoryPath: args[0],
            sourcePaths: args.slice(1, 4),
            outputPath: args[4],
            unmatchedCsvPath: args[5],
          }),
          signal: AbortSignal.timeout(timeoutMs),
        });

        if (response.ok) {
          const result = await response.json();
          if (result?.ok) {
            log.log(`[worker] [DAEMON COMPLETADO ⚡] Inventario procesado en RAM en ${Date.now() - startedAt}ms! (coincidencias: ${result.matched}/${result.totalInventory})`);
            return result;
          }
        }
      }
    } catch (error) {
      log.warn(`[worker] [DAEMON FALLBACK ⚠️] Falló llamada a daemon C# (${error.message}). Usando CLI tradicional...`);
    }

    return runCli(args, onProgress);
  }

  function runCli(args, onProgress) {
    return new Promise((resolve, reject) => {
      const child = spawn(processor, args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
      let stdout = '';
      let stderrTail = '';
      let stderrPending = '';
      let timedOut = false;
      const timeout = setTimeout(() => {
        timedOut = true;
        child.kill('SIGKILL');
      }, timeoutMs);

      child.stdout.setEncoding('utf8');
      child.stderr.setEncoding('utf8');
      child.stdout.on('data', chunk => { stdout = (stdout + chunk).slice(-2_000_000); });
      child.stderr.on('data', chunk => {
        const lines = (stderrPending + chunk).split(/\r?\n/);
        stderrPending = lines.pop() || '';
        for (const line of lines) {
          if (line.startsWith('PROGRESS:')) {
            try {
              const progress = JSON.parse(line.slice('PROGRESS:'.length));
              if (typeof progress.stage === 'string' && typeof progress.message === 'string') {
                onProgress?.(progress);
              }
            } catch {
              stderrTail = (stderrTail + `${line}\n`).slice(-50_000);
            }
          } else if (line.trim()) {
            stderrTail = (stderrTail + `${line}\n`).slice(-50_000);
          }
        }
      });
      child.on('error', error => {
        clearTimeout(timeout);
        reject(new Error(
          `No se pudo iniciar el procesador (spawn error: ${error.message}; code=${error.code || 'n/a'}). ` +
          `stderr: ${(stderrTail.trim() || '(vacío)').slice(0, 500)}`
        ));
      });
      child.on('close', (code, signal) => {
        clearTimeout(timeout);
        if (timedOut) {
          reject(new Error('El procesamiento excedió el tiempo máximo y se detuvo.'));
          return;
        }
        if (code !== 0) {
          let message = stderrTail.trim() || stdout.trim() || `El procesador terminó con código ${code} y señal ${signal || 'n/a'}.`;
          try {
            const details = JSON.parse(message.split('\n').at(-1));
            if (details.error) message = details.error;
          } catch { /* usa el mensaje tal cual */ }
          reject(new Error(
            `${message.split('\n')[0]} [exit=${code} signal=${signal || 'n/a'}] ` +
            `stdout: ${(stdout.trim() || '(vacío)').slice(-300)}`
          ));
          return;
        }
        try {
          const result = JSON.parse(stdout.trim());
          if (!result?.ok) throw new Error(result?.error || 'Resultado inválido del procesador.');
          resolve(result);
        } catch (error) {
          reject(new Error(`No se pudo leer el resultado: ${error.message}`));
        }
      });
    });
  }

  function preflight() {
    try {
      const child = spawn(processor, [], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
      let errorOutput = '';
      child.stderr.setEncoding('utf8');
      child.stderr.on('data', chunk => { errorOutput += chunk; });
      child.on('error', error => log.error(`[worker] preflight spawn error: ${error.message} (code=${error.code || 'n/a'})`));
      child.on('close', (code, signal) => {
        log.log(`[worker] preflight: exit=${code} signal=${signal || 'n/a'} out=${errorOutput.trim().slice(0, 200) || '(vacío)'}`);
      });
    } catch (error) {
      log.error(`[worker] preflight exception: ${error.message}`);
    }
  }

  return {
    startDaemon,
    checkReady,
    warmup,
    run,
    preflight,
    get url() { return daemonUrl; },
    get pid() { return daemonProcess?.pid || null; },
    get daemonReady() { return daemonReady; },
  };
}

function forwardLines(data, callback) {
  for (const line of data.split('\n')) {
    const trimmed = line.trim();
    if (trimmed) callback(trimmed);
  }
}

module.exports = { createProcessorClient };
