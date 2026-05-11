interface Fetcher {
  [key: string]: unknown;
}

export interface Env {
  ASSETS: Fetcher;
  PLAYLIST_URL?: string;
  EPG_URL?: string;
  EPG_GZ_URL?: string;
}

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

const FORWARDED_HEADERS = [
  "accept",
  "range",
  "user-agent",
  "referer",
] as const;

const STRIP_RESPONSE_HEADERS = [
  "content-encoding",
  "content-length",
  "transfer-encoding",
] as const;

const DEFAULT_UPSTREAMS: Partial<Record<NamedRouteKey, string>> = {
  PLAYLIST_URL: "https://epg.binaryninja.net/XMLTV-EPG/formatted_v2.0.0.dat",
  EPG_URL: "https://epg.binaryninja.net/XMLTV-EPG/xmltv_v2.0.0.xml",
  // EPG_GZ_URL removed: default URL returns 404. Users can provide via env var or ?url= query param.
};

export default {
  async fetchHandler(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: new Headers(CORS_HEADERS),
      });
    }

    if (url.pathname === "/healthz") {
      return withCors(
        new Response("ok", {
          status: 200,
          headers: { "content-type": "text/plain; charset=utf-8" },
        }),
      );
    }

    if (isPlaylistRoute(url.pathname)) {
      return handleNamedProxyRoute(request, env, "PLAYLIST_URL", "application/vnd.apple.mpegurl; charset=utf-8", "/playlist.m3u8");
    }

    if (isEpgRoute(url.pathname)) {
      return handleNamedProxyRoute(request, env, "EPG_URL", "application/xml; charset=utf-8", "/xmltv.xml");
    }

    if (isEpgGzipRoute(url.pathname)) {
      return handleNamedProxyRoute(request, env, "EPG_GZ_URL", "application/gzip", "/xmltv.xml.gz");
    }

    if (url.pathname === "/proxy") {
      return handleProxy(request);
    }

    return (getAssetsFetcher(env) as (input: Request | string | URL, init?: RequestInit) => Promise<Response>)(request);
  },
};

type NamedRouteKey = "PLAYLIST_URL" | "EPG_URL" | "EPG_GZ_URL";

async function handleNamedProxyRoute(
  request: Request,
  env: Env,
  envKey: NamedRouteKey,
  forcedContentType: string,
  assetFallbackPath: string,
): Promise<Response> {
  const requestUrl = new URL(request.url);
  const resolvedUpstreamUrl = resolveUpstreamUrl(requestUrl, env[envKey], envKey);

  if (!resolvedUpstreamUrl) {
    const staticAssetResponse = await fetchAssetFallback(request, env, assetFallbackPath, forcedContentType);
    if (staticAssetResponse) {
      return staticAssetResponse;
    }

    return withCors(
      new Response(
        `Missing upstream URL. Provide ?url=https://... or set ${envKey} in Worker vars.`,
        { status: 400 },
      ),
    );
  }

  const proxiedUrl = new URL("/proxy", requestUrl.origin);
  proxiedUrl.searchParams.set("url", resolvedUpstreamUrl);

  const proxyRequest = new Request(proxiedUrl.toString(), {
    method: request.method,
    headers: request.headers,
  });

  const response = await handleProxy(proxyRequest);
  if (!response.ok) {
    return response;
  }

  const rawBody = await response.text();
  if (!looksLikeExpectedPayload(rawBody, forcedContentType)) {
    return withCors(
      new Response("Upstream payload did not match expected format", { status: 502 }),
    );
  }

  const headers = new Headers(response.headers);
  headers.set("content-type", forcedContentType);

  return new Response(rawBody, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function looksLikeExpectedPayload(payload: string, forcedContentType: string): boolean {
  const body = payload.trimStart();

  if (forcedContentType.includes("mpegurl")) {
    return body.startsWith("#EXTM3U");
  }

  if (forcedContentType.includes("application/xml")) {
    return body.startsWith("<?xml") || body.startsWith("<tv") || body.startsWith("<xml");
  }

  if (forcedContentType.includes("application/gzip")) {
    return payload.length > 0;
  }

  return true;
}

async function fetchAssetFallback(
  request: Request,
  env: Env,
  assetPath: string,
  forcedContentType: string,
): Promise<Response | null> {
  const requestUrl = new URL(request.url);
  const assetUrl = new URL(assetPath, requestUrl.origin);
  const assetRequest = new Request(assetUrl.toString(), {
    method: "GET",
    headers: request.headers,
  });
  const assetResponse = await (getAssetsFetcher(env) as (input: Request | string | URL, init?: RequestInit) => Promise<Response>)(assetRequest);

  if (!assetResponse.ok) {
    return null;
  }

  const headers = new Headers(assetResponse.headers);
  applyCors(headers);
  headers.set("content-type", forcedContentType);

  return new Response(assetResponse.body, {
    status: assetResponse.status,
    statusText: assetResponse.statusText,
    headers,
  });
}

async function handleProxy(request: Request): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return withCors(
      new Response("Method Not Allowed", {
        status: 405,
        headers: { Allow: "GET, HEAD, OPTIONS" },
      }),
    );
  }

  const requestUrl = new URL(request.url);
  const targetUrl = requestUrl.searchParams.get("url");

  if (!targetUrl) {
    return withCors(new Response("Missing url query parameter", { status: 400 }));
  }

  let upstreamUrl: URL;
  try {
    upstreamUrl = new URL(targetUrl);
  } catch {
    return withCors(new Response("Invalid url", { status: 400 }));
  }

  if (!isSafeUpstreamUrl(upstreamUrl)) {
    return withCors(new Response("Blocked upstream URL", { status: 403 }));
  }

  const upstreamHeaders = new Headers({
    Accept: "*/*",
    "Accept-Encoding": "identity",
    "Accept-Language": "en-US,en;q=0.9",
  });

  for (const headerName of FORWARDED_HEADERS) {
    const value = request.headers.get(headerName);
    if (value) {
      upstreamHeaders.set(headerName, value);
    }
  }

  let upstreamResponse: Response;
  const networkRequest = globalThis.fetch;

  try {
    upstreamResponse = await networkRequest(upstreamUrl.toString(), {
      method: "GET",
      headers: upstreamHeaders,
      redirect: "follow",
    });
  } catch {
    return withCors(new Response("Upstream fetch failed", { status: 502 }));
  }

  const headers = new Headers(upstreamResponse.headers);
  applyCors(headers);

  const contentType = headers.get("content-type")?.toLowerCase() ?? "";
  const pathname = upstreamUrl.pathname.toLowerCase();
  const isHls =
    pathname.endsWith(".m3u") ||
    pathname.endsWith(".m3u8") ||
    contentType.includes("mpegurl") ||
    contentType.includes("application/x-mpegurl");

  sanitizeResponseHeaders(headers);

  if (!isHls) {
    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers,
    });
  }

  const playlistText = await upstreamResponse.text();
  const rewritten = rewritePlaylist(playlistText, upstreamUrl, requestUrl.origin);

  headers.set("content-type", "application/vnd.apple.mpegurl; charset=utf-8");
  return new Response(rewritten, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers,
  });
}

function rewritePlaylist(playlist: string, upstreamUrl: URL, origin: string): string {
  return playlist
    .split(/\r?\n/)
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        return line.replace(/URI="([^"]+)"/g, (_match, uri: string) => {
          const absolute = new URL(uri, upstreamUrl).toString();
          return `URI="${origin}/proxy?url=${encodeURIComponent(absolute)}"`;
        });
      }

      const absolute = new URL(trimmed, upstreamUrl).toString();
      const proxied = `${origin}/proxy?url=${encodeURIComponent(absolute)}`;
      return line.replace(trimmed, proxied);
    })
    .join("\n");
}

function resolveUpstreamUrl(requestUrl: URL, envValue: string | undefined, envKey: NamedRouteKey): string | null {
  const queryUrl = requestUrl.searchParams.get("url");
  if (queryUrl) {
    return queryUrl;
  }

  if (envValue && envValue.trim()) {
    return envValue.trim();
  }

  return DEFAULT_UPSTREAMS[envKey] ?? null;
}

function isPlaylistRoute(pathname: string): boolean {
  const normalized = pathname.toLowerCase();
  return normalized === "/playlist" || normalized === "/playlist.m3u" || normalized === "/playlist.m3u8";
}

function isEpgRoute(pathname: string): boolean {
  const normalized = pathname.toLowerCase();
  return normalized === "/epg" || normalized === "/epg.xml";
}

function isEpgGzipRoute(pathname: string): boolean {
  return pathname.toLowerCase() === "/epg.xml.gz";
}

function isSafeUpstreamUrl(url: URL): boolean {
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return false;
  }

  const hostname = url.hostname.toLowerCase();

  if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    return false;
  }

  if (isPrivateIpv4(hostname)) {
    return false;
  }

  return true;
}

function isPrivateIpv4(hostname: string): boolean {
  const match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!match) {
    return false;
  }

  const octets = match.slice(1).map((part) => Number(part));
  if (octets.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
    return false;
  }

  const [a, b] = octets;

  if (a === 127) {
    return true;
  }

  if (a === 10) {
    return true;
  }

  if (a === 192 && b === 168) {
    return true;
  }

  if (a === 172 && b >= 16 && b <= 31) {
    return true;
  }

  return false;
}

function applyCors(headers: Headers): void {
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    headers.set(key, value);
  }
}

function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  applyCors(headers);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function sanitizeResponseHeaders(headers: Headers): void {
  for (const header of STRIP_RESPONSE_HEADERS) {
    headers.delete(header);
  }
}
