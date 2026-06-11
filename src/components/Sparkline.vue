<script setup lang="ts">
import { computed } from 'vue';
const props = defineProps<{ series: number[]; target: number }>();
const W = 760, H = 90, P = 6;
const max = computed(() => Math.max(props.target * 1.4, ...props.series));
const xs = (i: number) => P + (i / (props.series.length - 1)) * (W - P * 2);
const ys = (v: number) => H - P - ((v - 0) / (max.value - 0)) * (H - P * 2);
const pts = computed(() => props.series.map((v, i) => `${xs(i)},${ys(v)}`).join(' '));
const area = computed(() => `M${xs(0)},${H} L ${pts.value} L ${xs(props.series.length - 1)},${H} Z`);
const targetY = computed(() => ys(props.target));
const lastX = computed(() => xs(props.series.length - 1));
const lastY = computed(() => ys(props.series[props.series.length - 1]));
const grids = [0.25, 0.5, 0.75];
</script>

<template>
  <div style="width: 100%;">
    <svg :viewBox="`0 0 ${W} ${H}`" preserveAspectRatio="none"
         :style="{ width: '100%', height: H + 'px', display: 'block' }">
      <defs>
        <linearGradient id="spark-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="oklch(0.82 0.13 220)" stop-opacity="0.35" />
          <stop offset="100%" stop-color="oklch(0.82 0.13 220)" stop-opacity="0" />
        </linearGradient>
      </defs>
      <line v-for="p in grids" :key="p" :x1="P" :x2="W - P" :y1="P + p * (H - P * 2)" :y2="P + p * (H - P * 2)"
            stroke="var(--hairline)" stroke-width="1" stroke-dasharray="2 4" />
      <line :x1="P" :x2="W - P" :y1="targetY" :y2="targetY" stroke="oklch(0.82 0.13 220 / 0.5)" stroke-dasharray="3 3" stroke-width="1" />
      <path :d="area" fill="url(#spark-grad)" />
      <polyline fill="none" stroke="oklch(0.82 0.13 220)" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round" :points="pts" />
      <circle :cx="lastX" :cy="lastY" r="3.5" fill="oklch(0.82 0.13 220)" />
      <circle :cx="lastX" :cy="lastY" r="7" fill="oklch(0.82 0.13 220 / 0.25)" />
    </svg>
    <div class="row" style="justify-content: space-between; font-size: 10px; color: var(--text-3); margin-top: 4px;">
      <span class="mono">−60m</span><span class="mono">−45m</span><span class="mono">−30m</span><span class="mono">−15m</span><span class="mono">now</span>
    </div>
  </div>
</template>
