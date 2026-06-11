// Shared HLS playlist helpers. Ported from d-combine/lib/core/playlist.mjs. The only per-source
// difference — whether the rewriter also learns (allowlists) each child host — is the `onChildHost`
// hook param, so one implementation serves every source.

/** True if the upstream URL / content-type looks like an HLS playlist (.m3u8). */
export function looksLikePlaylist(upstreamUrl: string, contentType: string): boolean {
  if (contentType && contentType.includes('mpegurl')) return true; // apple.mpegurl / x-mpegurl
  try {
    return new URL(upstreamUrl).pathname.toLowerCase().endsWith('.m3u8');
  } catch {
    return false;
  }
}

/**
 * Rewrite every child URI in a playlist so it routes back through this proxy.
 *
 * @param text         the raw playlist body
 * @param baseUrl      the upstream URL it was fetched from (for relative→absolute)
 * @param prefix       proxy mount prefix to prepend, e.g. "/api/v1/dulo/"
 * @param onChildHost  per-child-host hook (dlhd dynamic-allow; dulo/common null)
 */
export function rewritePlaylist(
  text: string,
  baseUrl: string,
  prefix: string,
  onChildHost: ((host: string) => void) | null,
): string {
  return text
    .split(/\r?\n/)
    .map((rawLine) => {
      const trimmed = rawLine.trim();
      if (!trimmed || trimmed.startsWith('#')) return rawLine; // tag / comment / blank → as-is
      const abs = new URL(trimmed, baseUrl).href; // resolve relative → absolute
      if (onChildHost) {
        try {
          onChildHost(new URL(abs).hostname);
        } catch {
          /* ignore malformed */
        }
      }
      return `${prefix}${encodeURIComponent(abs)}`;
    })
    .join('\n');
}
