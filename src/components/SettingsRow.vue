<script setup lang="ts">
defineProps<{ label: string; hint: string }>();
</script>
<template>
  <div class="row" style="align-items: center; padding: 10px 0;">
    <div style="flex: 1;">
      <div style="font-weight: 500; font-size: var(--fs-base);">{{ label }}</div>
      <div class="muted" style="font-size: var(--fs-xs); margin-top: 2px;">{{ hint }}</div>
    </div>
    <slot name="right" />
  </div>
</template>
