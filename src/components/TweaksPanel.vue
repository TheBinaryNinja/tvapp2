<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue';

defineProps<{ title?: string }>();

const open = ref(false);
const panel = ref<HTMLDivElement | null>(null);
const offset = ref({ x: 16, y: 16 });
const PAD = 16;

function clamp() {
  const el = panel.value;
  if (!el) return;
  const w = el.offsetWidth, h = el.offsetHeight;
  const maxRight = Math.max(PAD, window.innerWidth - w - PAD);
  const maxBottom = Math.max(PAD, window.innerHeight - h - PAD);
  offset.value = {
    x: Math.min(maxRight, Math.max(PAD, offset.value.x)),
    y: Math.min(maxBottom, Math.max(PAD, offset.value.y)),
  };
}

function onMsg(e: MessageEvent) {
  const t = (e?.data as any)?.type;
  if (t === '__activate_edit_mode') open.value = true;
  else if (t === '__deactivate_edit_mode') open.value = false;
}

function dismiss() {
  open.value = false;
  try { window.parent?.postMessage({ type: '__edit_mode_dismissed' }, '*'); } catch {}
}

function onDragStart(e: MouseEvent) {
  const el = panel.value;
  if (!el) return;
  const r = el.getBoundingClientRect();
  const sx = e.clientX, sy = e.clientY;
  const startRight = window.innerWidth - r.right;
  const startBottom = window.innerHeight - r.bottom;
  const move = (ev: MouseEvent) => {
    offset.value = { x: startRight - (ev.clientX - sx), y: startBottom - (ev.clientY - sy) };
    clamp();
  };
  const up = () => {
    window.removeEventListener('mousemove', move);
    window.removeEventListener('mouseup', up);
  };
  window.addEventListener('mousemove', move);
  window.addEventListener('mouseup', up);
}

onMounted(() => {
  window.addEventListener('message', onMsg);
  try { window.parent?.postMessage({ type: '__edit_mode_available' }, '*'); } catch {}
  window.addEventListener('resize', clamp);
});
onBeforeUnmount(() => {
  window.removeEventListener('message', onMsg);
  window.removeEventListener('resize', clamp);
});
</script>

<template>
  <div v-if="open" ref="panel" class="twk-panel"
       :style="{ right: offset.x + 'px', bottom: offset.y + 'px' }">
    <div class="twk-hd" @mousedown="onDragStart">
      <b>{{ title || 'Tweaks' }}</b>
      <button class="twk-x" aria-label="Close tweaks"
              @mousedown.stop @click="dismiss">✕</button>
    </div>
    <div class="twk-body"><slot /></div>
  </div>
</template>

<style>
.twk-panel{position:fixed;right:16px;bottom:16px;z-index:2147483646;width:280px;
  max-height:calc(100vh - 32px);display:flex;flex-direction:column;
  background:rgba(250,249,247,.78);color:#29261b;
  -webkit-backdrop-filter:blur(24px) saturate(160%);backdrop-filter:blur(24px) saturate(160%);
  border:.5px solid rgba(255,255,255,.6);border-radius:14px;
  box-shadow:0 1px 0 rgba(255,255,255,.5) inset,0 12px 40px rgba(0,0,0,.18);
  font:11.5px/1.4 ui-sans-serif,system-ui,-apple-system,sans-serif;overflow:hidden}
.twk-hd{display:flex;align-items:center;justify-content:space-between;
  padding:10px 8px 10px 14px;cursor:move;user-select:none}
.twk-hd b{font-size:12px;font-weight:600;letter-spacing:.01em}
.twk-x{appearance:none;border:0;background:transparent;color:rgba(41,38,27,.55);
  width:22px;height:22px;border-radius:6px;cursor:default;font-size:13px;line-height:1}
.twk-x:hover{background:rgba(0,0,0,.06);color:#29261b}
.twk-body{padding:2px 14px 14px;display:flex;flex-direction:column;gap:10px;
  overflow-y:auto;overflow-x:hidden;min-height:0}
.twk-row{display:flex;flex-direction:column;gap:5px}
.twk-lbl{display:flex;justify-content:space-between;align-items:baseline;color:rgba(41,38,27,.72)}
.twk-lbl>span:first-child{font-weight:500}
.twk-sect{font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;
  color:rgba(41,38,27,.45);padding:10px 0 0}
.twk-sect:first-child{padding-top:0}
.twk-seg{position:relative;display:flex;padding:2px;border-radius:8px;background:rgba(0,0,0,.06);user-select:none}
.twk-seg-thumb{position:absolute;top:2px;bottom:2px;border-radius:6px;background:rgba(255,255,255,.9);
  box-shadow:0 1px 2px rgba(0,0,0,.12);transition:left .15s cubic-bezier(.3,.7,.4,1),width .15s}
.twk-seg button{appearance:none;position:relative;z-index:1;flex:1;border:0;background:transparent;
  color:inherit;font:inherit;font-weight:500;min-height:22px;border-radius:6px;cursor:default;padding:4px 6px;line-height:1.2}
</style>
