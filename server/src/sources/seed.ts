// Seed / init / sync / reset for the established (Default) source playlists.
//
// "Both: bundle + live sync" — the committed <id>.source.json bundle is the GUARANTEED baseline used
// to initialize/reset MongoDB (offline-safe, reproducible); a live sync then refreshes channels and
// the Playlist's sync metadata from upstream when reachable. Boot init (ensureSeeded + background
// syncLive via bootInitSources) runs once per source in server/src/index.ts after the Mongo connect,
// covering both Docker variants without extra orchestration.

import { readFileSync } from 'node:fs';
import { Playlist } from '../models/Playlist.js';
import { SourceChannel, type SourceChannelDoc } from '../models/SourceChannel.js';
import { SOURCES, getSource } from './registry.js';
import { buildSource } from './core/buildSource.js';
import { bundleFile } from './paths.js';
import { logger } from './core/logger.js';
import type { SourceAdapter } from './types.js';

export interface IntegrityReport {
  id: string;
  playlistExists: boolean;
  channelCount: number;
  ok: boolean;
  issues: string[];
}

function readBundle(id: string): SourceChannelDoc[] {
  const arr = JSON.parse(readFileSync(bundleFile(id), 'utf8'));
  if (!Array.isArray(arr)) throw new Error(`bundle for "${id}" is not a JSON array`);
  return arr as SourceChannelDoc[];
}

function groupCount(docs: SourceChannelDoc[]): number {
  return new Set(docs.map((d) => d.groupKey)).size;
}

// Idempotent upsert by _id. Strips _id from $set (immutable; supplied by the filter on insert).
async function upsertChannels(docs: SourceChannelDoc[]): Promise<void> {
  if (!docs.length) return;
  const ops = docs.map((d) => {
    const { _id, ...rest } = d;
    return { updateOne: { filter: { _id }, update: { $set: rest }, upsert: true } };
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await SourceChannel.bulkWrite(ops as any[], { ordered: false });
}

async function upsertPlaylistRow(
  adapter: SourceAdapter,
  groups: number,
  opts: { lastSync: string; status: string },
): Promise<void> {
  const row = {
    id: adapter.id,
    source: adapter.id,
    name: `(Default) ${adapter.label}`,
    url: `source://${adapter.id}`,
    groups,
    lastSync: opts.lastSync,
    status: opts.status,
    auto: true,
    interval: 'Auto-updated',
    builtin: true,
  };
  await Playlist.updateOne({ id: adapter.id }, { $set: row }, { upsert: true });
}

export async function validateIntegrity(id: string): Promise<IntegrityReport> {
  const issues: string[] = [];
  const playlist = await Playlist.findOne({ id }).lean();
  const channelCount = await SourceChannel.countDocuments({ source: id });
  if (!playlist) issues.push('playlist row missing');
  if (channelCount === 0) issues.push('no channels');
  const sample = await SourceChannel.findOne({ source: id }).lean();
  if (sample) {
    for (const f of ['name', 'streamEntryUrl', 'groupKey'] as const) {
      if (!sample[f]) issues.push(`a channel is missing required field "${f}"`);
    }
  }
  return { id, playlistExists: !!playlist, channelCount, ok: issues.length === 0, issues };
}

/** Initialize a source from its committed bundle (idempotent upsert). */
export async function initFromBundle(id: string): Promise<IntegrityReport> {
  const adapter = getSource(id);
  if (!adapter) throw new Error(`unknown source: ${id}`);
  const docs = readBundle(id);
  await upsertChannels(docs);
  await upsertPlaylistRow(adapter, groupCount(docs), { lastSync: 'Ships with TVApp2', status: 'good' });
  logger.ok('seed', `[${id}] initialized ${docs.length} channels from bundle`);
  return validateIntegrity(id);
}

/** Restore a source EXACTLY to its committed bundle (drops stale channels, then reinserts). */
export async function resetFromBundle(id: string): Promise<IntegrityReport> {
  const adapter = getSource(id);
  if (!adapter) throw new Error(`unknown source: ${id}`);
  const docs = readBundle(id);
  await SourceChannel.deleteMany({ source: id });
  await SourceChannel.insertMany(docs, { ordered: false });
  await upsertPlaylistRow(adapter, groupCount(docs), { lastSync: 'Reset from bundle', status: 'good' });
  logger.ok('seed', `[${id}] reset ${docs.length} channels from bundle`);
  return validateIntegrity(id);
}

/** Live refresh: run the adapter's build pipeline and upsert; updates Playlist sync metadata. */
export async function syncLive(
  id: string,
): Promise<{ report: IntegrityReport; live: boolean; count: number }> {
  const adapter = getSource(id);
  if (!adapter) throw new Error(`unknown source: ${id}`);
  const result = await buildSource(adapter);
  await upsertChannels(result.docs);
  await upsertPlaylistRow(adapter, groupCount(result.docs), {
    lastSync: new Date().toISOString(),
    status: result.live ? 'good' : 'warn',
  });
  logger.ok(
    'seed',
    `[${id}] live sync upserted ${result.count} channels (${result.live ? 'live' : 'snapshot'})`,
  );
  const report = await validateIntegrity(id);
  return { report, live: result.live, count: result.count };
}

/** Boot guard: seed from bundle only if the (Default) playlist is missing or empty. */
export async function ensureSeeded(id: string): Promise<IntegrityReport> {
  const report = await validateIntegrity(id);
  if (report.playlistExists && report.channelCount > 0) {
    logger.info('seed', `[${id}] already seeded (${report.channelCount} channels) — skipping init`);
    return report;
  }
  logger.info('seed', `[${id}] not seeded — initializing from bundle`);
  return initFromBundle(id);
}

/**
 * Run once at startup for every registered source: guarantee the bundle baseline synchronously, then
 * kick a non-blocking live sync (Both mode). A failed/slow live sync must NEVER block or crash boot —
 * the bundle baseline already satisfies init.
 */
export async function bootInitSources(opts: { liveSync?: boolean } = {}): Promise<void> {
  const liveSync = opts.liveSync ?? true;
  for (const adapter of SOURCES) {
    try {
      const report = await ensureSeeded(adapter.id);
      if (!report.ok) {
        logger.warn('seed', `[${adapter.id}] integrity issues after init: ${report.issues.join(', ')}`);
      }
      if (liveSync) {
        void syncLive(adapter.id).catch((err) =>
          logger.warn(
            'seed',
            `[${adapter.id}] live sync failed (keeping bundle baseline): ${(err as Error).message}`,
          ),
        );
      }
    } catch (err) {
      logger.error('seed', `[${adapter.id}] init failed: ${(err as Error).message}`);
    }
  }
}
