<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import Icon from './Icon.vue';
import Btn from './Btn.vue';
import Pill from './Pill.vue';
import SearchInput from './SearchInput.vue';
import Segmented from './Segmented.vue';
import { CHANNELS } from '../data';

const emit = defineEmits<{ (e: 'close'): void }>();

const LOG_SOURCES = ['sync', 'epg', 'stream', 'match', 'api', 'core'];
const LOG_LEVELS = [
  { v: 'info', weight: 60, color: 'var(--text-2)' },
  { v: 'ok', weight: 15, color: 'var(--good)' },
  { v: 'warn', weight: 18, color: 'var(--warn)' },
  { v: 'error', weight: 4, color: 'var(--bad)' },
  { v: 'debug', weight: 3, color: 'var(--text-3)' },
];
const LOG_TEMPLATES: [string, string, string][] = [
  ['sync', 'info', 'Refreshing playlist {pl}'],
  ['sync', 'ok', 'Playlist {pl} synced in {ms}ms · {n} channels, +{added} −{removed}'],
  ['sync', 'warn', 'Playlist {pl} returned 3 channel(s) with 503 — retry in 30s'],
  ['epg', 'info', 'Fetching EPG source {epg}'],
  ['epg', 'ok', 'Indexed {programs} programs from {epg} in {ms}ms'],
  ['epg', 'debug', 'Parsed <programme> nodes: {programs}'],
  ['stream', 'info', 'Probing upstream {url}'],
  ['stream', 'ok', 'Stream {ch} healthy · {bitrate} Mbps, latency {lat}s'],
  ['stream', 'warn', 'Stream {ch} dropped {n} frames in last 60s'],
  ['stream', 'error', 'Stream {ch} upstream HTTP 503 — pausing relay'],
  ['match', 'info', 'Auto-matching {n} channels against EPG IDs'],
  ['match', 'ok', 'Mapped {ch} → {tvg}'],
  ['match', 'warn', 'Could not auto-match {ch} (no candidate over 0.8 confidence)'],
  ['api', 'info', 'GET /v1/playlists/{pl} 200 · {ms}ms'],
  ['api', 'info', 'GET /v1/epg/{epg}/programs 200 · {ms}ms'],
  ['api', 'warn', 'GET /v1/streams 429 · rate limit'],
  ['core', 'info', 'Cache warm: {n} entries, {kb}KB'],
  ['core', 'debug', 'GC reclaimed {kb}KB'],
];

interface Log { ts: Date; id: string; source: string; level: string; text: string }

function genLog(seed: number): Omit<Log, 'ts' | 'id'> {
  const tpl = LOG_TEMPLATES[seed % LOG_TEMPLATES.length];
  const pl = ['Default', 'IPTV-Pro Main', 'Free UK Bouquet', 'Archive (legacy)'][seed % 4];
  const epg = ['Default', 'XMLTV UK Guide', 'iptv-org world EPG'][seed % 3];
  const list = CHANNELS.value;
  const ch = list.length > 0
    ? list[seed % list.length]
    : { id: 'ch-0', tvg_name: 'BBC One HD', tvg_id: 'bbc.one.uk' };
  const tvg = ch.tvg_id || 'bbc.one.uk';
  const url = `http://edge-fra-04/live/${ch.id.replace('ch-', 'ch')}/index.m3u8`;
  const ms = (60 + (seed * 17) % 800);
  const bitrate = (3 + ((seed * 5) % 50) / 10).toFixed(1);
  const lat = (1.2 + ((seed * 7) % 30) / 10).toFixed(1);
  const n = ((seed * 11) % 12) + 1;
  const added = (seed % 7);
  const removed = ((seed >> 1) % 4);
  const programs = 1500 + (seed * 53) % 9000;
  const kb = 50 + (seed * 31) % 950;
  const text = tpl[2]
    .replace('{pl}', pl).replace('{epg}', epg).replace('{ch}', ch.tvg_name)
    .replace('{tvg}', tvg).replace('{url}', url)
    .replace('{ms}', String(ms)).replace('{bitrate}', bitrate).replace('{lat}', lat)
    .replace('{n}', String(n)).replace('{added}', String(added)).replace('{removed}', String(removed))
    .replace('{programs}', programs.toLocaleString()).replace('{kb}', String(kb));
  return { source: tpl[0], level: tpl[1], text };
}

const seed: Log[] = Array.from({ length: 36 }, (_, i) => {
  const g = genLog(i * 13 + 5);
  const t = new Date(Date.now() - (36 - i) * (1200 + i * 137));
  return { ts: t, id: 'seed-' + i, ...g };
});

const logs = ref<Log[]>(seed);
const paused = ref(false);
const filter = ref('all');
const src = ref('all');
const search = ref('');
const autoscroll = ref(true);
const body = ref<HTMLDivElement | null>(null);
let counter = 0;
let intId: number | null = null;

function startInterval() {
  if (intId) clearInterval(intId);
  intId = window.setInterval(() => {
    if (paused.value) return;
    counter++;
    const nl: Log = { ...genLog(Date.now() + counter), ts: new Date(), id: 'live-' + counter };
    const next = [...logs.value, nl];
    logs.value = next.length > 400 ? next.slice(next.length - 400) : next;
  }, 700 + Math.random() * 900);
}

function onKey(e: KeyboardEvent) { if (e.key === 'Escape') emit('close'); }

onMounted(() => { startInterval(); window.addEventListener('keydown', onKey); });
onBeforeUnmount(() => { if (intId) clearInterval(intId); window.removeEventListener('keydown', onKey); });

watch(logs, async () => {
  if (autoscroll.value && body.value) {
    await nextTick();
    body.value.scrollTop = body.value.scrollHeight;
  }
});

const visible = computed(() => logs.value.filter((l) =>
  (filter.value === 'all' || filter.value === l.level || (filter.value === 'issues' && (l.level === 'warn' || l.level === 'error')))
  && (src.value === 'all' || l.source === src.value)
  && (search.value === '' || l.text.toLowerCase().includes(search.value.toLowerCase()))
));

const counts = computed(() => ({
  total: logs.value.length,
  warn: logs.value.filter((l) => l.level === 'warn').length,
  error: logs.value.filter((l) => l.level === 'error').length,
}));

function onScroll(e: Event) {
  const el = e.target as HTMLElement;
  const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
  if (atBottom !== autoscroll.value) autoscroll.value = atBottom;
}

function jumpToLive() {
  autoscroll.value = true;
  if (body.value) body.value.scrollTop = body.value.scrollHeight;
}

function fmtTime(ts: Date) {
  return ts.toLocaleTimeString('en-GB', { hour12: false }) + '.' + String(ts.getMilliseconds()).padStart(3, '0');
}
function levelColor(l: string) { return LOG_LEVELS.find((x) => x.v === l)?.color || 'var(--text-2)'; }
</script>

<template>
  <div class="logs-drawer-wrap">
    <div class="glass-bg logs-drawer-backdrop" @click="emit('close')" />
    <div class="glass logs-drawer">
      <div class="logs-hd">
        <div class="row" style="gap: 8px;">
          <Icon name="file" :size="15" />
          <span style="font-weight: 600; font-size: 14px;">Realtime logs</span>
          <span v-if="!paused" class="live-pill"
                style="background: oklch(0.78 0.16 150 / 0.18); color: var(--good); border-color: oklch(0.78 0.16 150 / 0.4);">
            <span class="dot" style="background: var(--good); box-shadow: 0 0 8px var(--good);" />STREAMING
          </span>
          <Pill v-if="paused" tone="warn"><Icon name="pause" :size="11" />paused</Pill>
          <span class="muted mono" style="font-size: 11px; margin-left: 6px;">
            {{ counts.total }} lines · {{ counts.warn }} warn · {{ counts.error }} err
          </span>
        </div>
        <SearchInput :value="search" @change="(v) => search = v" placeholder="Filter logs" :width="220" />
        <div class="select" style="min-width: 110px;">
          <select v-model="src">
            <option value="all">All sources</option>
            <option v-for="s in LOG_SOURCES" :key="s" :value="s">{{ s }}</option>
          </select>
        </div>
        <Segmented :value="filter" @change="(v) => filter = v" :options="[
          { value: 'all', label: 'All' },
          { value: 'info', label: 'Info' },
          { value: 'issues', label: 'Issues' },
          { value: 'debug', label: 'Debug' },
        ]" />
        <span class="spacer" />
        <Btn variant="ghost" size="sm" :icon="paused ? 'play' : 'pause'" @click="paused = !paused">
          {{ paused ? 'Resume' : 'Pause' }}
        </Btn>
        <Btn variant="ghost" size="sm" icon="trash" @click="logs = []" title="Clear">Clear</Btn>
        <Btn variant="ghost" size="sm" icon="upload" title="Download log">Export</Btn>
        <Btn variant="ghost" size="sm" icon="x" @click="emit('close')" title="Close (Esc)" />
      </div>
      <div class="logs-body" ref="body" @scroll="onScroll">
        <div v-if="visible.length === 0" class="empty" style="padding: 40px;">
          <h3>No log lines match</h3>
          <p>Adjust the search or level filter.</p>
        </div>
        <template v-else>
          <div v-for="l in visible" :key="l.id" :class="`log-line log-${l.level}`">
            <span class="log-ts mono">{{ fmtTime(l.ts) }}</span>
            <span class="log-lvl" :style="{ color: levelColor(l.level) }">{{ l.level.toUpperCase() }}</span>
            <span class="log-src">{{ l.source }}</span>
            <span class="log-msg">{{ l.text }}</span>
          </div>
        </template>
      </div>
      <button v-if="!autoscroll" class="logs-scroll-btn" @click="jumpToLive">
        <Icon name="chevron-d" :size="12" />Jump to live
      </button>
    </div>
  </div>
</template>
