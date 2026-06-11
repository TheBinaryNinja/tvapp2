<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import Icon from '../components/Icon.vue';
import Btn from '../components/Btn.vue';
import Pill from '../components/Pill.vue';
import StatusDot from '../components/StatusDot.vue';
import { PLAYLISTS, EPG_SOURCES, CHANNELS, ACTIVITY } from '../data';

const emit = defineEmits<{ (e: 'add', k: 'playlist' | 'epg'): void }>();
const router = useRouter();
function go(p: string) { router.push(p); }

const totalChannels = computed(() => PLAYLISTS.value.reduce((s, p) => s + p.channels, 0));
const totalPrograms = computed(() => EPG_SOURCES.value.reduce((s, e) => s + e.programs, 0));
const unmatched = computed(() => CHANNELS.value.filter((c) => c.epg === 'unmatched').length);
</script>

<template>
  <div class="col" style="gap: 18px;">
    <div class="stats">
      <div class="card stat">
        <div class="lbl">Playlists</div>
        <div class="val">{{ PLAYLISTS.length }}</div>
        <div class="delta"><Icon name="check" :size="12" />all syncing</div>
      </div>
      <div class="card stat">
        <div class="lbl">Channels</div>
        <div class="val">{{ totalChannels }}</div>
        <div class="delta"><Icon name="plus" :size="12" />12 new this week</div>
      </div>
      <div class="card stat">
        <div class="lbl">EPG sources</div>
        <div class="val">{{ EPG_SOURCES.length }}</div>
        <div class="delta">{{ totalPrograms.toLocaleString() }} programs</div>
      </div>
      <div class="card stat">
        <div class="lbl">Unmatched</div>
        <div class="val">{{ unmatched }}</div>
        <div class="delta bad"><Icon name="warn" :size="12" />needs mapping</div>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: 1.4fr 1fr; gap: 18px;">
      <div class="col" style="min-width: 0;">
        <div class="card flush">
          <div class="card-hd">
            <Icon name="playlist" :size="15" />
            <h2>Playlists</h2>
            <Pill tone="cyan">{{ PLAYLISTS.length }}</Pill>
            <span class="spacer" />
            <Btn variant="ghost" size="sm" @click="go('/playlists')">View all</Btn>
            <Btn variant="ghost" size="sm" icon="plus" @click="emit('add', 'playlist')">Add playlist</Btn>
          </div>
          <div v-for="p in PLAYLISTS" :key="p.id" class="src-row" @click="go(`/playlists/${p.id}`)">
            <div :class="['src-ico', { builtin: p.builtin }]">
              <Icon :name="p.builtin ? 'tv' : 'playlist'" :size="18" />
            </div>
            <div>
              <div class="src-name">
                {{ p.name }}
                <StatusDot :status="p.status" :pulse="p.status === 'good'" />
                <Pill v-if="p.builtin" tone="system"><Icon name="check" :size="10" />built-in</Pill>
              </div>
              <div class="src-url">{{ p.url }}</div>
            </div>
            <div class="stat-mini"><b>{{ p.channels }}</b>channels</div>
            <div class="stat-mini"><b>{{ p.groups }}</b>groups</div>
            <div class="stat-mini" style="min-width: 110px;">
              <b style="font-size: 12px; font-weight: 500; color: var(--text-1);">{{ p.lastSync }}</b>
              last sync
            </div>
            <Btn variant="ghost" size="sm" icon="chevron-r" />
          </div>
        </div>

        <div class="card flush">
          <div class="card-hd">
            <Icon name="epg" :size="15" style="color: var(--good);" />
            <h2>EPG Sources</h2>
            <Pill tone="good">{{ EPG_SOURCES.length }}</Pill>
            <span class="spacer" />
            <Btn variant="ghost" size="sm" @click="go('/epg-sources')">View all</Btn>
            <Btn variant="ghost" size="sm" icon="plus" @click="emit('add', 'epg')">Add EPG source</Btn>
          </div>
          <div v-for="p in EPG_SOURCES" :key="p.id" class="src-row" @click="go(`/epg-sources/${p.id}`)">
            <div :class="['src-ico', { builtin: p.builtin, 'epg-builtin': p.builtin }]" style="color: var(--good);">
              <Icon :name="p.builtin ? 'tv' : 'epg'" :size="18" />
            </div>
            <div>
              <div class="src-name">
                {{ p.name }}
                <StatusDot :status="p.status" pulse />
                <Pill v-if="p.builtin" tone="system"><Icon name="check" :size="10" />built-in</Pill>
              </div>
              <div class="src-url">{{ p.url }}</div>
            </div>
            <div class="stat-mini"><b>{{ p.channels }}</b>channels</div>
            <div class="stat-mini"><b>{{ p.programs.toLocaleString() }}</b>programs</div>
            <div class="stat-mini" style="min-width: 110px;">
              <b style="font-size: 12px; font-weight: 500; color: var(--text-1);">{{ p.lastSync }}</b>
              last sync
            </div>
            <Btn variant="ghost" size="sm" icon="chevron-r" />
          </div>
        </div>
      </div>

      <div class="card flush">
        <div class="card-hd">
          <h2>Activity</h2>
          <span class="spacer" />
          <span class="muted" style="font-size: var(--fs-xs);">Last 24h</span>
        </div>
        <div v-for="(a, i) in ACTIVITY" :key="i" class="act">
          <div class="ico-w">
            <Icon :name="a.icon" :size="14" />
          </div>
          <div style="flex: 1;">
            <div v-html="a.html" />
            <div class="when">{{ a.when }} ago</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
