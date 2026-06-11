<script setup lang="ts">
defineProps<{ tone?: string }>();
</script>
<template>
  <span :class="['pill', tone || '']"><slot /></span>
</template>
