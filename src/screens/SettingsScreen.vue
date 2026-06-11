<script setup lang="ts">
import { ref, reactive, computed, onMounted, onBeforeUnmount, watch, watchEffect } from 'vue';
import Icon from '../components/Icon.vue';
import Btn from '../components/Btn.vue';
import Pill from '../components/Pill.vue';
import Toggle from '../components/Toggle.vue';
import SettingsRow from '../components/SettingsRow.vue';
import EndpointField from '../components/EndpointField.vue';
import { PLAYLISTS, EPG_SOURCES, type Playlist, type EpgSource } from '../data';
import { bus, type RestoreItem } from '../composables/bus';
import { displayName, domain, m3uPath, epgPath } from '../composables/useSettings';

const SCHEDULE_PRESETS = [
  { label: 'Every 15 minutes', cron: '*/15 * * * *', next: 'in 8 min' },
  { label: 'Every 30 minutes', cron: '*/30 * * * *', next: 'in 22 min' },
  { label: 'Every hour', cron: '0 * * * *', next: 'in 38 min' },
  { label: 'Every 6 hours', cron: '0 */6 * * *', next: 'in 3h 12m' },
  { label: 'Every 12 hours', cron: '0 */12 * * *', next: 'in 8h 41m' },
  { label: 'Daily at 03:00', cron: '0 3 * * *', next: 'tomorrow 03:00' },
  { label: 'Daily at 06:00', cron: '0 6 * * *', next: 'tomorrow 06:00' },
  { label: 'Weekly (Sun 04:00)', cron: '0 4 * * 0', next: 'Sun 04:00' },
];

function defaultCronFor(src: Playlist | EpgSource): string {
  if (src.interval === 'Every 6 hours') return '0 */6 * * *';
  if (src.interval === 'Every 12 hours') return '0 */12 * * *';
  if (src.interval === 'Daily') return '0 3 * * *';
  if (src.interval === 'Auto-updated') return '0 */6 * * *';
  return '0 3 * * *';
}
function nextRunForCron(cron: string): string {
  return SCHEDULE_PRESETS.find((p) => p.cron === cron)?.next || '—';
}

const autoSync = ref(true);
const autoMatch = ref(true);
const notif = ref(false);
const tz = ref('Europe/London');
const openPlaylists = ref(false);
const openEpg = ref(false);
const restoreState = ref<'idle' | 'confirm' | 'restoring' | 'done'>('idle');
const editingCronId = ref<string | null>(null);

const builtInPlaylists = computed(() => PLAYLISTS.value.filter((p) => p.builtin).length);
const builtInEpg = computed(() => EPG_SOURCES.value.filter((e) => e.builtin).length);

const schedules = reactive<Record<string, { cron: string; enabled: boolean }>>({});
watchEffect(() => {
  for (const src of [...PLAYLISTS.value, ...EPG_SOURCES.value]) {
    if (!schedules[src.id]) schedules[src.id] = { cron: defaultCronFor(src), enabled: true };
  }
});

function updateSched(id: string, patch: Partial<{ cron: string; enabled: boolean }>) {
  schedules[id] = { ...schedules[id], ...patch };
}

watch(restoreState, (v) => {
  if (v === 'done') setTimeout(() => restoreState.value = 'idle', 2200);
});

function onDone() { restoreState.value = 'done'; }
onMounted(() => bus.on('tvapp:restore-done', onDone));
onBeforeUnmount(() => bus.off('tvapp:restore-done', onDone));

function fireRestore() {
  const items: RestoreItem[] = [];
  PLAYLISTS.value.filter((p) => p.builtin).forEach((p) => {
    items.push({ kind: 'playlist', text: `Fetching playlist · ${p.name}` });
    items.push({ kind: 'playlist', text: `Indexing channels · ${p.name}` });
  });
  EPG_SOURCES.value.filter((e) => e.builtin).forEach((e) => {
    items.push({ kind: 'epg', text: `Downloading EPG · ${e.name}` });
    items.push({ kind: 'epg', text: `Parsing programmes · ${e.name}` });
  });
  items.push({ kind: 'refresh', text: 'Rebuilding workspace cache' });
  bus.emit('tvapp:restore-start', { items });
  restoreState.value = 'restoring';
}

function presetMatch(cron: string) {
  return SCHEDULE_PRESETS.some((p) => p.cron === cron);
}

function onCronSelect(id: string, val: string) {
  if (val === '__custom') { editingCronId.value = id; return; }
  updateSched(id, { cron: val });
}

function onCronBlur(id: string, e: Event) {
  updateSched(id, { cron: (e.target as HTMLInputElement).value });
  editingCronId.value = null;
}

function onCronKey(id: string, e: KeyboardEvent) {
  if (e.key === 'Enter') { updateSched(id, { cron: (e.target as HTMLInputElement).value }); editingCronId.value = null; }
  if (e.key === 'Escape') editingCronId.value = null;
}

const builtPL = computed(() => PLAYLISTS.value.filter((p) => p.builtin));
const builtEP = computed(() => EPG_SOURCES.value.filter((e) => e.builtin));
</script>

<template>
  <div class="col" style="max-width: 760px;">
    <div class="card">
      <h3 class="section-title">General</h3>
      <div class="form-grid-2">
        <div class="form-row">
          <div class="field-lbl">Display name</div>
          <div class="input"><input v-model="displayName" /></div>
        </div>
        <div class="form-row">
          <div class="field-lbl">Domain</div>
          <div class="input mono" style="font-size: 12px;">
            <Icon name="globe" :size="14" />
            <input v-model="domain" placeholder="https://tvapp2.example.com" />
          </div>
          <div class="muted" style="font-size: var(--fs-xs); margin-top: 6px;">
            Base URL used by all hosted endpoints (M3U, EPG, per-playlist custom paths).
          </div>
        </div>
        <div class="form-row">
          <div class="field-lbl">Time zone</div>
          <div class="select">
            <select v-model="tz">
              <option>Europe/London</option>
              <option>America/New_York</option>
              <option>Europe/Berlin</option>
              <option>Asia/Tokyo</option>
            </select>
          </div>
        </div>
      </div>

      <div class="divider" style="margin: 18px 0 14px;" />

      <div class="field-lbl" style="margin-bottom: 10px;">Hosting endpoints</div>
      <div class="muted" style="font-size: var(--fs-xs); margin-top: -4px; margin-bottom: 12px;">
        Public URLs where TVApp2 will expose the consolidated M3U playlist and EPG guide to your downstream apps.
      </div>

      <EndpointField label="M3U endpoint" icon="playlist"
        :model-value="`${domain.replace(/\/$/, '')}${m3uPath}`"
        @update:model-value="(v) => m3uPath = v.startsWith(domain.replace(/\/$/, '')) ? v.slice(domain.replace(/\/$/, '').length) : v"
        mono />
      <div style="height: 10px;" />
      <EndpointField label="EPG endpoint" icon="epg" icon-color="var(--good)"
        :model-value="`${domain.replace(/\/$/, '')}${epgPath}`"
        @update:model-value="(v) => epgPath = v.startsWith(domain.replace(/\/$/, '')) ? v.slice(domain.replace(/\/$/, '').length) : v"
        mono />
    </div>

    <div class="card">
      <h3 class="section-title">Syncing</h3>
      <div class="sync-grid">
        <div class="sync-row sync-row-lvl">
          <div class="sync-meta">
            <div class="sync-lbl">Auto-sync sources</div>
            <div class="sync-hint">Refresh all playlists and EPG sources on their configured schedules.</div>
          </div>
          <div class="sync-col-sched" />
          <div class="sync-col-cron" />
          <div class="sync-col-toggle"><Toggle :on="autoSync" @change="(v) => autoSync = v" /></div>
        </div>

        <template v-if="autoSync">
          <div :class="['sync-section-hd collapsible', { open: openPlaylists }]" @click="openPlaylists = !openPlaylists">
            <Icon name="chevron-r" :size="12" class="chev" />
            <Icon name="playlist" :size="13" />
            <span>Playlists</span>
            <span class="muted" style="font-size: var(--fs-xs); font-weight: 400; margin-left: 6px;">
              {{ PLAYLISTS.length }} sources · {{ tz }}
            </span>
            <span class="spacer" />
            <Btn variant="ghost" size="sm" icon="refresh" @click.stop>Sync all</Btn>
          </div>
          <template v-if="openPlaylists">
            <div v-for="p in PLAYLISTS" :key="p.id"
                 :class="['sync-row sync-row-sched', { disabled: !schedules[p.id].enabled }]">
              <div :class="['sched-ico', { builtin: p.builtin }]">
                <Icon :name="p.builtin ? 'tv' : 'playlist'" :size="14" />
              </div>
              <div class="sync-meta">
                <div class="sync-lbl row" style="gap: 8px;">
                  {{ p.name }}
                  <Pill v-if="p.builtin" tone="system"><Icon name="check" :size="10" />built-in</Pill>
                </div>
                <div class="sync-hint" style="display: flex; align-items: center; gap: 5px;">
                  <Icon name="refresh" :size="11" />
                  Next run <b style="color: var(--text-1); font-weight: 500;">{{ nextRunForCron(schedules[p.id].cron) }}</b>
                </div>
              </div>
              <div class="sync-col-sched">
                <div v-if="editingCronId === p.id" class="input mono" style="height: 30px; width: 100%; font-size: 11px;">
                  <input :value="schedules[p.id].cron"
                         @blur="onCronBlur(p.id, $event)"
                         @keydown="onCronKey(p.id, $event)" />
                </div>
                <div v-else class="select" style="width: 100%;">
                  <select :value="presetMatch(schedules[p.id].cron) ? schedules[p.id].cron : '__custom'"
                          @change="onCronSelect(p.id, ($event.target as HTMLSelectElement).value)">
                    <option v-for="x in SCHEDULE_PRESETS" :key="x.cron" :value="x.cron">{{ x.label }}</option>
                    <option value="__custom">Custom…</option>
                    <option v-if="!presetMatch(schedules[p.id].cron)" :value="schedules[p.id].cron">Custom: {{ schedules[p.id].cron }}</option>
                  </select>
                </div>
              </div>
              <div class="sync-col-cron">
                <code class="cron-chip" @click="editingCronId = p.id" title="Click to edit cron">
                  {{ schedules[p.id].cron }}
                </code>
              </div>
              <div class="sync-col-toggle">
                <Toggle :on="schedules[p.id].enabled" @change="(v) => updateSched(p.id, { enabled: v })" />
              </div>
            </div>
          </template>

          <div :class="['sync-section-hd collapsible', { open: openEpg }]" @click="openEpg = !openEpg">
            <Icon name="chevron-r" :size="12" class="chev" />
            <Icon name="epg" :size="13" style="color: var(--good);" />
            <span>EPG Sources</span>
            <span class="muted" style="font-size: var(--fs-xs); font-weight: 400; margin-left: 6px;">
              {{ EPG_SOURCES.length }} sources · {{ tz }}
            </span>
            <span class="spacer" />
            <Btn variant="ghost" size="sm" icon="refresh" @click.stop>Sync all</Btn>
          </div>
          <template v-if="openEpg">
            <div v-for="e in EPG_SOURCES" :key="e.id"
                 :class="['sync-row sync-row-sched', { disabled: !schedules[e.id].enabled }]">
              <div :class="['sched-ico is-epg', { builtin: e.builtin, 'epg-builtin': e.builtin }]">
                <Icon :name="e.builtin ? 'tv' : 'epg'" :size="14" />
              </div>
              <div class="sync-meta">
                <div class="sync-lbl row" style="gap: 8px;">
                  {{ e.name }}
                  <Pill v-if="e.builtin" tone="system"><Icon name="check" :size="10" />built-in</Pill>
                </div>
                <div class="sync-hint" style="display: flex; align-items: center; gap: 5px;">
                  <Icon name="refresh" :size="11" />
                  Next run <b style="color: var(--text-1); font-weight: 500;">{{ nextRunForCron(schedules[e.id].cron) }}</b>
                </div>
              </div>
              <div class="sync-col-sched">
                <div v-if="editingCronId === e.id" class="input mono" style="height: 30px; width: 100%; font-size: 11px;">
                  <input :value="schedules[e.id].cron"
                         @blur="onCronBlur(e.id, $event)"
                         @keydown="onCronKey(e.id, $event)" />
                </div>
                <div v-else class="select" style="width: 100%;">
                  <select :value="presetMatch(schedules[e.id].cron) ? schedules[e.id].cron : '__custom'"
                          @change="onCronSelect(e.id, ($event.target as HTMLSelectElement).value)">
                    <option v-for="x in SCHEDULE_PRESETS" :key="x.cron" :value="x.cron">{{ x.label }}</option>
                    <option value="__custom">Custom…</option>
                    <option v-if="!presetMatch(schedules[e.id].cron)" :value="schedules[e.id].cron">Custom: {{ schedules[e.id].cron }}</option>
                  </select>
                </div>
              </div>
              <div class="sync-col-cron">
                <code class="cron-chip" @click="editingCronId = e.id" title="Click to edit cron">
                  {{ schedules[e.id].cron }}
                </code>
              </div>
              <div class="sync-col-toggle">
                <Toggle :on="schedules[e.id].enabled" @change="(v) => updateSched(e.id, { enabled: v })" />
              </div>
            </div>
          </template>
        </template>

        <div class="sync-row sync-row-lvl">
          <div class="sync-meta">
            <div class="sync-lbl">Auto-match channels to EPG</div>
            <div class="sync-hint">Run fuzzy name matching against EPG channel IDs after each import.</div>
          </div>
          <div class="sync-col-sched" />
          <div class="sync-col-cron" />
          <div class="sync-col-toggle"><Toggle :on="autoMatch" @change="(v) => autoMatch = v" /></div>
        </div>

        <div class="sync-row sync-row-lvl sync-row-last">
          <div class="sync-meta">
            <div class="sync-lbl">Email me about sync failures</div>
            <div class="sync-hint">Send a summary if more than 3% of channels go offline.</div>
          </div>
          <div class="sync-col-sched" />
          <div class="sync-col-cron" />
          <div class="sync-col-toggle"><Toggle :on="notif" @change="(v) => notif = v" /></div>
        </div>
      </div>
    </div>

    <div class="card">
      <h3 class="section-title">Data</h3>
      <div class="row">
        <Btn variant="ghost" icon="upload">Export all sources</Btn>
        <Btn variant="ghost" icon="refresh">Rebuild EPG index</Btn>
        <Btn variant="ghost" icon="trash">Clear cache</Btn>
      </div>
      <div class="divider" />
      <SettingsRow
        label="Restore built-in sources"
        :hint="`Re-add the ${builtInPlaylists} default playlist${builtInPlaylists === 1 ? '' : 's'} and ${builtInEpg} default EPG source${builtInEpg === 1 ? '' : 's'} that ship with TVApp2. Your custom sources are untouched.`">
        <template #right>
          <Btn v-if="restoreState === 'done'" variant="ghost" icon="check"><span style="color: var(--good);">Restored</span></Btn>
          <Btn v-else-if="restoreState === 'restoring'" variant="ghost" icon="refresh" disabled><span class="muted">Restoring…</span></Btn>
          <Btn v-else variant="ghost" icon="refresh" @click="restoreState = 'confirm'">Restore defaults</Btn>
        </template>
      </SettingsRow>

      <div v-if="restoreState === 'confirm'" class="modal-bg" @click="restoreState = 'idle'">
        <div class="modal" @click.stop style="width: 520px; max-width: 92vw;">
          <div class="modal-hd">
            <Icon name="refresh" :size="18" />
            <h2>Restore built-in sources?</h2>
            <span class="spacer" />
            <Btn variant="ghost" size="sm" icon="x" @click="restoreState = 'idle'" />
          </div>
          <div class="modal-body">
            <div style="font-size: var(--fs-base); color: var(--text-1); line-height: 1.5;">
              TVApp2 will re-add the default playlist and EPG sources that ship with the app.
              If any of them were previously hidden or removed, they will reappear in your workspace.
            </div>

            <div style="display: grid; gap: 10px;">
              <div v-for="group in [
                { title: 'Playlists', icon: 'playlist', items: builtPL },
                { title: 'EPG sources', icon: 'epg', items: builtEP },
              ]" :key="group.title"
                   style="border: 1px solid var(--hairline); border-radius: 10px; padding: 10px 12px; background: var(--bg-2);">
                <div class="row" style="gap: 8px; margin-bottom: 8px;">
                  <Icon :name="group.icon" :size="14" />
                  <span style="font-weight: 600; font-size: var(--fs-sm);">{{ group.title }}</span>
                  <span class="spacer" />
                  <Pill tone="cyan">{{ group.items.length }}</Pill>
                </div>
                <div v-for="it in group.items" :key="it.id" class="row"
                     style="gap: 8px; padding: 4px 0; font-size: var(--fs-sm);">
                  <span class="dot good" style="width: 6px; height: 6px;" />
                  <span style="font-weight: 500;">{{ it.name }}</span>
                  <span class="mono muted" style="font-size: var(--fs-xs);">{{ it.url }}</span>
                </div>
              </div>
            </div>

            <div class="row" style="gap: 8px; padding: 8px 10px; background: var(--accent-soft); border-radius: 8px; align-items: flex-start;">
              <span style="color: var(--accent-hi); margin-top: 1px;"><Icon name="check" :size="13" /></span>
              <span style="font-size: var(--fs-xs); color: var(--text-1); line-height: 1.5;">
                Your custom playlists, EPG sources, channel mappings, and viewing history will not be modified.
              </span>
            </div>
          </div>
          <div class="modal-ft">
            <span class="spacer" />
            <Btn variant="ghost" @click="restoreState = 'idle'">Cancel</Btn>
            <Btn variant="primary" icon="refresh" @click="fireRestore(); restoreState = 'idle'">Confirm restore</Btn>
          </div>
        </div>
      </div>

      <div class="divider" />
      <SettingsRow label="Danger zone" hint="Permanently delete all playlists, EPG data, and mappings.">
        <template #right><Btn variant="ghost" icon="trash"><span style="color: var(--bad);">Reset workspace</span></Btn></template>
      </SettingsRow>
    </div>
  </div>
</template>
