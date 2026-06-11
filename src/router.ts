import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/active' },
  { path: '/dashboard', name: 'dashboard', component: () => import('./screens/DashboardScreen.vue') },
  { path: '/active', name: 'active', component: () => import('./screens/ActiveStreamsScreen.vue') },
  { path: '/playlists', name: 'playlists', component: () => import('./screens/PlaylistsScreen.vue') },
  { path: '/playlists/:id', name: 'playlist', component: () => import('./screens/PlaylistDetailScreen.vue'), props: true },
  { path: '/epg-sources', name: 'epg-sources', component: () => import('./screens/EPGSourcesScreen.vue') },
  { path: '/epg-sources/:id', name: 'epg-detail', component: () => import('./screens/EPGDetailScreen.vue'), props: true },
  { path: '/mapping', name: 'mapping', component: () => import('./screens/MappingScreen.vue') },
  { path: '/history', name: 'history', component: () => import('./screens/HistoryMetricsScreen.vue') },
  { path: '/import', name: 'import', component: () => import('./screens/ImportScreen.vue') },
  { path: '/settings', name: 'settings', component: () => import('./screens/SettingsScreen.vue') },
];

export const router = createRouter({ history: createWebHashHistory(), routes });
