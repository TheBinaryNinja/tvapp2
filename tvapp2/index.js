#!/usr/bin/env node

/*
    Import Packages
*/

import os from 'os'
import fs from 'fs'
import https from 'https'
import path from 'path';
import http from 'http'
import zlib from 'zlib'
import chalk from 'chalk';
import UserAgent from 'user-agents';
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

/*
    Define > Environment Variables || Defaults
*/

const envUrlRepo = process.env.URL_REPO || `https://git.binaryninja.net/binaryninja`;
const envStreamQuality = process.env.STREAM_QUALITY || `hd`;
const envFilePlaylist = process.env.FILE_PLAYLIST || `playlist.m3u8`;
const envFileEPG = process.env.FILE_EPG || `xmltv.xml`;
const LOG_LEVEL = process.env.LOG_LEVEL || 8;

/*
    Define > Externals
*/

const extURL = `${envUrlRepo}/tvapp2-externals/raw/branch/main/urls.txt`;
const extEPG = `${envUrlRepo}/XMLTV-EPG/raw/branch/main/xmltv.1.xml`;
const extFormatted = `${envUrlRepo}/tvapp2-externals/raw/branch/main/formatted.dat`;
const extEvents = '';

/*
    Define > Defaults
*/

let urls = [];
let tokenData = {
    subdomain: null,
    token: null,
    url: null,
    validationUrl: null,
    cookies: null,
};

let lastTokenFetchTime = 0;

let gCookies = {};
const USERAGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

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
            console.trace(chalk.white.bgMagenta.bold(` ${name} `), chalk.white(` → `), this.now(), chalk.magentaBright(message.join(" ")))
    }

    static debug(...message) {
        if (LOG_LEVEL >= 5)
            console.debug(chalk.white.bgGray.bold(` ${name} `), chalk.white(` → `), this.now(), chalk.gray(message.join(" ")))
    }

    static info(...message) {
        if (LOG_LEVEL >= 4)
            console.info(chalk.white.bgBlueBright.bold(` ${name} `), chalk.white(` → `), this.now(), chalk.blueBright(message.join(" ")))
    }

    static ok(...message) {
        if (LOG_LEVEL >= 4)
            console.log(chalk.white.bgGreen.bold(` ${name} `), chalk.white(` → `), this.now(), chalk.greenBright(message.join(" ")))
    }

    static notice(...message) {
        if (LOG_LEVEL >= 3)
            console.log(chalk.white.bgYellow.bold(` ${name} `), chalk.white(` → `), this.now(), chalk.yellowBright(message.join(" ")))
    }

    static warn(...message) {
        if (LOG_LEVEL >= 2)
            console.warn(chalk.white.bgYellow.bold(` ${name} `), chalk.white(` → `), this.now(), chalk.yellow(message.join(" ")))
    }

    static error(...message) {
        if (LOG_LEVEL >= 1)
            console.error(chalk.white.bgRedBright.bold(` ${name} `), chalk.white(` → `), this.now(), chalk.red(message.join(" ")))
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
    EPG_FILE = path.join(basePath, 'xmltv.1.xml');
    EPG_FILE.length;
} else {
    Log.info(`Processing Locals`);
    URLS_FILE = path.resolve(__dirname, 'urls.txt');
    FORMATTED_FILE = path.resolve(__dirname, 'formatted.dat');
    EPG_FILE = path.resolve(__dirname, 'xmltv.1.xml');
}

/*
    Semaphore > Declare

    allows multiple threads to work with the same shared resources
*/

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

/*
    Semaphore > Initialize

    @arg        int threads_max
*/

const semaphore = new Semaphore(5);

/*
    Func > Download File

    @arg        str url                         https://git.binaryninja.net/binaryninja/tvapp2-externals/raw/branch/main/urls.txt
    @arg        str filePath                    H:\Repos\github\BinaryNinja\tvapp2\tvapp2\urls.txt
    @return     Promise<>
*/

async function downloadFile(url, filePath) {
    Log.info(`Fetching ${url}`)

    return new Promise((resolve, reject) => {
        const isHttps = new URL(url).protocol === 'https:';
        const httpModule = isHttps ? https : http;
        const file = fs.createWriteStream(filePath);
        httpModule
            .get(url, (response) => {
                if (response.statusCode !== 200) {
                    Log.error(`Failed to download file: ${url}`, chalk.white(` → `), chalk.grey(`Status code: ${response.statusCode}`));
                    return reject(new Error(`Failed to download file: ${url}. Status code: ${response.statusCode}`));
                }
                response.pipe(file);
                file.on('finish', () => {
                    Log.ok(`Successfully fetched ${filePath}`)
                    file.close(() => resolve(true));
                });
            })
            .on('error', (err) => {
                Log.error(`Error downloading file: ${url}`, chalk.white(` → `), chalk.grey(`Status code: ${err.message}`));
                fs.unlink(filePath, () => reject(err));
            });
    });
}

/*
    Func > Ensure File Exists

    if file exists; start download from external website utilizing url and file path arguments; or
    throw error to user that file does not exist via the URL.

    If file cannot be obtained from external url; use local copy if available

    @arg        str url                         https://git.binaryninja.net/binaryninja/tvapp2-externals/raw/branch/main/urls.txt
    @arg        str filePath                    H:\Repos\github\BinaryNinja\tvapp2\tvapp2\urls.txt
    @return     none
*/

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
                    Log.error(`Server returned status code other than 200`, chalk.white(` → `), chalk.grey(`${url} - ${resp.statusCode}`));
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

            Log.error(`Missing "uri" parameter for key download`, chalk.white(` → `), chalk.grey(`${req.url}`));

            return res.end('Error: Missing "uri" parameter for key download.');
        }

        const keyData = await fetchRemote(uriParam);
        res.writeHead(200, {
            'Content-Type': 'application/octet-stream'
        });

        res.end(keyData);

    } catch (err) {
        Log.error(`ServeKey Error:`, chalk.white(` → `), chalk.grey(`${err.message}`));

        res.writeHead(500, {
            'Content-Type': 'text/plain'
        });

        res.end('Error fetching key.');
    }
}

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

/*
    Rewrites the URLs
*/

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

/*
    Serves IPTV .m3u playlist
*/

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

        response.writeHead(500, {
            'Content-Type': 'text/plain'
        });

        response.end(`Error serving playlist: ${error.message}`);
    }

}

/*
    Serves IPTV .xml guide data
*/

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

        await ensureFileExists(extURL, URLS_FILE);
        await ensureFileExists(extFormatted, FORMATTED_FILE);
        await ensureFileExists(extEPG, EPG_FILE);

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
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
        <title>TVApp2 - File Browser</title>
        <meta name="robots" content="noindex, nofollow">
        <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/css/bootstrap.min.css">
        <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/lightbox2/2.10.0/css/lightbox.min.css">
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/TheBinaryNinja/tvapp2@main/tvapp2/web/css/tvapp2.min.css">
        <style>
            body
            {
                background-color: #f8f9fa;
                padding-bottom: 20px;
                overflow: auto;
            }

            @media (prefers-color-scheme: dark)
            {
                body
                {
                    background-color: #262626;
                    color: #fff;
                }
            }

            @-webkit-keyframes fade-in
            {
                from { opacity: 0.6; }
                to { opacity: 1; }
            }

            @-moz-keyframes fade-in
            {
                from { opacity: 0.6; }
                to { opacity: 1; }
            }

            @keyframes fade-in
            {
                from { opacity: 0.6; }
                to { opacity: 1; }
            }

            @keyframes scale-in
            {
                from {
                    transform: scale(1, 1);
                }
                to {
                    transform: scale(1.1, 1.1);
                }
            }

            .container
            {
                text-align: left;
            }

            .container nav
            {
                margin-left: -8px;
            }

            .container .about
            {
                padding-left: 8px;
                padding-bottom: 4vh;
                font-size: 1.6vmin;
                line-height: 2.5vmin;
            }

            .breadcrumb
            {
                background-color: transparent;
                padding: 0rem 1rem;
            }

            .breadcrumb .breadcrumb-item a
            {
                color: #4caf50;
            }

            html
            {
                position: relative;
                min-height: 100%;
            }

            a
            {
                color: #FF0E7F !important;
                text-decoration: underline dotted #606060;
                font-weight: 600;
            }

            a:hover
            {
                color: #FFF !important;
                text-decoration: underline dotted #FF0048;
                font-weight: 600;
            }

            p
            {
                margin-top: 0;
                margin-bottom: 0;
            }

            .header .logo
            {
                animation-name: fade-in, scale-in;
                animation-duration: 1s, 0.5s;
                animation-timing-function: ease-in, linear;
                animation-direction: alternate, alternate;
                animation-iteration-count: infinite, 1;
                transition: all 0.3s;
                opacity: 0.5;
                transform: scale(1.1);
            }

            .footer
            {
                position: absolute;
                bottom: 0;
                width: 100%;
                margin-bottom: 0;
                padding-bottom: 20px;
                padding-top: 20px;
                background-color: #151515;
            }

            .footer a,
            .footer a:focus,
            .footer a:hover
            {
                color: #FFFFFF;
            }

            .footer a
            {
                color: #f7296c;
            }

            .navbar
            {
                padding: 15px 1rem;
            }

            .header
            {
                background-color: #a82147;
                color: #fff;
                height: 55px;
            }

            .header .navbar-brand
            {
                padding: 0 8px;
                font-size: 16px;
                line-height: 24px;
                height: 24px;
            }

            .header a
            {
                color: #FFF !important;
                text-decoration: none;
                padding-left: 7px;
            }

            #breadcrumbs::before
            {
                margin-top: 4px;
                padding-right: 15px;
                content: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 576 512' fill='white' width='19px' height='19px'%3E%3Cdefs%3E%3Cstyle%3E.fa-secondary%7Bopacity:.4%7D%3C/style%3E%3C/defs%3E%3Cpath class='fa-primary' d='M160 384H512c35.3 0 64-28.7 64-64V160c0-35.3-28.7-64-64-64H394.5c-17 0-33.3-6.7-45.3-18.7L322.7 50.7c-12-12-28.3-18.7-45.3-18.7H160c-35.3 0-64 28.7-64 64V320c0 35.3 28.7 64 64 64z'%3E%3C/path%3E%3Cpath class='fa-secondary' d='M24 96c13.3 0 24 10.7 24 24V344c0 48.6 39.4 88 88 88H456c13.3 0 24 10.7 24 24s-10.7 24-24 24H136C60.9 480 0 419.1 0 344V120c0-13.3 10.7-24 24-24z'%3E%3C/path%3E%3C/svg%3E");
            }

            .breadcrumb-item.active
            {
                color: #6c757d;
                padding-left: 10px;
            }

            .breadcrumb
            {
                padding-top: 30px;
            }

            .header-container
            {
                padding-top: 30px;
            }

            #list a,
            #list a:focus
            {
                color: #FFF !important;
            }

            #list a:hover
            {
                color: #ff275d !important;
            }

            #list colgroup
            {
                display: none;
            }

            #list .filename
            {
                word-break: break-all;
                white-space: normal;
            }

            table
            {
                margin-bottom: 10vh !important;
            }

            .table thead th a
            {
                color: #9b9b9b !important;
                font-weight: normal;
            }

            .table td, .table th
            {
                padding: .75rem;
                vertical-align: top;
                border-top: 0px solid #dee2e6;
                font-size: 1.6vmin;
                line-height: 2.5vmin;
            }

            .table thead tr
            {
                border-bottom: 2px solid #575757;
                background-color: #181818;
                color: #717171;
            }

            .table thead th
            {
                vertical-align: bottom;
                border-bottom: 0px solid #575757;
                font-size: 1.6vmin;
                line-height: 2.5vmin;
            }

            .table-hover tbody tr:hover
            {
                background-color: rgba(155, 155, 155, 0.075);
            }

            .text-accent
            {
                font-weight: bold;
                color: #d0c273;
            }

            #warning-firewall
            {
                background-color: #0F0F0F57;
                padding: 2vh;
                margin-bottom: 2vh;
                font-size: 1.6vmin;
                font-weight: 100;
                border: 1px dashed #FF6C00;
                width: 100%;
                line-height: 25px;
            }

            #warning-localhost
            {
                background-color: #0F0F0F57;
                padding: 2vh;
                font-size: 1.6vmin;
                font-weight: 100;
                border: 1px dashed #FF0048;
                width: 100%;
                line-height: 25px;
            }

            span.notice
            {
                color:                      #FFF;
                background-color:           #97950A;
                padding-left:               7px;
                padding-right:              7px;
                padding-top:                2px;
                padding-bottom:             2px;
                font-family:                SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace;
                margin-right:               8px;
                animation-name:             fade-in, scale-in;
                animation-duration:         1s, 0.5s;
                animation-timing-function:  ease-in, linear;
                animation-direction:        alternate, alternate;
                animation-iteration-count:  infinite, 1;
                transition:                 all 0.3s;
                opacity:                    0.5;
                transform:                  scale(1.1);
            }

            span.warning
            {
                color:                      #FFF;
                background-color:           #aa102d;
                padding-left:               7px;
                padding-right:              7px;
                padding-top:                2px;
                padding-bottom:             2px;
                font-family:                SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace;
                margin-right:               8px;
                animation-name:             fade-in, scale-in;
                animation-duration:         1s, 0.5s;
                animation-timing-function:  ease-in, linear;
                animation-direction:        alternate, alternate;
                animation-iteration-count:  infinite, 1;
                transition:                 all 0.3s;
                opacity:                    0.5;
                transform:                  scale(1.1);
            }

            code
            {
                font-size: 96%;
                color: #ff4985;
                word-break: break-word;
                padding-right: 5px;
                padding-left: 4px;
            }

            @media (prefers-color-scheme: dark)
            {
                #list a,
                #list a:focus,
                #list a:hover {
                    color: #fff;
                }
            }
        </style>
    </head>

    <body>
        <div class="header">
            <nav class="navbar sticky-top container">
                <div class="navbar-brand">
                    <i class="logo fa-sharp-duotone fa-regular fa-tv" style="--fa-primary-color: rgb(255, 255, 255); --fa-secondary-color: rgb(255, 255, 255);" aria-hidden="true"></i>
                    <a class="header-name" href="https://github.com/Aetherinox/thetvapp-docker">TVApp2 for Docker</a>
                </div>
            </nav>
        </div>

        <div class="container header-container">
            <div class="row">
                <div class="col">
                    <div class="about">This page displays your most recent copies of the <code>.m3u8</code> playlist and <code>.xml</code> EPG guide data. Right-click each file, select <span class="text-accent">Copy Link</span> and paste the URLs within an IPTV app such as Jellyfin. The <code>.m3u8</code> and <code>.m3u8.gz</code> are identical guide lists, but the <code>.xml.gz</code> is compressed and will import into your IPTV application much faster.</div>
                </div>
            </div>
        </div>

        <div class="container main-container">
            <table id="list" class="table table-sm table-hover text-nowrap">
                <thead>
                    <tr class="d-none d-md-table-row">
                        <td class="col-auto"></td>
                        <th style="width:55%" class="col filename">
                            File Name
                        </th>
                        <th style="width:25%" class="col-auto d-none d-md-table-cell">
                            Description
                        </th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td class="col-auto">
                            <svg class="svg-inline--fa fa-file-lines fa-fw" aria-hidden="true" focusable="false" data-prefix="fas" data-icon="file-lines" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" data-fa-i2svg="">
                                <path fill="currentColor" d="M64 0C28.7 0 0 28.7 0 64V448c0 35.3 28.7 64 64 64H320c35.3 0 64-28.7 64-64V160H256c-17.7 0-32-14.3-32-32V0H64zM256 0V128H384L256 0zM112 256H272c8.8 0 16 7.2 16 16s-7.2 16-16 16H112c-8.8 0-16-7.2-16-16s7.2-16 16-16zm0 64H272c8.8 0 16 7.2 16 16s-7.2 16-16 16H112c-8.8 0-16-7.2-16-16s7.2-16 16-16zm0 64H272c8.8 0 16 7.2 16 16s-7.2 16-16 16H112c-8.8 0-16-7.2-16-16s7.2-16 16-16z"></path>
                            </svg>
                            <!-- <i class="fa fa-fw fa-solid fa-file-lines" aria-hidden="true"></i> -->
                        </td>
                        <td class="link col filename">
                            <a id="playlist-url" target="_blank"></a>
                        </td>
                        <td class="date col-auto d-none d-md-table-cell">Playlist data file which contains a list of all channels, their associated group, and logo URL.</td>
                    </tr>
                    <tr>
                        <td class="col-auto">
                            <svg class="svg-inline--fa fa-file-lines fa-fw" aria-hidden="true" focusable="false" data-prefix="fas" data-icon="file-lines" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" data-fa-i2svg="">
                                <path fill="currentColor" d="M64 0C28.7 0 0 28.7 0 64V448c0 35.3 28.7 64 64 64H320c35.3 0 64-28.7 64-64V160H256c-17.7 0-32-14.3-32-32V0H64zM256 0V128H384L256 0zM112 256H272c8.8 0 16 7.2 16 16s-7.2 16-16 16H112c-8.8 0-16-7.2-16-16s7.2-16 16-16zm0 64H272c8.8 0 16 7.2 16 16s-7.2 16-16 16H112c-8.8 0-16-7.2-16-16s7.2-16 16-16zm0 64H272c8.8 0 16 7.2 16 16s-7.2 16-16 16H112c-8.8 0-16-7.2-16-16s7.2-16 16-16z"></path>
                            </svg>
                            <!-- <i class="fa fa-fw fa-solid fa-file-lines" aria-hidden="true"></i> -->
                        </td>
                        <td class="link col filename">
                            <a id="epg-url" target="_blank"></a>
                        </td>
                        <td class="date col-auto d-none d-md-table-cell">XML / EPG guide data which contains a list of all programs which are scheduled to play on a specific channel.</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div class="container">
            <div id="warning-firewall"></div>
            <div id="warning-localhost" class="container"></div>
        </div>

        <footer class="footer navbar">
            <div class="container">
                <div class="col text-center text-muted text-small text-nowrap">
                    <small>Developed by BinaryNinja - <a href="https://github.com/thebinaryninja/tvapp2">TVApp2</a></small><br />
                    <small>This utility is for educational purposes only</small>
                </div>
            </div>
        </footer>

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
            document.addEventListener("DOMContentLoaded", function()
            {
                const host = window.location.hostname;
                if (host === "localhost" || host === "127.0.0.1")
                {
                    const warning       = document.createElement("div");
                    warning.innerHTML   = "<p><span class='warning'>Warning</span> If you are accessing this page via 127.0.0.1 or localhost, proxying will not work on other devices.Please load \
                                        this page using your computer's IP address (e.g., 192.168.x.x) and port in order to access the playlist from other devices on your network.</p> \
                                        <br> \
                                        <p> Learn how to locate your IP address on <a href='https://youtube.com/watch?v=UAhDHXN2c6E' target = '_blank' > Windows</a> or \
                                        <a href='https://youtube.com/watch?v=gaIYP4TZfHI' target = '_blank' > Linux</a>.</p>";

                    document.getElementById("warning-localhost").appendChild(warning);
                } else {
                    document.getElementById("warning-localhost").style.display = "none";
                }
            });

            document.addEventListener("DOMContentLoaded", function()
            {
                const port              = window.location.port || (window.location.protocol === "https:" ? "443" : "80");
                const warningMessage    = "<p><span class='notice'>Notice</span> Port <strong> " + port + " </strong> must be open and allowed through your <a href='https://youtu.be/zOZWlTplrcA?si=nGXrHKU4sAQsy18e&t=18 target='_blank'>Windows</a> \
                                        or <a href='https://youtu.be/7c_V_3nWWbA?si=Hkd_II9myn-AkNnS&t=12' target='_blank'>Linux</a> OS firewall settings \
                                        This action enables devices such as Firestick or Android to connect to the server and request the playlist through the proxy.</p>";

                document.getElementById("warning-firewall").innerHTML = warningMessage;
            });
        </script>
        <script src="https://cdn.jsdelivr.net/gh/TheBinaryNinja/tvapp2@main/tvapp2/web/js/tvapp2.min.js"></script>
    </body>
</html>`;
            res.writeHead(200, {
                'Content-Type': 'text/html'
            });
            res.end(htmlContent);
            return;
        }

        if (req.url === '/playlist' && req.method === 'GET') {
            Log.info(`Received request for playlist data`, chalk.white(` → `), chalk.grey(`/playlist`));

            await servePlaylist(res, req);
            return;
        }

        if (req.url.startsWith('/channel') && req.method === 'GET') {
            Log.info(`Received request for channel data`, chalk.white(` → `), chalk.grey(`/channel`));

            await serveChannelPlaylist(req, res);
            return;
        }

        if (req.url.startsWith('/key') && req.method === 'GET') {
            Log.info(`Received request for key data`, chalk.white(` → `), chalk.grey(`/key`));

            await serveKey(req, res);
            return;
        }

        if (req.url === '/epg' && req.method === 'GET') {
            Log.info(`Received request for EPG data`, chalk.white(` → `), chalk.grey(`/epg`));

            await serveXmltv(res, req);
            return;
        }

        res.writeHead(404, {
            'Content-Type': 'text/plain'
        });

        res.end('Not Found');
    };
    handleRequest().catch((error) => {
        Log.error(`Error handling request:`, chalk.white(` → `), chalk.grey(`${error}`));

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
    });
})();
