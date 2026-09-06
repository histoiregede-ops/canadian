'use strict';

const os = require('os');
const fs = require('fs');
const path = require('path');

function createApiMetrics() {
  const metrics = new Map();
  const knownEndpoints = discoverEndpoints();
  let previousCpu = process.cpuUsage();
  let previousCpuAt = process.hrtime.bigint();

  function routePathFor(req) {
    const originalPath = (req.originalUrl || req.path).split('?')[0];
    if (req.route?.path && req.baseUrl) return `${req.baseUrl}${req.route.path}`;
    return originalPath.replace(/\/([0-9a-f]{8}-[0-9a-f-]{27,}|\d+)(?=\/|$)/gi, '/:id');
  }

  function keyFor(req) {
    return `${req.method} ${routePathFor(req)}`;
  }

  function middleware(req, res, next) {
    if (!req.path.startsWith('/api')) return next();

    const startedAt = process.hrtime.bigint();
    res.once('finish', () => {
      const key = keyFor(req);
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
      const current = metrics.get(key) || {
        method: req.method,
        path: routePathFor(req),
        requests: 0,
        successes: 0,
        errors: 0,
        totalDurationMs: 0,
        maxDurationMs: 0,
        lastDurationMs: 0,
        statusCodes: {}
      };

      current.requests += 1;
      current.successes += res.statusCode < 400 ? 1 : 0;
      current.errors += res.statusCode >= 400 ? 1 : 0;
      current.totalDurationMs += durationMs;
      current.maxDurationMs = Math.max(current.maxDurationMs, durationMs);
      current.lastDurationMs = durationMs;
      current.statusCodes[res.statusCode] = (current.statusCodes[res.statusCode] || 0) + 1;
      metrics.set(key, current);
    });

    next();
  }

  function snapshot() {
    return knownEndpoints.map(endpoint => {
      const item = metrics.get(`${endpoint.method} ${endpoint.path}`) || {
        ...endpoint,
        requests: 0,
        successes: 0,
        errors: 0,
        totalDurationMs: 0,
        maxDurationMs: 0,
        lastDurationMs: 0,
        statusCodes: {}
      };
      return {
      ...item,
      averageDurationMs: item.requests === 0 ? 0 : item.totalDurationMs / item.requests,
      successRate: item.requests === 0 ? 0 : item.successes / item.requests,
      errorRate: item.requests === 0 ? 0 : item.errors / item.requests
      };
    });
  }

  function reset() {
    metrics.clear();
  }

  function systemSnapshot() {
    const now = process.hrtime.bigint();
    const currentCpu = process.cpuUsage();
    const elapsedMicros = Number(now - previousCpuAt) / 1000;
    const cpuMicros = (currentCpu.user - previousCpu.user) + (currentCpu.system - previousCpu.system);
    const cpuPercent = elapsedMicros > 0 ? Math.min(100, (cpuMicros / elapsedMicros) * 100) : 0;
    previousCpu = currentCpu;
    previousCpuAt = now;

    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const processMemory = process.memoryUsage();
    const alerts = [];
    if (cpuPercent >= 80) alerts.push({ level: 'critical', code: 'cpu-high', message: 'Le processus backend consomme beaucoup de CPU. Vérifiez les traitements lourds et les appels répétés.' });
    if ((usedMemory / totalMemory) * 100 >= 85) alerts.push({ level: 'warning', code: 'memory-high', message: 'La mémoire système est fortement utilisée. Vérifiez les fuites mémoire et les volumes de données chargés.' });

    return {
      cpuPercent: Number(cpuPercent.toFixed(2)),
      loadAverage: os.loadavg()[0],
      memory: {
        totalBytes: totalMemory,
        freeBytes: freeMemory,
        usedBytes: usedMemory,
        usedPercent: Number(((usedMemory / totalMemory) * 100).toFixed(2))
      },
      process: {
        rssBytes: processMemory.rss,
        heapUsedBytes: processMemory.heapUsed,
        heapTotalBytes: processMemory.heapTotal
      },
      uptimeSeconds: Math.round(process.uptime()),
      alerts
    };
  }

  return { middleware, snapshot, reset, systemSnapshot };
}

function discoverEndpoints() {
  const routesDir = path.join(__dirname, '..', 'routes');
  const indexPath = path.join(__dirname, '..', 'index.js');
  if (!fs.existsSync(routesDir) || !fs.existsSync(indexPath)) return [{ method: 'GET', path: '/api/monitoring/metrics' }];

  const indexSource = fs.readFileSync(indexPath, 'utf8');
  const variables = {};
  for (const match of indexSource.matchAll(/const (\w+) = require\('\.\/routes\/([^']+)'\);/g)) {
    variables[match[1]] = match[2];
  }
  const mounts = {};
  for (const match of indexSource.matchAll(/app\.use\('(\/api[^']*)', (\w+)\);/g)) {
    if (variables[match[2]]) mounts[variables[match[2]]] = match[1];
  }

  const endpoints = [];
  for (const file of fs.readdirSync(routesDir).filter(name => name.endsWith('.js'))) {
    const mount = mounts[file.replace(/\.js$/, '')];
    if (!mount) continue;
    const source = fs.readFileSync(path.join(routesDir, file), 'utf8');
    for (const match of source.matchAll(/router\.(get|post|put|patch|delete)\(['"]([^'"]*)['"]/gi)) {
      const suffix = match[2] === '/' ? '' : match[2];
      endpoints.push({ method: match[1].toUpperCase(), path: `${mount}${suffix}` });
    }
  }
  endpoints.push({ method: 'GET', path: '/api/monitoring/metrics' });
  return Array.from(new Map(endpoints.map(endpoint => [`${endpoint.method} ${endpoint.path}`, endpoint])).values());
}

module.exports = { createApiMetrics };