import { Schema, model } from 'mongoose';

// SourceChannel — the canonical normalized channel document, adopted verbatim from d-combine's
// shared `channels` collection (see ../d-combine/docs/combine-architecture.md). One doc per channel
// across every (Default) source playlist, with a deterministic string `_id` ("<source>:<id>") so
// re-imports/syncs upsert idempotently. The Vue UI never reads this shape directly — the sources
// router projects it through translate.ts (toUiChannel) into the legacy Channel shape on read.

export interface SourceChannelDoc {
  _id: string; // "<source>:<sourceChannelId>" — deterministic, collision-proof
  source: string; // discriminator / UI heading / proxy prefix
  sourceChannelId: string; // original upstream id as string (UUID, "51", SHA1…)
  name: string;
  category: string | null; // dulo: semantic; dlhd: null
  groupKey: string; // UI bucket key (dulo: category; dlhd: first letter)
  groupLabel: string;
  logoUrl: string | null; // dulo/common: logo; dlhd: null
  streamEntryUrl: string; // URL handed to the proxy (master .m3u8 or dlhd watch.php entry)
  isPlayable: boolean; // false for malformed source URLs
  sourceCreatedAt: string | null; // dulo timestamps; dlhd/common null
  sourceUpdatedAt: string | null;
  ingestedAt: string; // when buildSource/seed wrote it
}

const SourceChannelSchema = new Schema<SourceChannelDoc>(
  {
    _id: { type: String, required: true },
    source: { type: String, required: true },
    sourceChannelId: { type: String, required: true },
    name: { type: String, required: true },
    category: { type: String, default: null },
    groupKey: { type: String, required: true },
    groupLabel: { type: String, required: true },
    logoUrl: { type: String, default: null },
    streamEntryUrl: { type: String, required: true },
    isPlayable: { type: Boolean, required: true },
    sourceCreatedAt: { type: String, default: null },
    sourceUpdatedAt: { type: String, default: null },
    ingestedAt: { type: String, required: true },
  },
  { versionKey: false },
);

// Covers the per-source grouped/ordered listing query (source → groupKey → name).
SourceChannelSchema.index({ source: 1, groupKey: 1, name: 1 });
// Dead-channel / playable filtering per source.
SourceChannelSchema.index({ source: 1, isPlayable: 1 });

export const SourceChannel = model<SourceChannelDoc>('SourceChannel', SourceChannelSchema);
