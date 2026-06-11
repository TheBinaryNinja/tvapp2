// In-memory counters, one set PER SOURCE. Surfaced via /api/sources/:id/status and /health-style
// reporting. Ported from d-combine/lib/core/metrics.mjs.

export interface Metrics {
  startedAt: number;
  requests: {
    total: number;
    master: number;
    variant: number;
    segment: number;
    other: number;
    errors: number;
  };
  upstream: { ok: number; notLive: number; forbidden: number; failed: number };
  bytesStreamed: number;
  active: number; // proxy requests currently in flight
  lastStreamAt: number | null;
  lastError: string | null;
}

export function createMetrics(): Metrics {
  return {
    startedAt: Date.now(),
    requests: { total: 0, master: 0, variant: 0, segment: 0, other: 0, errors: 0 },
    upstream: { ok: 0, notLive: 0, forbidden: 0, failed: 0 }, // 404=notLive, 403=forbidden(gate)
    bytesStreamed: 0,
    active: 0,
    lastStreamAt: null,
    lastError: null,
  };
}

/** Human-readable byte size. */
export function fmtBytes(n: number): string {
  if (n < 1024) return `${n}B`;
  if (n < 1048576) return `${(n / 1024).toFixed(1)}KB`;
  return `${(n / 1048576).toFixed(2)}MB`;
}

/** JSON snapshot of one source's metrics. */
export function snapshotOne(m: Metrics) {
  return {
    uptimeSeconds: Math.round((Date.now() - m.startedAt) / 1000),
    active: m.active,
    requests: { ...m.requests },
    upstream: { ...m.upstream },
    bytesStreamed: m.bytesStreamed,
    mbStreamed: +(m.bytesStreamed / 1048576).toFixed(2),
    lastStreamAt: m.lastStreamAt ? new Date(m.lastStreamAt).toISOString() : null,
    lastError: m.lastError,
  };
}
