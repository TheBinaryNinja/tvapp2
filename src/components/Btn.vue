<script setup lang="ts">
import { computed, useSlots } from 'vue';
import Icon from './Icon.vue';

const props = defineProps<{
  variant?: 'primary' | 'ghost';
  size?: 'sm';
  icon?: string;
  title?: string;
  disabled?: boolean;
}>();
const slots = useSlots();

const cls = computed(() => {
  const hasContent = !!slots.default;
  return ['btn', props.variant, props.size, props.icon && !hasContent ? 'icon' : '']
    .filter(Boolean).join(' ');
});
</script>
<template>
  <button :class="cls" :title="title" :disabled="disabled">
    <Icon v-if="icon" :name="icon" :size="size === 'sm' ? 13 : 14" />
    <slot />
  </button>
</template>
