#!/usr/bin/env node
/**
 * API Performance Benchmark — Electro Canadien (backend Express)
 * -------------------------------------------------------------
 * Mesure la durée de chaque appel API GET de base, calcule les percentiles
 * (min / moyenne / p95 / max) et vérifie la CONFORMITÉ à la NORME de
 * performance du projet (SLA).
 *
 * NORME DE PERFORMANCE (SLA)  — modifiable via variables d'environnement :
 *   • GET listes            : p95 < 500 ms   (SLA_P95_GET_MS)    — cible normale
 *                             max  < 2000 ms (SLA_MAX_GET_MS)    — durcissement
 *   • Timeout par requête   : 15 s           (défaut axios)
 *   • Tolérance réseau      : 3 tentatives   (BENCH_ATTEMPTS)
 *
 * Utilisation :
 *   node back/scripts/api-benchmark.js            # démarre le serveur localement
 *   node back/scripts/api-benchmark.js --base http://hote:3000/api   # serveur externe
 *   node back/scripts/api-benchmark.js --write    # inclut tests d'écriture (supprimés après)
 *
 * Codes de sortie :
 *   0 = conforme à la norme    1 = erreur d'exécution    2 = norme non respectée
 *
 * Rapport écrit : back/tmp/api-benchmark-report.json
 */
'use strict';

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const axios = require('axios');

const BACK_DIR = path.join(__dirname, '..');
const TMP_DIR = path.join(BACK_DIR, 'tmp');
const REPORT_FILE = path.join(TMP_DIR, 'api-benchmark-report.json');

// ---------------------------------------------------------------------------
// Configuration / norme
// ---------------------------------------------------------------------------
const PORT = Number(process.env.BENCH_PORT || 3999);
const INTERNAL_BASE = `http://127.0.0.1:${PORT}/api`;
const ITERATIONS = Number(process.env.BENCH_ITERATIONS || 5);
const ATTEMPTS = Number(process.env.BENCH_ATTEMPTS || 3);
const SLA_P95_GET_MS = Number(process.env.SLA_P95_GET_MS || 500);
const SLA_MAX_GET_MS = Number(process.env.SLA_MAX_GET_MS || 2000);
const REQUEST_TIMEOUT_MS = Number(process.env.BENCH_REQUEST_TIMEOUT_MS || 15000);
const SERVER_READY_TIMEOUT_MS = Number(process.env.BENCH_READY_TIMEOUT_MS || 30000);

const CREDENTIALS = {
  username: process.env.BENCH_USER || 'admin',
  password: process.env.BENCH_PASS || 'admin'
};

const ENDPOINTS = [
  { method: 'GET', path: '/products', label: 'Produits (liste)' },
  { method: 'GET', path: '/suppliers', label: 'Fournisseurs (liste)' },
  { method: 'GET', path: '/categories', label: 'Catégories (liste)' },
  { method: 'GET', path: '/customers', label: 'Clients (liste)' },
  { method: 'GET', path: '/orders', label: 'Commandes (liste)' },
  { method: 'GET', path: '/repairs', label: 'Réparations (liste)' },
  { method: 'GET', path: '/installations', label: 'Installations (liste)' },
  { method: 'GET', path: '/users', label: 'Utilisateurs (liste)' },
  { method: 'GET', path: '/transfers', label: 'Transferts (liste)' },
  { method: 'GET', path: '/movements', label: 'Mouvements (liste)' },
  { method: 'GET', path: '/finance/transactions', label: 'Finance (transactions)' },
  { method: 'GET', path: '/stats/dashboard', label: 'Dashboard (stats)' },
  { method: 'GET', path: '/purchase-orders', label: 'Commandes fournisseurs (liste)' },
  { method: 'GET', path: '/reports/dashboard', label: 'Rapports (dashboard)' }
];

// ---------------------------------------------------------------------------
// Utilitaires
// ---------------------------------------------------------------------------
function p95(values) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.ceil((sorted.length * 95) / 100) - 1;
  return sorted[Math.max(0, idx)];
}

function mean(values) {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function formatMs(v) {
  return `${v.toFixed(0)} ms`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Démarrage du serveur (mode autonome)
// ---------------------------------------------------------------------------
async function startServerIfNeeded(args, childEnv) {
  if (args['base']) return { base: args['base'].replace(/\/$/, ''), child: null, own: false };
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['index.js'], {
      cwd: BACK_DIR,
      env: childEnv,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let output = '';
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error(`Délai d'attente du serveur dépassé (${SERVER_READY_TIMEOUT_MS} ms). Sortie:\n${output}`));
    }, SERVER_READY_TIMEOUT_MS);

    const onData = (chunk) => {
      output += chunk.toString();
      if (output.includes('Server is running') || output.includes(`port ${PORT}`)) {
        clearTimeout(timer);
        resolve({ base: INTERNAL_BASE, child, own: true });
      }
    };

    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on('exit', (code) => {
      clearTimeout(timer);
      if (!output.includes('Server is running')) {
        reject(new Error(`Le serveur s'est arrêté avant d'être prêt (code ${code}). Sortie:\n${output.slice(0, 2000)}`));
      }
    });
  });
}

// ---------------------------------------------------------------------------
// Authentification
// ---------------------------------------------------------------------------
async function login(base) {
  const res = await axios.post(`${base}/auth/login`, CREDENTIALS, { timeout: REQUEST_TIMEOUT_MS });
  if (!res.data || !res.data.token) throw new Error('Login réussi mais aucun token renvoyé.');
  return res.data.token;
}

/**
 * En mode --sqlite, la base temporaire est vide : on insère l'admin
 * via un sous-processus partageant la même config SQLite.
 */
function seedBenchmarkUser(childEnv) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(__dirname, 'seed-benchmark-user.js')], {
      cwd: BACK_DIR,
      env: childEnv,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let out = '';
    child.stdout.on('data', (d) => { out += d.toString(); });
    child.stderr.on('data', (d) => { out += d.toString(); });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve(out);
      else reject(new Error(`seed-benchmark-user a échoué (code ${code}): ${out.slice(0, 500)}`));
    });
  });
}

// ---------------------------------------------------------------------------
// Mesure d'un endpoint
// ---------------------------------------------------------------------------
async function measureEndpoint(base, token, endpoint) {
  const url = `${base}${endpoint.path}`;
  const headers = { Authorization: `Bearer ${token}` };
  const samples = [];
  let lastError = null;
  let lastStatus = null;

  for (let i = 0; i < ITERATIONS; i++) {
    for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
      const start = process.hrtime.bigint();
      try {
        const res = await axios.get(url, { headers, timeout: REQUEST_TIMEOUT_MS });
        const durMs = Number(process.hrtime.bigint() - start) / 1e6;
        lastStatus = res.status;
        samples.push(durMs);
        break;
      } catch (err) {
        const durMs = Number(process.hrtime.bigint() - start) / 1e6;
        lastError = err.response
          ? `HTTP ${err.response.status} ${err.response.statusText}`
          : err.code || err.message;
        lastStatus = err.response ? err.response.status : null;
        if (attempt === ATTEMPTS - 1) {
          samples.push(durMs); // on garde la mesure de l'échec pour le rapport
        } else {
          await sleep(50 * (attempt + 1));
        }
      }
    }
  }

  return {
    endpoint: endpoint.path,
    label: endpoint.label,
    status: lastStatus || 'ERROR',
    error: lastError || null,
    samples,
    minMs: Math.min(...samples),
    meanMs: mean(samples),
    p95Ms: p95(samples),
    maxMs: Math.max(...samples)
  };
}

// ---------------------------------------------------------------------------
// Tests d'écriture optionnels (--write) : création puis suppression propre
// ---------------------------------------------------------------------------
async function measureWriteRoundTrip(base, token) {
  const stamp = Date.now();
  const payload = {
    name: `Benchmark ${stamp}`,
    email: `benchmark-${stamp}@test.local`,
    contactName: 'Benchmark',
    city: 'Test',
    country: 'CI'
  };

  const headers = { Authorization: `Bearer ${token}` };
  const createStart = process.hrtime.bigint();
  let created = null;
  try {
    const res = await axios.post(`${base}/suppliers`, payload, { headers, timeout: REQUEST_TIMEOUT_MS });
    created = res.data;
  } catch (err) {
    return {
      endpoint: 'POST /suppliers (écriture)',
      status: err.response ? `HTTP ${err.response.status}` : 'ERROR',
      error: err.response ? (err.response.data && (err.response.data.error || err.response.data.message)) : (err.code || err.message),
      ms: Number(process.hrtime.bigint() - createStart) / 1e6
    };
  }
  const createMs = Number(process.hrtime.bigint() - createStart) / 1e6;

  let deleteMs = null;
  if (created && created.id) {
    const delStart = process.hrtime.bigint();
    try {
      await axios.delete(`${base}/suppliers/${created.id}`, { headers, timeout: REQUEST_TIMEOUT_MS });
      deleteMs = Number(process.hrtime.bigint() - delStart) / 1e6;
    } catch (err) {
      deleteMs = -1; // indicateur de nettoyage échoué
    }
  }

  return {
    endpoint: 'POST /suppliers (écriture)',
    status: '201',
    createMs,
    deleteMs,
    note: deleteMs === -1 ? 'Nettoyage (DELETE) en échec — à vérifier manuellement' : 'Nettoyage OK'
  };
}

// ---------------------------------------------------------------------------
// Rapport & vérification de la norme
// ---------------------------------------------------------------------------
function buildReport(results, writeResult) {
  const failures = results.filter((r) => r.error && r.status !== '200');
  const outOfSla = results.filter((r) => !r.error && (r.p95Ms > SLA_P95_GET_MS || r.maxMs > SLA_MAX_GET_MS));

  const report = {
    generatedAt: new Date().toISOString(),
    serverBase: results.length ? results[0].endpoint : null,
    iterations: ITERATIONS,
    norme: {
      slaP95GetMs: SLA_P95_GET_MS,
      slaMaxGetMs: SLA_MAX_GET_MS,
      requestTimeoutMs: REQUEST_TIMEOUT_MS,
      description: `GET : p95 < ${SLA_P95_GET_MS} ms et max < ${SLA_MAX_GET_MS} ms`
    },
    endpoints: results.map((r) => ({
      endpoint: r.endpoint,
      label: r.label,
      status: r.status,
      error: r.error,
      minMs: Math.round(r.minMs),
      meanMs: Math.round(r.meanMs),
      p95Ms: Math.round(r.p95Ms),
      maxMs: Math.round(r.maxMs),
      slaCompliant: !r.error && r.p95Ms <= SLA_P95_GET_MS && r.maxMs <= SLA_MAX_GET_MS
    })),
    writeRoundTrip: writeResult || null,
    compliant: failures.length === 0 && outOfSla.length === 0
  };
  return report;
}

function printReport(report) {
  console.log('='.repeat(88));
  console.log(' BENCHMARK PERFORMANCE API — ELECTRO CANADIEN');
  console.log('='.repeat(88));
  console.log(` Date          : ${report.generatedAt}`);
  console.log(` Itérations    : ${report.iterations} par endpoint`);
  console.log(` NORME (SLA)   : ${report.norme.description}`);
  console.log('-' .repeat(88));
  console.log(' Endpoint                          Statut    min     moy     p95     max   SLA');
  console.log('-'.repeat(88));
  for (const e of report.endpoints) {
    const status = e.status || 'ERR';
    const min = e.minMs !== undefined ? ` ${formatMs(e.minMs).padStart(6)}` : '    n/a';
    const moy = e.meanMs !== undefined ? ` ${formatMs(e.meanMs).padStart(6)}` : '    n/a';
    const p = e.p95Ms !== undefined ? ` ${formatMs(e.p95Ms).padStart(6)}` : '    n/a';
    const max = e.maxMs !== undefined ? ` ${formatMs(e.maxMs).padStart(6)}` : '    n/a';
    const sla = e.slaCompliant ? 'OK' : (e.error ? 'ERR' : 'ÉCHEC');
    const label = `${e.label || e.endpoint}`.padEnd(35);
    console.log(` ${label} ${String(status).padEnd(7)}${min}${moy}${p}${max}  ${sla}`);
    if (e.error) console.log(`     → ${e.error}`);
  }
  if (report.writeRoundTrip) {
    const w = report.writeRoundTrip;
    console.log('-'.repeat(88));
    console.log(
      ` ÉCRITURE  : ${w.endpoint} en ${formatMs(w.createMs).padStart(6)}  |  ${w.note}`
    );
  }
  console.log('-'.repeat(88));
  const failedCount = report.endpoints.filter((e) => !e.slaCompliant).length;
  console.log(
    report.compliant
      ? ` RÉSULTAT   : CONFORME à la norme (${report.endpoints.length} endpoints, ${failedCount} non conformes)`
      : ` RÉSULTAT   : NON CONFORME (${failedCount} endpoint(s) hors norme ou en erreur)`
  );
  console.log('='.repeat(88));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const args = {};
  process.argv.slice(2).forEach((a) => {
    if (a.startsWith('--base=')) args['base'] = a.split('=')[1];
    if (a === '--write') args['write'] = true;
    if (a === '--sqlite') args['sqlite'] = true;
  });

  const childEnv = { ...process.env, PORT: String(PORT), NODE_ENV: process.env.NODE_ENV || 'development' };
  if (args['sqlite']) {
    // Mode local : DB SQLite temporaire (aucun impact sur la vraie base)
    childEnv.DB_DIALECT = 'sqlite';
    childEnv.DB_STORAGE = path.join(TMP_DIR, 'benchmark.sqlite');
    fs.mkdirSync(TMP_DIR, { recursive: true });
  }

  const { base, child, own } = await startServerIfNeeded(args, childEnv);
  let token = null;
  const results = [];
  let writeResult = null;

  try {
    token = await login(base);
    console.log(`Authentifié (${CREDENTIALS.username}) — base ${base}`);
  } catch (err) {
    if (child && args['sqlite'] && String(err.message).includes('401')) {
      // Base locale vide : on insère l'admin puis on retente une seule fois
      try {
        await seedBenchmarkUser(childEnv);
      } catch (seedErr) {
        console.error('Seed admin échoué :', seedErr.message);
        if (child) child.kill('SIGTERM');
        process.exit(1);
      }
      try {
        token = await login(base);
        console.log(`Authentifié (${CREDENTIALS.username}) — base ${base} (après seed)`);
      } catch (retryErr) {
        console.error(`Impossible de se connecter à l'API (${base}) :`, retryErr.message);
        if (child) child.kill('SIGTERM');
        process.exit(1);
      }
    } else {
      console.error(`Impossible de se connecter à l'API (${base}) :`, err.message);
      if (child) child.kill('SIGTERM');
      process.exit(1);
    }
  }

  for (const endpoint of ENDPOINTS) {
    const r = await measureEndpoint(base, token, endpoint);
    results.push(r);
  }

  if (args['write']) {
    writeResult = await measureWriteRoundTrip(base, token);
  }

  const report = buildReport(results, writeResult);
  fs.mkdirSync(TMP_DIR, { recursive: true });
  fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2), 'utf8');
  printReport(report);
  console.log(`Rapport détaillé : ${REPORT_FILE}`);

  if (child) child.kill('SIGTERM');

  process.exit(report.compliant ? 0 : 2);
}

main().catch((err) => {
  console.error('Erreur fatale du benchmark :', err);
  process.exit(1);
});