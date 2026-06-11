import { Router } from 'express';
import { Playlist } from '../models/Playlist.js';
import { PlaylistChannel } from '../models/PlaylistChannel.js';
import { Channel } from '../models/Channel.js';
import { SourceChannel, type SourceChannelDoc } from '../models/SourceChannel.js';
import { toUiChannel } from '../sources/translate.js';

export const playlistsRouter = Router();

// Channel count comes from SourceChannel for (Default) source playlists, else the legacy join table.
async function channelCountFor(doc: { id: string; source?: string | null }): Promise<number> {
  if (doc.source) return SourceChannel.countDocuments({ source: doc.source });
  return PlaylistChannel.countDocuments({ playlistId: doc.id });
}

playlistsRouter.get('/', async (_req, res, next) => {
  try {
    const docs = await Playlist.find({}, { _id: 0 }).lean();
    const [legacyCounts, sourceCounts] = await Promise.all([
      PlaylistChannel.aggregate<{ _id: string; count: number }>([
        { $group: { _id: '$playlistId', count: { $sum: 1 } } },
      ]),
      SourceChannel.aggregate<{ _id: string; count: number }>([
        { $group: { _id: '$source', count: { $sum: 1 } } },
      ]),
    ]);
    const legacyById = new Map(legacyCounts.map((c) => [c._id, c.count]));
    const sourceBySource = new Map(sourceCounts.map((c) => [c._id, c.count]));
    res.json(
      docs.map((d) => ({
        ...d,
        channels: d.source ? sourceBySource.get(d.source) ?? 0 : legacyById.get(d.id) ?? 0,
      })),
    );
  } catch (err) {
    next(err);
  }
});

playlistsRouter.get('/:id', async (req, res, next) => {
  try {
    const doc = await Playlist.findOne({ id: req.params.id }, { _id: 0 }).lean();
    if (!doc) return res.status(404).json({ error: 'not_found' });
    res.json({ ...doc, channels: await channelCountFor(doc) });
  } catch (err) {
    next(err);
  }
});

// List channels in a playlist. (Default) source playlists project the canonical SourceChannel docs
// through the translation layer (UI shape, nulls for unmapped fields); legacy playlists use the join.
playlistsRouter.get('/:id/channels', async (req, res, next) => {
  try {
    const playlist = await Playlist.findOne({ id: req.params.id }).lean();
    if (!playlist) return res.status(404).json({ error: 'not_found' });

    if (playlist.source) {
      const docs = await SourceChannel.find({ source: playlist.source })
        .sort({ groupKey: 1, name: 1 })
        .lean<SourceChannelDoc[]>();
      return res.json(docs.map((d, order) => ({ ...toUiChannel(d), order })));
    }

    const memberships = await PlaylistChannel.find({ playlistId: req.params.id }, { _id: 0 })
      .sort({ order: 1 })
      .lean();
    const channelIds = memberships.map((m) => m.channelId);
    const channels = await Channel.find({ id: { $in: channelIds } }, { _id: 0 }).lean();
    const byId = new Map(channels.map((c) => [c.id, c]));
    res.json(
      memberships
        .map((m) => {
          const ch = byId.get(m.channelId);
          return ch ? { ...ch, order: m.order } : null;
        })
        .filter(Boolean),
    );
  } catch (err) {
    next(err);
  }
});

// Add a channel to a (legacy) playlist (idempotent on the unique pair).
playlistsRouter.post('/:id/channels', async (req, res, next) => {
  try {
    const { channelId, order } = req.body ?? {};
    if (typeof channelId !== 'string' || typeof order !== 'number') {
      return res.status(400).json({ error: 'channelId (string) and order (number) required' });
    }
    const doc = await PlaylistChannel.findOneAndUpdate(
      { playlistId: req.params.id, channelId },
      { $set: { order } },
      { upsert: true, new: true, projection: { _id: 0 } },
    ).lean();
    res.status(201).json(doc);
  } catch (err) {
    next(err);
  }
});

// Remove a channel from a (legacy) playlist.
playlistsRouter.delete('/:id/channels/:channelId', async (req, res, next) => {
  try {
    const result = await PlaylistChannel.deleteOne({
      playlistId: req.params.id,
      channelId: req.params.channelId,
    });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'not_found' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
