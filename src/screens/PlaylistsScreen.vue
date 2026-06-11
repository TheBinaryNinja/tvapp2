<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import Icon from '../components/Icon.vue';
import Btn from '../components/Btn.vue';
import Pill from '../components/Pill.vue';
import StatusDot from '../components/StatusDot.vue';
import SearchInput from '../components/SearchInput.vue';
import type { Playlist } from '../data';
import { usePlaylistStatus } from '../composables/useSettings';

const emit = defineEmits<{ (e: 'add', k: 'playlist' | 'epg'): void }>();
const router = useRouter();

const playlists = ref<Playlist[]>([]);
onMounted(async () => {
  const res = await fetch('/api/playlists');
  if (res.ok) playlists.value = await res.json();
});
</script>

<template>
  <div class="col">
    <div class="card flush">
      <div class="toolbar">
        <SearchInput :value="''" @change="() => {}" placeholder="Search playlists" />
        <span class="spacer" />
        <Btn variant="ghost" icon="refresh">Sync all</Btn>
        <Btn variant="primary" icon="plus" @click="emit('add', 'playlist')">Add playlist</Btn>
      </div>
      <div v-for="p in playlists" :key="p.id" class="src-row" @click="router.push(`/playlists/${p.id}`)">
        <div :class="['src-ico', { builtin: p.builtin }]">
          <Icon :name="p.builtin ? 'tv' : 'playlist'" :size="18" />
        </div>
        <div>
          <div class="src-name">
            {{ p.name }}
            <StatusDot :status="p.status" :pulse="p.status === 'good'" />
            <Pill v-if="p.builtin" tone="system"><Icon name="check" :size="10" />built-in</Pill>
            <Pill tone="cyan">{{ p.interval }}</Pill>
          </div>
          <div class="src-url">{{ p.url }}</div>
        </div>
        <Pill :tone="usePlaylistStatus(p.id).active ? 'active' : 'disabled'">
          {{ usePlaylistStatus(p.id).active ? 'Active' : 'Inactive' }}
        </Pill>
        <div class="stat-mini"><b>{{ p.channels }}</b>channels</div>
        <div class="stat-mini"><b>{{ p.groups }}</b>groups</div>
        <div class="stat-mini" style="min-width: 110px;">
          <b style="font-size: 12px; font-weight: 500; color: var(--text-1);">{{ p.lastSync }}</b>
          last sync
        </div>
      </div>
    </div>
  </div>
</template>
