// Reactive store for TVApp2.
//
// Top-level data (PLAYLISTS, CHANNELS, ACTIVE_STREAMS, etc.) is fetched from
// the API at app startup via bootstrapData(). Consumers in <script setup>
// read them as Vue refs (e.g. CHANNELS.value) or via the reactive
// EPG_PROGRAMS map.
//
// Static UI constants (GROUPS, EPG_HOURS) and pure client-side helpers
// (streamSparkline) live here too — they're not mock data, they're config
// the SPA owns.

import { ref, reactive, type Ref } from 'vue';

// ──────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────

export interface Playlist {
  id: string; name: string; url: string; channels: number; groups: number;
  lastSync: string; status: string; auto: boolean; interval: string; builtin?: boolean;
  // Set for the established (Default) source playlists (dulo/common/dlhd); drives live sync.
  source?: string | null;
}
export interface EpgSource {
  id: string; name: string; url: string; channels: number; programs: number;
  lastSync: string; status: string; auto: boolean; interval: string; builtin?: boolean;
}
export interface Channel {
  id: string; tvg_name: string; group: string;
  // Nullable: the established (Default) source playlists have no source equivalent for these — the
  // server's translation layer returns explicit null (legacy mock channels always have values).
  channel: number | null; tvg_id: string | null;
  state: 'active' | 'disabled';
  epg: 'matched' | 'unmatched' | null; status: string | null; res: string | null;
  source: string;
  url: string;
  logoColor: string; initials: string;
  // Additive — present on (Default) source-playlist channels (from the d-combine normalized schema).
  logoUrl?: string | null;
  streamEntryUrl?: string | null;
  isPlayable?: boolean;
}
export interface Program { start: number; end: number; title: string; cat: string }
export interface ActiveStream {
  id: string; channelId: string; status: string;
  uptime: string; uptimeMin: number;
  viewers: number; peakViewers: number;
  bitrate: number; targetBitrate: number;
  codec: string; audio: string; container: string;
  resolution: string; fps: number;
  sourceUrl: string; sourceHost: string;
  droppedFrames: number; droppedRatio: number;
  latency: number; bandwidth: number;
}
export interface CustomPlaylist { id: string; name: string; slug: string; channels: number; updated: string }
export interface StreamSession { ip: string; region: string; client: string; joined: string; bitrate: string }
export interface Activity { when: string; icon: string; html: string }

// ──────────────────────────────────────────────────────────────────────
// Reactive stores — populated by bootstrapData()
// ──────────────────────────────────────────────────────────────────────

export const PLAYLISTS: Ref<Playlist[]> = ref([]);
export const EPG_SOURCES: Ref<EpgSource[]> = ref([]);
export const CHANNELS: Ref<Channel[]> = ref([]);
export const ACTIVE_STREAMS: Ref<ActiveStream[]> = ref([]);
export const CUSTOM_PLAYLISTS: Ref<CustomPlaylist[]> = ref([]);
export const STREAM_SESSIONS: Ref<StreamSession[]> = ref([]);
export const ACTIVITY: Ref<Activity[]> = ref([]);
export const EPG_PROGRAMS: Record<string, Program[]> = reactive({});

// ──────────────────────────────────────────────────────────────────────
// Static UI constants
// ──────────────────────────────────────────────────────────────────────

export const GROUPS = ['News', 'Sport', 'Entertainment', 'Movies', 'Kids', 'Music', 'Documentary', 'Lifestyle'];
export const EPG_HOURS = Array.from({ length: 25 }, (_, i) => i);

// ──────────────────────────────────────────────────────────────────────
// Bootstrap — fetches every collection in parallel
// ──────────────────────────────────────────────────────────────────────

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

let bootstrapPromise: Promise<void> | null = null;

export function bootstrapData(): Promise<void> {
  if (bootstrapPromise) return bootstrapPromise;
  bootstrapPromise = (async () => {
    const [
      playlists, epgSources, channels, activeStreams,
      customPlaylists, streamSessions, activity, programs,
    ] = await Promise.all([
      getJson<Playlist[]>('/api/playlists'),
      getJson<EpgSource[]>('/api/epg-sources'),
      getJson<Channel[]>('/api/channels'),
      getJson<ActiveStream[]>('/api/active-streams'),
      getJson<CustomPlaylist[]>('/api/custom-playlists'),
      getJson<StreamSession[]>('/api/stream-sessions'),
      getJson<Activity[]>('/api/activity'),
      getJson<Record<string, Program[]>>('/api/epg-programs'),
    ]);
    PLAYLISTS.value = playlists;
    EPG_SOURCES.value = epgSources;
    CHANNELS.value = channels;
    ACTIVE_STREAMS.value = activeStreams;
    CUSTOM_PLAYLISTS.value = customPlaylists;
    STREAM_SESSIONS.value = streamSessions;
    ACTIVITY.value = activity;
    for (const k of Object.keys(EPG_PROGRAMS)) delete EPG_PROGRAMS[k];
    Object.assign(EPG_PROGRAMS, programs);
  })().catch((err) => {
    bootstrapPromise = null;
    throw err;
  });
  return bootstrapPromise;
}

// ──────────────────────────────────────────────────────────────────────
// Pure helper — random sparkline series for an active stream
// ──────────────────────────────────────────────────────────────────────

// Proxy path for a source-playlist channel: /api/v1/<source>/<enc streamEntryUrl>. Derived here (not
// stored) so a proxy-mount / dlhd mirror change needs no data rewrite. Null for legacy channels.
export function proxyPath(ch: Channel): string | null {
  if (!ch.streamEntryUrl || !ch.source) return null;
  return `/api/v1/${ch.source}/${encodeURIComponent(ch.streamEntryUrl)}`;
}

export function streamSparkline(seed: number, target: number): number[] {
  let s = seed;
  const rng = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const points: number[] = [];
  for (let i = 0; i < 60; i++) {
    const drift = (rng() - 0.5) * 0.6;
    points.push(Math.max(0.2, target + drift));
  }
  return points;
}
