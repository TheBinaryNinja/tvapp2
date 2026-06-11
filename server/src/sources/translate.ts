// Translation layer: project a canonical SourceChannel doc into the legacy UI Channel shape the Vue
// screens consume. Fields with no source equivalent are returned as explicit null (never fabricated)
// per the agreed schema-reconciliation decision; logoUrl + streamEntryUrl + isPlayable are added so
// the SPA can render real logos and play through the proxy. The frontend derives the proxy path from
// (source, streamEntryUrl); it is intentionally not stored.

import type { SourceChannelDoc } from '../models/SourceChannel.js';

export interface UiChannel {
  id: string; // "<source>:<sourceChannelId>"
  tvg_name: string;
  group: string;
  channel: number | null; // no source channel number
  tvg_id: string | null;
  state: 'active' | 'disabled';
  epg: 'matched' | 'unmatched' | null; // no EPG matching yet
  status: string | null; // unknown until a stream is probed
  res: string | null; // unknown until a stream is probed
  source: string;
  url: string; // streamEntryUrl (legacy field name)
  logoColor: string; // derived deterministic fallback
  initials: string; // derived from name
  logoUrl: string | null; // real logo when the source provides one (dlhd: null)
  streamEntryUrl: string; // explicit, for the player / proxyPath derivation
  isPlayable: boolean;
}

// Deterministic hue from a stable string → keeps a channel's fallback logo color stable across syncs.
function hueFromString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % 360;
}

function logoColorFor(id: string): string {
  return `oklch(0.5 0.16 ${hueFromString(id)})`;
}

function initialsFor(name: string): string {
  const ini = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
  return ini || '?';
}

export function toUiChannel(doc: SourceChannelDoc): UiChannel {
  return {
    id: doc._id,
    tvg_name: doc.name,
    group: doc.groupLabel,
    channel: null,
    tvg_id: null,
    state: doc.isPlayable ? 'active' : 'disabled',
    epg: null,
    status: null,
    res: null,
    source: doc.source,
    url: doc.streamEntryUrl,
    logoColor: logoColorFor(doc._id),
    initials: initialsFor(doc.name),
    logoUrl: doc.logoUrl,
    streamEntryUrl: doc.streamEntryUrl,
    isPlayable: doc.isPlayable,
  };
}
