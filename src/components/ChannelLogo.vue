<script setup lang="ts">
import { ref } from 'vue';
import type { Channel } from '../data';
const props = defineProps<{ ch: Channel; size?: '' | 'lg' }>();
// Source playlists (dulo/common) provide a real logo URL; fall back to the derived initials tile
// (also used for dlhd, which has no logos, and all legacy channels). If the image fails to load,
// fall back to initials too.
const broken = ref(false);
</script>
<template>
  <img
    v-if="ch.logoUrl && !broken"
    :class="['ch-logo', size || '']"
    :src="ch.logoUrl"
    :alt="ch.tvg_name"
    loading="lazy"
    @error="broken = true"
    style="object-fit: cover; background: #0b0b0f;"
  />
  <div
    v-else
    :class="['ch-logo', size || '']"
    :style="{ background: ch.logoColor + ' linear-gradient(135deg, transparent, rgba(0,0,0,.25))', color: 'white' }"
  >
    {{ ch.initials }}
  </div>
</template>
