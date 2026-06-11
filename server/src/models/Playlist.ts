import { Schema, model } from 'mongoose';

const PlaylistSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    url: { type: String, required: true },
    groups: { type: Number, required: true },
    lastSync: { type: String, required: true },
    status: { type: String, required: true },
    auto: { type: Boolean, required: true },
    interval: { type: String, required: true },
    builtin: { type: Boolean },
    // Set for the established (Default) source playlists (dulo/common/dlhd). When present, the
    // playlist's channels live in the SourceChannel collection (queried by this `source`) instead
    // of the legacy PlaylistChannel join. Unset for legacy/mock playlists.
    source: { type: String, default: null, index: true },
  },
  { versionKey: false },
);

export const Playlist = model('Playlist', PlaylistSchema);
