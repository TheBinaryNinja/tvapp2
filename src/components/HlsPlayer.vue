<script setup lang="ts">
// HLS player: plays a proxied stream URL through hls.js, with a native-HLS fallback for Safari.
// `src` is the /api/v1/<source>/<enc streamEntryUrl> proxy path (see proxyPath() in data.ts) — the
// proxy handles every per-source resolve/auth/SSRF concern, so the player just points hls.js at it.
import { ref, watch, onMounted, onBeforeUnmount } from 'vue';
import Hls from 'hls.js';

const props = defineProps<{ src: string | null }>();
const video = ref<HTMLVideoElement | null>(null);
const error = ref<string | null>(null);
let hls: Hls | null = null;

function teardown() {
  if (hls) {
    hls.destroy();
    hls = null;
  }
}

function load(src: string | null) {
  error.value = null;
  teardown();
  const el = video.value;
  if (!el || !src) return;

  if (el.canPlayType('application/vnd.apple.mpegurl')) {
    // Safari / iOS play HLS natively — no hls.js needed.
    el.src = src;
    el.play().catch(() => undefined);
    return;
  }

  if (Hls.isSupported()) {
    hls = new Hls({ enableWorker: true, lowLatencyMode: false });
    hls.on(Hls.Events.ERROR, (_evt, data) => {
      if (data.fatal) error.value = `Playback error: ${data.type} · ${data.details}`;
    });
    hls.loadSource(src);
    hls.attachMedia(el);
    el.play().catch(() => undefined);
    return;
  }

  error.value = 'HLS playback is not supported in this browser.';
}

onMounted(() => load(props.src));
watch(() => props.src, (s) => load(s));
onBeforeUnmount(teardown);
</script>

<template>
  <div class="hls-player">
    <video
      ref="video"
      controls
      autoplay
      muted
      playsinline
      style="width: 100%; height: 100%; background: #000; border-radius: inherit; display: block;"
    />
    <div v-if="error" class="hls-error mono">{{ error }}</div>
  </div>
</template>

<style scoped>
.hls-player {
  position: relative;
  width: 100%;
  height: 100%;
}
.hls-error {
  position: absolute;
  inset: auto 8px 8px 8px;
  padding: 6px 9px;
  font-size: 11px;
  color: #fff;
  background: rgba(180, 40, 40, 0.85);
  border-radius: 6px;
}
</style>
