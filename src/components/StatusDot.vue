<script setup lang="ts">
defineProps<{ status?: string; pulse?: boolean }>();
</script>
<template>
  <div :class="['dot', status || 'idle', { pulse }]" :title="status" />
</template>
