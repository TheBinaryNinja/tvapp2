// Translation layer: project a canonical SourceChannel doc into the legacy UI Channel shape the Vue
// screens consume. Fields with no source equivalent are returned as explicit null (never fabricated)
// per the agreed schema-reconciliation decision; logoUrl + streamEntryUrl + isPlayable are added so
// the SPA can render real logos and play through the proxy. The frontend derives the proxy path from
// (source, streamEntryUrl); it is intentionally not stored.
// Deterministic hue from a stable string → keeps a channel's fallback logo color stable across syncs.
function hueFromString(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++)
        h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return h % 360;
}
function logoColorFor(id) {
    return `oklch(0.5 0.16 ${hueFromString(id)})`;
}
function initialsFor(name) {
    const ini = name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
        .toUpperCase();
    return ini || '?';
}
export function toUiChannel(doc) {
    return {
        id: doc._id,
        tvg_name: doc.name,
        group: doc.groupLabel,
        channel: null,
        tvg_id: null,
        state: doc.isPlayable ? 'active' : 'disabled',
        epg: null,
        status: null,
        res: null,
        source: doc.source,
        url: doc.streamEntryUrl,
        logoColor: logoColorFor(doc._id),
        initials: initialsFor(doc.name),
        logoUrl: doc.logoUrl,
        streamEntryUrl: doc.streamEntryUrl,
        isPlayable: doc.isPlayable,
    };
}
//# sourceMappingURL=translate.js.map