<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, provide } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import Icon from './components/Icon.vue';
import Btn from './components/Btn.vue';
import TweaksPanel from './components/TweaksPanel.vue';
import TweakSection from './components/TweakSection.vue';
import TweakRadio from './components/TweakRadio.vue';
import ChannelDrawer from './components/ChannelDrawer.vue';
import AddSourceModal from './components/AddSourceModal.vue';
import LogsDrawer from './components/LogsDrawer.vue';
import { PLAYLISTS, EPG_SOURCES, ACTIVE_STREAMS, bootstrapData, type Channel } from './data';
import { useTweaks } from './composables/useTweaks';
import { bus, type RestoreItem } from './composables/bus';

const { tweaks, setTweak } = useTweaks();
const router = useRouter();
const route = useRoute();

// Cross-screen UI state
const channel = ref<Channel | null>(null);
const addOpen = ref<'playlist' | 'epg' | null>(null);
const logsOpen = ref(false);
const restoreJob = ref<{ items: RestoreItem[]; idx: number; percent: number; label: string; kind: string } | null>(null);

provide('openChannel', (c: Channel) => { channel.value = c; });

const NAV = computed(() => [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', path: '/dashboard' },
  { id: 'active', label: 'Active Streams', icon: 'tv', path: '/active',
    count: ACTIVE_STREAMS.value.filter((s) => s.status !== 'bad').length, live: true },
  { id: 'playlists', label: 'Playlists', icon: 'playlist', path: '/playlists', count: PLAYLISTS.value.length },
  { id: 'epg-sources', label: 'EPG Sources', icon: 'epg', path: '/epg-sources', count: EPG_SOURCES.value.length },
  { id: 'mapping', label: 'Channel Mapping', icon: 'map', path: '/mapping' },
  { id: 'history', label: 'History / Metrics', icon: 'file', path: '/history' },
  { id: 'import', label: 'Import', icon: 'import', path: '/import' },
  { id: 'settings', label: 'Settings', icon: 'settings', path: '/settings' },
]);

function isActive(id: string) {
  const name = route.name as string | undefined;
  if (!name) return false;
  if (id === 'playlists' && name === 'playlist') return true;
  if (id === 'epg-sources' && name === 'epg-detail') return true;
  return id === name;
}

const crumbs = computed(() => {
  const name = route.name as string | undefined;
  switch (name) {
    case 'dashboard': return { title: 'Dashboard', crumb: 'Overview' };
    case 'active': return { title: 'Active Streams', crumb: `${ACTIVE_STREAMS.value.filter((s) => s.status !== 'bad').length} live now` };
    case 'playlists': return { title: 'Playlists', crumb: `${PLAYLISTS.value.length} sources` };
    case 'epg-sources': return { title: 'EPG Sources', crumb: `${EPG_SOURCES.value.length} sources` };
    case 'mapping': return { title: 'Channel Mapping', crumb: 'M3U ↔ EPG' };
    case 'history': return { title: 'History / Metrics', crumb: 'Streaming history' };
    case 'import': return { title: 'Import', crumb: 'M3U / XMLTV' };
    case 'settings': return { title: 'Settings', crumb: 'Workspace' };
    case 'playlist': {
      const p = PLAYLISTS.value.find((x) => x.id === route.params.id) || PLAYLISTS.value[0];
      return { title: p?.name ?? '', parent: 'Playlists', parentPath: '/playlists', crumb: p?.name ?? '' };
    }
    case 'epg-detail': {
      const e = EPG_SOURCES.value.find((x) => x.id === route.params.id) || EPG_SOURCES.value[0];
      return { title: e?.name ?? '', parent: 'EPG Sources', parentPath: '/epg-sources', crumb: e?.name ?? '' };
    }
    default: return { title: '', crumb: '' };
  }
});

const screenFlex = computed(() =>
  (route.name === 'epg-detail' || route.name === 'active')
    ? { display: 'flex', flexDirection: 'column' as const } : null);

function go(path: string) { router.push(path); channel.value = null; }

function onRestoreStart(payload: { items: RestoreItem[] }) {
  const items = payload.items || [];
  if (!items.length) return;
  const ticksPerItem = 5;
  const totalTicks = items.length * ticksPerItem;
  let tick = 0;
  restoreJob.value = { items, idx: 0, percent: 0, label: items[0].text, kind: items[0].kind };
  const id = window.setInterval(() => {
    tick++;
    const pct = Math.min(100, Math.round((tick / totalTicks) * 100));
    const idx = Math.min(items.length - 1, Math.floor(tick / ticksPerItem));
    const item = items[idx];
    restoreJob.value = { items, idx, percent: pct, label: item.text, kind: item.kind };
    if (tick >= totalTicks) {
      clearInterval(id);
      setTimeout(() => { restoreJob.value = null; bus.emit('tvapp:restore-done'); }, 520);
    }
  }, 220);
}

onMounted(() => {
  bus.on('tvapp:restore-start', onRestoreStart);
  bootstrapData().catch((err) => console.error('[bootstrap] failed:', err));
});
onBeforeUnmount(() => bus.off('tvapp:restore-start', onRestoreStart));
</script>

<template>
  <div class="app">
    <aside class="sidebar">
      <div class="brand">
        <span class="brand-dot" />
        TVApp2
      </div>
      <div class="nav-group-label">Workspace</div>
      <div v-for="n in NAV.slice(0, 6)" :key="n.id"
           :class="['nav-item', { active: isActive(n.id) }]" @click="go(n.path)">
        <Icon :name="n.icon" />
        <span>{{ n.label }}</span>
        <span v-if="n.live" class="dot good pulse" style="width: 6px; height: 6px;" />
        <span v-if="n.count !== undefined" class="count">{{ n.count }}</span>
      </div>
      <div class="nav-group-label">Actions</div>
      <div v-for="n in NAV.slice(6)" :key="n.id"
           :class="['nav-item', { active: isActive(n.id) }]" @click="go(n.path)">
        <Icon :name="n.icon" />
        <span>{{ n.label }}</span>
      </div>

      <div class="sidebar-foot-stack">
        <button class="logs-btn" @click="logsOpen = true">
          <span class="logs-btn-ico">
            <Icon name="file" :size="14" />
            <span class="dot good pulse" style="width: 6px; height: 6px;" />
          </span>
          <span style="flex: 1; text-align: left;">View logs</span>
          <span class="mono" style="font-size: 10px; color: var(--text-3);">live</span>
        </button>
        <div class="sidebar-foot">
          <div class="avatar">EB</div>
          <div style="min-width: 0;">
            <div class="name">Elena Bell</div>
            <div class="plan">Pro · 3 workspaces</div>
          </div>
        </div>
      </div>
    </aside>

    <main class="main">
      <header class="topbar">
        <h1>{{ crumbs.title }}</h1>
        <template v-if="restoreJob">
          <div class="restore-strip" role="status" aria-live="polite">
            <div class="restore-strip-line">
              <Icon :name="restoreJob.kind || 'refresh'" :size="12" />
              <span class="restore-strip-action">Restoring</span>
              <span class="restore-strip-label">{{ restoreJob.label }}</span>
            </div>
            <div class="restore-strip-bar">
              <div class="restore-strip-fill" :style="{ width: restoreJob.percent + '%' }" />
            </div>
            <span class="restore-strip-pct mono">{{ restoreJob.percent }}%</span>
          </div>
        </template>
        <template v-else>
          <span class="crumb" style="margin-left: 6px;">
            <template v-if="crumbs.parent">
              <span style="cursor: default;" @click="go(crumbs.parentPath!)">{{ crumbs.parent }}</span>
              <span style="color: var(--text-3); margin: 0 6px;">›</span>
            </template>
            {{ crumbs.crumb }}
          </span>
          <span class="topbar-spacer" />
        </template>
        <button class="theme-toggle"
                @click="setTweak('theme', tweaks.theme === 'dark' ? 'light' : 'dark')"
                :title="tweaks.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
                aria-label="Toggle theme">
          <span :class="['theme-toggle-thumb', tweaks.theme === 'dark' ? 'is-dark' : 'is-light']">
            <Icon :name="tweaks.theme === 'dark' ? 'moon' : 'sun'" :size="13" />
          </span>
          <span class="theme-toggle-ico"><Icon name="sun" :size="13" /></span>
          <span class="theme-toggle-ico"><Icon name="moon" :size="13" /></span>
        </button>
        <Btn v-if="route.name === 'dashboard'" variant="primary" icon="plus" @click="go('/import')">New source</Btn>
      </header>

      <div class="screen" :style="screenFlex || undefined">
        <router-view v-slot="{ Component }">
          <component :is="Component" @add="(k) => addOpen = k" />
        </router-view>
      </div>
    </main>

    <ChannelDrawer v-if="channel" :ch="channel" @close="channel = null" />
    <AddSourceModal v-if="addOpen" :kind="addOpen" @close="addOpen = null" />
    <LogsDrawer v-if="logsOpen" @close="logsOpen = false" />

    <TweaksPanel title="Tweaks">
      <TweakSection label="Theme" />
      <TweakRadio label="Mode" :value="tweaks.theme" :options="['light', 'dark']"
                  @change="(v) => setTweak('theme', v as any)" />
      <TweakSection label="Layout" />
      <TweakRadio label="Density" :value="tweaks.density" :options="['compact', 'regular', 'spacious']"
                  @change="(v) => setTweak('density', v as any)" />
      <TweakSection label="EPG view" />
      <TweakRadio label="Style" :value="tweaks.epgMode" :options="['timeline', 'list']"
                  @change="(v) => setTweak('epgMode', v as any)" />
    </TweaksPanel>
  </div>
</template>
