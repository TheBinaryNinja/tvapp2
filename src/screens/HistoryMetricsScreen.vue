<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import Icon from '../components/Icon.vue';
import Btn from '../components/Btn.vue';
import Pill from '../components/Pill.vue';
import SearchInput from '../components/SearchInput.vue';
import Segmented from '../components/Segmented.vue';
import ChannelLogo from '../components/ChannelLogo.vue';
import { CHANNELS } from '../data';

interface Session {
  id: string; channelId: string; ip: string; region: string; client: string;
  startedAgo: number; duration: number;
  buffers: number; rebuffMs: number; dropped: number;
  avgBitrate: number; resolution: string; codec: string;
  score: number; health: 'good' | 'warn' | 'bad'; ended: boolean;
}

const VIEW_HISTORY = computed<Session[]>(() => {
  const channels = CHANNELS.value;
  if (channels.length === 0) return [];
  const regions = [
    { ip: '82.14.221.47', region: 'GB · London', client: 'VLC / Linux' },
    { ip: '192.81.45.12', region: 'DE · Frankfurt', client: 'Tivimate / Android TV' },
    { ip: '104.18.92.5', region: 'NL · Amsterdam', client: 'OTT Navigator / FireTV' },
    { ip: '176.58.103.9', region: 'GB · Manchester', client: 'Kodi 21' },
    { ip: '78.143.211.4', region: 'FR · Paris', client: 'IPTV Smarters / iOS' },
    { ip: '10.0.4.118', region: 'Local · LAN', client: 'ffmpeg / probe' },
    { ip: '165.225.18.4', region: 'US · Ashburn', client: 'Plex / NVIDIA Shield' },
    { ip: '203.0.113.91', region: 'IE · Dublin', client: 'VLC / macOS' },
    { ip: '51.15.88.142', region: 'FR · Paris', client: 'Jellyfin / FireTV' },
  ];
  let s = 99;
  const rng = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const sessions: Session[] = [];
  for (let i = 0; i < 28; i++) {
    const ch = channels[i % channels.length];
    const r = regions[Math.floor(rng() * regions.length)];
    const minutesAgo = Math.floor(rng() * 60 * 26);
    const durMin = 4 + Math.floor(rng() * 180);
    const buffers = Math.floor(rng() * 18);
    const dropped = Math.floor(rng() * 350);
    const avgBitrate = (3 + rng() * 6);
    const rebuffMs = buffers * (200 + Math.floor(rng() * 1800));
    const score = Math.max(0, Math.min(100, 100 - buffers * 4 - ((rebuffMs / 100) | 0)));
    const health = score < 55 ? 'bad' : score < 80 ? 'warn' : 'good';
    sessions.push({
      id: 's-' + i, channelId: ch.id, ip: r.ip, region: r.region, client: r.client,
      startedAgo: minutesAgo, duration: durMin, buffers, rebuffMs, dropped,
      avgBitrate: +avgBitrate.toFixed(1), resolution: ch.res, codec: 'H.264',
      score, health, ended: rng() > 0.25,
    });
  }
  return sessions.sort((a, b) => a.startedAgo - b.startedAgo);
});

function formatAgo(min: number) {
  if (min < 1) return 'now';
  if (min < 60) return min + 'm ago';
  const h = Math.floor(min / 60), m = min % 60;
  if (h < 24) return `${h}h ${m ? m + 'm' : ''}`.trim() + ' ago';
  const d = Math.floor(h / 24);
  return d + 'd ago';
}
function formatMs(ms: number) {
  if (ms < 1000) return ms + 'ms';
  const s = ms / 1000;
  if (s < 60) return s.toFixed(1) + 's';
  const m = Math.floor(s / 60), sec = Math.round(s % 60);
  return `${m}m ${sec}s`;
}
function formatDur(min: number) {
  if (min < 60) return min + 'm';
  const h = Math.floor(min / 60), m = min % 60;
  return `${h}h ${m ? m + 'm' : ''}`.trim();
}

const range = ref('24h');
const search = ref('');
const health = ref<'all' | 'good' | 'warn' | 'bad'>('all');
const selectedId = ref<string | null>(null);

const sessions = computed(() => VIEW_HISTORY.value.filter((s) => {
  const ch = CHANNELS.value.find((c) => c.id === s.channelId);
  if (!ch) return false;
  if (search.value && !ch.tvg_name.toLowerCase().includes(search.value.toLowerCase()) && !s.ip.includes(search.value)) return false;
  if (health.value !== 'all' && s.health !== health.value) return false;
  return true;
}));

const totalMinutes = computed(() => sessions.value.reduce((a, s) => a + s.duration, 0));
const totalBuffers = computed(() => sessions.value.reduce((a, s) => a + s.buffers, 0));
const totalRebuffMs = computed(() => sessions.value.reduce((a, s) => a + s.rebuffMs, 0));
const rebuffRatio = computed(() => totalMinutes.value ? (totalRebuffMs.value / 1000) / (totalMinutes.value * 60) * 100 : 0);
const uniqueIps = computed(() => new Set(sessions.value.map((s) => s.ip)).size);
const uniqueChannels = computed(() => new Set(sessions.value.map((s) => s.channelId)).size);
const avgScore = computed(() => sessions.value.length ? Math.round(sessions.value.reduce((a, s) => a + s.score, 0) / sessions.value.length) : 0);

const bufBins = computed(() => {
  const b = Array(24).fill(0);
  sessions.value.forEach((s) => {
    const hourAgo = Math.min(23, Math.floor(s.startedAgo / 60));
    b[23 - hourAgo] += s.buffers;
  });
  return b;
});

const problemChannels = computed(() => {
  const byChannel: Record<string, { ch: any; sessions: number; buffers: number; scores: number[] }> = {};
  sessions.value.forEach((s) => {
    const k = s.channelId;
    if (!byChannel[k]) byChannel[k] = { ch: CHANNELS.value.find((c) => c.id === k), sessions: 0, buffers: 0, scores: [] };
    byChannel[k].sessions++;
    byChannel[k].buffers += s.buffers;
    byChannel[k].scores.push(s.score);
  });
  return Object.values(byChannel)
    .filter((c) => c.ch)
    .map((c) => ({ ...c, avgScore: Math.round(c.scores.reduce((a, b) => a + b, 0) / c.scores.length) }))
    .sort((a, b) => a.avgScore - b.avgScore)
    .slice(0, 5);
});

const sel = computed(() => sessions.value.find((s) => s.id === selectedId.value) || sessions.value[0]);

function chOf(s: Session) { return CHANNELS.value.find((c) => c.id === s.channelId)!; }

const ready = ref(false);
onMounted(() => requestAnimationFrame(() => ready.value = true));

function barStyle(v: number, i: number) {
  const max = Math.max(1, ...bufBins.value);
  const ratio = v / max;
  const h = ratio * 100;
  const L = (0.88 - ratio * 0.33).toFixed(3);
  const C = (0.10 + ratio * 0.07).toFixed(3);
  const tone = `oklch(${L} ${C} 220)`;
  const total = 1500, perBar = 520;
  const stagger = (total - perBar) / Math.max(1, bufBins.value.length - 1);
  const delay = i * stagger;
  return {
    height: ready.value ? h + '%' : '0%',
    background: tone,
    boxShadow: v > 0 && ready.value ? `0 0 8px ${tone}` : 'none',
    transition: `height ${perBar}ms cubic-bezier(.2,.8,.2,1) ${delay}ms, box-shadow 240ms ease ${delay + perBar - 100}ms`,
  };
}

const events = computed(() => {
  if (!sel.value) return [];
  let s = sel.value.id.charCodeAt(2) + 9;
  const rng = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const list: { at: number; dur: number; cause: string }[] = [];
  for (let i = 0; i < sel.value.buffers; i++) {
    const at = Math.floor(rng() * sel.value.duration);
    const dur = 200 + Math.floor(rng() * 1600);
    const cause = ['upstream stall', 'client buffer underrun', 'bitrate dip', 'network jitter'][Math.floor(rng() * 4)];
    list.push({ at, dur, cause });
  }
  return list.sort((a, b) => a.at - b.at);
});

function metricColor(tone?: string) {
  return tone === 'good' ? 'var(--good)' : tone === 'warn' ? 'var(--warn)' : tone === 'bad' ? 'var(--bad)' : 'var(--text-0)';
}
</script>

<template>
  <div class="col" style="gap: 18px;">
    <div class="card" style="display: flex; align-items: center; gap: 12px; padding: 14px;">
      <Icon name="file" :size="18" />
      <div>
        <div style="font-weight: 600; font-size: 15px;">Streaming history &amp; metrics</div>
        <div class="muted" style="font-size: var(--fs-xs); margin-top: 2px;">
          Past viewer sessions across all channels — identify channels with frequent rebuffering or playback issues.
        </div>
      </div>
      <span class="spacer" />
      <Segmented :value="range" @change="(v) => range = v" :options="[
        { value: '1h', label: '1h' },
        { value: '24h', label: '24h' },
        { value: '7d', label: '7d' },
        { value: '30d', label: '30d' },
      ]" />
      <Btn variant="ghost" icon="upload">Export</Btn>
    </div>

    <div class="stats">
      <div class="card stat">
        <div class="lbl">Sessions</div>
        <div class="val">{{ sessions.length }}</div>
        <div class="delta">{{ uniqueChannels }} channels · {{ uniqueIps }} unique IPs</div>
      </div>
      <div class="card stat">
        <div class="lbl">Watch time</div>
        <div class="val">{{ formatDur(totalMinutes) }}</div>
        <div class="delta">avg {{ sessions.length ? Math.round(totalMinutes / sessions.length) : 0 }}m / session</div>
      </div>
      <div class="card stat">
        <div class="lbl">Rebuffer ratio</div>
        <div class="val" :style="rebuffRatio > 1.5 ? { color: 'var(--warn)' } : undefined">
          {{ rebuffRatio.toFixed(2) }}<span style="font-size: 14px; color: var(--text-2); font-weight: 500;">%</span>
        </div>
        <div :class="['delta', { bad: rebuffRatio > 1.5 }]">
          {{ totalBuffers }} buffer events · {{ formatMs(totalRebuffMs) }} total
        </div>
      </div>
      <div class="card stat">
        <div class="lbl">QoE score</div>
        <div class="val" :style="{ color: avgScore < 70 ? 'var(--warn)' : 'var(--good)' }">
          {{ avgScore }}<span style="font-size: 14px; color: var(--text-2); font-weight: 500;"> / 100</span>
        </div>
        <div class="delta">{{ sessions.filter((s) => s.health === 'bad').length }} problem sessions</div>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: 1.5fr 1fr; gap: 14px;">
      <div class="card">
        <div class="row" style="margin-bottom: 10px;">
          <div style="font-weight: 600; font-size: 14px;">Buffer events · last 24h</div>
          <span class="spacer" />
          <Pill tone="warn">{{ totalBuffers }} total</Pill>
          <Pill>{{ Math.max(...bufBins) }} peak / hour</Pill>
        </div>
        <div>
          <div class="buf-bars">
            <div v-for="(v, i) in bufBins" :key="i" class="buf-bar-wrap" :title="`${23 - i}h ago: ${v} buffer events`">
              <div class="buf-bar" :style="barStyle(v, i)" />
            </div>
          </div>
          <div class="row" style="justify-content: space-between; margin-top: 6px; font-size: 10px; color: var(--text-3);">
            <span class="mono">−24h</span><span class="mono">−18h</span><span class="mono">−12h</span><span class="mono">−6h</span><span class="mono">now</span>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="row" style="margin-bottom: 10px;">
          <div style="font-weight: 600; font-size: 14px;">Problem channels</div>
          <span class="spacer" />
          <span class="muted" style="font-size: var(--fs-xs);">by QoE score</span>
        </div>
        <div class="col" style="gap: 10px;">
          <div v-for="c in problemChannels" :key="c.ch.id" class="row" style="gap: 10px;">
            <ChannelLogo :ch="c.ch" />
            <div style="flex: 1; min-width: 0;">
              <div style="font-size: var(--fs-sm); font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{ c.ch.tvg_name }}</div>
              <div class="muted" style="font-size: var(--fs-xs);">{{ c.sessions }} sessions · {{ c.buffers }} buffers</div>
            </div>
            <div style="min-width: 50px; text-align: right;">
              <span class="mono" :style="{ fontWeight: 600, fontSize: '14px', color: c.avgScore < 60 ? 'var(--bad)' : c.avgScore < 80 ? 'var(--warn)' : 'var(--good)' }">{{ c.avgScore }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="hm-grid">
      <div class="card flush hm-list">
        <div class="toolbar">
          <SearchInput :value="search" @change="(v) => search = v" placeholder="Channel or IP" :width="200" />
          <span class="spacer" />
          <Segmented :value="health" @change="(v) => health = v as any" :options="[
            { value: 'all', label: 'All' },
            { value: 'good', label: 'Good' },
            { value: 'warn', label: 'Warn' },
            { value: 'bad', label: 'Bad' },
          ]" />
        </div>
        <table class="tbl">
          <thead>
            <tr>
              <th>Channel</th><th>IP / Region</th><th>Started</th>
              <th>Duration</th><th>Buffers</th><th>QoE</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in sessions" :key="s.id"
                :class="{ selected: selectedId === s.id }" @click="selectedId = s.id">
              <td>
                <div class="row" style="gap: 8px;">
                  <ChannelLogo :ch="chOf(s)" />
                  <div style="min-width: 0;">
                    <div style="font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 140px;">{{ chOf(s).tvg_name }}</div>
                    <div class="mono muted" style="font-size: 10px;">#{{ chOf(s).channel }}</div>
                  </div>
                </div>
              </td>
              <td>
                <div class="mono" style="font-size: 11px;">{{ s.ip }}</div>
                <div class="muted" style="font-size: 10px; margin-top: 2px;">{{ s.region }}</div>
              </td>
              <td class="muted mono">{{ formatAgo(s.startedAgo) }}</td>
              <td class="mono">
                {{ formatDur(s.duration) }}
                <Pill v-if="!s.ended" tone="cyan" style="margin-left: 6px;">live</Pill>
              </td>
              <td>
                <div class="row" style="gap: 4px;">
                  <span class="mono" :style="{ fontWeight: 600, color: s.buffers > 6 ? 'var(--warn)' : 'var(--text-1)' }">{{ s.buffers }}</span>
                  <span class="muted mono" style="font-size: 10px;">· {{ formatMs(s.rebuffMs) }}</span>
                </div>
              </td>
              <td>
                <div class="qoe-pill" :data-health="s.health">
                  <span class="dot" />{{ s.score }}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="card flush hm-detail">
        <template v-if="sel">
          <div class="card-hd" style="padding: 14px var(--pad-card);">
            <ChannelLogo :ch="chOf(sel)" />
            <div style="min-width: 0; flex: 1;">
              <div style="font-weight: 600; font-size: 14px;">{{ chOf(sel).tvg_name }}</div>
              <div class="mono muted" style="font-size: 11px; margin-top: 2px;">#{{ chOf(sel).channel }} · session {{ sel.id }}</div>
            </div>
            <div class="qoe-pill" :data-health="sel.health" style="font-size: 13px; padding: 4px 12px;">
              <span class="dot" />QoE {{ sel.score }}
            </div>
          </div>

          <div style="padding: 16px var(--pad-card) 0; display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
            <div class="metric" style="background: var(--bg-2);">
              <div class="lbl">Duration</div>
              <div class="val" :style="{ fontSize: '17px' }">{{ formatDur(sel.duration) }}</div>
              <div class="sub">started {{ formatAgo(sel.startedAgo) }}</div>
            </div>
            <div class="metric" style="background: var(--bg-2);">
              <div class="lbl">Avg bitrate</div>
              <div class="val" :style="{ fontSize: '17px' }">{{ sel.avgBitrate }} Mbps</div>
              <div class="sub">{{ sel.resolution }} · {{ sel.codec }}</div>
            </div>
            <div class="metric" style="background: var(--bg-2);">
              <div class="lbl">Rebuffer</div>
              <div class="val" :style="{ color: metricColor(sel.buffers > 6 ? 'warn' : 'good'), fontSize: '17px' }">{{ formatMs(sel.rebuffMs) }}</div>
              <div class="sub">{{ sel.buffers }} events · {{ sel.dropped }} drops</div>
            </div>
          </div>

          <div style="padding: 16px var(--pad-card);">
            <div class="kv-list" style="grid-template-columns: 120px 1fr;">
              <div class="k">Client IP</div><div class="v mono">{{ sel.ip }}</div>
              <div class="k">Region</div><div class="v">{{ sel.region }}</div>
              <div class="k">Player</div><div class="v">{{ sel.client }}</div>
              <div class="k">Resolution</div><div class="v mono">{{ sel.resolution }} · {{ sel.codec }}</div>
              <div class="k">Channel #</div><div class="v mono">#{{ chOf(sel).channel }}</div>
              <div class="k">Group</div><div class="v">{{ chOf(sel).group }}</div>
              <div class="k">TVG-ID</div>
              <div class="v mono">
                <template v-if="chOf(sel).tvg_id">{{ chOf(sel).tvg_id }}</template>
                <span v-else style="color: var(--text-3);">—</span>
              </div>
              <div class="k">Source</div>
              <div class="v"><Pill tone="cyan">{{ chOf(sel).source }}</Pill></div>
            </div>
          </div>

          <div style="padding: 0 var(--pad-card) 16px;">
            <div class="row" style="margin-bottom: 8px;">
              <div style="font-size: var(--fs-sm); font-weight: 600;">Buffering timeline</div>
              <span class="spacer" />
              <span class="muted mono" style="font-size: 11px;">0 → {{ formatDur(sel.duration) }}</span>
            </div>
            <div class="buf-timeline">
              <div v-if="events.length === 0" class="buf-timeline-empty">
                <Icon name="check" :size="12" />
                No buffer events
              </div>
              <template v-else>
                <div v-for="(e, i) in events" :key="i" class="buf-event"
                     :style="{ left: (e.at / sel.duration * 100) + '%', width: Math.max(2, (e.dur / 60000 / sel.duration * 100)) + '%' }"
                     :title="`${formatMs(e.dur)} stall at ${e.at}m — ${e.cause}`" />
              </template>
            </div>
            <div v-if="events.length > 0" class="col" style="gap: 6px; margin-top: 12px;">
              <div v-for="(e, i) in events.slice(0, 6)" :key="i" class="row" style="font-size: var(--fs-xs); color: var(--text-2);">
                <span class="mono" style="width: 50px; color: var(--text-1);">+{{ e.at }}m</span>
                <span class="mono" :style="{ width: '70px', color: e.dur > 1000 ? 'var(--warn)' : 'var(--text-1)' }">{{ formatMs(e.dur) }}</span>
                <span>{{ e.cause }}</span>
              </div>
              <span v-if="events.length > 6" class="muted mono" style="font-size: 11px;">+ {{ events.length - 6 }} more</span>
            </div>
          </div>
        </template>
        <div v-else class="empty"><h3>No session</h3></div>
      </div>
    </div>
  </div>
</template>
