<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import Icon from '../components/Icon.vue';
import Btn from '../components/Btn.vue';
import Pill from '../components/Pill.vue';
import StatusDot from '../components/StatusDot.vue';
import SearchInput from '../components/SearchInput.vue';
import Segmented from '../components/Segmented.vue';
import ChannelLogo from '../components/ChannelLogo.vue';
import Sparkline from '../components/Sparkline.vue';
import { ACTIVE_STREAMS, CHANNELS, STREAM_SESSIONS, EPG_PROGRAMS, streamSparkline, type ActiveStream, type Program } from '../data';

const liveStreams = computed(() => ACTIVE_STREAMS.value);
const selId = ref<string | null>(null);
const filter = ref<'all' | 'live' | 'issues'>('all');
const viewing = ref<string | null>(null);
const playing = ref(true);
const muted = ref(false);

const filtered = computed(() => liveStreams.value.filter((s) =>
  filter.value === 'all' ? true :
  filter.value === 'issues' ? s.status !== 'good' :
  filter.value === 'live' ? s.status === 'good' : true
));
const sel = computed(() =>
  liveStreams.value.find((s) => s.id === selId.value) || liveStreams.value[0],
);
const totals = computed(() => ({
  streams: liveStreams.value.filter((s) => s.status !== 'bad').length,
  viewers: liveStreams.value.reduce((a, s) => a + s.viewers, 0),
  bandwidth: liveStreams.value.reduce((a, s) => a + s.bandwidth, 0),
  issues: liveStreams.value.filter((s) => s.status !== 'good').length,
}));

function chOf(s: ActiveStream) { return CHANNELS.value.find((c) => c.id === s.channelId)!; }

const selSeries = computed(() =>
  sel.value ? streamSparkline(sel.value.uptimeMin + 1, sel.value.targetBitrate || 5) : [],
);

const viewStream = computed(() => liveStreams.value.find((s) => s.id === viewing.value));

function onView() {
  if (!sel.value) return;
  viewing.value = sel.value.id;
  playing.value = sel.value.status !== 'bad';
  muted.value = false;
}
function close() { viewing.value = null; }
function onKey(e: KeyboardEvent) { if (e.key === 'Escape' && viewing.value) close(); }
onMounted(() => window.addEventListener('keydown', onKey));
onBeforeUnmount(() => window.removeEventListener('keydown', onKey));

function formatTime(h: number) {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
}

function npData(channelId: string): { live?: Program; next?: Program } {
  const progs = EPG_PROGRAMS[channelId] || [];
  const now = new Date().getHours() + new Date().getMinutes() / 60;
  const live = progs.find((p) => now >= p.start && now < p.end);
  const next = progs.find((p) => p.start >= (live ? live.end : now));
  return { live, next };
}
</script>

<template>
  <div class="col" style="height: 100%; min-height: 0;">
    <div class="stats">
      <div class="card stat">
        <div class="lbl">Live now</div>
        <div class="val">{{ totals.streams }}<span style="color: var(--text-3); font-size: 16px; font-weight: 500;"> / {{ liveStreams.length }}</span></div>
        <div class="delta"><span class="dot good pulse" style="width: 6px; height: 6px;" />relaying</div>
      </div>
      <div class="card stat">
        <div class="lbl">Viewers</div>
        <div class="val">{{ totals.viewers }}</div>
        <div class="delta"><Icon name="check" :size="12" />peak 412 today</div>
      </div>
      <div class="card stat">
        <div class="lbl">Egress</div>
        <div class="val">{{ (totals.bandwidth / 1000).toFixed(2) }}<span style="font-size: 14px; color: var(--text-2); font-weight: 500;"> Gbps</span></div>
        <div class="delta">across 3 edge nodes</div>
      </div>
      <div class="card stat">
        <div class="lbl">Issues</div>
        <div class="val">{{ totals.issues }}</div>
        <div :class="['delta', { bad: totals.issues }]">
          <template v-if="totals.issues"><Icon name="warn" :size="12" />needs attention</template>
          <template v-else><Icon name="check" :size="12" />all healthy</template>
        </div>
      </div>
    </div>

    <div v-if="sel && chOf(sel)" class="streams-grid">
      <div class="streams-list">
        <div class="toolbar">
          <SearchInput :value="''" @change="() => {}" placeholder="Search streams" :width="180" />
          <span class="spacer" />
          <Segmented :value="filter" @change="(v) => filter = v as any" :options="[
            { value: 'all', label: 'All' },
            { value: 'live', label: 'Live' },
            { value: 'issues', label: 'Issues' },
          ]" />
        </div>
        <div class="body">
          <div v-for="s in filtered" :key="s.id"
               :class="['stream-item', { selected: selId === s.id }]" @click="selId = s.id">
            <ChannelLogo :ch="chOf(s)" />
            <div style="min-width: 0;">
              <div class="nm">
                <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{ chOf(s).tvg_name }}</span>
                <span v-if="s.status === 'good'" class="dot good pulse" style="width: 6px; height: 6px;" />
                <span v-else-if="s.status === 'warn'" class="dot warn" style="width: 6px; height: 6px;" />
                <span v-else class="dot bad" style="width: 6px; height: 6px;" />
              </div>
              <div class="meta">
                <span class="mono">{{ s.status === 'bad' ? 'offline' : s.resolution }}</span>
                <span>·</span>
                <span class="mono">{{ s.status === 'bad' ? '—' : s.bitrate.toFixed(1) + ' Mbps' }}</span>
                <span>·</span>
                <span>{{ s.uptime }}</span>
              </div>
            </div>
            <div class="viewer">
              <b>{{ s.viewers }}</b>
              <span>viewers</span>
            </div>
          </div>
        </div>
      </div>

      <div class="stream-detail">
        <div :style="{ padding: 'var(--pad-card)', display: 'flex', flexDirection: 'column', gap: '16px' }">
          <div class="row" style="gap: 14px;">
            <ChannelLogo :ch="chOf(sel)" size="lg" />
            <div style="flex: 1;">
              <div class="row" style="gap: 10px;">
                <h2 style="margin: 0; font-size: 17px; font-weight: 600;">{{ chOf(sel).tvg_name }}</h2>
                <span v-if="sel.status !== 'bad'" class="live-pill"><span class="dot" />LIVE</span>
                <Pill v-if="sel.status === 'bad'" tone="bad"><Icon name="warn" :size="11" />offline</Pill>
                <Pill v-if="sel.status === 'warn'" tone="warn"><Icon name="warn" :size="11" />degraded</Pill>
              </div>
              <div class="mono muted" style="font-size: var(--fs-xs); margin-top: 4px;">
                #{{ chOf(sel).channel }} · {{ chOf(sel).group }} · stream-id <span style="color: var(--text-1);">{{ sel.id }}</span>
              </div>
            </div>
            <Btn variant="ghost" size="sm" icon="refresh">Restart</Btn>
            <Btn :variant="sel.status === 'bad' ? 'primary' : 'ghost'" size="sm" :icon="sel.status === 'bad' ? 'play' : 'stop'">
              {{ sel.status === 'bad' ? 'Start' : 'Stop' }}
            </Btn>
            <Btn variant="primary" size="sm" icon="tv" @click="onView">View channel</Btn>
          </div>

          <div class="metric-grid">
            <div class="metric">
              <div class="lbl">Viewers</div>
              <div class="val">{{ sel.viewers }}</div>
              <div class="sub">peak {{ sel.peakViewers }} · session</div>
            </div>
            <div class="metric">
              <div class="lbl">Bitrate</div>
              <div class="val">{{ sel.status === 'bad' ? '—' : sel.bitrate.toFixed(1) }}<span v-if="sel.status !== 'bad'" style="font-size: 12px; color: var(--text-2); font-weight: 500;"> Mbps</span></div>
              <div class="sub">target {{ sel.targetBitrate.toFixed(1) }} Mbps</div>
            </div>
            <div class="metric">
              <div class="lbl">Uptime</div>
              <div class="val">{{ sel.uptime }}</div>
              <div class="sub">since {{ sel.status === 'bad' ? '—' : 'started' }}</div>
            </div>
            <div class="metric">
              <div class="lbl">Bandwidth</div>
              <div class="val">{{ sel.bandwidth }}<span style="font-size: 12px; color: var(--text-2); font-weight: 500;"> Mbps</span></div>
              <div class="sub">egress · {{ sel.viewers }} client{{ sel.viewers === 1 ? '' : 's' }}</div>
            </div>
          </div>

          <div class="card" style="background: var(--bg-2); padding: 14px;">
            <div class="row" style="margin-bottom: 8px;">
              <div style="font-size: var(--fs-sm); font-weight: 600;">Bitrate · last 60 min</div>
              <span class="spacer" />
              <Pill tone="cyan">avg {{ (selSeries.reduce((a, b) => a + b, 0) / selSeries.length).toFixed(1) }} Mbps</Pill>
              <Pill>min {{ Math.min(...selSeries).toFixed(1) }}</Pill>
              <Pill>max {{ Math.max(...selSeries).toFixed(1) }}</Pill>
            </div>
            <Sparkline :series="selSeries" :target="sel.targetBitrate" />
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
            <div class="card" style="background: var(--bg-2); padding: 14px;">
              <div style="font-size: var(--fs-sm); font-weight: 600; margin-bottom: 12px;">Technical</div>
              <div class="kv-list">
                <div class="k">Video</div><div class="v mono">{{ sel.codec }}</div>
                <div class="k">Audio</div><div class="v mono">{{ sel.audio }}</div>
                <div class="k">Container</div><div class="v mono">{{ sel.container }}</div>
                <div class="k">Resolution</div><div class="v mono">{{ sel.resolution }} @ {{ sel.fps }}fps</div>
                <div class="k">Latency</div><div class="v mono">{{ sel.latency.toFixed(1) }} s</div>
                <div class="k">Dropped</div><div class="v mono">
                  {{ sel.droppedFrames }} frames · {{ (sel.droppedRatio * 100).toFixed(2) }}%
                  <span v-if="sel.droppedRatio > 0.1" style="color: var(--bad); margin-left: 8px;">● high</span>
                </div>
              </div>
            </div>
            <div class="card" style="background: var(--bg-2); padding: 14px;">
              <div style="font-size: var(--fs-sm); font-weight: 600; margin-bottom: 12px;">Source</div>
              <div class="kv-list">
                <div class="k">Upstream</div>
                <div class="v mono" style="font-size: 11px; word-break: break-all;">{{ sel.sourceUrl }}</div>
                <div class="k">Edge node</div><div class="v mono">{{ sel.sourceHost }}</div>
                <div class="k">Protocol</div><div class="v mono">HLS · HTTPS</div>
                <div class="k">TVG-ID</div>
                <div class="v mono">
                  <template v-if="chOf(sel).tvg_id">{{ chOf(sel).tvg_id }}</template>
                  <span v-else style="color: var(--text-3);">—</span>
                </div>
                <div class="k">Source</div>
                <div class="v"><Pill tone="cyan">{{ chOf(sel).source }}</Pill></div>
                <div class="k">EPG</div>
                <div class="v">
                  <Pill v-if="chOf(sel).epg === 'matched'" tone="good"><Icon name="check" :size="11" />matched</Pill>
                  <Pill v-else tone="warn">unmatched</Pill>
                </div>
              </div>
            </div>
          </div>

          <div class="card flush" style="background: var(--bg-2);">
            <div class="card-hd" style="padding: 12px 14px;">
              <h2 style="font-size: 13px;">Connected sessions</h2>
              <Pill tone="cyan">{{ sel.status === 'bad' ? 0 : sel.viewers }}</Pill>
              <span class="spacer" />
              <Btn variant="ghost" size="sm" icon="more" />
            </div>
            <div v-if="sel.status === 'bad'" class="empty" style="padding: 28px;">
              <div class="muted">No viewers — stream is offline.</div>
            </div>
            <table v-else class="tbl">
              <thead>
                <tr>
                  <th>IP</th><th>Region</th><th>Client</th><th>Bitrate</th>
                  <th style="width: 90px;">Joined</th><th style="width: 50px;" />
                </tr>
              </thead>
              <tbody>
                <tr v-for="(s, i) in STREAM_SESSIONS.slice(0, Math.min(sel.viewers, 6))" :key="i">
                  <td class="mono">{{ s.ip }}</td>
                  <td class="muted">{{ s.region }}</td>
                  <td>{{ s.client }}</td>
                  <td class="mono">{{ s.bitrate }}</td>
                  <td class="muted">{{ s.joined }}</td>
                  <td><Btn variant="ghost" size="sm" icon="x" title="Disconnect" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Stream viewer slide-over -->
    <div v-if="viewStream" class="stream-view-bg" @click="close">
      <div class="stream-view" @click.stop>
        <div class="stream-view-hd">
          <ChannelLogo :ch="chOf(viewStream)" />
          <div style="min-width: 0; flex: 1;">
            <div class="row" style="gap: 8px;">
              <span style="font-weight: 600; font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{ chOf(viewStream).tvg_name }}</span>
              <span v-if="viewStream.status !== 'bad'" class="live-pill"><span class="dot" />LIVE</span>
              <Pill v-else tone="bad"><Icon name="warn" :size="11" />offline</Pill>
            </div>
            <div class="mono muted" style="font-size: var(--fs-xs); margin-top: 3px;">
              #{{ chOf(viewStream).channel }} · {{ chOf(viewStream).group }} ·
              {{ viewStream.status === 'bad' ? 'no signal' : viewStream.resolution + ' · ' + viewStream.bitrate.toFixed(1) + ' Mbps' }}
            </div>
          </div>
          <Btn variant="ghost" size="sm" icon="x" @click="close" title="Close (Esc)" />
        </div>

        <div class="stream-view-body">
          <div class="player" style="border-radius: 12px;">
            <template v-if="viewStream.status === 'bad'">
              <div style="position: absolute; inset: 0; display: grid; place-items: center; color: var(--text-2); font-size: 13px;">
                <div style="text-align: center;">
                  <Icon name="warn" :size="32" />
                  <div style="margin-top: 12px; font-weight: 600; color: var(--text-1); font-size: 15px;">Stream offline</div>
                  <div class="mono" style="font-size: 11px; margin-top: 6px;">upstream returned HTTP 503</div>
                  <div style="margin-top: 16px;"><Btn variant="primary" size="sm" icon="refresh">Retry source</Btn></div>
                </div>
              </div>
            </template>
            <template v-else>
              <div class="stripes" />
              <div class="label mono">{{ viewStream.resolution }} · {{ viewStream.fps }}fps · {{ viewStream.bitrate.toFixed(1) }} Mbps</div>
              <div v-if="!playing" class="play" @click="playing = true">
                <div class="play-btn"><Icon name="play" :size="28" /></div>
              </div>
              <div class="controls">
                <button class="player-ctrl" @click="playing = !playing">
                  <Icon :name="playing ? 'pause' : 'play'" :size="14" />
                </button>
                <span class="mono" style="font-size: 11px;">{{ playing ? '01:42' : '00:00' }}</span>
                <div class="track" />
                <button class="player-ctrl" @click="muted = !muted">
                  <Icon :name="muted ? 'x' : 'check'" :size="13" />
                </button>
                <span class="mono" style="font-size: 11px;">LIVE</span>
                <button class="player-ctrl" title="Fullscreen"><Icon name="grid" :size="13" /></button>
              </div>
            </template>
          </div>

          <div v-if="viewStream.status !== 'bad'" class="card flush" style="background: var(--bg-2);">
            <div class="card-hd" style="padding: 12px 14px;">
              <h2 style="font-size: 13px;">From the guide</h2>
              <span class="spacer" />
              <span class="muted" style="font-size: var(--fs-xs);">EPG-matched</span>
            </div>
            <div :style="{ padding: '14px', display: 'grid', gridTemplateColumns: npData(viewStream.channelId).live && npData(viewStream.channelId).next ? '1fr 1fr' : '1fr', gap: '12px' }">
              <div v-if="npData(viewStream.channelId).live"
                   style="padding: 10px 12px; border-radius: 8px; background: var(--accent-soft); border: 1px solid oklch(0.82 0.13 220 / 0.4);">
                <div class="mono" style="font-size: 10px; letter-spacing: 0.08em; color: var(--accent-hi); font-weight: 600;">ON NOW</div>
                <div style="font-weight: 600; font-size: 14px; margin-top: 4px; color: var(--accent-hi);">{{ npData(viewStream.channelId).live!.title }}</div>
                <div class="mono muted" style="font-size: 11px; margin-top: 4px;">
                  {{ formatTime(npData(viewStream.channelId).live!.start) }}–{{ formatTime(npData(viewStream.channelId).live!.end) }} · {{ npData(viewStream.channelId).live!.cat }}
                </div>
              </div>
              <div v-if="npData(viewStream.channelId).next"
                   style="padding: 10px 12px; border-radius: 8px; background: var(--bg-3); border: 1px solid var(--hairline);">
                <div class="mono" style="font-size: 10px; letter-spacing: 0.08em; color: var(--text-2); font-weight: 600;">UP NEXT</div>
                <div style="font-weight: 600; font-size: 14px; margin-top: 4px; color: var(--text-0);">{{ npData(viewStream.channelId).next!.title }}</div>
                <div class="mono muted" style="font-size: 11px; margin-top: 4px;">
                  {{ formatTime(npData(viewStream.channelId).next!.start) }}–{{ formatTime(npData(viewStream.channelId).next!.end) }} · {{ npData(viewStream.channelId).next!.cat }}
                </div>
              </div>
            </div>
          </div>

          <div class="metric-grid" style="grid-template-columns: repeat(4, 1fr);">
            <div class="metric"><div class="lbl">Viewers</div><div class="val" style="font-size: 17px;">{{ viewStream.viewers }}</div></div>
            <div class="metric"><div class="lbl">Bitrate</div><div class="val" style="font-size: 17px;">{{ viewStream.status === 'bad' ? '—' : viewStream.bitrate.toFixed(1) + ' Mbps' }}</div></div>
            <div class="metric"><div class="lbl">Latency</div><div class="val" style="font-size: 17px;">{{ viewStream.status === 'bad' ? '—' : viewStream.latency.toFixed(1) + 's' }}</div></div>
            <div class="metric"><div class="lbl">Uptime</div><div class="val" style="font-size: 17px;">{{ viewStream.uptime }}</div></div>
          </div>

          <div class="card flush" style="background: var(--bg-2);">
            <div class="card-hd" style="padding: 12px 14px;">
              <h2 style="font-size: 13px;">Stream details</h2>
              <span class="spacer" />
              <Pill :tone="viewStream.status === 'bad' ? 'bad' : 'good'">
                <StatusDot :status="viewStream.status" :pulse="viewStream.status !== 'bad'" />
                {{ viewStream.status === 'bad' ? 'offline' : viewStream.status === 'warn' ? 'degraded' : 'healthy' }}
              </Pill>
            </div>
            <div style="padding: 14px;">
              <div class="kv-list">
                <div class="k">Video</div><div class="v mono">{{ viewStream.codec }}</div>
                <div class="k">Audio</div><div class="v mono">{{ viewStream.audio }}</div>
                <div class="k">Container</div><div class="v mono">{{ viewStream.container }}</div>
                <div class="k">Resolution</div><div class="v mono">{{ viewStream.resolution }} @ {{ viewStream.fps }}fps</div>
                <div class="k">Dropped</div><div class="v mono">
                  {{ viewStream.droppedFrames }} frames · {{ (viewStream.droppedRatio * 100).toFixed(2) }}%
                  <span v-if="viewStream.droppedRatio > 0.1" style="color: var(--bad); margin-left: 8px;">● high</span>
                </div>
                <div class="k">Bandwidth</div><div class="v mono">{{ viewStream.bandwidth }} Mbps egress</div>
                <div class="k">Edge node</div><div class="v mono">{{ viewStream.sourceHost }}</div>
                <div class="k">Source URL</div>
                <div class="v mono" style="font-size: 11px; word-break: break-all;">{{ viewStream.sourceUrl }}</div>
                <div class="k">TVG-ID</div>
                <div class="v mono">
                  <template v-if="chOf(viewStream).tvg_id">{{ chOf(viewStream).tvg_id }}</template>
                  <span v-else style="color: var(--text-3);">—</span>
                </div>
                <div class="k">Source</div>
                <div class="v"><Pill tone="cyan">{{ chOf(viewStream).source }}</Pill></div>
              </div>
            </div>
          </div>

          <div class="row" style="gap: 8px;">
            <Btn variant="ghost" icon="refresh">Restart stream</Btn>
            <Btn variant="ghost" icon="edit">Edit channel</Btn>
            <span class="spacer" />
            <Btn v-if="viewStream.status !== 'bad'" variant="ghost" icon="stop">Stop</Btn>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
