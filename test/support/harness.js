// Levanta server.js como proceso hijo, aislado de la base de datos y el "hoy" reales.
//
// server.js resuelve su ruta de SQLite con `path.join(__dirname, 'reservas.db')`: __dirname
// es la carpeta del archivo físico, no el cwd del proceso. Por eso el aislamiento consiste
// en copiar SOLO el archivo server.js a un directorio temporal antes de arrancarlo: al vivir
// ahí, su reservas.db se crea nueva y vacía en ese temporal, y el reservas.db real del
// repositorio nunca se toca. Las dependencias (express, better-sqlite3) se resuelven vía
// NODE_PATH apuntando al node_modules real, así no hace falta copiarlo.
//
// El reloj se fija con el preload de fixed-clock.js (ver ese archivo) para poder construir
// bordes exactos de fechas/horas sin depender del reloj real de la máquina.
'use strict';

const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const PROJECT_ROOT = path.join(__dirname, '..', '..');
const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;
const CLOCK_PRELOAD = path.join(__dirname, 'fixed-clock.js');
// El proceso se ejecuta desde un archivo recién creado en %TEMP%. En Windows, la
// primera inspección del archivo y del addon nativo puede demorarse por el antivirus.
const STARTUP_TIMEOUT_MS = 15000;

let child = null;
let tempDir = null;

async function waitForServer(url, timeoutMs, serverProcess) {
  const start = Date.now();
  let lastError = null;
  while (Date.now() - start < timeoutMs) {
    if (serverProcess.exitCode !== null || serverProcess.signalCode !== null) {
      throw new Error(
        `El servidor terminó antes de responder (código ${serverProcess.exitCode}, ` +
        `señal ${serverProcess.signalCode})`
      );
    }
    try {
      const res = await fetch(url);
      // Cualquier respuesta HTTP (incluso un error de aplicación) confirma que el
      // servidor ya está escuchando y aceptando conexiones.
      if (res) return;
    } catch (err) {
      lastError = err;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  const detalle = lastError && lastError.cause
    ? `${lastError}; causa: ${lastError.cause}`
    : lastError;
  throw new Error(`El servidor no respondió en ${url} dentro de ${timeoutMs}ms: ${detalle}`);
}

async function startServer(mockNowISO) {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cancha-total-test-'));
  const serverDest = path.join(tempDir, 'server.js');
  fs.copyFileSync(path.join(PROJECT_ROOT, 'server.js'), serverDest);

  child = spawn(
    process.execPath,
    ['--require', CLOCK_PRELOAD, serverDest],
    {
      cwd: tempDir,
      env: {
        ...process.env,
        NODE_PATH: path.join(PROJECT_ROOT, 'node_modules'),
        MOCK_NOW: mockNowISO,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  );

  let stderrOutput = '';
  let stdoutOutput = '';
  child.stderr.on('data', (chunk) => {
    stderrOutput += chunk.toString();
  });
  child.stdout.on('data', (chunk) => {
    stdoutOutput += chunk.toString();
  });

  child.on('exit', (code, signal) => {
    if (code !== null && code !== 0) {
      // eslint-disable-next-line no-console
      console.error(`[servidor de pruebas] terminó con código ${code}. stderr:\n${stderrOutput}`);
    }
  });

  try {
    await waitForServer(BASE_URL, STARTUP_TIMEOUT_MS, child);
  } catch (err) {
    await stopServer();
    throw new Error(
      `${err.message}\nstdout del servidor:\n${stdoutOutput}\nstderr del servidor:\n${stderrOutput}`
    );
  }

  return {
    baseUrl: BASE_URL,
    dbPath: path.join(tempDir, 'reservas.db'),
  };
}

async function stopServer() {
  if (child && !child.killed) {
    // En Windows, child.kill() no garantiza que el proceso ya haya soltado el archivo de
    // la base de datos en el momento en que retorna: hay que esperar su salida real antes
    // de borrar el directorio temporal, o rmSync falla con EBUSY.
    const salida = new Promise((resolve) => child.once('exit', resolve));
    child.kill();
    await Promise.race([salida, new Promise((resolve) => setTimeout(resolve, 2000))]);
  }
  child = null;
  if (tempDir && fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  }
  tempDir = null;
}

module.exports = { startServer, stopServer };
