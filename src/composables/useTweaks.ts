import { reactive, watch } from 'vue';

export interface Tweaks {
  theme: 'dark' | 'light';
  density: 'compact' | 'regular' | 'spacious';
  epgMode: 'timeline' | 'list';
}

const tweaks = reactive<Tweaks>({
  theme: 'dark',
  density: 'regular',
  epgMode: 'timeline',
});

watch(
  () => [tweaks.theme, tweaks.density] as const,
  ([theme, density]) => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.density = density;
  },
  { immediate: true }
);

export function useTweaks() {
  function setTweak<K extends keyof Tweaks>(key: K, value: Tweaks[K]): void;
  function setTweak(edits: Partial<Tweaks>): void;
  function setTweak(keyOrEdits: any, val?: any) {
    const edits = typeof keyOrEdits === 'object' && keyOrEdits !== null
      ? keyOrEdits : { [keyOrEdits]: val };
    Object.assign(tweaks, edits);
    try { window.parent?.postMessage({ type: '__edit_mode_set_keys', edits }, '*'); } catch {}
  }
  return { tweaks, setTweak };
}
