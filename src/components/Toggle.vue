<script setup lang="ts">
const props = defineProps<{ on: boolean }>();
const emit = defineEmits<{ (e: 'change', v: boolean): void }>();
</script>
<template>
  <div :class="['toggle', { on: props.on }]" role="switch" :aria-checked="!!props.on"
       @click="emit('change', !props.on)" />
</template>
