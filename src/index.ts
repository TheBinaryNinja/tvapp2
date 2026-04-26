interface Fetcher {
  fetch(input: Request | string | URL, init?: RequestInit): Promise<Response>;
}

export interface Env {
  ASSETS: Fetcher;
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

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/proxy") {
      return handleProxy(request);
    }

    return env.ASSETS.fetch(request);
  },
};

async function handleProxy(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: new Headers(CORS_HEADERS),
    });
  }

  if (request.method !== "GET") {
    return withCors(
      new Response("Method Not Allowed", {
        status: 405,
        headers: { Allow: "GET, OPTIONS" },
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
    Connection: "keep-alive",
  });

  for (const headerName of FORWARDED_HEADERS) {
    const value = request.headers.get(headerName);
    if (value) {
      upstreamHeaders.set(headerName, value);
    }
  }

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(upstreamUrl.toString(), {
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
        return line;
      }

      if (!isRelativeUri(trimmed)) {
        return line;
      }

      const absolute = new URL(trimmed, upstreamUrl).toString();
      const proxied = `${origin}/proxy?url=${encodeURIComponent(absolute)}`;
      return line.replace(trimmed, proxied);
    })
    .join("\n");
}

function isRelativeUri(value: string): boolean {
  if (value.startsWith("//")) {
    return false;
  }

  return !/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(value);
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
