<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue';
import Icon from '../components/Icon.vue';
import Btn from '../components/Btn.vue';
import Pill from '../components/Pill.vue';
import Stat from '../components/Stat.vue';
import ChannelLogo from '../components/ChannelLogo.vue';
import { CHANNELS } from '../data';

const epgChannelIds = [
  { id: 'bbc.one.uk', name: 'BBC One' },
  { id: 'bbc.two.uk', name: 'BBC Two' },
  { id: 'bbc.news.uk', name: 'BBC News' },
  { id: 'sky.sports.main.uk', name: 'Sky Sports Main Event' },
  { id: 'sky.sports.f1.uk', name: 'Sky Sports F1' },
  { id: 'itv1.uk', name: 'ITV1' },
  { id: 'channel4.uk', name: 'Channel 4' },
  { id: 'film4.uk', name: 'Film4' },
  { id: 'discovery.uk', name: 'Discovery Channel UK' },
  { id: 'natgeo.uk', name: 'National Geographic UK' },
  { id: 'cnn.int', name: 'CNN International' },
  { id: 'aljazeera.en', name: 'Al Jazeera English' },
  { id: 'hgtv.uk', name: 'HGTV UK' },
  { id: 'nickjr.uk', name: 'Nick Jr UK' },
  { id: 'tcm.uk', name: 'TCM Movies' },
  { id: 'eurosport1.uk', name: 'Eurosport 1' },
];

const mappings = reactive<Record<string, string>>({});
watch(CHANNELS, (list) => {
  list.forEach((c) => { if (c.epg === 'matched' && c.tvg_id) mappings[c.id] = c.tvg_id; });
}, { immediate: true });
const selL = ref<string | null>(null);
const filter = ref<'all' | 'unmatched' | 'matched'>('unmatched');

const channelsView = computed(() => CHANNELS.value.filter((c) =>
  filter.value === 'all' || (filter.value === 'unmatched' ? !mappings[c.id] : !!mappings[c.id])
));

function link(chId: string, epgId: string) { mappings[chId] = epgId; }
function unlink(chId: string) { delete mappings[chId]; }

const matched = computed(() => Object.keys(mappings).length);
const total = computed(() => CHANNELS.value.length);

function usedBy(eid: string) {
  return Object.entries(mappings).find(([, v]) => v === eid);
}
</script>

<template>
  <div class="col">
    <div class="card" style="display: flex; align-items: center; gap: 18px;">
      <Icon name="map" :size="20" />
      <div style="flex: 1;">
        <div style="font-weight: 600; font-size: 15px;">Channel ↔ EPG mapping</div>
        <div class="muted" style="font-size: var(--fs-xs); margin-top: 2px;">
          Drag from left to right, or pick a channel and click the EPG ID. Auto-match runs nightly.
        </div>
      </div>
      <Stat label="Matched" :value="`${matched} / ${total}`" />
      <div style="width: 180px; height: 6px; background: var(--bg-2); border-radius: 999px; overflow: hidden;">
        <div :style="{ width: (matched / total * 100) + '%', height: '100%', background: 'var(--accent)', boxShadow: '0 0 12px var(--accent)' }" />
      </div>
      <Btn variant="primary" icon="refresh">Auto-match</Btn>
    </div>

    <div class="map-grid">
      <div class="map-col">
        <h3>
          <Icon name="playlist" :size="14" /> M3U Channels
          <span class="spacer" />
          <div class="segmented" style="padding: 2px;">
            <button :class="filter === 'unmatched' ? 'active' : ''" @click="filter = 'unmatched'"
                    style="font-size: 10.5px; padding: 3px 8px;">Unmatched</button>
            <button :class="filter === 'matched' ? 'active' : ''" @click="filter = 'matched'"
                    style="font-size: 10.5px; padding: 3px 8px;">Matched</button>
            <button :class="filter === 'all' ? 'active' : ''" @click="filter = 'all'"
                    style="font-size: 10.5px; padding: 3px 8px;">All</button>
          </div>
        </h3>
        <div class="map-list">
          <div v-for="c in channelsView" :key="c.id"
               :class="['map-item', { selected: selL === c.id, matched: !!mappings[c.id] }]"
               @click="selL = c.id">
            <ChannelLogo :ch="c" />
            <div class="nm">{{ c.tvg_name }}</div>
            <template v-if="mappings[c.id]">
              <span class="id">{{ mappings[c.id] }}</span>
              <Btn variant="ghost" size="sm" icon="x" @click="unlink(c.id)" />
            </template>
            <Pill v-else tone="warn">unmatched</Pill>
          </div>
          <div v-if="channelsView.length === 0" class="empty">
            <h3>All matched 🎉</h3>
            <p>Every channel in this view has an EPG ID assigned.</p>
          </div>
        </div>
      </div>

      <div class="map-link" style="align-self: center;">
        <Icon name="chevron-r" :size="22" />
      </div>

      <div class="map-col">
        <h3>
          <Icon name="epg" :size="14" /> EPG channel IDs
          <span class="spacer" />
          <Pill>{{ epgChannelIds.length }}</Pill>
        </h3>
        <div class="map-list">
          <div v-for="e in epgChannelIds" :key="e.id"
               :class="['map-item', { selected: selL && !usedBy(e.id), matched: !!usedBy(e.id) }]"
               @click="() => { if (selL && !usedBy(e.id)) { link(selL, e.id); selL = null; } }">
            <div class="nm">{{ e.name }}</div>
            <span class="id">{{ e.id }}</span>
            <Pill v-if="usedBy(e.id)" tone="good"><Icon name="check" :size="10" />linked</Pill>
            <Pill v-else-if="selL" tone="cyan">click to link</Pill>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
