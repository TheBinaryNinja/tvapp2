<script setup lang="ts">
defineProps<{ label: string; value: string | number; small?: boolean }>();
</script>
<template>
  <div style="text-align: right;">
    <div class="muted" style="font-size: var(--fs-xs); text-transform: uppercase; letter-spacing: 0.06em;">{{ label }}</div>
    <div :style="{ fontWeight: 600, fontSize: small ? 'var(--fs-sm)' : '18px', fontVariantNumeric: 'tabular-nums', marginTop: '2px' }">
      <slot>{{ value }}</slot>
    </div>
  </div>
</template>
