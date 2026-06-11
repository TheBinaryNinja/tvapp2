<script setup lang="ts">
import { ref, computed } from 'vue';
import Icon from './Icon.vue';
import Btn from './Btn.vue';

const props = defineProps<{ label: string; icon: string; iconColor?: string; defaultValue?: string; modelValue?: string; mono?: boolean; readonly?: boolean }>();
const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>();
const internal = ref(props.defaultValue ?? '');
const val = computed({
  get: () => (props.modelValue !== undefined ? props.modelValue : internal.value),
  set: (v: string) => {
    if (props.modelValue !== undefined) emit('update:modelValue', v);
    else internal.value = v;
  },
});
const copied = ref(false);

function copy() {
  try { navigator.clipboard?.writeText(val.value); } catch {}
  copied.value = true;
  setTimeout(() => copied.value = false, 1400);
}
</script>

<template>
  <div class="endpoint-field">
    <div class="endpoint-lbl">
      <div class="endpoint-ico" :style="{ color: iconColor || 'var(--accent-hi)' }">
        <Icon :name="icon" :size="13" />
      </div>
      {{ label }}
    </div>
    <div :class="['input', { mono }]" :style="{ flex: 1, fontSize: mono ? '12px' : 'var(--fs-base)' }">
      <Icon name="globe" :size="14" />
      <input v-model="val" :readonly="readonly" />
    </div>
    <Btn variant="ghost" size="sm" :icon="copied ? 'check' : 'copy'" @click="copy" title="Copy URL">
      {{ copied ? 'Copied' : 'Copy' }}
    </Btn>
  </div>
</template>
