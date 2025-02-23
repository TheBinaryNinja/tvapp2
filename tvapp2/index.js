#!/usr/bin/env node

const fs = require('fs');
const https = require('https');
const path = require('path');
const UserAgent = require('user-agents');
const http = require('http');
const os = require('os');
const zlib = require('zlib');
const { randomUUID } = require('crypto');
const { channel } = require('diagnostics_channel');
const cache = new Map();

let URLS_FILE;
let FORMATTED_FILE;
let EPG_FILE;
const externalURL = `${process.env.URL_REPO}/tvapp2-externals/raw/branch/main/urls.txt`;
const externalEPG = `${process.env.URL_REPO}//XMLTV-EPG/raw/branch/main/xmltv.1.xml`;
const externalFORMATTED_1 = `${process.env.URL_REPO}/tvapp2-externals/raw/branch/main/formatted.dat`;
const externalFORMATTED_2 = '';
const externalFORMATTED_3 = '';
const externalEvents = '';

if (process.pkg) {
    console.log('Process package');
    const basePath = path.dirname(process.execPath);
    URLS_FILE = path.join(basePath, 'urls.txt');
    FORMATTED_FILE = path.join(basePath, 'formatted.dat');
    //EPG_FILE = path.join(basePath, 'epg.xml');
    EPG_FILE = path.join(basePath, 'xmltv.1.xml');
    EPG_FILE.length;
} else {
    console.log('Process locals');
    URLS_FILE = path.resolve(__dirname, 'urls.txt');
    FORMATTED_FILE = path.resolve(__dirname, 'formatted.dat');
    EPG_FILE = path.resolve(__dirname, 'xmltv.1.xml');
}

class Semaphore {
    constructor(max) {
        this.max = max;
        this.queue = [];
        this.active = 0;
    }
    async acquire() {
        if (this.active < this.max) {
            this.active++;
            return;
        }
        return new Promise((resolve) => this.queue.push(resolve));
    }
    release() {
        this.active--;
        if (this.queue.length > 0) {
            const resolve = this.queue.shift();
            this.active++;
            resolve();
        }
    }
}

const semaphore = new Semaphore(5);

let urls = [];
let tokenData = {
    subdomain: null,
    token: null,
    url: null,
    validationUrl: null,
    cookies: null,
};
let lastTokenFetchTime = 0;

const log = (message) => {
    const now = new Date();
    console.log(`[${now.toLocaleTimeString()}] ${message}`);
};

async function downloadFile(url, filePath) {
    console.log(`Fetching ${url}`);
    return new Promise((resolve, reject) => {
        const isHttps = new URL(url).protocol === 'https:';
        const httpModule = isHttps ? require('https') : require('http');
        const file = fs.createWriteStream(filePath);

        httpModule
            .get(url, (response) => {
                if (response.statusCode !== 200) {
                    console.error(`Failed to download file: ${url}. Status code: ${response.statusCode}`);
                    return reject(new Error(`Failed to download file: ${url}. Status code: ${response.statusCode}`));
                }
                response.pipe(file);
                file.on('finish', () => {
                    log(`Success: ${filePath}`);
                    file.close(() => resolve(true));
                });
            })
            .on('error', (err) => {
                console.error(`Error downloading file: ${url}. Error: ${err.message}`);
                fs.unlink(filePath, () => reject(err));
            });
    });
}

async function ensureFileExists(url, filePath) {
    try {
        await downloadFile(url, filePath);
    } catch (error) {
        if (fs.existsSync(filePath)) {
            console.warn(`Using existing file for ${filePath} due to download failure.`);
        } else {
            console.error(`Critical: Failed to download ${url}, and no local file exists.`);
            throw error;
        }
    }
}

// REMOVED REFERENCE CALLS TO THIS FUNCTION
// TODO: UPDATES TO HANDLER FOR SPORT EVENTS
async function fetchSportsData() {
    return new Promise((resolve, reject) => {
        const isHttps = new URL(externalEvents).protocol === 'https:';
        const httpModule = isHttps ? require('https') : require('http');
        httpModule
            .get(url, (response) => {
                if (response.statusCode !== 200) {
                    console.error(`Failed to fetch sports data. Status code: ${response.statusCode}`);
                    return reject(new Error(`Failed to fetch sports data. Status code: ${response.statusCode}`));
                }
                let data = '';
                response.on('data', (chunk) => (data += chunk));
                response.on('end', () => {
                    log('Fetched sports data successfully.');
                    resolve(data);
                });
            })
            .on('error', (err) => {
                console.error(`Error fetching sports data: ${err.message}`);
                reject(err);
            });
    });
}

async function fetchRemote(url) {
    return new Promise((resolve, reject) => {
        const mod = url.startsWith('https') ? https : http;
        mod
            .get(url, {
                headers: {
                    'Accept-Encoding': 'gzip, deflate, br'
                }
            }, (resp) => {
                if (resp.statusCode !== 200) {
                    return reject(new Error(`HTTP ${resp.statusCode} for ${url}`));
                }
                const chunks = [];
                resp.on('data', (chunk) => chunks.push(chunk));
                resp.on('end', () => {
                    const buffer = Buffer.concat(chunks);
                    const encoding = resp.headers['content-encoding'];
                    if (encoding === 'gzip') {
                        zlib.gunzip(buffer, (err, decoded) => {
                            if (err) return reject(err);
                            resolve(decoded);
                        });
                    } else if (encoding === 'deflate') {
                        zlib.inflate(buffer, (err, decoded) => {
                            if (err) return reject(err);
                            resolve(decoded);
                        });
                    } else if (encoding === 'br') {
                        zlib.brotliDecompress(buffer, (err, decoded) => {
                            if (err) return reject(err);
                            resolve(decoded);
                        });
                    } else {
                        resolve(buffer);
                    }
                });
            })
            .on('error', reject);
    });
}

async function serveKey(req, res) {
    try {
        const uriParam = new URL(req.url, `http://${req.headers.host}`).searchParams.get('uri');
        if (!uriParam) {
            res.writeHead(400, {
                'Content-Type': 'text/plain'
            });
            return res.end('Error: Missing "uri" parameter for key download.');
        }
        const keyData = await fetchRemote(uriParam);
        res.writeHead(200, {
            'Content-Type': 'application/octet-stream'
        });
        res.end(keyData);
    } catch (err) {
        console.error('Error in serveKey:', err.message);
        res.writeHead(500, {
            'Content-Type': 'text/plain'
        });
        res.end('Error fetching key.');
    }
}

let gCookies = {};
const USERAGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

function parseSetCookieHeaders(setCookieValues) {
    if (!Array.isArray(setCookieValues)) return;
    setCookieValues.forEach((line) => {
        const [cookiePair] = line.split(';');
        if (cookiePair) {
            const [key, val] = cookiePair.split('=');
            if (key && val) {
                gCookies[key.trim()] = val.trim();
            }
        }
    });
}

function buildCookieHeader() {
    const pairs = [];
    for (const [k, v] of Object.entries(gCookies)) {
        pairs.push(`${k}=${v}`);
    }
    return pairs.join('; ');
}

function fetchPage(url) {
    return new Promise((resolve, reject) => {
        const opts = {
            method: 'GET',
            headers: {
                'User-Agent': USERAGENT,
                Accept: '*/*',
                Cookie: buildCookieHeader(),
            },
        };
        https
            .get(url, opts, (res) => {
                if (res.statusCode !== 200) {
                    return reject(new Error(`Non-200 status ${res.statusCode} => ${url}`));
                }
                if (res.headers['set-cookie']) {
                    parseSetCookieHeaders(res.headers['set-cookie']);
                }
                let data = '';
                res.on('data', (chunk) => (data += chunk));
                res.on('end', () => resolve(data));
            })
            .on('error', reject);
    });
}

async function getTokenizedUrl(channelUrl) {
    try {
        const html = await fetchPage(channelUrl);

        let streamName;
        let streamHost;
        if (channelUrl.includes('espn-')) {
            streamName = 'ESPN';
        } else if (channelUrl.includes('espn2-')) {
            streamName = 'ESPN2';
        } else {
            const streamNameMatch = html.match(/id="stream_name" name="([^"]+)"/);
            if (!streamNameMatch) {
                log('No "stream_name" found');
                return null;
            }
            streamName = streamNameMatch[1];
        }
        if (channelUrl.match('tvpass\.org')) {
            streamHost = 'tvpass.org';
        };
        if (channelUrl.match('thetvapp\.to')) {
            streamHost = 'thetvapp.to';
        };
        const tokenUrl = `https://${streamHost}/token/${streamName}?quality=hd`;
        const tokenResponse = await fetchPage(tokenUrl);
        let finalUrl;
        try {
            const json = JSON.parse(tokenResponse);
            finalUrl = json.url;
        } catch (err) {
            log('Failed to parse token JSON');
            return null;
        }
        if (!finalUrl) {
            log('No URL found in the token JSON');
            return null;
        }
        log(`Tokenized URL: ${finalUrl}`);
        return finalUrl;
    } catch (err) {
        log(`Fatal error fetching token: ${err.message}`);
        return null;
    }
}

async function serveChannelPlaylist(req, res) {
    await semaphore.acquire();
    try {
        const urlParam = new URL(req.url, `http://${req.headers.host}`).searchParams.get('url');
        if (!urlParam) {
            log('Error: Missing URL parameter');
            res.writeHead(400, {
                'Content-Type': 'text/plain'
            });
            res.end('Error: Missing URL parameter.');
            return;
        }
        const decodedUrl = decodeURIComponent(urlParam);
        if (decodedUrl.endsWith('.ts')) {
            res.writeHead(302, {
                Location: decodedUrl
            });
            res.end();
            return;
        }
        const cachedUrl = getCache(decodedUrl);
        if (cachedUrl) {
            const rewrittenPlaylist = await rewritePlaylist(cachedUrl, req);
            res.writeHead(200, {
                'Content-Type': 'application/vnd.apple.mpegurl',
                'Content-Disposition': 'inline; filename="playlist.m3u8"',
            });
            res.end(rewrittenPlaylist);
            return;
        }
        log(`Fetching stream: ${urlParam}`);
        const finalUrl = await getTokenizedUrl(decodedUrl);
        if (!finalUrl) {
            log('Error: Failed to retrieve tokenized URL');
            res.writeHead(500, {
                'Content-Type': 'text/plain'
            });
            res.end('Error: Failed to retrieve tokenized URL.');
            return;
        }
        setCache(decodedUrl, finalUrl, 4 * 60 * 60 * 1000);
        const hdUrl = finalUrl.replace('tracks-v2a1', 'tracks-v1a1');
        const rewrittenPlaylist = await rewritePlaylist(hdUrl, req);
        res.writeHead(200, {
            'Content-Type': 'application/vnd.apple.mpegurl',
            'Content-Disposition': 'inline; filename="playlist.m3u8"',
        });
        res.end(rewrittenPlaylist);
        log('Served playlist');
    } catch (error) {
        log(`Error processing request: ${error.message}`);
        if (!res.headersSent) {
            res.writeHead(500, {
                'Content-Type': 'text/plain'
            });
            res.end('Error processing request.');
        }
    } finally {
        semaphore.release();
    }
}

async function rewritePlaylist(originalUrl, req) {
    const rawData = await fetchRemote(originalUrl);
    const protocol = req.headers['x-forwarded-proto']?.split(',')[0] || (req.socket.encrypted ? 'https' : 'http');
    const host = req.headers.host;
    const baseUrl = `${protocol}://${host}`;
    const playlistContent = rawData.toString('utf8');
    return playlistContent
        .replace(/URI="([^"]+)"/g, (match, uri) => {
            const resolvedUri = new URL(uri, originalUrl).href;
            return `URI="${baseUrl}/key?uri=${encodeURIComponent(resolvedUri)}"`;
        })
        .replace(/^([^#].*\.m3u8)(\?.*)?$/gm, (match, uri) => {
            const resolvedUri = new URL(uri, originalUrl).href;
            return `${baseUrl}/channel?url=${encodeURIComponent(resolvedUri)}`;
        })
        .replace(/^([^#].*\.ts)(\?.*)?$/gm, (match, uri) => {
            const resolvedUri = new URL(uri, originalUrl).href;
            return `${baseUrl}/channel?url=${encodeURIComponent(resolvedUri)}`;
        });
}

async function servePlaylist(response, req) {

    try {

        const protocol = req.headers['x-forwarded-proto']?.split(',')[0] || (req.socket.encrypted ? 'https' : 'http');
        const host = req.headers.host;
        const baseUrl = `${protocol}://${host}`;
        const formattedContent = fs.readFileSync(FORMATTED_FILE, 'utf-8');
        const updatedContent = formattedContent
            .replace(/(https?:\/\/[^\s]*thetvapp[^\s]*)/g, (fullUrl) => {
                return `${baseUrl}/channel?url=${encodeURIComponent(fullUrl)}`;
            })
            .replace(/(https?:\/\/[^\s]*tvpass[^\s]*)/g, (fullUrl) => {
                return `${baseUrl}/channel?url=${encodeURIComponent(fullUrl)}`;
            });

        response.writeHead(200, {
            'Content-Type': 'application/x-mpegURL',
            'Content-Disposition': 'inline; filename="playlist.m3u8"',
        });
        response.end(updatedContent);

    } catch (error) {

        console.error('Error in servePlaylist:', error.message);
        response.writeHead(500, {
            'Content-Type': 'text/plain'
        });
        response.end(`Error serving playlist: ${error.message}`);

    }

}

async function serveXmltv(response, req) {

    try {

        const protocol = req.headers['x-forwarded-proto']?.split(',')[0] || (req.socket.encrypted ? 'https' : 'http');
        const host = req.headers.host;
        const baseUrl = `${protocol}://${host}`;
        const formattedContent = fs.readFileSync(EPG_FILE, 'utf-8');

        response.writeHead(200, {
            'Content-Type': 'application/xml',
            'Content-Disposition': 'inline; filename="xmltv.1.xml"',
        });
        response.end(formattedContent);

    } catch (error) {

        console.error('Error in servePlaylist:', error.message);
        response.writeHead(500, {
            'Content-Type': 'text/plain'
        });
        response.end(`Error serving playlist: ${error.message}`);

    }

};

/*
ORIGINAL ASYNC HANDLER - HOPE ALL IS WELL DTANK - JOB WELL DONE
async function serveXmltv(response, req) {
  try {
    const protocol = req.headers['x-forwarded-proto']?.split(',')[0] || (req.socket.encrypted ? 'https' : 'http');
    const host = req.headers.host;
    const baseUrl = `${protocol}://${host}`;
    //const sportsData = await fetchSportsData();
    const formattedContent = fs.readFileSync(EPG_FILE, 'utf-8');
    //const updatedContent = formattedContent
      //.replace(/#\[SPORTS\]/g, sportsData || '')
      //.replace(/(https?:\/\/[^\s]*thetvapp[^\s]*)/g, (fullUrl) => {
        //return `${baseUrl}/channel?url=${encodeURIComponent(fullUrl)}`;
      //});
    response.writeHead(200, {
      'Content-Type': 'application/x-mpegURL',
      'Content-Disposition': 'inline; filename="playlist.m3u8"',
    });
    response.end(updatedContent);
  } catch (error) {
    console.error('Error in servePlaylist:', error.message);
    response.writeHead(500, { 'Content-Type': 'text/plain' });
    response.end(`Error serving playlist: ${error.message}`);
  }
}

async function servePlaylist(response, req) {
  try {
    const protocol = req.headers['x-forwarded-proto']?.split(',')[0] || (req.socket.encrypted ? 'https' : 'http');
    const host = req.headers.host;
    const baseUrl = `${protocol}://${host}`;
    //const sportsData = await fetchSportsData();
    const formattedContent = fs.readFileSync(FORMATTED_FILE, 'utf-8');
    const updatedContent = formattedContent
      //.replace(/#\[SPORTS\]/g, sportsData || '')
      .replace(/(https?:\/\/[^\s]*thetvapp[^\s]*)/g, (fullUrl) => {
        return `${baseUrl}/channel?url=${encodeURIComponent(fullUrl)}`;
      })
      .replace(/(https?:\/\/[^\s]*tvpass[^\s]*)/g, (fullUrl) => {
        return `${baseUrl}/channel?url=${encodeURIComponent(fullUrl)}`;
      });
    response.writeHead(200, {
      'Content-Type': 'application/x-mpegURL',
      'Content-Disposition': 'inline; filename="playlist.m3u8"',
    });
    response.end(updatedContent);
  } catch (error) {
    console.error('Error in servePlaylist:', error.message);
    response.writeHead(500, { 'Content-Type': 'text/plain' });
    response.end(`Error serving playlist: ${error.message}`);
  }
}
*/

function setCache(key, value, ttl) {
    const expiry = Date.now() + ttl;
    cache.set(key, {
        value,
        expiry
    });
    log(`Cache set: ${key}, expires in ${ttl / 1000} seconds`);
}

function getCache(key) {
    const cached = cache.get(key);
    if (cached && cached.expiry > Date.now()) {
        return cached.value;
    } else {
        if (cached) log(`Cache expired for key: ${key}`);
        cache.delete(key);
        return null;
    }
}

async function initialize() {
    try {
        log('Initializing server...');
        await ensureFileExists(externalURL, URLS_FILE);
        await ensureFileExists(externalFORMATTED_1, FORMATTED_FILE);
        await ensureFileExists(externalEPG, EPG_FILE);
        urls = fs.readFileSync(URLS_FILE, 'utf-8').split('\n').filter(Boolean);
        if (urls.length === 0) {
            throw new Error(`No valid URLs found in ${URLS_FILE}`);
        }
        log('Initialization complete.');
    } catch (error) {
        console.error(`Initialization error: ${error.message}`);
    }
}

const server = http.createServer((req, res) => {
    const handleRequest = async () => {
        const protocol = req.headers['x-forwarded-proto']?.split(',')[0] || (req.socket.encrypted ? 'https' : 'http');
        const host = req.headers.host;
        const baseUrl = `${protocol}://${host}`;
        if (req.url === '/' && req.method === 'GET') {
            const htmlContent = `<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Playlist Details</title>
        <meta name="robots" content="noindex, nofollow">
        <style>
            body {
                font-family: Arial, sans-serif;
                margin: 0;
                background-color: #fff;
                padding: 20px;
            }

            .container {
                width: 100%;
                max-width: 470px;
                margin: 0 auto;
            }

            h1 {
                color: #333;
                margin-bottom: 20px;
            }

            a {
                color: #007bff;
                text-decoration: none;
            }

            a:hover {
                text-decoration: underline;
            }

            .details p {
                margin: 10px 0;
                color: #555;
            }

            .warning {
                color: #ff4e4e;
                font-size: 16px;
                font-weight: bold;
                margin-bottom: 20px;
                text-align: center;
                width: 100%;
            }

            #firewall-warning {
                margin-top: 20px;
                width: 100%;
                text-align: center;
                color: #555;
            }

            #warning-container p {
                margin: 10px 0;
            }
        </style>
    </head>
    <body>
        <center>
            <div class="container main-container">
                <h1>Playlist Details</h1>
                <div class="details">
                    <p>
                        <strong>Playlist URL:</strong>
                        <a id="playlist-url" target="_blank"></a>
                    </p>
                    <p>
                        <strong>EPG URL:</strong>
                        <a id="epg-url" target="_blank"></a>
                    </p>
                </div>
                <div id="firewall-warning"></div>
                <div id="warning-container" class="container"></div>
            </div>
        </center>
        <script>
            const baseURL = window.location.origin;
            const playlistURL = baseURL + "/playlist";
            const epgURL = baseURL + "/epg";
            document.getElementById("playlist-url").textContent = playlistURL;
            document.getElementById("playlist-url").href = playlistURL;
            document.getElementById("epg-url").textContent = epgURL;
            document.getElementById("epg-url").href = epgURL;
        </script>
        <script>
            document.addEventListener("DOMContentLoaded", function() {
                const host = window.location.hostname;
                if (host === "localhost" || host === "127.0.0.1") {
                    const warning = document.createElement("div");
                    warning.style.color = "#ff4e4e";
                    warning.style.fontSize = "14px";
                    warning.style.textAlign = "center";
                    warning.style.fontWeight = "bold";
                    warning.innerHTML = " < p > Warning: If you are accessing this page via 127.0 .0 .1 or localhost, proxying will not work on other devices.Please load this page using your computer 's IP address (e.g., 192.168.x.x) and port in order to access the playlist from other devices on your network.</p>" +
                    " < p > How to locate IP address on < a href = 'https://www.youtube.com/watch?v=UAhDHXN2c6E'
                    target = '_blank' > Windows < /a> or  < a href = 'https://www.youtube.com/watch?v=gaIYP4TZfHI'
                    target = '_blank' > Linux < /a>. < /p>";
                    document.getElementById("warning-container").appendChild(warning);
                }
            });
            document.addEventListener("DOMContentLoaded", function() {
                const port = window.location.port || (window.location.protocol === "https:" ? "443" : "80");
                const warningMessage = " < p > Ensure that port < strong > " + port + " < /strong> is open and allowed through your Windows ( < a href = 'https://youtu.be/zOZWlTplrcA?si=nGXrHKU4sAQsy18e&t=18'
                target = '_blank' > how to < /a>) or Linux ( < a href = 'https://youtu.be/7c_V_3nWWbA?si=Hkd_II9myn-AkNnS&t=12'
                target = '_blank' > how to < /a>) firewall settings. This will enable other devices, such as Firestick, Android, and others, to connect to the server and request the playlist through the proxy. < /p>";
                document.getElementById("firewall-warning").innerHTML = warningMessage;
            });
        </script>
    </body>
</html>`;
            res.writeHead(200, {
                'Content-Type': 'text/html'
            });
            res.end(htmlContent);
            return;
        }
        if (req.url === '/playlist' && req.method === 'GET') {
            log('Playlist request received');
            await servePlaylist(res, req);
            return;
        }
        if (req.url.startsWith('/channel') && req.method === 'GET') {
            await serveChannelPlaylist(req, res);
            return;
        }
        if (req.url.startsWith('/key') && req.method === 'GET') {
            await serveKey(req, res);
            return;
        }
        if (req.url === '/epg' && req.method === 'GET') {
            log('Epg request received');
            await serveXmltv(res, req);
            return;
            /*res.writeHead(302, {
              Location: 'https://raw.githubusercontent.com/dtankdempse/thetvapp-m3u/refs/heads/main/guide/epg.xml',
            });
            res.end();
            return;*/
        }
        res.writeHead(404, {
            'Content-Type': 'text/plain'
        });
        res.end('Not Found');
    };
    handleRequest().catch((error) => {
        console.error('Error handling request:', error);
        res.writeHead(500, {
            'Content-Type': 'text/plain'
        });
        res.end('Internal Server Error');
    });
});

(async () => {
    await initialize();
    const PORT = process.env.WEB_PORT;
    server.listen(PORT, `${process.env.WEB_IP}`, () => {
        log(`Server is running on port ${PORT}`);
    });
})();
