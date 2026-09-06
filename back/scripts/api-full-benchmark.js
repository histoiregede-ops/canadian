#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const axios = require('axios');

const BACK_DIR = path.join(__dirname, '..');
const ROUTES_DIR = path.join(BACK_DIR, 'routes');
const TMP_DIR = path.join(BACK_DIR, 'tmp');
const REPORT_FILE = path.join(TMP_DIR, 'api-full-benchmark-report.json');
const PORT = Number(process.env.BENCH_PORT || 3998);
const BASE_URL = `http://127.0.0.1:${PORT}/api`;
const ITERATIONS = Number(process.env.BENCH_ITERATIONS || 1);
const REQUEST_TIMEOUT_MS = Number(process.env.BENCH_REQUEST_TIMEOUT_MS || 15000);
const CREDENTIALS = { username: process.env.BENCH_USER || 'admin', password: process.env.BENCH_PASS || 'admin' };

const PARAM_VALUES = {
  id: 'c0000001-0000-0000-0000-000000000001',
  customerId: 'a0000001-0000-0000-0000-000000000005',
  productId: 'c0000001-0000-0000-0000-000000000001',
  conversationId: 'benchmark-conversation',
  messageId: 'benchmark-message',
  transactionId: 'benchmark-transaction',
  orderId: 'benchmark-order',
  depositId: 'benchmark-deposit'
};

function routeMounts() {
  const index = fs.readFileSync(path.join(BACK_DIR, 'index.js'), 'utf8');
  const variables = {};
  for (const match of index.matchAll(/const (\w+) = require\('\.\/routes\/([^']+)'\);/g)) {
    variables[match[1]] = match[2];
  }
  const mounts = {};
  for (const match of index.matchAll(/app\.use\('(\/api[^']*)', (\w+)\);/g)) {
    const file = variables[match[2]];
    if (file) mounts[file] = match[1];
  }
  return mounts;
}

function discoverRoutes() {
  const mounts = routeMounts();
  const routes = [];
  for (const file of fs.readdirSync(ROUTES_DIR).filter(name => name.endsWith('.js'))) {
    const source = fs.readFileSync(path.join(ROUTES_DIR, file), 'utf8');
    const mount = mounts[file.replace(/\.js$/, '')];
    if (!mount) continue;
    for (const match of source.matchAll(/router\.(get|post|put|patch|delete)\(['"]([^'"]*)['"]/gi)) {
      const method = match[1].toUpperCase();
      const routePath = `${mount}${match[2] === '/' ? '' : match[2]}`;
      const skip = routePath === '/api/seed' || routePath === '/api/seed-all';
      routes.push({ method, path: routePath.replace(/^\/api/, ''), source: file, skip });
    }
  }
  routes.push({ method: 'GET', path: '/monitoring/metrics', source: 'index.js', skip: false });
  return routes;
}

function materialize(route) {
  return route.path.replace(/\{?:(\w+)\}?|\{(\w+)\}/g, (_, colonName, braceName) => PARAM_VALUES[colonName || braceName] || 'benchmark-id');
}

function requestBody(route) {
  if (route.path === '/auth/login') return CREDENTIALS;
  if (route.path === '/customers/login') return { email: 'benchmark@example.test', password: 'benchmark' };
  if (route.path === '/contact') return { name: 'Benchmark', email: 'benchmark@example.test', message: 'API benchmark' };
  return {};
}

function percentile(values, ratio) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * ratio) - 1)];
}

function startServer(env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['index.js'], { cwd: BACK_DIR, env, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    const timer = setTimeout(() => reject(new Error(`Serveur non pret:\n${output.slice(-2000)}`)), 30000);
    const onData = chunk => {
      output += chunk.toString();
      if (output.includes('Server is running')) {
        clearTimeout(timer);
        resolve(child);
      }
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    child.on('error', reject);
  });
}

async function login() {
  const response = await axios.post(`${BASE_URL}/auth/login`, CREDENTIALS, { timeout: REQUEST_TIMEOUT_MS });
  return response.data.token;
}

async function measure(route, token) {
  const samples = [];
  const statuses = [];
  let error = null;
  for (let attempt = 0; attempt < ITERATIONS; attempt++) {
    const start = process.hrtime.bigint();
    try {
      const response = await axios.request({
        method: route.method,
        url: `${BASE_URL}${materialize(route)}`,
        headers: { Authorization: `Bearer ${token}` },
        data: ['POST', 'PUT', 'PATCH', 'DELETE'].includes(route.method) ? requestBody(route) : undefined,
        timeout: REQUEST_TIMEOUT_MS,
        validateStatus: () => true
      });
      samples.push(Number(process.hrtime.bigint() - start) / 1e6);
      statuses.push(response.status);
    } catch (caught) {
      samples.push(Number(process.hrtime.bigint() - start) / 1e6);
      statuses.push(null);
      error = caught.code || caught.message;
    }
  }
  const status = statuses[statuses.length - 1];
  return {
    method: route.method,
    endpoint: `${route.method} ${route.path}`,
    source: route.source,
    status,
    success: status >= 200 && status < 300,
    healthy: status !== null && status < 500,
    error,
    minMs: Math.round(Math.min(...samples)),
    meanMs: Math.round(samples.reduce((sum, value) => sum + value, 0) / samples.length),
    p95Ms: Math.round(percentile(samples, 0.95)),
    maxMs: Math.round(Math.max(...samples))
  };
}

async function main() {
  const routes = discoverRoutes();
  const childEnv = { ...process.env, PORT: String(PORT), DB_DIALECT: 'sqlite', DB_STORAGE: path.join(TMP_DIR, 'benchmark-full.sqlite') };
  fs.mkdirSync(TMP_DIR, { recursive: true });
  const child = await startServer(childEnv);
  try {
    const token = await login();
    const results = [];
    for (const route of routes) {
      if (route.skip) {
        results.push({ method: route.method, endpoint: `${route.method} ${route.path}`, source: route.source, skipped: true, reason: 'destructive seed route' });
      } else {
        results.push(await measure(route, token));
      }
    }
    const executed = results.filter(result => !result.skipped);
    const report = {
      generatedAt: new Date().toISOString(),
      discoveredRoutes: routes.length,
      executedRoutes: executed.length,
      skippedRoutes: results.filter(result => result.skipped).length,
      norm: { p95MaxMs: 500, maxMaxMs: 2000, description: 'Chaque route executee doit rester sous 500 ms au p95 et 2000 ms au maximum.' },
      totals: {
        healthy: executed.filter(result => result.healthy).length,
        successful2xx: executed.filter(result => result.success).length,
        serverErrors5xx: executed.filter(result => !result.healthy).length,
        latencyViolations: executed.filter(result => result.p95Ms > 500 || result.maxMs > 2000).length
      },
      compliant: executed.every(result => result.healthy && result.p95Ms <= 500 && result.maxMs <= 2000),
      endpoints: results
    };
    fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));
    console.log(`Routes decouvertes : ${report.discoveredRoutes}`);
    console.log(`Routes executees   : ${report.executedRoutes}`);
    console.log(`Routes ignorees    : ${report.skippedRoutes}`);
    console.log(`Reponses 2xx      : ${report.totals.successful2xx}`);
    console.log(`Erreurs 5xx       : ${report.totals.serverErrors5xx}`);
    console.log(`Hors norme        : ${report.totals.latencyViolations}`);
    console.log(`Resultat          : ${report.compliant ? 'CONFORME' : 'NON CONFORME'}`);
    console.log(`Rapport           : ${REPORT_FILE}`);
    process.exitCode = report.compliant ? 0 : 2;
  } finally {
    child.kill('SIGTERM');
  }
}

main().catch(error => {
  console.error('Benchmark complet echoue:', error.message);
  process.exitCode = 1;
});