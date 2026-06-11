<script setup lang="ts">
import { ref, computed } from 'vue';
import Icon from './Icon.vue';
import Btn from './Btn.vue';
import Pill from './Pill.vue';
import Toggle from './Toggle.vue';
import { type Channel, type Playlist } from '../data';
import { domain, m3uEndpoint, usePlaylistStatus, playlistEndpoint } from '../composables/useSettings';

const props = defineProps<{ playlist: Playlist; channels: Channel[] }>();
const emit = defineEmits<{ (e: 'close'): void }>();

const status = usePlaylistStatus(props.playlist.id);

const matched = computed(() => props.channels.filter((c) => c.epg === 'matched').length);
const unmatched = computed(() => props.channels.length - matched.value);

const perGroup = computed(() => {
  const map = new Map<string, number>();
  for (const c of props.channels) map.set(c.group, (map.get(c.group) || 0) + 1);
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
});

const endpointUrl = computed(() => playlistEndpoint(props.playlist.id));
const baseDomain = computed(() => domain.value.replace(/\/$/, ''));

const copied = ref(false);
function copy() {
  try { navigator.clipboard?.writeText(endpointUrl.value); } catch {}
  copied.value = true;
  setTimeout(() => copied.value = false, 1400);
}

function setMode(m: 'global' | 'custom') { status.endpointMode = m; }
</script>

<template>
  <div class="drawer-wrap">
    <div class="glass-bg drawer-backdrop" @click="emit('close')" />
    <div class="glass drawer-panel" style="width: 50vw; max-width: 50vw; min-width: 440px;">
      <div class="drawer-hd">
        <div :class="['src-ico', { builtin: playlist.builtin }]" style="width: 44px; height: 44px; border-radius: 10px;">
          <Icon name="globe" :size="20" />
        </div>
        <div style="flex: 1;">
          <div style="font-weight: 600; font-size: 15px;">Playlist status</div>
          <div class="muted" style="font-size: var(--fs-xs); margin-top: 2px;">{{ playlist.name }}</div>
        </div>
        <Btn variant="ghost" size="sm" icon="x" @click="emit('close')" />
      </div>

      <div class="drawer-body">
        <div class="form-row">
          <div class="field-lbl">State</div>
          <div class="row" style="gap: 10px; align-items: center;">
            <Toggle :on="status.active" @change="(v) => status.active = v" />
            <Pill :tone="status.active ? 'active' : 'disabled'">
              {{ status.active ? 'Active' : 'Inactive' }}
            </Pill>
            <span class="muted" style="font-size: var(--fs-xs);">
              {{ status.active ? 'Playlist is being served at the endpoint below.' : 'Endpoint is paused. Downstream clients will receive 404.' }}
            </span>
          </div>
        </div>

        <div class="divider" />

        <div class="form-row">
          <div class="field-lbl">Endpoint</div>
          <div style="display: grid; gap: 8px;">
            <label class="row" style="gap: 10px; padding: 8px 10px; border: 1px solid var(--hairline); border-radius: 8px; cursor: pointer;"
                   :style="status.endpointMode === 'global' ? 'border-color: var(--accent); background: var(--accent-soft);' : ''">
              <input type="radio" name="endpoint-mode" :checked="status.endpointMode === 'global'" @change="setMode('global')" />
              <div style="flex: 1;">
                <div style="font-weight: 500; font-size: var(--fs-sm);">Global</div>
                <div class="muted mono" style="font-size: var(--fs-xs); margin-top: 2px;">{{ m3uEndpoint }}</div>
                <div class="muted" style="font-size: var(--fs-xs); margin-top: 2px;">Uses the M3U endpoint defined in Settings.</div>
              </div>
            </label>
            <label class="row" style="gap: 10px; padding: 8px 10px; border: 1px solid var(--hairline); border-radius: 8px; cursor: pointer; align-items: flex-start;"
                   :style="status.endpointMode === 'custom' ? 'border-color: var(--accent); background: var(--accent-soft);' : ''">
              <input type="radio" name="endpoint-mode" :checked="status.endpointMode === 'custom'" @change="setMode('custom')" style="margin-top: 4px;" />
              <div style="flex: 1;">
                <div style="font-weight: 500; font-size: var(--fs-sm);">Custom</div>
                <div class="muted" style="font-size: var(--fs-xs); margin-top: 2px; margin-bottom: 6px;">
                  Host this playlist at a custom path on the Domain from Settings.
                </div>
                <div :class="['input', 'mono']" style="font-size: 12px;" :style="status.endpointMode === 'custom' ? '' : 'opacity: 0.55; pointer-events: none;'">
                  <span class="mono" style="padding: 0 8px 0 10px; color: var(--text-3); font-size: 11px; border-right: 1px solid var(--hairline); align-self: stretch; display: flex; align-items: center;">{{ baseDomain }}</span>
                  <input v-model="status.customPath" placeholder="/playlists/my-playlist.m3u" />
                </div>
              </div>
            </label>
          </div>
        </div>

        <div class="divider" />

        <div class="form-row">
          <div class="field-lbl">Hosted at</div>
          <div class="row" style="gap: 8px;">
            <div class="input mono" style="flex: 1; font-size: 12px;">
              <Icon name="globe" :size="14" />
              <input :value="endpointUrl" readonly />
            </div>
            <Btn variant="ghost" size="sm" :icon="copied ? 'check' : 'copy'" @click="copy">
              {{ copied ? 'Copied' : 'Copy' }}
            </Btn>
          </div>
        </div>

        <div class="divider" />

        <div class="field-lbl" style="margin-bottom: 10px;">Summary</div>
        <div style="display: grid; gap: 8px;">
          <div class="row" style="gap: 10px; padding: 8px 12px; border: 1px solid var(--hairline); border-radius: 8px; background: var(--bg-2);">
            <Icon name="check" :size="13" style="color: var(--good);" />
            <span style="font-size: var(--fs-sm);">EPG matched</span>
            <span class="spacer" />
            <Pill tone="good">{{ matched }}</Pill>
          </div>
          <div class="row" style="gap: 10px; padding: 8px 12px; border: 1px solid var(--hairline); border-radius: 8px; background: var(--bg-2);">
            <Icon name="warn" :size="13" style="color: var(--warn);" />
            <span style="font-size: var(--fs-sm);">EPG unmatched</span>
            <span class="spacer" />
            <Pill tone="warn">{{ unmatched }}</Pill>
          </div>

          <div style="border: 1px solid var(--hairline); border-radius: 8px; background: var(--bg-2); padding: 8px 12px;">
            <div class="row" style="gap: 8px; margin-bottom: 6px;">
              <Icon name="grid" :size="13" />
              <span style="font-weight: 600; font-size: var(--fs-sm);">Channels per category</span>
              <span class="spacer" />
              <Pill tone="cyan">{{ perGroup.length }}</Pill>
            </div>
            <div v-for="[g, n] in perGroup" :key="g" class="row" style="gap: 8px; padding: 3px 0; font-size: var(--fs-sm);">
              <span style="font-weight: 500;">{{ g }}</span>
              <span class="spacer" />
              <span class="mono muted" style="font-size: var(--fs-xs);">{{ n }}</span>
            </div>
          </div>
        </div>

        <div class="row" style="margin-top: 6px;">
          <span class="spacer" />
          <Btn variant="primary" icon="check" @click="emit('close')">Done</Btn>
        </div>
      </div>
    </div>
  </div>
</template>
