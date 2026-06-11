import { ref, computed, reactive } from 'vue';

export const displayName = ref('TVApp2 Workspace');
export const domain = ref('https://tvapp2.example.com');
export const m3uPath = ref('/m3u/playlist.m3u8');
export const epgPath = ref('/epg/guide.xml.gz');

export const m3uEndpoint = computed(() => `${domain.value.replace(/\/$/, '')}${m3uPath.value.startsWith('/') ? '' : '/'}${m3uPath.value}`);
export const epgEndpoint = computed(() => `${domain.value.replace(/\/$/, '')}${epgPath.value.startsWith('/') ? '' : '/'}${epgPath.value}`);

export interface PlaylistStatus {
  active: boolean;
  endpointMode: 'global' | 'custom';
  customPath: string;
}

const _status = reactive<Record<string, PlaylistStatus>>({});

export function usePlaylistStatus(id: string): PlaylistStatus {
  if (!_status[id]) {
    _status[id] = { active: true, endpointMode: 'global', customPath: `/playlists/${id}.m3u` };
  }
  return _status[id];
}

export function playlistEndpoint(id: string): string {
  const s = usePlaylistStatus(id);
  const base = domain.value.replace(/\/$/, '');
  if (s.endpointMode === 'custom') {
    const p = s.customPath.startsWith('/') ? s.customPath : `/${s.customPath}`;
    return `${base}${p}`;
  }
  return m3uEndpoint.value;
}
