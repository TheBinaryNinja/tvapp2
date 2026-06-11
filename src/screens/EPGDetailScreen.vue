<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import Icon from '../components/Icon.vue';
import Btn from '../components/Btn.vue';
import Pill from '../components/Pill.vue';
import StatusDot from '../components/StatusDot.vue';
import SearchInput from '../components/SearchInput.vue';
import ChannelLogo from '../components/ChannelLogo.vue';
import Segmented from '../components/Segmented.vue';
import Stat from '../components/Stat.vue';
import { EPG_SOURCES, CHANNELS, EPG_HOURS, EPG_PROGRAMS, type Channel, type Program } from '../data';
import { useTweaks } from '../composables/useTweaks';

const props = defineProps<{ id: string }>();
const { tweaks } = useTweaks();

const epg = computed(() => EPG_SOURCES.value.find((e) => e.id === props.id) || EPG_SOURCES.value[0]);
const visibleChannels = computed(() => CHANNELS.value.slice(0, 12));

const now = ref(0);
function tick() { const d = new Date(); now.value = d.getHours() + d.getMinutes() / 60; }
let id: number | null = null;
onMounted(() => { tick(); id = window.setInterval(tick, 60000); });
onBeforeUnmount(() => { if (id) clearInterval(id); });

const viewing = ref<{ channel: Channel; prog: Program } | null>(null);
function open(channel: Channel, prog: Program) { viewing.value = { channel, prog }; }
function close() { viewing.value = null; }

function formatTime(h: number) {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
}
function humanizeDur(hours: number) {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} hr`;
  return `${h} hr ${m} min`;
}
function humanizeDelta(hours: number) {
  if (hours < 1) return Math.round(hours * 60) + ' min';
  return humanizeDur(hours);
}

const HOUR_W = 140;
const totalW = 24 * HOUR_W;

const dayLabel = computed(() => 'Today, ' + new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }));

function onKey(e: KeyboardEvent) { if (e.key === 'Escape' && viewing.value) close(); }
onMounted(() => window.addEventListener('keydown', onKey));
onBeforeUnmount(() => window.removeEventListener('keydown', onKey));

function progState(p: Program) {
  if (now.value >= p.start && now.value < p.end) return 'live';
  if (now.value >= p.end) return 'past';
  return 'upcoming';
}

const blurbs: Record<string, string> = {
  'Live': "Live coverage with breaking updates, analysis and reports from correspondents on the ground.",
  'News': "The latest national and international stories, plus business, sport, and a look at tomorrow's papers.",
  'Documentary': "An in-depth feature on the world's most fascinating places, people, and events.",
  'Lifestyle': "Fresh ideas for home, food, and travel — practical inspiration for everyday living.",
  'Film': "A feature-length presentation. Cinematic storytelling with subtitles and audio description available.",
  'Football': "Full match coverage with pre-match build-up, expert punditry, and post-match analysis.",
  'Highlights': "The best moments and key plays condensed into a fast-paced roundup.",
  'Comedy': "An evening of stand-up, sketches, and satire from familiar faces and rising stars.",
  'Series': "The next instalment in our ongoing drama series. Contains scenes some viewers may find intense.",
  'Music': "Back-to-back hits, exclusive sessions, and the latest releases from across the charts.",
  'Kids': "Bright, friendly programming made just for younger viewers — learning through play.",
  'Technology': "What's new in tech, gadgets, and software — reviews, deep-dives, and hands-on demos.",
  'Discussion': "Panel conversation with guests dissecting the day's biggest stories.",
  'Business': "Markets, deals, and the people moving them. Plus analysis from the trading floor.",
  'Weather': "A full national outlook plus regional forecasts for the next 48 hours.",
  'Game show': "Quick-fire rounds and big prizes — armchair contestants welcome.",
  'Feature': "A standalone feature presentation tonight. Tune in for an unmissable story.",
};

function listProgs(c: Channel) {
  return (EPG_PROGRAMS[c.id] || []).filter((p) => p.end >= now.value - 1).slice(0, 6);
}
function livePr(c: Channel) {
  return listProgs(c).find((p) => now.value >= p.start && now.value < p.end);
}
function progs(c: Channel) {
  return EPG_PROGRAMS[c.id] || [];
}
</script>

<template>
  <div v-if="epg" class="col" style="height: 100%;">
    <div class="card" style="display: flex; align-items: center; gap: 16px;">
      <div :class="['src-ico', { builtin: epg.builtin, 'epg-builtin': epg.builtin }]"
           style="width: 52px; height: 52px; border-radius: 12px; color: var(--good);">
        <Icon :name="epg.builtin ? 'tv' : 'epg'" :size="22" />
      </div>
      <div style="flex: 1;">
        <div class="row" style="gap: 10px;">
          <h2 style="margin: 0; font-size: 18px; font-weight: 600;">{{ epg.name }}</h2>
          <StatusDot :status="epg.status" pulse />
          <Pill v-if="epg.builtin" tone="system"><Icon name="check" :size="10" />built-in</Pill>
          <Pill tone="cyan">{{ epg.interval }}</Pill>
        </div>
        <div class="src-url" style="margin-top: 4px;">{{ epg.url }}</div>
        <div v-if="epg.builtin" class="muted" style="font-size: var(--fs-xs); margin-top: 6px;">
          Ships with TVApp2 · guide data is preconfigured and auto-updated with the app.
        </div>
      </div>
      <div class="row" style="gap: 18px;">
        <Stat label="Channels" :value="epg.channels" />
        <Stat label="Programs" :value="epg.programs.toLocaleString()" />
        <Stat label="Synced" :value="epg.lastSync" small />
      </div>
      <Btn v-if="!epg.builtin" variant="ghost" icon="refresh">Sync now</Btn>
    </div>

    <div class="card flush" style="display: flex; flex-direction: column; flex: 1; min-height: 0;">
      <div class="toolbar">
        <Btn variant="ghost" size="sm" icon="chevron-l" />
        <Pill tone="cyan">
          <Icon name="epg" :size="11" />
          {{ dayLabel }}
        </Pill>
        <Btn variant="ghost" size="sm" icon="chevron-r" />
        <SearchInput :value="''" @change="() => {}" placeholder="Filter channels" :width="220" />
        <span class="spacer" />
        <span class="muted" style="font-size: var(--fs-xs);">
          Now: <span class="mono" style="color: var(--accent-hi);">
            {{ String(Math.floor(now)).padStart(2, '0') }}:{{ String(Math.floor((now % 1) * 60)).padStart(2, '0') }}
          </span>
        </span>
        <Segmented :value="tweaks.epgMode" @change="() => {}" :options="[
          { value: 'timeline', label: 'Timeline', icon: 'grid' },
          { value: 'list', label: 'List', icon: 'list' },
        ]" />
      </div>

      <!-- Timeline -->
      <div v-if="tweaks.epgMode === 'timeline'" class="epg" style="flex: 1; overflow: hidden;">
        <div class="epg-head">
          <div class="head-l">Channel</div>
          <div class="head-r" :style="{ width: totalW + 'px' }">
            <div v-for="h in EPG_HOURS.slice(0, 24)" :key="h" class="epg-time" :style="{ width: HOUR_W + 'px' }">
              {{ String(h).padStart(2, '0') }}:00
            </div>
          </div>
        </div>
        <div class="epg-body">
          <div :style="{ width: (200 + totalW) + 'px' }">
            <div v-for="c in visibleChannels" :key="c.id" class="epg-row">
              <div class="ch">
                <ChannelLogo :ch="c" />
                <div style="min-width: 0;">
                  <div class="nm" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{ c.tvg_name }}</div>
                  <div class="num mono">#{{ c.channel }}</div>
                </div>
              </div>
              <div class="epg-progs" :style="{ width: totalW + 'px' }">
                <div v-for="(p, i) in progs(c)" :key="i"
                     :class="['epg-prog', { live: now >= p.start && now < p.end }]"
                     :style="{ left: (p.start * HOUR_W + 2) + 'px', width: ((p.end - p.start) * HOUR_W - 4) + 'px' }"
                     @click="open(c, p)"
                     :title="`${p.title} · ${formatTime(p.start)}–${formatTime(p.end)}`">
                  <div class="t">{{ p.title }}</div>
                  <div class="sub">{{ formatTime(p.start) }}–{{ formatTime(p.end) }} · {{ p.cat }}</div>
                </div>
                <div class="now-line" :style="{ left: (now * HOUR_W) + 'px' }" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- List -->
      <div v-else style="overflow-y: auto; flex: 1;">
        <div v-for="c in visibleChannels" :key="c.id" style="border-bottom: 1px solid var(--hairline); padding: 14px var(--pad-card);">
          <div class="row" style="gap: 10px; margin-bottom: 10px;">
            <ChannelLogo :ch="c" />
            <div>
              <div style="font-weight: 600;">{{ c.tvg_name }}</div>
              <div class="mono muted" style="font-size: var(--fs-xs);">#{{ c.channel }} · {{ c.group }}</div>
            </div>
            <span class="spacer" />
            <Pill v-if="livePr(c)" tone="cyan">
              <span class="dot good" style="width: 6px; height: 6px;" />on now: {{ livePr(c)!.title }}
            </Pill>
          </div>
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 8px;">
            <div v-for="(p, i) in listProgs(c)" :key="i"
                 :style="{
                   padding: '10px 12px',
                   background: (now >= p.start && now < p.end) ? 'var(--accent-soft)' : 'var(--bg-2)',
                   border: '1px solid ' + ((now >= p.start && now < p.end) ? 'oklch(0.82 0.13 220 / 0.4)' : 'var(--hairline)'),
                   borderRadius: '8px',
                   cursor: 'default'
                 }"
                 @click="open(c, p)">
              <div class="mono" :style="{ fontSize: 'var(--fs-xs)', color: (now >= p.start && now < p.end) ? 'var(--accent-hi)' : 'var(--text-2)' }">
                {{ formatTime(p.start) }}–{{ formatTime(p.end) }}
              </div>
              <div :style="{ fontWeight: 500, fontSize: 'var(--fs-sm)', marginTop: '2px', color: (now >= p.start && now < p.end) ? 'var(--accent-hi)' : 'var(--text-0)' }">
                {{ p.title }}
              </div>
              <div class="muted" style="font-size: var(--fs-xs); margin-top: 2px;">{{ p.cat }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Program panel -->
    <div v-if="viewing" class="stream-view-bg" @click="close">
      <div class="glass stream-view" @click.stop>
        <div class="stream-view-hd">
          <ChannelLogo :ch="viewing.channel" />
          <div style="min-width: 0; flex: 1;">
            <div class="row" style="gap: 8px;">
              <span style="font-weight: 600; font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{ viewing.channel.tvg_name }}</span>
              <span v-if="progState(viewing.prog) === 'live'" class="live-pill"><span class="dot" />LIVE</span>
              <Pill v-else-if="progState(viewing.prog) === 'upcoming'" tone="cyan"><Icon name="epg" :size="11" />upcoming</Pill>
              <Pill v-else>aired</Pill>
            </div>
            <div class="mono muted" style="font-size: var(--fs-xs); margin-top: 3px;">
              #{{ viewing.channel.channel }} · {{ viewing.channel.group }} · {{ viewing.channel.res }}
            </div>
          </div>
          <Btn variant="ghost" size="sm" icon="x" @click="close" title="Close (Esc)" />
        </div>

        <div class="stream-view-body">
          <div class="player">
            <template v-if="progState(viewing.prog) === 'past'">
              <div style="position: absolute; inset: 0; display: grid; place-items: center; color: var(--text-2); font-size: 13px;">
                <div style="text-align: center;">
                  <Icon name="epg" :size="32" />
                  <div style="margin-top: 12px; font-weight: 600; color: var(--text-1); font-size: 15px;">Programme has ended</div>
                  <div class="mono" style="font-size: 11px; margin-top: 6px;">aired {{ formatTime(viewing.prog.start) }}–{{ formatTime(viewing.prog.end) }}</div>
                  <div style="margin-top: 16px;"><Btn variant="ghost" size="sm" icon="refresh">Check on-demand</Btn></div>
                </div>
              </div>
            </template>
            <template v-else-if="progState(viewing.prog) === 'upcoming'">
              <div style="position: absolute; inset: 0; display: grid; place-items: center; color: var(--text-2); font-size: 13px;">
                <div style="text-align: center;">
                  <Icon name="epg" :size="32" />
                  <div style="margin-top: 12px; font-weight: 600; color: var(--text-1); font-size: 15px;">Starts at {{ formatTime(viewing.prog.start) }}</div>
                  <div class="mono" style="font-size: 11px; margin-top: 6px;">in {{ humanizeDelta(viewing.prog.start - now) }}</div>
                  <div style="margin-top: 16px;"><Btn variant="primary" size="sm" icon="add">Set reminder</Btn></div>
                </div>
              </div>
            </template>
            <template v-else>
              <div class="stripes" />
              <div class="label mono">{{ viewing.channel.res }} · LIVE</div>
              <div class="play"><div class="play-btn"><Icon name="play" :size="28" /></div></div>
              <div class="controls">
                <Icon name="pause" :size="14" />
                <span class="mono" style="font-size: 11px;">{{ formatTime(now) }}</span>
                <div class="track" />
                <span class="mono" style="font-size: 11px;">{{ formatTime(viewing.prog.end) }}</span>
              </div>
            </template>
          </div>

          <div>
            <div class="muted mono"
                 :style="{ fontSize: '10.5px', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600, color: progState(viewing.prog) === 'live' ? 'var(--accent-hi)' : 'var(--text-2)' }">
              {{ progState(viewing.prog) === 'live' ? 'ON NOW' : progState(viewing.prog) === 'upcoming' ? 'UP NEXT' : 'EARLIER TODAY' }} · {{ viewing.prog.cat }}
            </div>
            <h2 style="margin: 6px 0 8px; font-size: 22px; font-weight: 600; letter-spacing: -0.015em;">{{ viewing.prog.title }}</h2>
            <div class="row" style="gap: 6px;">
              <Pill tone="cyan"><Icon name="epg" :size="11" />{{ formatTime(viewing.prog.start) }}–{{ formatTime(viewing.prog.end) }}</Pill>
              <Pill>{{ humanizeDur(viewing.prog.end - viewing.prog.start) }}</Pill>
              <Pill>{{ viewing.prog.cat }}</Pill>
              <span class="spacer" />
              <span v-if="progState(viewing.prog) === 'live'" class="mono muted" style="font-size: 11px;">
                {{ Math.round(Math.min(1, Math.max(0, (now - viewing.prog.start) / (viewing.prog.end - viewing.prog.start))) * 100) }}% elapsed · {{ humanizeDelta(viewing.prog.end - now) }} left
              </span>
            </div>
            <div v-if="progState(viewing.prog) === 'live'" style="margin-top: 10px; height: 4px; border-radius: 999px; background: var(--bg-3); overflow: hidden;">
              <div :style="{ height: '100%', width: (Math.min(1, Math.max(0, (now - viewing.prog.start) / (viewing.prog.end - viewing.prog.start))) * 100) + '%', background: 'var(--accent)', boxShadow: '0 0 12px var(--accent)' }" />
            </div>
          </div>

          <div class="card" style="background: var(--bg-2); padding: 16px;">
            <div style="font-size: var(--fs-sm); line-height: 1.55; color: var(--text-1);">
              {{ blurbs[viewing.prog.cat] || 'A scheduled programme on this channel.' }}
            </div>
          </div>

          <div class="card" style="background: var(--bg-2); padding: 16px;">
            <div style="font-size: var(--fs-sm); font-weight: 600; margin-bottom: 12px;">Programme details</div>
            <div class="kv-list">
              <div class="k">Channel</div>
              <div class="v">{{ viewing.channel.tvg_name }} <span class="mono muted">· #{{ viewing.channel.channel }}</span></div>
              <div class="k">Group</div><div class="v">{{ viewing.channel.group }}</div>
              <div class="k">Time</div><div class="v mono">{{ formatTime(viewing.prog.start) }} – {{ formatTime(viewing.prog.end) }}</div>
              <div class="k">Duration</div><div class="v mono">{{ humanizeDur(viewing.prog.end - viewing.prog.start) }}</div>
              <div class="k">Category</div><div class="v">{{ viewing.prog.cat }}</div>
              <div class="k">Resolution</div><div class="v mono">{{ viewing.channel.res }}</div>
              <div class="k">TVG-ID</div>
              <div class="v mono">
                <template v-if="viewing.channel.tvg_id">{{ viewing.channel.tvg_id }}</template>
                <span v-else style="color: var(--text-3);">—</span>
              </div>
              <div class="k">Source</div>
              <div class="v"><Pill tone="cyan">{{ viewing.channel.source }}</Pill></div>
              <div class="k">EPG match</div>
              <div class="v">
                <Pill v-if="viewing.channel.epg === 'matched'" tone="good"><Icon name="check" :size="11" />matched</Pill>
                <Pill v-else tone="warn">unmatched</Pill>
              </div>
            </div>
          </div>

          <div class="row" style="gap: 8px;">
            <Btn v-if="progState(viewing.prog) === 'upcoming'" variant="primary" icon="add">Set reminder</Btn>
            <Btn v-if="progState(viewing.prog) === 'live'" variant="primary" icon="play">Watch live</Btn>
            <Btn v-if="progState(viewing.prog) === 'past'" variant="ghost" icon="refresh">Check catch-up</Btn>
            <Btn variant="ghost" icon="tv">Open channel</Btn>
            <Btn variant="ghost" icon="epg">Channel guide</Btn>
            <span class="spacer" />
            <Btn variant="ghost" icon="more" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
