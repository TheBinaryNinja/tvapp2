// One Express handler factory per source, bound to GET /api/v1/:source/*. Ported from
// d-combine/lib/core/proxy-handler.mjs. Every per-source difference (resolve, headers, SSRF allow,
// dynamic-allow, segment relabel, artifact classification) is read off `adapter`; the control flow
// below is invariant.
//
//   /api/v1/<source>/<enc entry-or-stream URL>
//     · entry URL (dlhd watch.php / stream-N.php) → adapter.resolveStream() → fresh master, then proxy
//     · master/variant .m3u8                      → rewrite child URIs back through /api/v1/<source>/…
//     · segment                                   → pipe bytes (adapter may relabel the content-type)
import { Readable } from 'node:stream';
import { logger } from './logger.js';
import { fmtBytes } from './metrics.js';
import { looksLikePlaylist, rewritePlaylist } from './playlist.js';
function label(url) {
    try {
        const u = new URL(url);
        const file = u.pathname.split('/').pop() || '';
        return { host: u.hostname, short: file.slice(0, 8) || '/' };
    }
    catch {
        return { host: '?', short: '?' };
    }
}
export function createProxyHandler(adapter, metrics) {
    // Marker used to slice the raw (still-encoded) upstream URL out of req.originalUrl, independent of
    // where the router is mounted. Keeps embedded ?session=/?md5&expires through ONE decodeURIComponent.
    const MARKER = `/v1/${adapter.id}/`;
    const PREFIX = `/api/v1/${adapter.id}/`;
    const tag = `stream:${adapter.id}`;
    const { proxy } = adapter;
    return async function handler(req, res) {
        const startedAt = Date.now();
        const ms = () => `${Date.now() - startedAt}ms`;
        // 1. Extract + decode the single percent-encoded upstream URL segment.
        const idx = req.originalUrl.indexOf(MARKER);
        const rawPath = idx >= 0 ? req.originalUrl.slice(idx + MARKER.length) : '';
        let upstreamUrl;
        try {
            upstreamUrl = decodeURIComponent(rawPath);
        }
        catch {
            logger.warn(tag, `400 malformed encoded URL from ${req.ip}`);
            res.status(400).type('text/plain').send('Bad request: malformed encoded URL');
            return;
        }
        // 2. Resolve-then-proxy: an entry URL must become a fresh stream URL first
        //    (dulo/common: never — entry IS the master; dlhd: the 3-hop scrape).
        if (adapter.isEntryUrl(upstreamUrl)) {
            metrics.requests.total++;
            metrics.requests.master++;
            try {
                const resolved = await adapter.resolveStream(upstreamUrl);
                upstreamUrl = resolved.masterUrl;
            }
            catch (err) {
                metrics.requests.errors++;
                metrics.upstream.notLive++;
                metrics.lastError = err.message;
                logger.warn(tag, `resolve failed: ${err.message} (${ms()})`);
                res.status(502).type('text/plain').send(`Resolve failed: ${err.message}`);
                return;
            }
        }
        else {
            // 3. Direct hop (master/variant/segment from a rewritten playlist) → SSRF gate.
            if (!proxy.isAllowedUpstream(upstreamUrl)) {
                logger.warn(tag, `400 blocked upstream: ${String(upstreamUrl).slice(0, 80)}`);
                res.status(400).type('text/plain').send('Bad request: upstream host not in the allowlist');
                return;
            }
            metrics.requests.total++;
            metrics.requests[proxy.classifyArtifact(upstreamUrl)]++;
        }
        const type = proxy.classifyArtifact(upstreamUrl);
        const { host, short } = label(upstreamUrl);
        metrics.active++;
        res.on('close', () => {
            metrics.active--;
        });
        let upstream;
        try {
            upstream = await fetch(upstreamUrl, { headers: proxy.upstreamHeaders(upstreamUrl) });
        }
        catch (err) {
            metrics.upstream.failed++;
            metrics.requests.errors++;
            metrics.lastError = err.message;
            logger.error(tag, `${type} ${host} ${short} upstream fetch failed: ${err.message} (${ms()})`);
            res.status(502).type('text/plain').send(`Upstream fetch failed: ${err.message}`);
            return;
        }
        // Forward upstream errors verbatim. 404 = not transcoding right now; 403 = origin/referer gate.
        if (!upstream.ok) {
            metrics.requests.errors++;
            if (upstream.status === 404)
                metrics.upstream.notLive++;
            else if (upstream.status === 403)
                metrics.upstream.forbidden++;
            else
                metrics.upstream.failed++;
            const note = upstream.status === 404 ? ' (not live)' : upstream.status === 403 ? ' (gate)' : '';
            metrics.lastError = `HTTP ${upstream.status} ${host}/${short}`;
            logger.warn(tag, `${type} ${host} ${short} status=${upstream.status}${note} (${ms()})`);
            const detail = await upstream.text().catch(() => '');
            res
                .status(upstream.status)
                .type(upstream.headers.get('content-type') || 'text/plain')
                .send(detail || `Upstream HTTP ${upstream.status}`);
            return;
        }
        const contentType = upstream.headers.get('content-type') || '';
        // 4. Playlist → rewrite child URIs back through this source's proxy prefix
        //    (and let the adapter learn each child host: dlhd dynamic-allow; dulo/common no-op).
        if (looksLikePlaylist(upstreamUrl, contentType)) {
            const rewritten = rewritePlaylist(await upstream.text(), upstreamUrl, PREFIX, proxy.onPlaylistChildHost);
            const bytes = Buffer.byteLength(rewritten);
            metrics.upstream.ok++;
            metrics.bytesStreamed += bytes;
            metrics.lastStreamAt = Date.now();
            logger.ok(tag, `${type} ${host} ${short} status=200 ${fmtBytes(bytes)} (${ms()})`);
            res.set('Cache-Control', 'no-store'); // playlists + tokens are short-lived
            res.type('application/vnd.apple.mpegurl').send(rewritten);
            return;
        }
        // 5. Segment (or anything else) → stream the bytes through, content-type per the adapter.
        res.set('Content-Type', proxy.relabelSegmentContentType(upstreamUrl, contentType, type));
        res.set('Cache-Control', 'no-store');
        if (!upstream.body) {
            metrics.upstream.ok++;
            logger.ok(tag, `${type} ${host} ${short} status=200 0B (${ms()})`);
            res.end();
            return;
        }
        let bytes = 0;
        const body = Readable.fromWeb(upstream.body);
        body.on('data', (chunk) => {
            bytes += chunk.length;
        });
        res.on('finish', () => {
            metrics.upstream.ok++;
            metrics.bytesStreamed += bytes;
            metrics.lastStreamAt = Date.now();
            logger.ok(tag, `${type} ${host} ${short} status=200 ${fmtBytes(bytes)} (${ms()})`);
        });
        body.on('error', (err) => {
            metrics.upstream.failed++;
            metrics.lastError = err.message;
            logger.error(tag, `${type} ${host} ${short} stream error: ${err.message}`);
            res.destroy(err);
        });
        body.pipe(res);
    };
}
//# sourceMappingURL=proxyHandler.js.map