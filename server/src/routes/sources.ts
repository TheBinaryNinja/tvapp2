// Generic source RestAPI, ported from ../d-combine/server.mjs into TVApp2's Express stack. One router
// serves every source by iterating the registry — adding a source needs zero route changes.
//
//   GET  /api/sources               manifest (drives the SPA; one entry per registered source)
//   GET  /api/sources/:id/status    runtime provenance (dlhd: live mirror; null otherwise)
//   GET  /api/sources/:id/metrics   per-source proxy counters
//   POST /api/sources/:id/sync      live refresh → upsert channels + Playlist sync metadata
//   POST /api/sources/:id/reset     restore the committed bundle baseline
//   GET  /api/v1/:source/*          single stream proxy; the :source segment binds that source's
//                                   resolve+proxy behavior (createProxyHandler per adapter)
//
// Mounted at the app root (app.use(sourcesRouter)) because its paths span /api/sources, /api/v1, …

import { Router, type RequestHandler } from 'express';
import { SOURCES, getSource } from '../sources/registry.js';
import { createProxyHandler } from '../sources/core/proxyHandler.js';
import { createMetrics, snapshotOne, type Metrics } from '../sources/core/metrics.js';
import { syncLive, resetFromBundle } from '../sources/seed.js';

export const sourcesRouter = Router();

// Build one proxy handler (+ metrics bag) per source once, then dispatch by the :source segment.
const metricsById = new Map<string, Metrics>();
const proxyHandlers = new Map<string, RequestHandler>();
for (const adapter of SOURCES) {
  const m = createMetrics();
  metricsById.set(adapter.id, m);
  proxyHandlers.set(adapter.id, createProxyHandler(adapter, m) as RequestHandler);
}

// ── Manifest ────────────────────────────────────────────────────────────────
sourcesRouter.get('/api/sources', (_req, res) => {
  res.json(
    SOURCES.map((s) => ({
      id: s.id,
      label: s.label,
      grouping: s.grouping,
      sourceUrl: `/api/channels?source=${s.id}`, // normalized catalog over Mongo
      proxyPrefix: `/api/v1/${s.id}/`,
      statusUrl: s.status ? `/api/sources/${s.id}/status` : null,
    })),
  );
});

// ── Per-source runtime status (dlhd mirror provenance; null for sources without one) ──
sourcesRouter.get('/api/sources/:id/status', async (req, res, next) => {
  try {
    const adapter = getSource(req.params.id);
    if (!adapter) return res.status(404).json({ error: `Unknown source: ${req.params.id}` });
    const status = adapter.status ? await adapter.status() : null;
    res.json(status ?? null);
  } catch (err) {
    next(err);
  }
});

// ── Per-source proxy metrics ──────────────────────────────────────────────────
sourcesRouter.get('/api/sources/:id/metrics', (req, res) => {
  const m = metricsById.get(req.params.id);
  if (!m) return res.status(404).json({ error: `Unknown source: ${req.params.id}` });
  res.json(snapshotOne(m));
});

// ── Live sync (refresh channels + Playlist sync metadata from upstream) ───────
sourcesRouter.post('/api/sources/:id/sync', async (req, res, next) => {
  try {
    if (!getSource(req.params.id)) return res.status(404).json({ error: `Unknown source: ${req.params.id}` });
    res.json(await syncLive(req.params.id));
  } catch (err) {
    next(err);
  }
});

// ── Reset to the committed bundle baseline ────────────────────────────────────
sourcesRouter.post('/api/sources/:id/reset', async (req, res, next) => {
  try {
    if (!getSource(req.params.id)) return res.status(404).json({ error: `Unknown source: ${req.params.id}` });
    res.json(await resetFromBundle(req.params.id));
  } catch (err) {
    next(err);
  }
});

// ── Single stream proxy API ───────────────────────────────────────────────────
sourcesRouter.get('/api/v1/:source/*', (req, res) => {
  const handler = proxyHandlers.get(req.params.source);
  if (!handler) {
    return res.status(404).type('text/plain').send(`Unknown source: ${req.params.source}`);
  }
  return handler(req, res, () => undefined);
});
