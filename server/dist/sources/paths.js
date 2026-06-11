import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
// This module lives at <root>/sources/paths.{ts,js} in BOTH dev (server/src) and prod (server/dist).
// The bundled seed assets sit at server/seed-data/sources — i.e. two levels up from here, then
// seed-data/sources. The Docker runtime stage copies server/seed-data → /app/seed-data alongside
// /app/dist, so this same relative resolution holds in the container.
const here = dirname(fileURLToPath(import.meta.url));
/** Directory holding the committed <id>.source.json baselines + <id>.snapshot.json fallbacks. */
export const SEED_SOURCES_DIR = resolve(here, '..', '..', 'seed-data', 'sources');
export function bundleFile(sourceId) {
    return resolve(SEED_SOURCES_DIR, `${sourceId}.source.json`);
}
export function snapshotFile(sourceId) {
    return resolve(SEED_SOURCES_DIR, `${sourceId}.snapshot.json`);
}
//# sourceMappingURL=paths.js.map