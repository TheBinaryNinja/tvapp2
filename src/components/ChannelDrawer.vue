<script setup lang="ts">
import Icon from './Icon.vue';
import Btn from './Btn.vue';
import Pill from './Pill.vue';
import StatusDot from './StatusDot.vue';
import ChannelLogo from './ChannelLogo.vue';
import Segmented from './Segmented.vue';
import HlsPlayer from './HlsPlayer.vue';
import { GROUPS, proxyPath, type Channel } from '../data';

const props = defineProps<{ ch: Channel }>();
const emit = defineEmits<{ (e: 'close'): void }>();

function setState(v: string) {
  props.ch.state = v as Channel['state'];
}
</script>

<template>
  <div class="drawer-wrap">
    <div class="glass-bg drawer-backdrop" @click="emit('close')" />
    <div class="glass drawer-panel">
      <div class="drawer-hd">
        <ChannelLogo :ch="ch" size="lg" />
        <div style="flex: 1;">
          <div style="font-weight: 600; font-size: 15px;">{{ ch.tvg_name }}</div>
          <div class="mono muted" style="font-size: var(--fs-xs); margin-top: 2px;">
            #{{ ch.channel ?? '—' }} · {{ ch.group }}<template v-if="ch.res"> · {{ ch.res }}</template>
          </div>
        </div>
        <Btn variant="ghost" size="sm" icon="x" @click="emit('close')" />
      </div>

      <div class="drawer-body">
        <!-- Source-playlist channels stream live through the proxy; legacy mock channels keep the
             non-functional placeholder. -->
        <div class="player" v-if="ch.streamEntryUrl" style="overflow: hidden;">
          <HlsPlayer :src="proxyPath(ch)" />
        </div>
        <div class="player" v-else>
          <div class="stripes" />
          <div class="label mono">STREAM TEST<template v-if="ch.res"> · {{ ch.res }}</template></div>
          <div class="play"><div class="play-btn"><Icon name="play" :size="26" /></div></div>
          <div class="controls">
            <Icon name="pause" :size="14" />
            <span class="mono" style="font-size: 11px;">00:14</span>
            <div class="track" />
            <span class="mono" style="font-size: 11px;">LIVE</span>
          </div>
        </div>

        <div class="row" style="gap: 6px;">
          <Pill tone="good"><StatusDot status="good" /> stream live</Pill>
          <Pill tone="cyan"><Icon name="globe" :size="11" /> 1280×720</Pill>
          <Pill>h.264 / AAC</Pill>
          <span class="spacer" />
          <Btn variant="ghost" size="sm" icon="refresh">Re-test</Btn>
        </div>

        <div class="divider" />

        <div class="form-row">
          <div class="field-lbl">State</div>
          <div class="row" style="gap: 10px;">
            <Segmented :value="ch.state" @change="setState" :options="[
              { value: 'active', label: 'Active', icon: 'check' },
              { value: 'disabled', label: 'Disabled', icon: 'x' },
            ]" />
            <Pill :tone="ch.state === 'active' ? 'active' : 'disabled'">
              {{ ch.state === 'active' ? 'active' : 'disabled' }}
            </Pill>
          </div>
        </div>

        <div class="form-row">
          <div class="field-lbl">Display name</div>
          <div class="input"><input :value="ch.tvg_name" /></div>
        </div>
        <div class="form-grid-2">
          <div class="form-row">
            <div class="field-lbl">Channel number</div>
            <div class="input"><input :value="ch.channel" /></div>
          </div>
          <div class="form-row">
            <div class="field-lbl">Group</div>
            <div class="select">
              <select :value="ch.group">
                <option v-for="g in GROUPS" :key="g">{{ g }}</option>
              </select>
            </div>
          </div>
        </div>
        <div class="form-row">
          <div class="field-lbl">Source</div>
          <div class="input">
            <Icon name="playlist" :size="14" />
            <input :value="ch.source" placeholder="e.g. Default" />
          </div>
        </div>
        <div class="form-row">
          <div class="field-lbl">TVG-ID (EPG link)</div>
          <div class="input">
            <Icon name="link" :size="14" />
            <input :value="ch.tvg_id || ''" placeholder="e.g. bbc.one.uk" />
          </div>
        </div>
        <div class="form-row">
          <div class="field-lbl">URL</div>
          <div class="input mono" style="font-size: 11px;">
            <Icon name="link" :size="14" />
            <input :value="ch.url" placeholder="https://example.com/live/channel/index.m3u8" />
          </div>
        </div>

        <div class="row" style="margin-top: 6px;">
          <Btn variant="ghost" icon="trash"><span style="color: var(--bad);">Remove</span></Btn>
          <span class="spacer" />
          <Btn variant="ghost" @click="emit('close')">Cancel</Btn>
          <Btn variant="primary" icon="check" @click="emit('close')">Save changes</Btn>
        </div>
      </div>
    </div>
  </div>
</template>
