// The source-adapter contract, ported from d-combine (sources/<id>/adapter.mjs). One object per
// source captures ONLY what differs between sources; the generic core (buildSource, proxyHandler,
// playlist) consumes any adapter without per-source branching. Adding a source = one adapter +
// one registry line.

import type { SourceChannelDoc } from '../models/SourceChannel.js';

export interface SourceMeta {
  live?: boolean;
  [k: string]: unknown;
}

export interface RawListing {
  // upstream-shaped records (JSON API rows, scraped cards, …) — the adapter boundary is untyped.
  raw: any[];
  meta?: SourceMeta;
}

export type ArtifactType = 'master' | 'variant' | 'segment' | 'other';

export interface SourceGrouping {
  by: string;
  groupOrder: string;
  channelOrder: string;
}

export interface SourceProxy {
  /** Headers to inject on every upstream hop (dulo: Origin; dlhd: Referer+UA). */
  upstreamHeaders(url: string): Record<string, string>;
  /** SSRF gate for direct hops (dulo: *.dulo.tv; dlhd: dynamic Set; common: block private IPs). */
  isAllowedUpstream(url: string): boolean;
  /** Per-rewritten-child hook (dlhd: dynamic-allow each host; dulo/common: null). */
  onPlaylistChildHost: ((host: string) => void) | null;
  /** dulo/common: pass-through; dlhd: relabel disguised image/pdf TS as video/mp2t. */
  relabelSegmentContentType(url: string, contentType: string, type?: ArtifactType): string;
  classifyArtifact(url: string): ArtifactType;
}

export interface SourceAdapter {
  id: string;
  label: string;
  /** Fetch/scrape raw listings → { raw, meta }; falls back to a bundled snapshot when offline. */
  listChannels(): Promise<RawListing>;
  /** Map one raw record → one normalized document, or null to drop it. */
  normalize(raw: any, ctx: { ingestedAt: string }): SourceChannelDoc | null;
  /** Serializable UI descriptor read by the SPA over /api/sources. */
  grouping: SourceGrouping;
  /** Optional runtime provenance (dlhd: active mirror + probes). Absent → manifest statusUrl null. */
  status?: () => unknown | Promise<unknown>;
  /** Does this URL need server-side resolution before proxying? (dulo/common: false; dlhd: watch.php) */
  isEntryUrl(url: string): boolean;
  /** Entry URL → { masterUrl }. dulo/common: identity; dlhd: 3-hop scrape. */
  resolveStream(entryUrl: string): Promise<{ masterUrl: string }>;
  proxy: SourceProxy;
}
