<script setup lang="ts">
import { ref, computed, inject, watch, watchEffect } from 'vue';
import Icon from '../components/Icon.vue';
import Btn from '../components/Btn.vue';
import Pill from '../components/Pill.vue';
import Checkbox from '../components/Checkbox.vue';
import StatusDot from '../components/StatusDot.vue';
import Segmented from '../components/Segmented.vue';
import SearchInput from '../components/SearchInput.vue';
import ChannelLogo from '../components/ChannelLogo.vue';
import ChannelBulkDrawer from '../components/ChannelBulkDrawer.vue';
import PlaylistStatusDrawer from '../components/PlaylistStatusDrawer.vue';
import { usePlaylistStatus } from '../composables/useSettings';
import Stat from '../components/Stat.vue';
import { GROUPS, CUSTOM_PLAYLISTS, type Playlist, type Channel, type CustomPlaylist } from '../data';

const props = defineProps<{ id: string }>();
const openChannel = inject<(c: Channel) => void>('openChannel')!;

const PLACEHOLDER: Playlist = {
  id: '', name: '…', url: '', channels: 0, groups: 0,
  lastSync: '', status: 'good', auto: false, interval: '',
};
const playlistRef = ref<Playlist>(PLACEHOLDER);
const playlist = computed(() => playlistRef.value);

const view = ref<'table' | 'grid'>('table');
const search = ref('');
const group = ref('all');
const selected = ref<Set<string>>(new Set());
const editingId = ref<string | null>(null);
const channels = ref<Channel[]>([]);

watchEffect(async () => {
  const id = props.id;
  if (!id) return;
  const [pRes, cRes] = await Promise.all([
    fetch(`/api/playlists/${encodeURIComponent(id)}`),
    fetch(`/api/playlists/${encodeURIComponent(id)}/channels`),
  ]);
  if (pRes.ok) playlistRef.value = await pRes.json();
  if (cRes.ok) channels.value = await cRes.json();
});
const customAction = ref<null | 'create' | 'append'>(null);
const customPlaylists = ref<CustomPlaylist[]>([]);
watch(CUSTOM_PLAYLISTS, (v) => { customPlaylists.value = [...v]; }, { immediate: true });
const toast = ref<{ kind: string; text: string } | null>(null);
const bulkOpen = ref(false);
const statusOpen = ref(false);
const plStatus = computed(() => usePlaylistStatus(playlist.value.id));
const lastSelectedId = ref<string | null>(null);

function onRowClick(c: Channel, e: MouseEvent) {
  const mod = e.ctrlKey || e.metaKey;
  if (mod && e.shiftKey) {
    selectRange(c.id);
    lastSelectedId.value = c.id;
    return;
  }
  if (mod) {
    toggleSel(c.id);
    lastSelectedId.value = c.id;
    return;
  }
  if (selected.value.size >= 2) bulkOpen.value = true;
  else openChannel(c);
}

function selectRange(toId: string) {
  const ids = filtered.value.map((c) => c.id);
  const toIdx = ids.indexOf(toId);
  if (toIdx < 0) return;
  const fromIdx = lastSelectedId.value ? ids.indexOf(lastSelectedId.value) : -1;
  const startIdx = fromIdx < 0 ? toIdx : Math.min(fromIdx, toIdx);
  const endIdx = Math.max(fromIdx < 0 ? toIdx : fromIdx, toIdx);
  const n = new Set(selected.value);
  for (let i = startIdx; i <= endIdx; i++) n.add(ids[i]);
  selected.value = n;
}

function applyBulk(payload: { state?: Channel['state']; group?: string; source?: string }) {
  if (!payload.state && !payload.group && !payload.source) {
    bulkOpen.value = false;
    return;
  }
  const ids = selected.value;
  const n = ids.size;
  channels.value = channels.value.map((c) =>
    ids.has(c.id)
      ? { ...c, ...(payload.state ? { state: payload.state } : {}), ...(payload.group ? { group: payload.group } : {}), ...(payload.source ? { source: payload.source } : {}) }
      : c
  );
  const parts: string[] = [];
  if (payload.state) parts.push(`state → ${payload.state}`);
  if (payload.group) parts.push(`group → ${payload.group}`);
  if (payload.source) parts.push(`source → ${payload.source}`);
  toast.value = { kind: 'edit', text: `Updated ${n} channel${n === 1 ? '' : 's'} · ${parts.join(', ')}` };
  bulkOpen.value = false;
  selected.value = new Set();
}

watch(toast, (v) => { if (v) setTimeout(() => toast.value = null, 3200); });

// Live sync for (Default) source playlists: re-runs the source adapter on the server, upserts the
// channels, and refreshes this view. (Bundled baseline already seeded the data on boot.)
const syncing = ref(false);
const playlistSource = computed(() => playlist.value.source ?? null);
async function reload() {
  const [pRes, cRes] = await Promise.all([
    fetch(`/api/playlists/${encodeURIComponent(props.id)}`),
    fetch(`/api/playlists/${encodeURIComponent(props.id)}/channels`),
  ]);
  if (pRes.ok) playlistRef.value = await pRes.json();
  if (cRes.ok) channels.value = await cRes.json();
}
async function syncNow() {
  const src = playlistSource.value;
  if (!src || syncing.value) return;
  syncing.value = true;
  try {
    const res = await fetch(`/api/sources/${encodeURIComponent(src)}/sync`, { method: 'POST' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const result = await res.json();
    await reload();
    toast.value = { kind: 'sync', text: `Synced ${result.count ?? ''} channels${result.live === false ? ' (snapshot)' : ''}`.trim() };
  } catch (err) {
    toast.value = { kind: 'sync', text: `Sync failed: ${(err as Error).message}` };
  } finally {
    syncing.value = false;
  }
}

const filtered = computed(() => channels.value.filter((c) =>
  (group.value === 'all' || c.group === group.value) &&
  (search.value === '' || c.tvg_name.toLowerCase().includes(search.value.toLowerCase()))
));

const selectedChannels = computed(() => channels.value.filter((c) => selected.value.has(c.id)));

// Group filter options derive from the loaded channels (source playlists use the source's own group
// taxonomy, e.g. dulo categories), falling back to the canonical GROUPS when none are loaded.
const groupOptions = computed(() => {
  const s = new Set(channels.value.map((c) => c.group).filter(Boolean));
  return s.size ? [...s].sort() : GROUPS;
});

function toggleSel(id: string) {
  const n = new Set(selected.value);
  if (n.has(id)) n.delete(id); else n.add(id);
  selected.value = n;
  lastSelectedId.value = id;
}
function toggleAll() {
  if (selected.value.size === filtered.value.length) selected.value = new Set();
  else selected.value = new Set(filtered.value.map((c) => c.id));
}
function rename(id: string, name: string) {
  channels.value = channels.value.map((c) => c.id === id ? { ...c, tvg_name: name } : c);
}
function onRenameBlur(id: string, e: FocusEvent) {
  rename(id, (e.target as HTMLInputElement).value);
  editingId.value = null;
}
function onRenameKey(id: string, e: KeyboardEvent) {
  if (e.key === 'Enter') { rename(id, (e.target as HTMLInputElement).value); editingId.value = null; }
  if (e.key === 'Escape') editingId.value = null;
}

// Create modal state
const createName = ref('My Custom Playlist');
const slugTouched = ref(false);
const createSlug = ref('my-custom-playlist');
function slugify(s: string) { return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48); }
watch(createName, (v) => { if (!slugTouched.value) createSlug.value = slugify(v) || 'custom-playlist'; });
const existingSlugs = computed(() => customPlaylists.value.map((p) => p.slug));
const slugConflict = computed(() => existingSlugs.value.includes(createSlug.value));
const slugOk = computed(() => createSlug.value.length > 0 && /^[a-z0-9-]+$/.test(createSlug.value) && !slugConflict.value);
const nameOk = computed(() => createName.value.trim().length > 0);
const canSubmitCreate = computed(() => nameOk.value && slugOk.value);

function openCreate() {
  createName.value = 'My Custom Playlist';
  slugTouched.value = false;
  createSlug.value = 'my-custom-playlist';
  customAction.value = 'create';
}
function doCreate() {
  if (!canSubmitCreate.value) return;
  const id = 'cust-' + createSlug.value + '-' + Date.now().toString(36);
  customPlaylists.value = [{ id, name: createName.value.trim(), slug: createSlug.value, channels: selectedChannels.value.length, updated: 'just now' }, ...customPlaylists.value];
  toast.value = { kind: 'create', text: `Created "${createName.value.trim()}" · ${selectedChannels.value.length} channels` };
  customAction.value = null;
  selected.value = new Set();
}

// Append modal state
const targetId = ref('');
function openAppend() {
  targetId.value = customPlaylists.value[0]?.id || '';
  customAction.value = 'append';
}
const target = computed(() => customPlaylists.value.find((p) => p.id === targetId.value));
const newTotal = computed(() => target.value ? target.value.channels + selectedChannels.value.length : 0);
function doAppend() {
  if (!target.value) return;
  customPlaylists.value = customPlaylists.value.map((p) =>
    p.id === target.value!.id ? { ...p, channels: p.channels + selectedChannels.value.length, updated: 'just now' } : p
  );
  toast.value = { kind: 'append', text: `Appended ${selectedChannels.value.length} channel${selectedChannels.value.length === 1 ? '' : 's'} to "${target.value!.name}"` };
  customAction.value = null;
  selected.value = new Set();
}
</script>

<template>
  <div class="col">
    <div class="card" style="display: flex; align-items: center; gap: 16px;">
      <div :class="['src-ico', { builtin: playlist.builtin }]" style="width: 52px; height: 52px; border-radius: 12px;">
        <Icon :name="playlist.builtin ? 'tv' : 'playlist'" :size="22" />
      </div>
      <div style="flex: 1;">
        <div class="row" style="gap: 10px;">
          <h2 style="margin: 0; font-size: 18px; font-weight: 600;">{{ playlist.name }}</h2>
          <StatusDot :status="playlist.status" :pulse="playlist.status === 'good'" />
          <Pill v-if="playlist.builtin" tone="system"><Icon name="check" :size="10" />built-in</Pill>
          <Pill tone="cyan">{{ playlist.interval }}</Pill>
        </div>
        <div class="src-url" style="margin-top: 4px;">{{ playlist.url }}</div>
        <div v-if="playlist.builtin" class="muted" style="font-size: var(--fs-xs); margin-top: 6px;">
          Ships with TVApp2 · channels are preconfigured and auto-updated with the app.
        </div>
      </div>
      <div class="row" style="gap: 18px;">
        <Btn variant="ghost" icon="globe" @click="statusOpen = true">
          Status
          <Pill :tone="plStatus.active ? 'active' : 'disabled'" style="margin-left: 6px;">
            {{ plStatus.active ? 'Active' : 'Inactive' }}
          </Pill>
        </Btn>
        <Stat label="Channels" :value="playlist.channels" />
        <Stat label="Groups" :value="playlist.groups" />
        <Stat label="Synced" :value="playlist.lastSync" small />
      </div>
      <Btn v-if="playlistSource" variant="ghost" icon="refresh" :disabled="syncing" @click="syncNow">
        {{ syncing ? 'Syncing…' : 'Sync now' }}
      </Btn>
      <Btn v-else-if="!playlist.builtin" variant="ghost" icon="refresh">Sync now</Btn>
      <Btn variant="ghost" icon="more" />
    </div>

    <div class="card flush">
      <div class="toolbar">
        <SearchInput :value="search" @change="(v) => search = v" placeholder="Search channels" />
        <div class="select">
          <select v-model="group">
            <option value="all">All groups</option>
            <option v-for="g in groupOptions" :key="g">{{ g }}</option>
          </select>
        </div>
        <Pill>{{ filtered.length }} of {{ channels.length }}</Pill>

        <span class="spacer" />

        <template v-if="selected.size > 0">
          <Pill tone="cyan">{{ selected.size }} selected</Pill>
          <Btn variant="primary" size="sm" icon="plus" @click="openCreate">Create</Btn>
          <Btn variant="ghost" size="sm" icon="playlist" @click="openAppend">Append</Btn>
          <span class="tbar-sep" aria-hidden="true" />
          <Btn variant="ghost" size="sm" icon="trash">Delete</Btn>
          <Btn variant="ghost" size="sm" @click="selected = new Set()">Clear</Btn>
        </template>
        <Segmented v-else :value="view" @change="(v) => view = v as any" :options="[
          { value: 'table', label: 'Table', icon: 'list' },
          { value: 'grid', label: 'Grid', icon: 'grid' },
        ]" />
      </div>

      <table v-if="view === 'table'" class="tbl">
        <thead>
          <tr>
            <th style="width: 40px;">
              <Checkbox :on="selected.size > 0 && selected.size === filtered.length" @change="toggleAll" />
            </th>
            <th style="width: 60px;">#</th>
            <th>Channel</th>
            <th>Group</th>
            <th>Source</th>
            <th>TVG-ID</th>
            <th>State</th>
            <th>EPG</th>
            <th style="width: 80px;">Stream</th>
            <th style="width: 60px;" />
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in filtered" :key="c.id" :class="{ selected: selected.has(c.id) }" @click="onRowClick(c, $event)">
            <td @click.stop>
              <Checkbox :on="selected.has(c.id)" @change="toggleSel(c.id)" />
            </td>
            <td class="mono muted">{{ c.channel ?? '—' }}</td>
            <td>
              <div class="row" style="gap: 10px;">
                <ChannelLogo :ch="c" />
                <input v-if="editingId === c.id" :value="c.tvg_name"
                       @blur="onRenameBlur(c.id, $event)" @keydown="onRenameKey(c.id, $event)"
                       @click.stop
                       style="background: var(--bg-2); border: 1px solid var(--accent); border-radius: 6px; padding: 3px 8px; color: var(--text-0); font-weight: 500; width: 200px; box-shadow: 0 0 0 3px var(--accent-soft);" />
                <span v-else style="font-weight: 500;" @dblclick.stop="editingId = c.id" title="Double-click to rename">{{ c.tvg_name }}</span>
                <Pill v-if="c.res">{{ c.res }}</Pill>
              </div>
            </td>
            <td class="muted">{{ c.group }}</td>
            <td><Pill tone="cyan">{{ c.source }}</Pill></td>
            <td class="mono muted">
              <template v-if="c.tvg_id">{{ c.tvg_id }}</template>
              <span v-else style="color: var(--text-3);">—</span>
            </td>
            <td>
              <Pill :tone="c.state === 'active' ? 'active' : 'disabled'">
                {{ c.state === 'active' ? 'active' : 'disabled' }}
              </Pill>
            </td>
            <td>
              <Pill v-if="c.epg === 'matched'" tone="good"><Icon name="check" :size="11" />matched</Pill>
              <Pill v-else-if="c.epg === 'unmatched'" tone="warn"><Icon name="warn" :size="11" />no match</Pill>
              <span v-else style="color: var(--text-3);">—</span>
            </td>
            <td>
              <div class="row" style="gap: 6px;">
                <template v-if="c.status">
                  <StatusDot :status="c.status" :pulse="c.status === 'good'" />
                  <span class="muted" style="font-size: var(--fs-xs);">
                    {{ c.status === 'good' ? 'live' : c.status === 'warn' ? 'slow' : 'down' }}
                  </span>
                </template>
                <span v-else class="muted" style="font-size: var(--fs-xs); color: var(--text-3);">—</span>
              </div>
            </td>
            <td @click.stop><Btn variant="ghost" size="sm" icon="more" /></td>
          </tr>
        </tbody>
      </table>

      <div v-else class="ch-grid">
        <div v-for="c in filtered" :key="c.id" :class="['ch-card', { selected: selected.has(c.id) }]" @click="onRowClick(c, $event)">
          <div class="cbx-pos">
            <Checkbox :on="selected.has(c.id)" @change="toggleSel(c.id)" />
          </div>
          <div class="top">
            <ChannelLogo :ch="c" size="lg" />
            <div style="min-width: 0;">
              <div class="name">{{ c.tvg_name }}</div>
              <div class="meta mono" style="margin-top: 4px;">#{{ c.channel ?? '—' }}<template v-if="c.res"> · {{ c.res }}</template></div>
            </div>
          </div>
          <div class="meta">{{ c.group }}</div>
          <div class="row">
            <Pill :tone="c.state === 'active' ? 'active' : 'disabled'">
              {{ c.state === 'active' ? 'active' : 'disabled' }}
            </Pill>
            <Pill v-if="c.epg === 'matched'" tone="good"><Icon name="check" :size="11" />EPG</Pill>
            <Pill v-else-if="c.epg === 'unmatched'" tone="warn">no EPG</Pill>
            <Pill tone="cyan">{{ c.source }}</Pill>
            <span class="spacer" />
            <StatusDot v-if="c.status" :status="c.status" :pulse="c.status === 'good'" />
          </div>
        </div>
      </div>
    </div>

    <!-- Create modal -->
    <div v-if="customAction === 'create'" class="modal-bg" @click="customAction = null">
      <div class="modal" @click.stop style="width: 520px; max-width: 92vw;">
        <div class="modal-hd">
          <Icon name="plus" :size="18" />
          <h2>New custom playlist</h2>
          <span class="spacer" />
          <Btn variant="ghost" size="sm" icon="x" @click="customAction = null" />
        </div>
        <div class="modal-body">
          <div class="row" style="gap: 8px; padding: 8px 10px; background: var(--accent-soft); border-radius: 8px; align-items: center;">
            <Icon name="playlist" :size="13" style="color: var(--accent-hi);" />
            <span style="font-size: var(--fs-sm); color: var(--text-1);">
              <b style="color: var(--accent-hi);">{{ selectedChannels.length }}</b>
              selected channel{{ selectedChannels.length === 1 ? '' : 's' }} will be added to the new playlist.
            </span>
          </div>

          <div class="form-row">
            <div class="field-lbl">Playlist name</div>
            <div class="input"><input v-model="createName" placeholder="e.g. Saturday Football" /></div>
          </div>

          <div class="form-row">
            <div class="field-lbl">URL path</div>
            <div :class="['input', { 'input-bad': createSlug && !slugOk }]" style="padding-left: 0;">
              <span class="mono" style="padding: 0 8px 0 12px; color: var(--text-3); font-size: var(--fs-xs); border-right: 1px solid var(--hairline); align-self: stretch; display: flex; align-items: center;">/playlists/</span>
              <input class="mono" style="font-size: var(--fs-sm);"
                     :value="createSlug"
                     @input="(e) => { createSlug = (e.target as HTMLInputElement).value.toLowerCase(); slugTouched = true; }"
                     placeholder="my-playlist" />
            </div>
            <div class="muted" style="font-size: var(--fs-xs); margin-top: 6px; display: flex; align-items: center; gap: 6px;">
              <span v-if="slugConflict" style="color: var(--bad);"><Icon name="x" :size="11" /> A custom playlist already uses this path.</span>
              <span v-else-if="createSlug && !slugOk" style="color: var(--bad);"><Icon name="x" :size="11" /> Use lowercase letters, numbers and dashes only.</span>
              <template v-else>
                <Icon name="link" :size="11" />
                Access at <span class="mono" style="color: var(--text-1);">https://tvapp2.example.com/playlists/{{ createSlug || '…' }}.m3u</span>
              </template>
            </div>
          </div>

          <div style="border: 1px solid var(--hairline); border-radius: 10px; padding: 10px 12px; background: var(--bg-2); max-height: 168px; overflow: auto;">
            <div class="row" style="gap: 8px; margin-bottom: 8px;">
              <Icon name="check" :size="13" style="color: var(--good);" />
              <span style="font-weight: 600; font-size: var(--fs-sm);">Channels to include</span>
              <span class="spacer" />
              <Pill tone="cyan">{{ selectedChannels.length }}</Pill>
            </div>
            <div v-for="c in selectedChannels.slice(0, 8)" :key="c.id" class="row" style="gap: 8px; padding: 3px 0; font-size: var(--fs-sm);">
              <span class="mono muted" style="font-size: var(--fs-xs); min-width: 32px;">#{{ c.channel }}</span>
              <span style="font-weight: 500;">{{ c.tvg_name }}</span>
              <span class="muted" style="font-size: var(--fs-xs);">· {{ c.group }}</span>
            </div>
            <div v-if="selectedChannels.length > 8" class="muted" style="font-size: var(--fs-xs); padding-top: 6px;">
              + {{ selectedChannels.length - 8 }} more
            </div>
          </div>
        </div>
        <div class="modal-ft">
          <span class="spacer" />
          <Btn variant="ghost" @click="customAction = null">Cancel</Btn>
          <Btn variant="primary" icon="plus" :disabled="!canSubmitCreate" @click="doCreate">Create playlist</Btn>
        </div>
      </div>
    </div>

    <!-- Append modal -->
    <div v-if="customAction === 'append'" class="modal-bg" @click="customAction = null">
      <div class="modal" @click.stop style="width: 520px; max-width: 92vw;">
        <div class="modal-hd">
          <Icon name="playlist" :size="18" />
          <h2>Append to custom playlist</h2>
          <span class="spacer" />
          <Btn variant="ghost" size="sm" icon="x" @click="customAction = null" />
        </div>
        <div class="modal-body">
          <div class="row" style="gap: 8px; padding: 8px 10px; background: var(--accent-soft); border-radius: 8px; align-items: center;">
            <Icon name="playlist" :size="13" style="color: var(--accent-hi);" />
            <span style="font-size: var(--fs-sm); color: var(--text-1);">
              <b style="color: var(--accent-hi);">{{ selectedChannels.length }}</b>
              selected channel{{ selectedChannels.length === 1 ? '' : 's' }} will be appended to the playlist you choose.
            </span>
          </div>

          <div v-if="customPlaylists.length === 0" class="empty" style="padding: 28px 20px; text-align: center;">
            <h3 style="margin: 0; font-size: var(--fs-base);">No custom playlists yet</h3>
            <p class="muted" style="font-size: var(--fs-sm); margin: 6px 0 0;">
              Use <b>Create</b> to make your first custom playlist.
            </p>
          </div>
          <template v-else>
            <div class="form-row">
              <div class="field-lbl">Destination playlist</div>
              <div class="select">
                <select v-model="targetId">
                  <option v-for="p in customPlaylists" :key="p.id" :value="p.id">{{ p.name }} — {{ p.channels }} channels</option>
                </select>
              </div>
            </div>

            <div v-if="target" style="border: 1px solid var(--hairline); border-radius: 10px; padding: 12px 14px; background: var(--bg-2); display: grid; gap: 10px;">
              <div class="row" style="gap: 10px;">
                <div class="src-ico" style="width: 40px; height: 40px; border-radius: 10px;">
                  <Icon name="playlist" :size="16" />
                </div>
                <div style="flex: 1; min-width: 0;">
                  <div style="font-weight: 600; font-size: var(--fs-sm);">{{ target.name }}</div>
                  <div class="mono muted" style="font-size: var(--fs-xs); margin-top: 2px;">/playlists/{{ target.slug }}.m3u</div>
                </div>
                <div class="muted" style="font-size: var(--fs-xs);">updated {{ target.updated }}</div>
              </div>
              <div class="row" style="gap: 10px; align-items: center; padding-top: 8px; border-top: 1px dashed var(--hairline);">
                <Stat label="Now" :value="target.channels" small />
                <span style="color: var(--text-3); font-size: 18px;">→</span>
                <Stat label="After append" :value="newTotal" small>
                  <span style="color: var(--accent-hi);">{{ newTotal }}</span>
                </Stat>
                <span class="spacer" />
                <Pill tone="cyan">+{{ selectedChannels.length }}</Pill>
              </div>
            </div>
          </template>
        </div>
        <div class="modal-ft">
          <span class="spacer" />
          <Btn variant="ghost" @click="customAction = null">Cancel</Btn>
          <Btn variant="primary" icon="check" :disabled="!target" @click="doAppend">
            Append {{ selectedChannels.length }} channel{{ selectedChannels.length === 1 ? '' : 's' }}
          </Btn>
        </div>
      </div>
    </div>

    <ChannelBulkDrawer
      v-if="bulkOpen"
      :channels="selectedChannels"
      @close="bulkOpen = false"
      @apply="applyBulk"
    />

    <PlaylistStatusDrawer
      v-if="statusOpen"
      :playlist="playlist"
      :channels="channels"
      @close="statusOpen = false"
    />

    <div v-if="toast" class="custom-toast">
      <Icon :name="toast.kind === 'create' ? 'plus' : 'playlist'" :size="14" />
      <span>{{ toast.text }}</span>
      <button class="custom-toast-x" @click="toast = null" aria-label="Dismiss">
        <Icon name="x" :size="12" />
      </button>
    </div>
  </div>
</template>
