import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { loadConfig } from './config.js';
import { connect, disconnect } from './db.js';
import { healthRouter } from './routes/health.js';
import { playlistsRouter } from './routes/playlists.js';
import { epgSourcesRouter } from './routes/epgSources.js';
import { channelsRouter } from './routes/channels.js';
import { activeStreamsRouter } from './routes/activeStreams.js';
import { customPlaylistsRouter } from './routes/customPlaylists.js';
import { programsRouter } from './routes/programs.js';
import { activityRouter } from './routes/activity.js';
import { streamSessionsRouter } from './routes/streamSessions.js';
import { sourcesRouter } from './routes/sources.js';
import { bootInitSources } from './sources/seed.js';
async function main() {
    const config = loadConfig();
    try {
        await connect(config.mongoUri);
    }
    catch (err) {
        console.error('[startup] failed to connect to mongo:', err.message);
        process.exit(1);
    }
    // Ingest the established (Default) source playlists: guarantee each from its committed bundle
    // (idempotent), then kick a non-blocking live sync. Runs in both Docker variants via this single
    // boot path. A failure here must not prevent the API from serving.
    try {
        await bootInitSources();
    }
    catch (err) {
        console.error('[startup] source init error (continuing):', err.message);
    }
    const app = express();
    app.use(express.json());
    app.use('/api/health', healthRouter);
    app.use('/api/playlists', playlistsRouter);
    app.use('/api/epg-sources', epgSourcesRouter);
    app.use('/api/channels', channelsRouter);
    app.use('/api/active-streams', activeStreamsRouter);
    app.use('/api/custom-playlists', customPlaylistsRouter);
    app.use('/api/epg-programs', programsRouter);
    app.use('/api/activity', activityRouter);
    app.use('/api/stream-sessions', streamSessionsRouter);
    // Generic source API (manifest, stream proxy, status, sync/reset) — mounted at root since its
    // paths span /api/sources and /api/v1.
    app.use(sourcesRouter);
    const here = dirname(fileURLToPath(import.meta.url));
    const publicDir = resolve(here, '..', 'public');
    if (existsSync(publicDir)) {
        app.use(express.static(publicDir));
        app.get(/^\/(?!api\/).*/, (_req, res) => {
            res.sendFile(resolve(publicDir, 'index.html'));
        });
        console.info(`[http] serving SPA from ${publicDir}`);
    }
    app.use((err, _req, res, _next) => {
        console.error('[api] error:', err.message);
        res.status(500).json({ error: 'internal_error' });
    });
    const server = app.listen(config.port, () => {
        console.info(`[api] listening on :${config.port}`);
    });
    const shutdown = async (signal) => {
        console.info(`[shutdown] received ${signal}`);
        server.close();
        await disconnect();
        process.exit(0);
    };
    process.on('SIGTERM', () => void shutdown('SIGTERM'));
    process.on('SIGINT', () => void shutdown('SIGINT'));
}
main().catch((err) => {
    console.error('[startup] fatal:', err);
    process.exit(1);
});
//# sourceMappingURL=index.js.map