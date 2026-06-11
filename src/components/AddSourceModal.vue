<script setup lang="ts">
import Icon from './Icon.vue';
import Btn from './Btn.vue';
import Toggle from './Toggle.vue';
import SettingsRow from './SettingsRow.vue';
import { useRouter } from 'vue-router';

const props = defineProps<{ kind: 'playlist' | 'epg' }>();
const emit = defineEmits<{ (e: 'close'): void }>();
const router = useRouter();
const label = props.kind === 'playlist' ? 'M3U Playlist' : 'EPG Source';

function onAdd() {
  emit('close');
  router.push(props.kind === 'playlist' ? '/playlists' : '/epg-sources');
}
function toImport() {
  emit('close');
  router.push('/import');
}
</script>

<template>
  <div class="modal-bg" @click="emit('close')">
    <div class="modal" @click.stop>
      <div class="modal-hd">
        <Icon :name="kind === 'playlist' ? 'playlist' : 'epg'" :size="18" />
        <h2>Add {{ label }}</h2>
        <span class="spacer" />
        <Btn variant="ghost" size="sm" icon="x" @click="emit('close')" />
      </div>
      <div class="modal-body">
        <div class="form-row">
          <div class="field-lbl">Name</div>
          <div class="input"><input :value="`My ${label}`" /></div>
        </div>
        <div class="form-row">
          <div class="field-lbl">Remote URL</div>
          <div class="input">
            <Icon name="link" :size="14" />
            <input :placeholder="kind === 'playlist' ? 'https://provider.example.com/playlist.m3u' : 'https://example.com/guide.xml.gz'" />
          </div>
        </div>
        <div class="form-grid-2">
          <div class="form-row">
            <div class="field-lbl">Refresh interval</div>
            <div class="select"><select value="6h">
              <option value="manual">Manual only</option>
              <option value="6h">Every 6 hours</option>
              <option value="12h">Every 12 hours</option>
              <option value="1d">Daily</option>
            </select></div>
          </div>
          <div class="form-row">
            <div class="field-lbl">Auth (optional)</div>
            <div class="select"><select value="none">
              <option value="none">None</option>
              <option value="basic">Basic auth</option>
              <option value="bearer">Bearer token</option>
            </select></div>
          </div>
        </div>
        <SettingsRow label="Auto-match channels to EPG" hint="Run fuzzy matching right after the first import.">
          <template #right><Toggle :on="true" /></template>
        </SettingsRow>
        <div class="muted" style="font-size: var(--fs-xs); padding: 4px 0;">
          Tip: you can also drag a file into the
          <span style="color: var(--accent-hi); cursor: default;" @click="toImport">Import</span> screen.
        </div>
      </div>
      <div class="modal-ft">
        <Btn variant="ghost" @click="emit('close')">Cancel</Btn>
        <Btn variant="primary" icon="check" @click="onAdd">Add &amp; sync</Btn>
      </div>
    </div>
  </div>
</template>
