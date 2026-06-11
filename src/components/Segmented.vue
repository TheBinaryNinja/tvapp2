<script setup lang="ts">
import Icon from './Icon.vue';
export interface SegOpt { value: string; label: string; icon?: string }
const props = defineProps<{ value: string; options: SegOpt[] }>();
const emit = defineEmits<{ (e: 'change', v: string): void }>();
</script>
<template>
  <div class="segmented">
    <button v-for="o in props.options" :key="o.value"
            :class="value === o.value ? 'active' : ''"
            @click="emit('change', o.value)">
      <Icon v-if="o.icon" :name="o.icon" :size="13" />
      {{ o.label }}
    </button>
  </div>
</template>
