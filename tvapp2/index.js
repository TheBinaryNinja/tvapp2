#!/usr/bin/env node

/*
    Import Packages
*/

import os from 'os'
import fs from 'fs'
import https from 'https'
import path from 'path';
import UserAgent from 'user-agents';
import http from 'http'
import zlib from 'zlib'
import chalk from 'chalk';
const cache = new Map();

/*
    Import package.json values
*/

const { name, author, version, repository } = JSON.parse(fs.readFileSync('./package.json'));

/*
    Old CJS variables converted to ESM
*/

import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url); // get resolved path to file
const __dirname = path.dirname(__filename); // get name of directory

/*
    chalk.level

    @ref        https://npmjs.com/package/chalk
                - 0 	All colors disabled
                - 1 	Basic color support (16 colors)
                - 2 	256 color support
                - 3 	Truecolor support (16 million colors)

    When assigning text colors, terminals and the windows command prompt can display any color; however apps
    such as Portainer console cannot. If you use 16 million colors and are viewing console in Portainer, colors will
    not be the same as the rgb value. It's best to just stick to Chalk's default colors.
*/

chalk.level = 3;

/*
    Define > General
*/

let URLS_FILE;
let FORMATTED_FILE;
let EPG_FILE;
const externalURL = `${process.env.URL_REPO}/tvapp2-externals/raw/branch/main/urls.txt`;
const externalEPG = `${process.env.URL_REPO}//XMLTV-EPG/raw/branch/main/xmltv.1.xml`;
const externalFORMATTED_1 = `${process.env.URL_REPO}/tvapp2-externals/raw/branch/main/formatted.dat`;
const externalFORMATTED_2 = '';
const externalFORMATTED_3 = '';
const envUrlRepo = process.env.URL_REPO || `https://git.binaryninja.net/binaryninja`;
const envStreamQuality = process.env.STREAM_QUALITY || `hd`;
const envFilePlaylist = process.env.FILE_PLAYLIST || `playlist.m3u8`;
const envFileEPG = process.env.FILE_EPG || `xmltv.xml`;
const LOG_LEVEL = process.env.LOG_LEVEL || 8;
/*
    Define > Logs

    When assigning text colors, terminals and the windows command prompt can display any color; however apps
    such as Portainer console cannot. If you use 16 million colors and are viewing console in Portainer, colors will
    not be the same as the rgb value. It's best to just stick to Chalk's default colors.

    Various levels of logs with the following usage:
        Log.trace(`This is trace`)
        Log.debug(`This is debug`)
        Log.info(`This is info`)
        Log.ok(`This is ok`)
        Log.notice(`This is notice`)
        Log.warn(`This is warn`)
        Log.error(
            `Error fetching sports data with error:`,
            chalk.white(` → `),
            chalk.grey(`This is the error message`)
        );

        Level               Type
    -----------------------------------
        6                   Trace
        5                   Debug
        4                   Info
        3                   Notice
        2                   Warn
        1                   Error
*/

class Log {
    static now() {
        const now = new Date();
        return chalk.gray(`[${now.toLocaleTimeString()}]`)
    }

    static trace(...message) {
        if (LOG_LEVEL >= 6)
        {
            console.trace(
                chalk.white.bgMagenta.bold(` ${name} `),
                chalk.white(` → `),
                this.now(),
                chalk.magentaBright(message.join(" "))
            )
        }
    }

    static debug(...message) {
        if (LOG_LEVEL >= 5)
        {
            console.debug(
                chalk.white.bgGray.bold(` ${name} `),
                chalk.white(` → `),
                this.now(),
                chalk.gray(message.join(" "))
            )
        }
    }

    static info(...message) {
        if (LOG_LEVEL >= 4)
        {
            console.info(
                chalk.white.bgBlueBright.bold(` ${name} `),
                chalk.white(` → `),
                this.now(),
                chalk.blueBright(message.join(" "))
            )
        }
    }

    static ok(...message) {
        if (LOG_LEVEL >= 4)
        {
            console.log(
                chalk.white.bgGreen.bold(` ${name} `),
                chalk.white(` → `),
                this.now(),
                chalk.greenBright(message.join(" "))
            )
        }
    }

    static notice(...message) {
        if (LOG_LEVEL >= 3)
        {
            console.log(
                chalk.white.bgYellow.bold(` ${name} `),
                chalk.white(` → `),
                this.now(),
                chalk.yellowBright(message.join(" "))
            )
        }
    }

    static warn(...message) {
        if (LOG_LEVEL >= 2)
        {
            console.warn(
                chalk.white.bgYellow.bold(` ${name} `),
                chalk.white(` → `),
                this.now(),
                chalk.yellow(message.join(" "))
            )
        }
    }

    static error(...message) {
        if (LOG_LEVEL >= 1)
        {
            console.error(
                chalk.white.bgRedBright.bold(` ${name} `),
                chalk.white(` → `),
                this.now(),
                chalk.red(message.join(" "))
            )
        }
    }
}

/*
    Process
*/

if (process.pkg) {
    Log.info(`Processing Package`);
    const basePath = path.dirname(process.execPath);
    URLS_FILE = path.join(basePath, 'urls.txt');
    FORMATTED_FILE = path.join(basePath, 'formatted.dat');
    //EPG_FILE = path.join(basePath, 'epg.xml');
    EPG_FILE = path.join(basePath, 'xmltv.1.xml');
    EPG_FILE.length;
} else {
    Log.info(`Processing Locals`);
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
    Log.info(`Fetching ${url}`)

    return new Promise((resolve, reject) => {
        const isHttps = new URL(url).protocol === 'https:';
        const httpModule = isHttps ? https : http;
        const file = fs.createWriteStream(filePath);

        httpModule
            .get(url, (response) => {
                if (response.statusCode !== 200) {
                    Log.error(
                        `Failed to download file: ${url}`,
                        chalk.white(` → `),
                        chalk.grey(`Status code: ${response.statusCode}`)
                    );
                    return reject(new Error(`Failed to download file: ${url}. Status code: ${response.statusCode}`));
                }
                response.pipe(file);
                file.on('finish', () => {
                    Log.ok(`Successfully fetched ${filePath}`)
                    file.close(() => resolve(true));
                });
            })
            .on('error', (err) => {
                Log.error(
                    `Error downloading file: ${url}`,
                    chalk.white(` → `),
                    chalk.grey(`Status code: ${err.message}`)
                );
                fs.unlink(filePath, () => reject(err));
            });
    });
}

async function ensureFileExists(url, filePath) {
    try {
        await downloadFile(url, filePath);
    } catch (error) {
        if (fs.existsSync(filePath)) {
            Log.warn(`Using existing local file ${filePath}, download failed`, chalk.white(` → `), chalk.grey(`${url}`));
        } else {
            Log.error(`Failed to download file, and no local file exists; aborting`, chalk.white(` → `), chalk.grey(`${url}`));

            throw error;
        }
    }
}

// REMOVED REFERENCE CALLS TO THIS FUNCTION
// TODO: UPDATES TO HANDLER FOR SPORT EVENTS
async function fetchSportsData() {
    return new Promise((resolve, reject) => {
        const isHttps = new URL(extEvents).protocol === 'https:';
        const httpModule = isHttps ? require('https') : require('http');
        httpModule
            .get(url, (response) => {
                if (response.statusCode !== 200) {
                    Log.error(`Failed to fetch sports data. Server returned status code other than 200`, chalk.white(` → `), chalk.grey(`${url} - ${response.statusCode}`));
                    return reject(new Error(`Failed to fetch sports data. Status code: ${response.statusCode}`));
                }

                let data = '';
                response.on('data', (chunk) => (data += chunk));
                response.on('end', () => {
                    Log.ok(`Fetched sports data successfully`);
                    resolve(data);
                });
            })
            .on('error', (err) => {
                Log.error(`Error fetching sports data:`, chalk.white(` → `), chalk.grey(`${err.message}`));
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
                    Log.error(
                        `Server returned status code other than 200`,
                        chalk.white(` → `),
                        chalk.grey(`${url} - ${resp.statusCode}`)
                    );

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

            Log.error(
                `Missing "uri" parameter for key download`,
                chalk.white(` → `),
                chalk.grey(`${req.url}`)
            );

            return res.end('Error: Missing "uri" parameter for key download.');
        }

        const keyData = await fetchRemote(uriParam);
        res.writeHead(200, {
            'Content-Type': 'application/octet-stream'
        });

        res.end(keyData);

    } catch (err) {
        Log.error(
            `ServeKey Error:`,
            chalk.white(` → `),
            chalk.grey(`${err.message}`)
        );

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
                Log.error(`Cannot find "stream_name"`, chalk.white(` → `), chalk.grey(`${channelUrl}`));
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

        const tokenUrl = `https://${streamHost}/token/${streamName}?quality=${envStreamQuality}`;
        const tokenResponse = await fetchPage(tokenUrl);
        let finalUrl;

        try {
            const json = JSON.parse(tokenResponse);
            finalUrl = json.url;
        } catch (err) {
            Log.error(`Failed to parse token JSON for channel`, chalk.white(` → `), chalk.grey(`${channelUrl} - ${err.message}`));
            return null;
        }

        if (!finalUrl) {
            Log.error(`No URL found in token JSON for channel`, chalk.white(` → `), chalk.grey(`${channelUrl}`));
            return null;
        }

        Log.debug(`Tokenized URL:`, chalk.white(` → `), chalk.grey(`${finalUrl}`));

        return finalUrl;
    } catch (err) {
        Log.error(`Fatal error fetching token:`, chalk.white(` → `), chalk.grey(`${err.message}`));
        return null;
    }
}

async function serveChannelPlaylist(req, res) {
    await semaphore.acquire();
    try {

        const urlParam = new URL(req.url, `http://${req.headers.host}`).searchParams.get('url');
        if (!urlParam) {
            Log.error(`Missing parameter`, chalk.white(` → `), chalk.grey(`URL`));
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
            res.writeHead(200,
            {
                'Content-Type': 'application/vnd.apple.mpegurl',
                'Content-Disposition': 'inline; filename="' + envFilePlaylist,
            });
            res.end(rewrittenPlaylist);
            return;
        }

        Log.info(`Fetching stream:`, chalk.white(` → `), chalk.grey(`${urlParam}`));

        const finalUrl = await getTokenizedUrl(decodedUrl);
        if (!finalUrl) {
            Log.error(`Failed to retrieve tokenized URL`);

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
            'Content-Disposition': 'inline; filename="' + envFilePlaylist,
        });

        res.end(rewrittenPlaylist);
        Log.ok(`Served playlist`);
    } catch (error) {
        Log.error(`Error processing request:`, chalk.white(` → `), chalk.grey(`${error.message}`));

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
            'Content-Disposition': 'inline; filename="' + envFilePlaylist,
        });

        response.end(updatedContent);

    } catch (error) {
        Log.error(`Error in servePlaylist:`, chalk.white(` → `), chalk.grey(`${error.message}`));

        console.error('Error in servePlaylist:', error.message);
        response.writeHead(500, {
            'Content-Type': 'text/plain'
        });
        response.end(`Error serving playlist: ${error.message}`);

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

        Log.error(`Error in servePlaylist:`, chalk.white(` → `), chalk.grey(`${error.message}`));

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

    Log.debug(`Cache set for key ${key} which expires in`, chalk.white(` → `), chalk.grey(`${ttl / 1000} seconds`));
}

function getCache(key) {
    const cached = cache.get(key);
    if (cached && cached.expiry > Date.now()) {
        return cached.value;
    } else {
        if (cached)
            Log.debug(`Cache expired for key`, chalk.white(` → `), chalk.grey(`${key}`));

        cache.delete(key);
        return null;
    }
}

async function initialize() {
    try {
        Log.info(`Initializing server...`);

        await ensureFileExists(externalFORMATTED_1, FORMATTED_FILE);
        await ensureFileExists(externalEPG, EPG_FILE);

        urls = fs.readFileSync(URLS_FILE, 'utf-8').split('\n').filter(Boolean);
        if (urls.length === 0) {
            throw new Error(`No valid URLs found in ${URLS_FILE}`);
        }

        Log.info(`Initializing Complete`);
    } catch (error) {
        Log.error(`Initialization error:`, chalk.white(` → `), chalk.grey(`${error.message}`));
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
            document.getElementById("playlist-url").textContent = "${envFilePlaylist}";
            document.getElementById("playlist-url").href = playlistURL;
            document.getElementById("epg-url").textContent = "${envFileEPG}";
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
            Log.info(
                `Received request for playlist data`,
                chalk.white(` → `),
                chalk.grey(`/playlist`)
            );

            await servePlaylist(res, req);
            return;
        }

        if (req.url.startsWith('/channel') && req.method === 'GET') {
            Log.info(
                `Received request for channel data`,
                chalk.white(` → `),
                chalk.grey(`/channel`)
            );

            await serveChannelPlaylist(req, res);
            return;
        }

        if (req.url.startsWith('/key') && req.method === 'GET') {
            Log.info(
                `Received request for key data`,
                chalk.white(` → `),
                chalk.grey(`/key`)
            );

            await serveKey(req, res);
            return;
        }

        if (req.url === '/epg' && req.method === 'GET') {
            Log.info(
                `Received request for EPG data`,
                chalk.white(` → `),
                chalk.grey(`/epg`)
            );

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
        Log.error(
            `Error handling request:`,
            chalk.white(` → `),
            chalk.grey(`${error}`)
        );

        res.writeHead(500, {
            'Content-Type': 'text/plain'
        });

        res.end('Internal Server Error');
    });
});

/*
    Initialize Webserver
*/

(async () => {
    const envWebIP = process.env.WEB_IP || '0.0.0.0';
    const envWebPort = process.env.WEB_PORT || `4124`;

    await initialize();
    server.listen(envWebPort, envWebIP, () => {
        Log.info(`Server is running on ${envWebIP}:${envWebPort}`)
        log(`Server is running on port ${PORT}`);
    });
})();
