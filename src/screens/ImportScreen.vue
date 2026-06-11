<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import Icon from '../components/Icon.vue';
import Btn from '../components/Btn.vue';
import Pill from '../components/Pill.vue';

const router = useRouter();
const tab = ref<'playlist' | 'epg'>('playlist');
const over = ref(false);
const file = ref<{ name: string; size: string } | null>(null);
const progress = ref(0);
const url = ref('');

function startImport(name: string) {
  file.value = { name, size: '1.2 MB' };
  progress.value = 0;
  let p = 0;
  const t = setInterval(() => {
    p += 7 + Math.random() * 10;
    if (p >= 100) { p = 100; clearInterval(t); }
    progress.value = Math.round(p);
  }, 180);
}

function onDrop(e: DragEvent) {
  e.preventDefault();
  over.value = false;
  const f = e.dataTransfer?.files[0];
  if (f) startImport(f.name);
}

function done() {
  router.push(tab.value === 'playlist' ? '/playlists' : '/epg-sources');
}
</script>

<template>
  <div class="col" style="max-width: 760px;">
    <div class="segmented" style="align-self: flex-start;">
      <button :class="tab === 'playlist' ? 'active' : ''" @click="tab = 'playlist'">
        <Icon name="playlist" :size="13" />M3U Playlist
      </button>
      <button :class="tab === 'epg' ? 'active' : ''" @click="tab = 'epg'">
        <Icon name="epg" :size="13" />EPG / XMLTV
      </button>
    </div>

    <div class="card">
      <div class="field-lbl">Source</div>
      <div class="segmented" style="margin-bottom: 14px;">
        <button class="active"><Icon name="upload" :size="13" />Upload file</button>
        <button><Icon name="link" :size="13" />Remote URL</button>
      </div>

      <div v-if="!file"
           :class="['dropzone', { over }]"
           @dragover.prevent="over = true"
           @dragleave="over = false"
           @drop="onDrop"
           @click="startImport(tab === 'playlist' ? 'playlist.m3u' : 'guide.xml.gz')">
        <div class="icon-circle"><Icon name="upload" :size="22" /></div>
        <div>
          <h3>Drop {{ tab === 'playlist' ? 'an M3U/M3U8' : 'an XMLTV' }} file here</h3>
          <p>or click to browse — up to 50 MB</p>
        </div>
        <div class="row" style="gap: 6px; color: var(--text-3); font-size: var(--fs-xs);">
          <Pill>.m3u</Pill><Pill>.m3u8</Pill><Pill>.xml</Pill><Pill>.xml.gz</Pill>
        </div>
      </div>

      <div v-else class="card" style="background: var(--bg-2);">
        <div class="row" style="margin-bottom: 12px;">
          <Icon name="file" :size="18" />
          <div style="flex: 1;">
            <div style="font-weight: 600;">{{ file.name }}</div>
            <div class="muted" style="font-size: var(--fs-xs);">
              {{ file.size }} · {{ progress < 100 ? 'parsing…' : 'ready' }}
            </div>
          </div>
          <Pill v-if="progress < 100" tone="cyan">{{ progress }}%</Pill>
          <Pill v-else tone="good"><Icon name="check" :size="11" />parsed</Pill>
          <Btn variant="ghost" size="sm" icon="x" @click="file = null; progress = 0" />
        </div>
        <div style="height: 4px; border-radius: 999px; background: var(--bg-3); overflow: hidden;">
          <div :style="{
            height: '100%',
            width: progress + '%',
            background: 'var(--accent)',
            boxShadow: '0 0 12px var(--accent)',
            transition: 'width .15s'
          }" />
        </div>
        <div v-if="progress === 100" style="margin-top: 16px; display: flex; flex-direction: column; gap: 12px;">
          <div class="form-grid-2">
            <div class="form-row">
              <div class="field-lbl">Source name</div>
              <div class="input"><input :value="tab === 'playlist' ? 'My Playlist' : 'My EPG Guide'" /></div>
            </div>
            <div class="form-row">
              <div class="field-lbl">Refresh interval</div>
              <div class="select"><select value="6h">
                <option value="manual">Manual only</option>
                <option value="6h">Every 6 hours</option>
                <option value="12h">Every 12 hours</option>
                <option value="1d">Daily</option>
              </select></div>
            </div>
          </div>
          <div class="row" style="margin-top: 4px;">
            <Pill tone="good">{{ tab === 'playlist' ? '142 channels detected' : '8,420 programs detected' }}</Pill>
            <Pill>{{ tab === 'playlist' ? '8 groups' : '124 channels' }}</Pill>
          </div>
          <div class="row" style="justify-content: flex-end; margin-top: 6px;">
            <Btn variant="ghost" @click="file = null; progress = 0">Cancel</Btn>
            <Btn variant="primary" icon="check" @click="done">
              Import {{ tab === 'playlist' ? 'playlist' : 'EPG' }}
            </Btn>
          </div>
        </div>
      </div>
    </div>

    <div v-if="!file" class="card">
      <div class="field-lbl">Or paste a URL</div>
      <div class="row">
        <div class="input" style="flex: 1;">
          <Icon name="link" :size="14" />
          <input v-model="url" :placeholder="tab === 'playlist' ? 'https://example.com/playlist.m3u' : 'https://example.com/guide.xml.gz'" />
        </div>
        <Btn variant="primary" icon="import" @click="startImport(tab === 'playlist' ? 'remote.m3u' : 'remote.xml.gz')">Fetch</Btn>
      </div>
    </div>
  </div>
</template>
