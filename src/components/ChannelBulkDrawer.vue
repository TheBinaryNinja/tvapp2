<script setup lang="ts">
import { ref, computed } from 'vue';
import Icon from './Icon.vue';
import Btn from './Btn.vue';
import Pill from './Pill.vue';
import Segmented from './Segmented.vue';
import { GROUPS, type Channel } from '../data';

const props = defineProps<{ channels: Channel[] }>();
const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'apply', payload: { state?: Channel['state']; group?: string; source?: string }): void;
}>();

const stateVal = ref<Channel['state'] | ''>('');
const groupVal = ref<string>('');
const sourceVal = ref<string>('');

const stateMixed = computed(() => {
  const s = new Set(props.channels.map((c) => c.state));
  return s.size > 1;
});
const groupMixed = computed(() => {
  const s = new Set(props.channels.map((c) => c.group));
  return s.size > 1;
});
const sourceMixed = computed(() => {
  const s = new Set(props.channels.map((c) => c.source));
  return s.size > 1;
});
const commonState = computed(() => (stateMixed.value ? '' : (props.channels[0]?.state ?? '')));
const commonGroup = computed(() => (groupMixed.value ? '' : (props.channels[0]?.group ?? '')));
const commonSource = computed(() => (sourceMixed.value ? '' : (props.channels[0]?.source ?? '')));

function setState(v: string) {
  stateVal.value = v as Channel['state'];
}

function apply() {
  const payload: { state?: Channel['state']; group?: string; source?: string } = {};
  if (stateVal.value && stateVal.value !== commonState.value) payload.state = stateVal.value;
  if (groupVal.value && groupVal.value !== commonGroup.value) payload.group = groupVal.value;
  if (sourceVal.value && sourceVal.value !== commonSource.value) payload.source = sourceVal.value;
  emit('apply', payload);
  emit('close');
}
</script>

<template>
  <div class="drawer-wrap">
    <div class="glass-bg drawer-backdrop" @click="emit('close')" />
    <div class="glass drawer-panel">
      <div class="drawer-hd">
        <div class="src-ico" style="width: 44px; height: 44px; border-radius: 10px;">
          <Icon name="edit" :size="20" />
        </div>
        <div style="flex: 1;">
          <div style="font-weight: 600; font-size: 15px;">Edit {{ channels.length }} channels</div>
          <div class="muted" style="font-size: var(--fs-xs); margin-top: 2px;">
            Apply changes to all selected channels
          </div>
        </div>
        <Btn variant="ghost" size="sm" icon="x" @click="emit('close')" />
      </div>

      <div class="drawer-body">
        <div style="border: 1px solid var(--hairline); border-radius: 10px; padding: 10px 12px; background: var(--bg-2); max-height: 168px; overflow: auto;">
          <div class="row" style="gap: 8px; margin-bottom: 8px;">
            <Icon name="check" :size="13" style="color: var(--good);" />
            <span style="font-weight: 600; font-size: var(--fs-sm);">Channels being edited</span>
            <span class="spacer" />
            <Pill tone="cyan">{{ channels.length }}</Pill>
          </div>
          <div v-for="c in channels.slice(0, 8)" :key="c.id" class="row" style="gap: 8px; padding: 3px 0; font-size: var(--fs-sm);">
            <span class="mono muted" style="font-size: var(--fs-xs); min-width: 32px;">#{{ c.channel }}</span>
            <span style="font-weight: 500;">{{ c.tvg_name }}</span>
            <span class="muted" style="font-size: var(--fs-xs);">· {{ c.group }}</span>
          </div>
          <div v-if="channels.length > 8" class="muted" style="font-size: var(--fs-xs); padding-top: 6px;">
            + {{ channels.length - 8 }} more
          </div>
        </div>

        <div class="divider" />

        <div class="form-row">
          <div class="field-lbl">
            State
            <span v-if="stateMixed" class="muted" style="font-size: var(--fs-xs); margin-left: 6px;">· mixed — leave unchanged</span>
          </div>
          <div class="row" style="gap: 10px;">
            <Segmented :value="stateVal || commonState" @change="setState" :options="[
              { value: 'active', label: 'Active', icon: 'check' },
              { value: 'disabled', label: 'Disabled', icon: 'x' },
            ]" />
            <Pill v-if="stateVal" :tone="stateVal === 'active' ? 'active' : 'disabled'">
              {{ stateVal === 'active' ? 'active' : 'disabled' }}
            </Pill>
            <Pill v-else-if="!stateMixed" :tone="commonState === 'active' ? 'active' : 'disabled'">
              {{ commonState }}
            </Pill>
          </div>
        </div>

        <div class="form-row">
          <div class="field-lbl">
            Group
            <span v-if="groupMixed" class="muted" style="font-size: var(--fs-xs); margin-left: 6px;">· mixed — leave unchanged</span>
          </div>
          <div class="select">
            <select v-model="groupVal">
              <option value="">{{ groupMixed ? 'Leave unchanged (mixed)' : `Leave unchanged (${commonGroup})` }}</option>
              <option v-for="g in GROUPS" :key="g" :value="g">{{ g }}</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="field-lbl">
            Source
            <span v-if="sourceMixed" class="muted" style="font-size: var(--fs-xs); margin-left: 6px;">· mixed — leave unchanged</span>
          </div>
          <div class="input">
            <Icon name="playlist" :size="14" />
            <input v-model="sourceVal" :placeholder="sourceMixed ? 'Leave unchanged (mixed)' : `Leave unchanged (${commonSource})`" />
          </div>
        </div>

        <div class="row" style="margin-top: 6px;">
          <span class="spacer" />
          <Btn variant="ghost" @click="emit('close')">Cancel</Btn>
          <Btn variant="primary" icon="check" @click="apply">
            Apply to {{ channels.length }} channels
          </Btn>
        </div>
      </div>
    </div>
  </div>
</template>
