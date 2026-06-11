// dulo.tv source adapter (Phase 1). Ported from ../d-combine/sources/dulo/adapter.mjs.
//
// dulo.tv exposes a JSON catalog API and each channel's `source_url` IS a token-free HLS master
// playlist. The memfs hosts gate playback behind an Origin allowlist, so the proxy injects
// `Origin: https://dulo.tv` on every hop. No server-side resolve is needed.
import { readFileSync } from 'node:fs';
import { snapshotFile } from '../paths.js';
const SNAPSHOT = snapshotFile('dulo');
const DULO_ORIGIN = 'https://dulo.tv';
const DULO_API = process.env.DULO_API || 'https://dulo.tv/api/live-tv/channels';
function isHttpUrl(url) {
    if (typeof url !== 'string')
        return false;
    try {
        const u = new URL(url);
        return u.protocol === 'https:' || u.protocol === 'http:';
    }
    catch {
        return false;
    }
}
function toIso(ts) {
    if (!ts || typeof ts !== 'string')
        return null;
    const d = new Date(ts);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
const duloAdapter = {
    id: 'dulo',
    label: 'dulo',
    // Prefer the live catalog API; fall back to the captured snapshot when offline / region-blocked.
    async listChannels() {
        try {
            const res = await fetch(DULO_API, { headers: { Origin: DULO_ORIGIN } });
            if (!res.ok)
                throw new Error(`HTTP ${res.status}`);
            const body = (await res.json());
            const raw = body.channels || [];
            if (!raw.length)
                throw new Error('empty channel list');
            return { raw, meta: { endpoint: DULO_API, live: true, fetchedAt: new Date().toISOString() } };
        }
        catch (err) {
            const snap = JSON.parse(readFileSync(SNAPSHOT, 'utf8'));
            return {
                raw: snap.channels || [],
                meta: {
                    endpoint: DULO_API,
                    live: false,
                    fallback: 'dulo.snapshot.json',
                    reason: err.message,
                    fetchedAt: new Date().toISOString(),
                },
            };
        }
    },
    normalize(raw, { ingestedAt }) {
        const sourceChannelId = String(raw.id);
        const category = raw.category || null;
        return {
            _id: `dulo:${sourceChannelId}`,
            source: 'dulo',
            sourceChannelId,
            name: raw.name,
            category, // dulo has real semantic categories
            groupKey: category || 'uncategorized',
            groupLabel: category || 'uncategorized',
            logoUrl: raw.logo_url || null,
            streamEntryUrl: raw.source_url, // token-free master .m3u8 (handed straight to the proxy)
            isPlayable: isHttpUrl(raw.source_url),
            sourceCreatedAt: toIso(raw.created_at),
            sourceUpdatedAt: toIso(raw.updated_at),
            ingestedAt,
        };
    },
    grouping: { by: 'groupKey', groupOrder: 'alpha', channelOrder: 'name' },
    isEntryUrl() {
        return false; // dulo source_url is already the master — nothing to resolve
    },
    async resolveStream(entryUrl) {
        return { masterUrl: entryUrl }; // identity no-op
    },
    proxy: {
        upstreamHeaders() {
            return { Origin: DULO_ORIGIN }; // the memfs Origin allowlist gate
        },
        isAllowedUpstream(url) {
            try {
                const u = new URL(url);
                return (u.protocol === 'https:' || u.protocol === 'http:') && u.hostname.endsWith('.dulo.tv');
            }
            catch {
                return false;
            }
        },
        onPlaylistChildHost: null, // static allowlist — nothing to learn at runtime
        relabelSegmentContentType(_url, contentType) {
            return contentType || 'application/octet-stream'; // plain TS — pass the upstream type through
        },
        classifyArtifact(url) {
            try {
                const p = new URL(url).pathname.toLowerCase();
                if (p.endsWith('.ts'))
                    return 'segment';
                if (p.endsWith('.m3u8'))
                    return p.includes('_output_') ? 'variant' : 'master';
                return 'other';
            }
            catch {
                return 'other';
            }
        },
    },
};
export default duloAdapter;
//# sourceMappingURL=dulo.js.map