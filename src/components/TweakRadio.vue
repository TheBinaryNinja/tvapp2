<script setup lang="ts">
import { computed } from 'vue';
const props = defineProps<{ label: string; value: string; options: string[] }>();
const emit = defineEmits<{ (e: 'change', v: string): void }>();
const idx = computed(() => Math.max(0, props.options.indexOf(props.value)));
const n = computed(() => props.options.length);
</script>

<template>
  <div class="twk-row">
    <div class="twk-lbl"><span>{{ label }}</span></div>
    <div class="twk-seg" role="radiogroup">
      <div class="twk-seg-thumb"
           :style="{ left: `calc(2px + ${idx} * (100% - 4px) / ${n})`, width: `calc((100% - 4px) / ${n})` }" />
      <button v-for="o in options" :key="o" type="button" role="radio" :aria-checked="o === value"
              @click="emit('change', o)">{{ o }}</button>
    </div>
  </div>
</template>
