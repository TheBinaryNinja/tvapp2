<script setup lang="ts">
const props = defineProps<{ on: boolean }>();
const emit = defineEmits<{ (e: 'change', v: boolean): void }>();
function click(e: MouseEvent) { e.stopPropagation(); emit('change', !props.on); }
</script>
<template>
  <div :class="['cbx', { on: props.on }]" role="checkbox" :aria-checked="!!props.on" @click="click" />
</template>
