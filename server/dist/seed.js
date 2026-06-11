// Seed script — populates every collection from inlined mock data.
// Idempotent: drops and refills each collection.
//
//   cd server && npm run seed
//
// Uses the same config resolution as the API (TVAPP2_CONFIG or ./config.local.json).
import { loadConfig } from './config.js';
import { connect, disconnect } from './db.js';
import { Playlist } from './models/Playlist.js';
import { Channel } from './models/Channel.js';
import { PlaylistChannel } from './models/PlaylistChannel.js';
import { EpgSource } from './models/EpgSource.js';
import { CustomPlaylist } from './models/CustomPlaylist.js';
import { ActiveStream } from './models/ActiveStream.js';
import { Program } from './models/Program.js';
import { Activity } from './models/Activity.js';
import { StreamSession } from './models/StreamSession.js';
const PLAYLISTS = [
    { id: 'pl-default', name: 'Default', url: 'bundled://tvapp2/default.m3u', groups: 6, lastSync: 'Ships with TVApp2', status: 'good', auto: true, interval: 'Auto-updated', builtin: true },
    { id: 'pl-iptv-pro', name: 'IPTV-Pro Main', url: 'https://iptv-pro.example.com/playlist.m3u8', groups: 8, lastSync: '2 minutes ago', status: 'good', auto: true, interval: 'Every 6 hours' },
    { id: 'pl-free-uk', name: 'Free UK Bouquet', url: 'https://iptv-org.github.io/iptv/countries/uk.m3u', groups: 4, lastSync: '1 hour ago', status: 'good', auto: true, interval: 'Daily' },
    { id: 'pl-archive', name: 'Archive (legacy)', url: 'file:///playlists/archive-2023.m3u', groups: 3, lastSync: '3 days ago', status: 'warn', auto: false, interval: 'Manual' },
];
const EPG_SOURCES = [
    { id: 'epg-default', name: 'Default', url: 'bundled://tvapp2/default.xml.gz', channels: 86, programs: 5240, lastSync: 'Ships with TVApp2', status: 'good', auto: true, interval: 'Auto-updated', builtin: true },
    { id: 'epg-xmltv-uk', name: 'XMLTV UK Guide', url: 'https://epg.example.com/uk.xml.gz', channels: 124, programs: 8420, lastSync: '12 minutes ago', status: 'good', auto: true, interval: 'Every 12 hours' },
    { id: 'epg-iptv-org', name: 'iptv-org world EPG', url: 'https://iptv-org.github.io/epg/guides/uk/openepg.xml', channels: 412, programs: 24180, lastSync: '2 hours ago', status: 'good', auto: true, interval: 'Daily' },
];
const CHANNEL_SEEDS = [
    { tvg_name: 'BBC One HD', group: 'Entertainment', channel: 101, tvg_id: 'bbc.one.uk', state: 'active', epg: 'matched', status: 'good', res: '1080p' },
    { tvg_name: 'BBC Two HD', group: 'Entertainment', channel: 102, tvg_id: 'bbc.two.uk', state: 'active', epg: 'matched', status: 'good', res: '1080p' },
    { tvg_name: 'BBC News', group: 'News', channel: 231, tvg_id: 'bbc.news.uk', state: 'active', epg: 'matched', status: 'good', res: '720p' },
    { tvg_name: 'Sky Sports Main', group: 'Sport', channel: 401, tvg_id: 'sky.sports.main.uk', state: 'active', epg: 'matched', status: 'good', res: '1080p' },
    { tvg_name: 'Sky Sports F1', group: 'Sport', channel: 406, tvg_id: 'sky.sports.f1.uk', state: 'active', epg: 'matched', status: 'good', res: '1080p' },
    { tvg_name: 'ITV1 HD', group: 'Entertainment', channel: 103, tvg_id: 'itv1.uk', state: 'active', epg: 'matched', status: 'good', res: '1080p' },
    { tvg_name: 'Channel 4 HD', group: 'Entertainment', channel: 104, tvg_id: 'channel4.uk', state: 'active', epg: 'matched', status: 'warn', res: '1080p' },
    { tvg_name: 'Film4', group: 'Movies', channel: 315, tvg_id: 'film4.uk', state: 'active', epg: 'matched', status: 'good', res: '720p' },
    { tvg_name: 'Discovery Channel', group: 'Documentary', channel: 520, tvg_id: 'discovery.uk', state: 'active', epg: 'matched', status: 'good', res: '1080p' },
    { tvg_name: 'National Geographic', group: 'Documentary', channel: 521, tvg_id: 'natgeo.uk', state: 'active', epg: 'unmatched', status: 'good', res: '1080p' },
    { tvg_name: 'CNN International', group: 'News', channel: 233, tvg_id: 'cnn.int', state: 'active', epg: 'matched', status: 'good', res: '720p' },
    { tvg_name: 'Al Jazeera English', group: 'News', channel: 235, tvg_id: 'aljazeera.en', state: 'active', epg: 'matched', status: 'good', res: '720p' },
    { tvg_name: 'Cartoon Network', group: 'Kids', channel: 601, tvg_id: 'cartoonnet.uk', state: 'active', epg: 'matched', status: 'good', res: '720p' },
    { tvg_name: 'Nick Jr.', group: 'Kids', channel: 615, tvg_id: null, state: 'disabled', epg: 'unmatched', status: 'warn', res: '720p' },
    { tvg_name: 'MTV Hits', group: 'Music', channel: 365, tvg_id: 'mtv.hits.uk', state: 'active', epg: 'matched', status: 'good', res: '720p' },
    { tvg_name: 'Kerrang!', group: 'Music', channel: 369, tvg_id: 'kerrang.uk', state: 'active', epg: 'matched', status: 'good', res: '720p' },
    { tvg_name: 'Food Network', group: 'Lifestyle', channel: 240, tvg_id: 'foodnet.uk', state: 'active', epg: 'matched', status: 'good', res: '720p' },
    { tvg_name: 'HGTV', group: 'Lifestyle', channel: 242, tvg_id: null, state: 'disabled', epg: 'unmatched', status: 'bad', res: '720p' },
    { tvg_name: 'TCM Movies', group: 'Movies', channel: 320, tvg_id: 'tcm.uk', state: 'active', epg: 'matched', status: 'good', res: '1080p' },
    { tvg_name: 'Eurosport 1', group: 'Sport', channel: 410, tvg_id: 'eurosport1.uk', state: 'active', epg: 'matched', status: 'good', res: '1080p' },
];
const CHANNELS = CHANNEL_SEEDS.map((c, i) => ({
    id: `ch-${i}`,
    ...c,
    source: 'Default',
    url: `http://sample.stream.com/channel/1.m3u8?ch=ch-${i}`,
    logoColor: `oklch(0.5 0.16 ${(i * 47) % 360})`,
    initials: c.tvg_name.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase(),
}));
const CUSTOM_PLAYLISTS = [
    { id: 'cust-sports-night', name: 'Sports Night', slug: 'sports-night', channels: 12, updated: '2 days ago' },
    { id: 'cust-kids-safe', name: 'Kids Safe', slug: 'kids-safe', channels: 8, updated: 'yesterday' },
    { id: 'cust-news-rotation', name: 'News Rotation', slug: 'news-rotation', channels: 6, updated: '5 hours ago' },
    { id: 'cust-living-room', name: 'Living Room Favorites', slug: 'living-room', channels: 18, updated: '1 week ago' },
];
const ACTIVE_STREAMS = [
    { id: 'as-1', channelId: 'ch-0', status: 'good', uptime: '4h 12m', uptimeMin: 252, viewers: 142, peakViewers: 168, bitrate: 6.4, targetBitrate: 6.0, codec: 'H.264 High@4.1', audio: 'AAC LC 2.0 · 128k', container: 'HLS / TS', resolution: '1920×1080', fps: 50, sourceUrl: 'http://stream.iptv-pro.example.com/live/bbc-one/index.m3u8', sourceHost: 'edge-fra-04', droppedFrames: 0, droppedRatio: 0.00, latency: 2.1, bandwidth: 912 },
    { id: 'as-2', channelId: 'ch-3', status: 'good', uptime: '1h 48m', uptimeMin: 108, viewers: 89, peakViewers: 112, bitrate: 8.2, targetBitrate: 8.0, codec: 'H.264 High@4.2', audio: 'AC3 5.1 · 384k', container: 'HLS / fMP4', resolution: '1920×1080', fps: 50, sourceUrl: 'http://stream.iptv-pro.example.com/live/sky-sports-main/index.m3u8', sourceHost: 'edge-lon-02', droppedFrames: 14, droppedRatio: 0.01, latency: 1.8, bandwidth: 730 },
    { id: 'as-3', channelId: 'ch-2', status: 'good', uptime: '22h 06m', uptimeMin: 1326, viewers: 47, peakViewers: 61, bitrate: 3.1, targetBitrate: 3.0, codec: 'H.264 Main@3.1', audio: 'AAC LC 2.0 · 96k', container: 'HLS / TS', resolution: '1280×720', fps: 25, sourceUrl: 'http://stream.iptv-pro.example.com/live/bbc-news/index.m3u8', sourceHost: 'edge-fra-04', droppedFrames: 2, droppedRatio: 0.00, latency: 2.4, bandwidth: 145 },
    { id: 'as-4', channelId: 'ch-6', status: 'warn', uptime: '12m', uptimeMin: 12, viewers: 8, peakViewers: 8, bitrate: 4.1, targetBitrate: 5.0, codec: 'H.264 High@4.0', audio: 'AAC LC 2.0 · 128k', container: 'HLS / TS', resolution: '1920×1080', fps: 25, sourceUrl: 'http://stream.iptv-pro.example.com/live/channel4/index.m3u8', sourceHost: 'edge-ams-01', droppedFrames: 184, droppedRatio: 0.47, latency: 4.7, bandwidth: 34 },
    { id: 'as-5', channelId: 'ch-4', status: 'good', uptime: '3h 41m', uptimeMin: 221, viewers: 31, peakViewers: 44, bitrate: 7.9, targetBitrate: 8.0, codec: 'H.264 High@4.2', audio: 'AC3 5.1 · 384k', container: 'HLS / fMP4', resolution: '1920×1080', fps: 50, sourceUrl: 'http://stream.iptv-pro.example.com/live/sky-sports-f1/index.m3u8', sourceHost: 'edge-lon-02', droppedFrames: 0, droppedRatio: 0.00, latency: 1.9, bandwidth: 245 },
    { id: 'as-6', channelId: 'ch-8', status: 'good', uptime: '45m', uptimeMin: 45, viewers: 12, peakViewers: 12, bitrate: 5.6, targetBitrate: 6.0, codec: 'H.265 Main@4.0', audio: 'AAC LC 2.0 · 128k', container: 'HLS / fMP4', resolution: '1920×1080', fps: 25, sourceUrl: 'http://stream.iptv-pro.example.com/live/discovery/index.m3u8', sourceHost: 'edge-fra-04', droppedFrames: 1, droppedRatio: 0.00, latency: 2.2, bandwidth: 68 },
    { id: 'as-7', channelId: 'ch-17', status: 'bad', uptime: '—', uptimeMin: 0, viewers: 0, peakViewers: 4, bitrate: 0, targetBitrate: 5.0, codec: '—', audio: '—', container: 'HLS / TS', resolution: '—', fps: 0, sourceUrl: 'http://stream.iptv-pro.example.com/live/hgtv/index.m3u8', sourceHost: 'edge-ams-01', droppedFrames: 0, droppedRatio: 0, latency: 0, bandwidth: 0 },
];
const ACTIVITY = [
    { when: '2m', icon: 'sync', html: '<b>IPTV-Pro Main</b> synced — 142 channels, no changes' },
    { when: '12m', icon: 'epg', html: '<b>XMLTV UK Guide</b> imported — 8,420 programs across 124 channels' },
    { when: '1h', icon: 'map', html: 'Manual mapping: <b>HGTV</b> → <code class="mono">hgtv.uk</code>' },
    { when: '1h', icon: 'warn', html: '<b>Free UK Bouquet</b> reports 3 channels offline (HTTP 503)' },
    { when: '3h', icon: 'edit', html: 'Renamed <b>Discovery</b> → <b>Discovery Channel</b>' },
    { when: 'Yest.', icon: 'add', html: 'Playlist <b>IPTV-Pro Main</b> added (142 channels)' },
];
const STREAM_SESSIONS = [
    { ip: '82.14.221.47', region: 'GB · London', client: 'VLC / Linux', joined: '2m ago', bitrate: '6.4 Mbps' },
    { ip: '192.81.45.12', region: 'DE · Frankfurt', client: 'Tivimate / Android TV', joined: '8m ago', bitrate: '6.4 Mbps' },
    { ip: '104.18.92.5', region: 'NL · Amsterdam', client: 'OTT Navigator / FireTV', joined: '14m ago', bitrate: '3.1 Mbps' },
    { ip: '176.58.103.9', region: 'GB · Manchester', client: 'Kodi 21', joined: '31m ago', bitrate: '6.4 Mbps' },
    { ip: '78.143.211.4', region: 'FR · Paris', client: 'IPTV Smarters / iOS', joined: '1h ago', bitrate: '3.1 Mbps' },
    { ip: '10.0.4.118', region: 'Local · LAN', client: 'ffmpeg / probe', joined: '3h ago', bitrate: '6.4 Mbps' },
];
const PROGRAM_LIBRARY = [
    ['Morning News', 'Live'], ['Breakfast Show', 'Lifestyle'], ['Market Report', 'Business'],
    ['Sports Roundup', 'Highlights'], ['Drama Hour', 'Series'], ['World Headlines', 'News'],
    ['Wildlife Special', 'Documentary'], ['Cooking with Anna', 'Lifestyle'],
    ['Classic Movies', 'Film'], ['Talk of the Day', 'Discussion'], ["Children's Hour", 'Kids'],
    ['Weather Watch', 'Weather'], ['Live Match', 'Football'], ['Tech Today', 'Technology'],
    ['Late Show', 'Comedy'], ['Documentary', 'Feature'], ['Music Mix', 'Music'],
    ['Quiz Night', 'Game show'], ['Reality TV', 'Series'], ['The Daily Brief', 'News'],
];
function rngFor(seed) {
    let s = seed;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
function generatePrograms(channelId, seedBase) {
    const rng = rngFor(seedBase);
    const progs = [];
    let t = 0;
    while (t < 24) {
        const dur = [0.5, 1, 1, 1.5, 2][Math.floor(rng() * 5)];
        const idx = Math.floor(rng() * PROGRAM_LIBRARY.length);
        progs.push({ channelId, start: t, end: Math.min(24, t + dur), title: PROGRAM_LIBRARY[idx][0], cat: PROGRAM_LIBRARY[idx][1] });
        t += dur;
    }
    return progs;
}
async function main() {
    const config = loadConfig();
    await connect(config.mongoUri);
    await Promise.all([
        Playlist.deleteMany({}),
        Channel.deleteMany({}),
        PlaylistChannel.deleteMany({}),
        EpgSource.deleteMany({}),
        CustomPlaylist.deleteMany({}),
        ActiveStream.deleteMany({}),
        Program.deleteMany({}),
        Activity.deleteMany({}),
        StreamSession.deleteMany({}),
    ]);
    await Playlist.insertMany(PLAYLISTS);
    await Channel.insertMany(CHANNELS);
    await EpgSource.insertMany(EPG_SOURCES);
    await CustomPlaylist.insertMany(CUSTOM_PLAYLISTS);
    await ActiveStream.insertMany(ACTIVE_STREAMS);
    // Default playlist holds every channel in order.
    const defaultPlaylist = PLAYLISTS.find((p) => p.builtin) ?? PLAYLISTS[0];
    await PlaylistChannel.insertMany(CHANNELS.map((c, order) => ({ playlistId: defaultPlaylist.id, channelId: c.id, order })));
    // EPG programs for the first 12 channels (matches the original mock).
    const programs = CHANNELS.slice(0, 12).flatMap((c, i) => generatePrograms(c.id, 100 + i * 7));
    await Program.insertMany(programs);
    await Activity.insertMany(ACTIVITY.map((a, order) => ({ ...a, order })));
    await StreamSession.insertMany(STREAM_SESSIONS.map((s, order) => ({ ...s, order })));
    console.info(`[seed] playlists=${PLAYLISTS.length} channels=${CHANNELS.length} ` +
        `epg-sources=${EPG_SOURCES.length} custom-playlists=${CUSTOM_PLAYLISTS.length} ` +
        `active-streams=${ACTIVE_STREAMS.length} programs=${programs.length} ` +
        `activity=${ACTIVITY.length} stream-sessions=${STREAM_SESSIONS.length}`);
    await disconnect();
}
main().catch((err) => {
    console.error('[seed] failed:', err);
    process.exit(1);
});
//# sourceMappingURL=seed.js.map