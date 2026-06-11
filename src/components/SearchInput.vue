<script setup lang="ts">
import Icon from './Icon.vue';
const props = defineProps<{ value: string; placeholder?: string; width?: number }>();
const emit = defineEmits<{ (e: 'change', v: string): void }>();
</script>
<template>
  <div class="input" :style="{ width: (props.width || 260) + 'px' }">
    <Icon name="search" :size="14" />
    <input :value="value" :placeholder="placeholder || 'Search'"
           @input="emit('change', ($event.target as HTMLInputElement).value)" />
  </div>
</template>
