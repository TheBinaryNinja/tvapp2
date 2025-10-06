#!/usr/bin/env node

/*
    Import Packages
*/

import fs from 'fs';
import path from 'path';
import http from 'http';
import https from 'https';
import os from 'node:os';
import osName from 'os-name';
import getos from 'getos';
import zlib from 'zlib';
import chalk from 'chalk';
import ejs from 'ejs';
import moment from 'moment';
import TimeAgo from 'javascript-time-ago';
import en from 'javascript-time-ago/locale/en';
import Log from './classes/Log.js';
import Storage from './classes/Storage.js';
import Utils from './classes/Utils.js';
import CLib from './classes/CLib.js';
import Semaphore from './classes/Semaphore.js';
import Tuner from './classes/Tuner.js';
import cron, { schedule } from 'node-cron';
import * as child from 'child_process';
import * as crons from 'cron';

/*
    Old CJS variables converted to ESM
*/

import { fileURLToPath } from 'url';

/*
    Initialize classes
*/

const cache = new Map();
const clib = new CLib();

const encoded = clib.encodeToHexBase64( 'tvapp2' );
const decoded = clib.decodeFromHexBase64( `${ encoded }` );

/*
    Import package.json values
*/

const { name, author, version, repository, discord, docs } = JSON.parse( fs.readFileSync( './package.json' ) );
const __filename = fileURLToPath( import.meta.url );            // get resolved path to file
const __dirname = path.dirname( __filename );                   // get name of directory

/*
    const gitHash = child.execSync( 'git rev-parse HEAD' ).toString().trim();
*/

/*
    chalk.level

    @ref        https://npmjs.com/package/chalk
                - 0    All colors disabled
                - 1    Basic color support (16 colors)
                - 2    256 color support
                - 3    Truecolor support (16 million colors)

    When assigning text colors, terminals and the windows command prompt can display any color; however apps
    such as Portainer console cannot. If you use 16 million colors and are viewing console in Portainer, colors will
    not be the same as the rgb value. It's best to just stick to Chalk's default colors.
*/

chalk.level = 3;

/*
    timeAgo
*/

TimeAgo.addDefaultLocale( en );
const timeAgo = new TimeAgo( );

/*
    Define › General

    @note       if you change `envWebFolder`; ensure you re-name the folder where the
                website assets are stored.
*/

let FILE_CFG;
let FILE_URL;
let FILE_M3U;
let FILE_XML;
let FILE_GZP;
let FILE_M3U_SIZE = 0;
let FILE_XML_SIZE = 0;
let FILE_GZP_SIZE = 0;
let FILE_M3U_MODIFIED = 0;
let FILE_XML_MODIFIED = 0;
let FILE_GZP_MODIFIED = 0;

/*
    Define › Environment Variables || Defaults
*/

const envAppRelease = process.env.RELEASE || 'stable';
const envUrlRepo = process.env.URL_REPO || 'https://git.binaryninja.net/binaryninja';
const envXmlEpg = process.env.URL_EPG || 'https://epg.binaryninja.net/XMLTV-EPG'; 
const envStreamQuality = process.env.STREAM_QUALITY || 'hd';
const envFileURL = process.env.FILE_URL || 'urls.txt';
const envFileM3U = process.env.FILE_M3U || 'playlist.m3u8';
const envFileXML = process.env.FILE_EPG || 'xmltv.xml';
const envFileGZP = process.env.FILE_GZP || 'xmltv.xml.gz';
const envApiKey = process.env.API_KEY || null;
const envWebIP = process.env.WEB_IP || '0.0.0.0';
const envWebPort = process.env.WEB_PORT || `4124`;
const envWebFolder = process.env.WEB_FOLDER || 'www';
const envHdhrPort = process.env.HDHR_PORT || `6077`;
const envWebEncoding = process.env.WEB_ENCODING || 'deflate, br';
const envProxyHeader = process.env.WEB_PROXY_HEADER || 'x-forwarded-for';
const envHealthTimer = process.env.HEALTH_TIMER || 600000;
const envTaskCronSync = process.env.TASK_CRON_SYNC || '0 0 */3 * *';
const envGitSHA1 = process.env.GIT_SHA1 || '0000000000000000000000000000000000000000';
const LOG_LEVEL = process.env.LOG_LEVEL || 4;

/*
    Server
*/

let serverOs = 'Unknown';
let serverStartup = 0;

/*
    Define › Externals
*/

const extURL = `${ envUrlRepo }/tvapp2-externals/raw/branch/main/urls.txt`;
const extXML = `${ envXmlEpg }/xmltv.1.xml`;
const extM3U = `${ envUrlRepo }/tvapp2-externals/raw/branch/main/formatted.dat`;

/*
    Define › Defaults
*/

let urls = [];
const gCookies = {};
const USERAGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:138.0) Gecko/20100101 Firefox/138.0';

/*
    Web url shortcuts

    using any of the following subdomains / subpaths will trigger the download for that specific file

    @example        http://127.0.0.1:4124/gzip
                    http://127.0.0.1:4124/gz
                    http://127.0.0.1:4124/playlist
                    http://127.0.0.1:4124/key
                    http://127.0.0.1:4124/channel?url=https://thetvapp.to/tv/bbc-america-live-stream/
                    http://127.0.0.1:4124/api/health
*/

const subdomainGZP = [ 'gzip', 'gz' ];
const subdomainM3U = [ 'playlist', 'm3u', 'm3u8' ];
const subdomainEPG = [ 'guide', 'epg', 'xml' ];
const subdomainKey = [ 'key', 'keys' ];
const subdomainChan = [ 'channels', 'channel', 'chan' ];
const subdomainHealth = [ 'api/status', 'api/health' ];
const subdomainRestart = [ 'api/restart', 'api/sync', 'api/resync' ];

/*
    Container Information

    these environment variables are defined from the s6-overlay layer of the docker image
*/

const fileIpGateway = '/var/run/s6/container_environment/IP_GATEWAY';
const fileIpContainer = '/var/run/s6/container_environment/IP_CONTAINER';
const envIpGateway = fs.existsSync( fileIpGateway ) ? fs.readFileSync( fileIpGateway, 'utf8' ) : `0.0.0.0`;
const envIpContainer = fs.existsSync( fileIpContainer ) ? fs.readFileSync( fileIpContainer, 'utf8' ) : `0.0.0.0`;

/*
    Hosts
*/

const hosts =
[
    { name: 'TVPass.org', url: 'https://tvpass.org' },
    { name: 'TheTVApp.to', url: 'https://thetvapp.to' },
    { name: 'MoveOnJoy.com', url: 'http://moveonjoy.com' },
    { name: 'Daddylive.dad', url: 'https://daddylivestream.com' },
    { name: 'git.binaryninja.net', url: envUrlRepo }
];

/*
    Get Server OS

    attempts to get the OS of a server a few different ways; and not just show "Linux".

    Windows machines will show          Windows 11
    Linux machines will show            Linux Alpine (3.22.0)
*/

getos( ( e, json ) =>
{
    if ( e )
        return osName( os.platform(), os.release() );

    if ( json.os === 'win32' )
        serverOs = osName( os.platform(), os.release() );

    if ( json.os === 'linux' )
    {
        if ( json.dist )
            serverOs = json.dist;

        if ( json.release )
            serverOs = serverOs.concat( ' ', '(' + json.release + ')' );
    }

    return serverOs;
});

/*
    Process
*/

if ( process.pkg )
{
    Log.info( `core`, chalk.yellow( `[initiate]` ), chalk.white( `ℹ️` ),
        chalk.blueBright( `<msg>` ), chalk.gray( `Starting server utilizing process.execPath` ) );

    const basePath = path.dirname( process.execPath );
    FILE_CFG = path.join( basePath, envWebFolder, `config.json` );
    FILE_URL = path.join( basePath, envWebFolder, `${ envFileURL }` );
    FILE_M3U = path.join( basePath, envWebFolder, `${ envFileM3U }` );
    FILE_XML = path.join( basePath, envWebFolder, `${ envFileXML }` );
    FILE_XML.length;
    FILE_GZP = path.join( basePath, envWebFolder, `${ envFileGZP }` );
}
else
{
    Log.info( `core`, chalk.yellow( `[initiate]` ), chalk.white( `ℹ️` ),
        chalk.blueBright( `<msg>` ), chalk.gray( `Starting server utilizing processed locals` ) );

    FILE_CFG = path.resolve( __dirname, envWebFolder, `config.json` );
    FILE_URL = path.resolve( __dirname, envWebFolder, `${ envFileURL }` );
    FILE_M3U = path.resolve( __dirname, envWebFolder, `${ envFileM3U }` );
    FILE_XML = path.resolve( __dirname, envWebFolder, `${ envFileXML }` );
    FILE_GZP = path.resolve( __dirname, envWebFolder, `${ envFileGZP }` );
}

/*
    helper › sleep
*/

function sleep( ms )
{
    return new Promise( ( resolve ) =>
    {
        setTimeout( resolve, ms );
    });
}

/*
    Semaphore › Initialize

    @arg        int threads_max
*/

const semaphore = new Semaphore( 5 );

/*
    Get Client IP

    prioritize header.
*/

const clientIp = ( req ) =>
    ( req.headers && (
        req.headers[envProxyHeader]?.split( ',' )?.shift() ||
        req.headers['X-Forwarded-For']?.split( ',' )?.shift() ||
        req.headers['x-forwarded-for']?.split( ',' )?.shift() ||
        req.headers['cf-connecting-ip']?.split( ',' )?.shift() ||
        req.headers['x-real-ip']?.split( ',' )?.shift() ||
        req.headers['X-Real-IP']?.split( ',' )?.shift() ||
        req.socket?.remoteAddress ) ||
    envIpContainer );

/*
    Check Service Status

    this function attempts to see if a specified domain is up.
    will first start with the URL you provide.
        if try 1 fails, it will determine if that URL used protocol https or https and then flip to the other
        if try 2 fails with the opposite protocol; domain is considered down
*/

async function hostCheck( service, uri )
{
    /* try 1 */
    try
    {
        const resp = await fetch( uri );

        /* try 1 › domain down */
        if ( resp.status !== 200 )
        {
            Log.error( `ping`, chalk.redBright( `[response]` ), chalk.white( `❌` ), chalk.redBright( `<msg>` ), chalk.gray( `Try: Service Offline; failed to communicate with service, possibly down` ), chalk.redBright( `<code>` ), chalk.gray( `${ resp.status }` ), chalk.redBright( `<service>` ), chalk.gray( `${ service }` ), chalk.redBright( `<address>` ), chalk.gray( `${ uri }` ) );
            return false;
        }

        /* try 1 › domain up */
        Log.ok( `ping`, chalk.yellow( `[response]` ), chalk.white( `✅` ), chalk.greenBright( `<msg>` ), chalk.gray( `Domain Online` ), chalk.greenBright( `<code>` ), chalk.gray( `${ resp.status }` ), chalk.greenBright( `<service>` ), chalk.gray( `${ service }` ), chalk.greenBright( `<address>` ), chalk.gray( `${ uri }` ) );
        return true;
    }
    catch ( err )
    {
        /*
            try 2 › https
        */

        if ( /^https:\/\//i.test( uri ) )
        {
            const uriRetry = uri.replace( /^https:\/\//ig, 'http://' );
            Log.info( `ping`, chalk.yellow( `[response]` ), chalk.white( `⚠️` ), chalk.yellowBright( `<msg>` ), chalk.gray( `Try: Failed via HTTPS; trying HTTP protocol` ), chalk.yellowBright( `<service>` ), chalk.gray( `${ service }` ), chalk.yellowBright( `<uriAttempt1>` ), chalk.gray( `${ uri }` ), chalk.redBright( `(failed)` ), chalk.yellowBright( `<uriAttempt2>` ), chalk.gray( `${ uriRetry }` ), chalk.blueBright( `(pending)` ) );

            try
            {
                const resp = await fetch( uriRetry );

                /* try 2 › https › domain down */
                if ( resp.status !== 200 )
                {
                    Log.error( `ping`, chalk.redBright( `[response]` ), chalk.white( `❌` ), chalk.redBright( `<msg>` ), chalk.gray( `Try: Domain Offline; failed to communicate with domain, possibly down` ), chalk.redBright( `<code>` ), chalk.gray( `${ resp.status }` ), chalk.redBright( `<service>` ), chalk.gray( `${ service }` ), chalk.redBright( `<address>` ), chalk.gray( `${ uriRetry }` ) );
                    return false;
                }

                /* try 2 › https › domain up */
                Log.ok( `ping`, chalk.yellow( `[response]` ), chalk.white( `✅` ), chalk.greenBright( `<msg>` ), chalk.gray( `Domain Online` ), chalk.greenBright( `<code>` ), chalk.gray( `${ resp.status }` ), chalk.greenBright( `<service>` ), chalk.gray( `${ service }` ), chalk.greenBright( `<address>` ), chalk.gray( `${ uriRetry }` ) );
                return true;
            }
            catch ( err )
            {
                /* try 2 › https › domain not exist */
                Log.error( `ping`, chalk.redBright( `[response]` ), chalk.white( `❌` ), chalk.redBright( `<msg>` ), chalk.gray( `Try: Domain Offline; failed to communicate with domain, address does not exist` ), chalk.redBright( `<service>` ), chalk.gray( `${ service }` ), chalk.redBright( `<address>` ), chalk.gray( `${ uri }` ), chalk.redBright( `<message>` ), chalk.gray( `${ err }` ) );
                return false;
            }
        }

        /*
            try 2 › http
        */

        else if ( /^http:\/\//i.test( uri ) )
        {
            const uriRetry = uri.replace( /^http:\/\//ig, 'https://' );
            Log.info( `ping`, chalk.yellow( `[response]` ), chalk.white( `⚠️` ), chalk.yellowBright( `<msg>` ), chalk.gray( `Try: Failed via HTTP; trying HTTPS protocol` ), chalk.yellowBright( `<service>` ), chalk.gray( `${ service }` ), chalk.yellowBright( `<uriAttempt1>` ), chalk.gray( `${ uri }` ), chalk.redBright( `(failed)` ), chalk.yellowBright( `<uriAttempt2>` ), chalk.gray( `${ uriRetry }` ), chalk.blueBright( `(pending)` ) );

            try
            {
                const resp = await fetch( uriRetry );

                /* try 2 › http › domain down */
                if ( resp.status !== 200 )
                {
                    Log.error( `ping`, chalk.redBright( `[response]` ), chalk.white( `❌` ), chalk.redBright( `<msg>` ), chalk.gray( `Domain Offline; failed to communicate with domain, possibly down` ), chalk.redBright( `<code>` ), chalk.gray( `${ resp.status }` ), chalk.redBright( `<service>` ), chalk.gray( `${ service }` ), chalk.redBright( `<address>` ), chalk.gray( `${ uriRetry }` ) );
                    return false;
                }

                /* try 2 › http › domain up */
                Log.ok( `ping`, chalk.yellow( `[response]` ), chalk.white( `✅` ), chalk.greenBright( `<msg>` ), chalk.gray( `Domain Online` ), chalk.greenBright( `<code>` ), chalk.gray( `${ resp.status }` ), chalk.greenBright( `<service>` ), chalk.gray( `${ service }` ), chalk.greenBright( `<address>` ), chalk.gray( `${ uriRetry }` ) );
                return true;
            }
            catch ( err )
            {
                /* try 2 › http › domain not exist */
                Log.error( `ping`, chalk.redBright( `[response]` ), chalk.white( `❌` ), chalk.redBright( `<msg>` ), chalk.gray( `Domain Offline; failed to communicate with domain, address does not exist` ), chalk.redBright( `<service>` ), chalk.gray( `${ service }` ), chalk.redBright( `<address>` ), chalk.gray( `${ uri }` ), chalk.redBright( `<message>` ), chalk.gray( `${ err }` ) );
                return false;
            }
        }
    }
}

/*
    Func › Download File

    @arg        str url                         https://git.binaryninja.net/binaryninja/tvapp2-externals/raw/branch/main/urls.txt
    @arg        str filePath                    H:\Repos\github\BinaryNinja\tvapp2\tvapp2\urls.txt
    @ret        Promise<>
*/

async function downloadFile( url, filePath )
{
    return new Promise( ( resolve, reject ) =>
    {
        Log.info( `file`, chalk.yellow( `[download]` ), chalk.white( `ℹ️` ),
            chalk.blueBright( `<msg>` ), chalk.gray( `Preparing to download external file` ),
            chalk.blueBright( `<src>` ), chalk.gray( `${ url }` ),
            chalk.blueBright( `<dest>` ), chalk.gray( `${ filePath }` ) );

        const isHttps = new URL( url ).protocol === 'https:';
        const httpModule = isHttps ? https : http;
        const file = fs.createWriteStream( filePath );
        httpModule
            .get( url, ( res ) =>
            {
                Log.info( `file`, chalk.yellow( `[retrieve]` ), chalk.white( `ℹ️` ),
                    chalk.blueBright( `<msg>` ), chalk.gray( `Getting response from file download request` ),
                    chalk.blueBright( `<code>` ), chalk.gray( `${ res.statusCode }` ),
                    chalk.blueBright( `<src>` ), chalk.gray( `${ url }` ),
                    chalk.blueBright( `<dest>` ), chalk.gray( `${ filePath }` ) );

                if ( res.statusCode !== 200 )
                {
                    Log.error( `file`, chalk.redBright( `[download]` ), chalk.white( `❌` ),
                        chalk.redBright( `<msg>` ), chalk.gray( `Attempt to download external file returned non-200 status` ),
                        chalk.redBright( `<code>` ), chalk.gray( `${ res.statusCode }` ),
                        chalk.redBright( `<src>` ), chalk.gray( `${ url }` ),
                        chalk.redBright( `<dest>` ), chalk.gray( `${ filePath }` ) );

                    return reject( new Error( `Failed to download file: ${ url }. Status code: ${ res.statusCode }` ) );
                }
                res.pipe( file );
                file.on( 'finish', () =>
                {
                    Log.ok( `file`, chalk.yellow( `[download]` ), chalk.white( `✅` ),
                        chalk.greenBright( `<msg>` ), chalk.gray( `Successfully downloaded external file` ),
                        chalk.greenBright( `<code>` ), chalk.gray( `${ res.statusCode }` ),
                        chalk.greenBright( `<src>` ), chalk.gray( `${ url }` ),
                        chalk.greenBright( `<dest>` ), chalk.gray( `${ filePath }` ) );

                    file.close( () => resolve( true ) );
                });
            })
            .on( 'error', ( err ) =>
            {
                Log.error( `file`, chalk.redBright( `[download]` ), chalk.white( `❌` ),
                    chalk.redBright( `<msg>` ), chalk.gray( `Failed to download external source file` ),
                    chalk.redBright( `<error>` ), chalk.gray( `${ err.message }` ),
                    chalk.redBright( `<src>` ), chalk.gray( `${ url }` ),
                    chalk.redBright( `<dest>` ), chalk.gray( `${ filePath }` ) );

                fs.unlink( filePath, () => reject( err ) );
            });
    });
}

/*
    Get Filesize and convert to human readable format

    @arg        str filename                    filename to get size in bytes for
    @ret        str                             2025-03-23 04:11 am
*/

function getFileModified( filename )
{
    return moment( fs.statSync( filename ).mtime ).format( 'YYYY-MM-DD h:mm a' );
}

/*
    Func > Get Human Readable Filesize

    Takes the total number of bytes in a file's size and converts it into
    a human readable format.

    @arg        str     filename            filename to get size in bytes for
    @arg        bool    si                  divides the bytes of a file by 1000 instead of 2024
    @arg        int     decimal             specifies the decimal point
    @ret        str                         111.9 KB

*/

function getFileSizeHuman( filename, si = true, decimal = 1 )
{
    let stats = [];
    stats.size = 0;
    if ( fs.existsSync( filename ) )
        stats = fs.statSync( filename );

    let bytes = stats.size;
    const thresh = si ? 1000 : 1024;

    if ( Math.abs( bytes ) < thresh )
        return bytes + ' B';

    const units = si
        ? [
            'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'
        ]
        : [
            'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'
        ];

    let u = -1;
    const r = 10 ** decimal;

    do
    {
        bytes /= thresh;
        ++u;
    } while ( Math.round( Math.abs( bytes ) * r ) / r >= thresh && u < units.length - 1 );

    return bytes.toFixed( decimal ) + ' ' + units[u];
}

/*
    Func > Get Files

    if file exists; start download from external website utilizing url and file path arguments; or
    throw error to user that file does not exist via the URL.

    If file cannot be obtained from external url; use local copy if available

    @arg        str url                         https://git.binaryninja.net/binaryninja/tvapp2-externals/raw/branch/main/urls.txt
    @arg        str filePath                    H:\Repos\github\BinaryNinja\tvapp2\tvapp2\urls.txt
    @ret        none
*/

async function getFile( url, filePath )
{
    try
    {
        Log.debug( `file`, chalk.yellow( `[requests]` ), chalk.white( `⚙️` ),
            chalk.blueBright( `<msg>` ), chalk.gray( `Requesting to download external file` ),
            chalk.blueBright( `<src>` ), chalk.gray( `${ url }` ),
            chalk.blueBright( `<dest>` ), chalk.gray( `${ filePath }` ) );

        const ok = await hostCheck( 'git.binaryninja.com', `${ envUrlRepo }` );

        if ( ok )
        {
            try
            {
                await downloadFile( url, filePath );
                return true;
            }
            catch ( err )
            {
                Log.error( `file`, chalk.redBright( `[download]` ), chalk.white( `❌` ),
                    chalk.redBright( `<msg>` ), chalk.gray( `Download attempt failed after service check succeeded` ),
                    chalk.redBright( `<error>` ), chalk.gray( `${ err.message }` ),
                    chalk.redBright( `<src>` ), chalk.gray( `${ url }` ),
                    chalk.redBright( `<dest>` ), chalk.gray( `${ filePath }` ) );

                return false;
            }
        }
        else
        {
            Log.info( `file`, chalk.yellow( `[download]` ), chalk.white( `ℹ️` ),
                chalk.yellowBright( `<msg>` ), chalk.gray( `Skipping download because service is offline; using existing local file` ),
                chalk.yellowBright( `<url>` ), chalk.gray( `${ url }` ),
                chalk.yellowBright( `<dest>` ), chalk.gray( `${ filePath }` ) );

            return false;
        }
    }
    catch ( err )
    {
        if ( fs.existsSync( filePath ) )
        {
            Log.warn( `file`, chalk.yellow( `[requests]` ), chalk.white( `⚠️` ),
                chalk.yellowBright( `<msg>` ), chalk.gray( `Download failed - Using existing local file ${ filePath }` ),
                chalk.yellowBright( `<src>` ), chalk.gray( `${ url }` ),
                chalk.yellowBright( `<dest>` ), chalk.gray( `${ filePath }` ) );
        }
        else
        {
            Log.error( `file`, chalk.redBright( `[requests]` ), chalk.white( `❌` ),
                chalk.redBright( `<msg>` ), chalk.gray( `Download filed and no local backup exists, aborting` ),
                chalk.redBright( `<error>` ), chalk.gray( `${ err.message }` ),
                chalk.redBright( `<src>` ), chalk.gray( `${ url }` ),
                chalk.redBright( `<dest>` ), chalk.gray( `${ filePath }` ) );

            throw err;
        }
    }
}

/*
    Func > Create GZip

    locates the xmltv.xml and packages it into a xmltv.gz archive
*/

async function createGzip( )
{
    return new Promise( ( resolve, reject ) =>
    {
        Log.info( `.gzp`, chalk.yellow( `[generate]` ), chalk.white( `ℹ️` ),
            chalk.blueBright( `<msg>` ), chalk.gray( `Preparing to create compressed XML gz file` ),
            chalk.blueBright( `<src>` ), chalk.gray( `${ FILE_XML }` ),
            chalk.blueBright( `<dest>` ), chalk.gray( `${ FILE_GZP }` ) );

        fs.readFile( FILE_XML, ( err, buf ) =>
        {
            Log.debug( `.gzp`, chalk.yellow( `[generate]` ), chalk.white( `⚙️` ),
                chalk.blueBright( `<msg>` ), chalk.gray( `Reading source XML file` ),
                chalk.blueBright( `<src>` ), chalk.gray( `${ FILE_XML }` ),
                chalk.blueBright( `<dest>` ), chalk.gray( `${ FILE_GZP }` ) );

            if ( err )
            {
                Log.error( `.gzp`, chalk.redBright( `[generate]` ), chalk.white( `❌` ),
                    chalk.redBright( `<msg>` ), chalk.gray( `Could not read source XML file` ),
                    chalk.redBright( `<error>` ), chalk.gray( `${ err }` ),
                    chalk.redBright( `<src>` ), chalk.gray( `${ FILE_XML }` ),
                    chalk.redBright( `<dest>` ), chalk.gray( `${ FILE_GZP }` ) );

                return reject( new Error( `Could not read file ${ envFileXML }. Error: ${ err }` ) );
            }

            zlib.gzip( buf, ( err, buf ) =>
            {
                Log.debug( `.gzp`, chalk.yellow( `[generate]` ), chalk.white( `⚙️` ),
                    chalk.blueBright( `<msg>` ), chalk.gray( `Starting zlib.gzip` ),
                    chalk.blueBright( `<src>` ), chalk.gray( `${ FILE_XML }` ),
                    chalk.blueBright( `<dest>` ), chalk.gray( `${ FILE_GZP }` ) );

                if ( err )
                {
                    Log.error( `.gzp`, chalk.redBright( `[generate]` ), chalk.white( `❌` ),
                        chalk.redBright( `<msg>` ), chalk.gray( `Could not create gz archive` ),
                        chalk.redBright( `<error>` ), chalk.gray( `${ err }` ),
                        chalk.redBright( `<src>` ), chalk.gray( `${ FILE_XML }` ),
                        chalk.redBright( `<dest>` ), chalk.gray( `${ FILE_GZP }` ) );

                    return reject( new Error( `Could not create ${ envFileGZP }. Error: ${ err }` ) );
                }

                Log.info( `.gzp`, chalk.yellow( `[generate]` ), chalk.white( `ℹ️` ),
                    chalk.blueBright( `<msg>` ), chalk.gray( `Started creating gz archive from XML source` ),
                    chalk.blueBright( `<src>` ), chalk.gray( `${ FILE_XML }` ),
                    chalk.blueBright( `<dest>` ), chalk.gray( `${ FILE_GZP }` ) );

                fs.writeFile( `${ FILE_GZP }`, buf, ( err ) =>
                {
                    if ( err )
                    {
                        Log.error( `.gzp`, chalk.redBright( `[generate]` ), chalk.white( `❌` ),
                            chalk.redBright( `<msg>` ), chalk.gray( `Could not write to and create gz archive` ),
                            chalk.redBright( `<error>` ), chalk.gray( `${ err }` ),
                            chalk.redBright( `<src>` ), chalk.gray( `${ FILE_XML }` ),
                            chalk.redBright( `<dest>` ), chalk.gray( `${ FILE_GZP }` ) );

                        return reject( new Error( `Could not write XML file ${ envFileXML } to ${ envFileGZP }. Error: ${ err }` ) );
                    }

                    Log.ok( `.gzp`, chalk.yellow( `[generate]` ), chalk.white( `✅` ),
                        chalk.greenBright( `<msg>` ), chalk.gray( `Successfully created compressed gz archive from XML source file` ),
                        chalk.greenBright( `<src>` ), chalk.gray( `${ FILE_XML }` ),
                        chalk.greenBright( `<dest>` ), chalk.gray( `${ FILE_GZP }` ) );

                    resolve( true );
                });
            });
        });
    });
}

/*
    Func > Get Gzip

    try; catch to create a .gz compressed file from the .xml guide data
*/

async function getGzip( )
{
    try
    {
        Log.debug( `.gzp`, chalk.yellow( `[requests]` ), chalk.white( `⚙️` ),
            chalk.blueBright( `<msg>` ), chalk.gray( `Requesting to create compressed gzip from uncompressed XML data` ),
            chalk.blueBright( `<src>` ), chalk.gray( `${ FILE_XML }` ),
            chalk.blueBright( `<dest>` ), chalk.gray( `${ FILE_GZP }` ) );

        await createGzip( );
    }
    catch ( err )
    {
        if ( fs.existsSync( FILE_XML ) )
        {
            Log.warn( `.gzp`, chalk.yellow( `[requests]` ), chalk.white( `⚠️` ),
                chalk.yellowBright( `<msg>` ), chalk.yellowBright( `Cannot get compressed gzip; but source XML file found and can be used` ),
                chalk.yellowBright( `<src>` ), chalk.gray( `${ FILE_XML }` ),
                chalk.yellowBright( `<dest>` ), chalk.gray( `${ FILE_GZP }` ) );
        }
        else
        {
            Log.error( `.gzp`, chalk.redBright( `[requests]` ), chalk.white( `❌` ),
                chalk.redBright( `<msg>` ), chalk.gray( `Failed to get compressed gzip, and source XML file not found` ),
                chalk.redBright( `<error>` ), chalk.gray( `${ err.message }` ),
                chalk.redBright( `<src>` ), chalk.gray( `${ FILE_XML }` ),
                chalk.redBright( `<dest>` ), chalk.gray( `${ FILE_GZP }` ) );

            throw err;
        }
    }
}

/*

    @note               Jellyfin Users
                        Originally, this node webserver enabled gzip compression for the value `Accept-Encoding`. Doing this
                        may cause an error to appear in Jellyfin logs / console when attempting to fetch the latest guide data
                        from the tvapp2 xml file.

                            [ERR] [27] Jellyfin.LiveTv.Guide.GuideManager: Error getting programs for channel XXXXXXXXXXXXXXX (Source 2)
                            System.Xml.XmlException: '', hexadecimal value 0x1F, is an invalid character. Line 1, position 1.

                        To fix the error, we create a customizable env variable that allows the user to override the encoding header.
                        We change the following:
                            'Accept-Encoding': 'gzip, deflate, br'
                                to
                            'Accept-Encoding': 'deflate, br'

                        This error does not appear if you load the xml guide data into Cabernet, and then use a tuner to fetch the data from
                        cabernet to jellyfin

*/

async function fetchRemote( url, req )
{
    return new Promise( ( resolve, reject ) =>
    {
        Log.info( `live`, chalk.yellow( `[generate]` ), chalk.white( `ℹ️` ),
            chalk.blueBright( `<msg>` ), chalk.gray( `Preparing to fetch remote request` ),
            chalk.blueBright( `<client>` ), chalk.gray( `${ clientIp( req ) }` ),
            chalk.blueBright( `<url>` ), chalk.gray( `${ url }` ) );

        const mod = url.startsWith( 'https' ) ? https : http;
        mod
            .get( url, {
                headers: {
                    'Accept-Encoding': envWebEncoding
                }
            }, ( resp ) =>
            {
                Log.info( `live`, chalk.yellow( `[retrieve]` ), chalk.white( `ℹ️` ),
                    chalk.blueBright( `<msg>` ), chalk.gray( `Getting response from remote fetch request` ),
                    chalk.blueBright( `<client>` ), chalk.gray( `${ clientIp( req ) }` ),
                    chalk.blueBright( `<code>` ), chalk.gray( `${ resp.statusCode }` ),
                    chalk.blueBright( `<url>` ), chalk.gray( `${ url }` ) );

                if ( resp.statusCode !== 200 )
                {
                    Log.error( `live`, chalk.redBright( `[retrieve]` ), chalk.white( `❌` ),
                        chalk.redBright( `<msg>` ), chalk.gray( `Remote fetch returned status code other than 200` ),
                        chalk.redBright( `<client>` ), chalk.gray( `${ clientIp( req ) }` ),
                        chalk.redBright( `<code>` ), chalk.gray( `${ resp.statusCode }` ),
                        chalk.redBright( `<url>` ), chalk.gray( `${ url }` ) );

                    return reject( new Error( `HTTP ${ resp.statusCode } for ${ url }` ) );
                }

                const chunks = [];

                resp.on( 'data', ( chunk ) => chunks.push( chunk ) );
                resp.on( 'end', () =>
                {
                    const buffer = Buffer.concat( chunks );
                    const encoding = resp.headers['content-encoding'];

                    if ( encoding === 'gzip' )
                    {
                        zlib.gunzip( buffer, ( err, decoded ) =>
                        {
                            if ( err )
                            {
                                Log.error( `live`, chalk.redBright( `[retrieve]` ), chalk.white( `❌` ),
                                    chalk.redBright( `<msg>` ), chalk.gray( `Remote fetch could not complete encoding type ${ encoding }` ),
                                    chalk.redBright( `<client>` ), chalk.gray( `${ clientIp( req ) }` ),
                                    chalk.redBright( `<error>` ), chalk.gray( `${ err }` ),
                                    chalk.redBright( `<encoding>` ), chalk.gray( `${ encoding }` ),
                                    chalk.redBright( `<code>` ), chalk.gray( `${ resp.statusCode }` ),
                                    chalk.redBright( `<url>` ), chalk.gray( `${ url }` ) );

                                return reject( err );
                            }

                            Log.debug( `live`, chalk.yellow( `[retrieve]` ), chalk.white( `⚙️` ),
                                chalk.blueBright( `<msg>` ), chalk.gray( `Remote fetch detected encoding type ${ encoding }; decoding` ),
                                chalk.blueBright( `<client>` ), chalk.gray( `${ clientIp( req ) }` ),
                                chalk.blueBright( `<encoding>` ), chalk.gray( `${ encoding }` ),
                                chalk.blueBright( `<code>` ), chalk.gray( `${ resp.statusCode }` ),
                                chalk.blueBright( `<url>` ), chalk.gray( `${ url }` ) );

                            resolve( decoded );
                        });
                    }
                    else if ( encoding === 'deflate' )
                    {
                        zlib.inflate( buffer, ( err, decoded ) =>
                        {
                            if ( err )
                            {
                                Log.error( `live`, chalk.redBright( `[retrieve]` ), chalk.white( `❌` ),
                                    chalk.redBright( `<msg>` ), chalk.gray( `Remote fetch could not complete encoding type ${ encoding }` ),
                                    chalk.redBright( `<client>` ), chalk.gray( `${ clientIp( req ) }` ),
                                    chalk.redBright( `<error>` ), chalk.gray( `${ err }` ),
                                    chalk.redBright( `<encoding>` ), chalk.gray( `${ encoding }` ),
                                    chalk.redBright( `<code>` ), chalk.gray( `${ resp.statusCode }` ),
                                    chalk.redBright( `<url>` ), chalk.gray( `${ url }` ) );

                                return reject( err );
                            }

                            Log.debug( `live`, chalk.yellow( `[retrieve]` ), chalk.white( `⚙️` ),
                                chalk.blueBright( `<msg>` ), chalk.gray( `Remote fetch detected encoding type ${ encoding }; decoding` ),
                                chalk.blueBright( `<client>` ), chalk.gray( `${ clientIp( req ) }` ),
                                chalk.blueBright( `<encoding>` ), chalk.gray( `${ encoding }` ),
                                chalk.blueBright( `<code>` ), chalk.gray( `${ resp.statusCode }` ),
                                chalk.blueBright( `<url>` ), chalk.gray( `${ url }` ) );

                            resolve( decoded );
                        });
                    }
                    else if ( encoding === 'br' )
                    {
                        zlib.brotliDecompress( buffer, ( err, decoded ) =>
                        {
                            if ( err )
                            {
                                Log.error( `live`, chalk.redBright( `[retrieve]` ), chalk.white( `❌` ),
                                    chalk.redBright( `<msg>` ), chalk.gray( `Remote fetch could not complete encoding type ${ encoding } (brotli decompress)` ),
                                    chalk.redBright( `<client>` ), chalk.gray( `${ clientIp( req ) }` ),
                                    chalk.redBright( `<error>` ), chalk.gray( `${ err }` ),
                                    chalk.redBright( `<encoding>` ), chalk.gray( `${ encoding }` ),
                                    chalk.redBright( `<code>` ), chalk.gray( `${ resp.statusCode }` ),
                                    chalk.redBright( `<url>` ), chalk.gray( `${ url }` ) );

                                return reject( err );
                            }

                            Log.debug( `live`, chalk.yellow( `[retrieve]` ), chalk.white( `⚙️` ),
                                chalk.blueBright( `<msg>` ), chalk.gray( `Remote fetch detected encoding type ${ encoding } (brotli decompress); decoding` ),
                                chalk.blueBright( `<client>` ), chalk.gray( `${ clientIp( req ) }` ),
                                chalk.blueBright( `<encoding>` ), chalk.gray( `${ encoding }` ),
                                chalk.blueBright( `<code>` ), chalk.gray( `${ resp.statusCode }` ),
                                chalk.blueBright( `<url>` ), chalk.gray( `${ url }` ) );

                            resolve( decoded );
                        });
                    }
                    else
                    {
                        Log.debug( `live`, chalk.yellow( `[retrieve]` ), chalk.white( `⚙️` ),
                            chalk.blueBright( `<msg>` ), chalk.gray( `Remote fetch contains no headers to decode; resolving buffer` ),
                            chalk.blueBright( `<client>` ), chalk.gray( `${ clientIp( req ) }` ),
                            chalk.blueBright( `<encoding>` ), chalk.gray( `${ encoding }` ),
                            chalk.blueBright( `<code>` ), chalk.gray( `${ resp.statusCode }` ),
                            chalk.blueBright( `<url>` ), chalk.gray( `${ url }` ) );

                        resolve( buffer );
                    }
                });
            })
            .on( 'error', reject );
    });
}

/*
    Serve Keys

    @url        https://tvapp2.domain.lan/keys?uri=https://v16.thetvapp.to/hls/WABCDT1/tracks-v2a1/mono.m3u8?token=a0b2C-1ae-qaxAV5iKAd8g&expires=1746394920&user_id=EjLZVsIiJphafFxXRVWRdVWPvzTqpWBZbchvsTwpAlrQZzFuZMpdSn==
*/

async function serveKey( req, res )
{
    try
    {
        const paramUrl = new URL( req.url, `http://${ req.headers.host }` ).searchParams.get( 'uri' );
        if ( !paramUrl )
        {
            const statusCheck =
            {
                ip: envIpContainer,
                gateway: envIpGateway,
                client: clientIp( req ),
                message: 'Error: Missing "uri" parameter for key download.',
                status: 'unhealthy',
                ref: req.url,
                method: req.method || 'GET',
                code: 400,
                uptime: Math.round( process.uptime() ),
                uptimeShort: timeAgo.format( Date.now() - process.uptime() * 1000, 'twitter' ),
                uptimeLong: timeAgo.format( Date.now() - process.uptime() * 1000, 'round' ),
                timestamp: Date.now()
            };

            res.writeHead( statusCheck.code, {
                'Content-Type': 'application/json'
            });

            Log.error( `keys`, chalk.redBright( `[response]` ), chalk.white( `❌` ),
                chalk.redBright( `<msg>` ), chalk.gray( `${ statusCheck.message }` ),
                chalk.redBright( `<cat>` ), chalk.gray( `serveKey` ),
                chalk.redBright( `<client>` ), chalk.gray( `${ clientIp( req ) }` ),
                chalk.redBright( `<code>` ), chalk.gray( `${ statusCheck.code }` ),
                chalk.redBright( `<url>` ), chalk.gray( `${ req.url }` ),
                chalk.redBright( `<param>` ), chalk.gray( `empty; missing var` ) );

            return res.end( JSON.stringify( statusCheck ) );
        }

        Log.debug( `keys`, chalk.yellow( `[response]` ), chalk.white( `⚙️` ),
            chalk.blueBright( `<msg>` ), chalk.gray( `Valid paramUrl specified; establishing connection to serve key to client` ),
            chalk.blueBright( `<cat>` ), chalk.gray( `serveKey` ),
            chalk.blueBright( `<client>` ), chalk.gray( `${ clientIp( req ) }` ),
            chalk.blueBright( `<url>` ), chalk.gray( `${ req.url }` ),
            chalk.blueBright( `<param>` ), chalk.gray( `${ paramUrl }` ) );

        const keyData = await fetchRemote( paramUrl, req );
        res.writeHead( 200, {
            'Content-Type': 'application/octet-stream'
        });

        Log.ok( `keys`, chalk.yellow( `[response]` ), chalk.white( `✅` ),
            chalk.greenBright( `<msg>` ), chalk.gray( `Serving key to client` ),
            chalk.greenBright( `<cat>` ), chalk.gray( `serveKey` ),
            chalk.greenBright( `<client>` ), chalk.gray( `${ clientIp( req ) }` ),
            chalk.greenBright( `<code>` ), chalk.gray( `200` ),
            chalk.greenBright( `<url>` ), chalk.gray( `${ req.url }` ),
            chalk.greenBright( `<param>` ), chalk.gray( `${ paramUrl }` ),
            chalk.greenBright( `<keyData>` ), chalk.gray( `${ keyData }` ) );

        res.end( keyData );
    }
    catch ( err )
    {
        const statusCheck =
        {
            ip: envIpContainer,
            gateway: envIpGateway,
            client: clientIp( req ),
            message: `Failed to serve key; try{} failed. Ensure you specify a valid uri to tvapp / tvpass`,
            error: `${ err.message }`,
            status: 'unhealthy',
            ref: req.url,
            method: req.method || 'GET',
            code: 500,
            uptime: Math.round( process.uptime() ),
            uptimeShort: timeAgo.format( Date.now() - process.uptime() * 1000, 'twitter' ),
            uptimeLong: timeAgo.format( Date.now() - process.uptime() * 1000, 'round' ),
            timestamp: Date.now()
        };

        res.writeHead( statusCheck.code, {
            'Content-Type': 'application/json'
        });

        Log.error( `keys`, chalk.yellow( `[response]` ), chalk.white( `❌` ),
            chalk.redBright( `<msg>` ), chalk.gray( `${ statusCheck.message }` ),
            chalk.redBright( `<cat>` ), chalk.gray( `serveKey` ),
            chalk.redBright( `<client>` ), chalk.gray( `${ clientIp( req ) }` ),
            chalk.redBright( `<code>` ), chalk.gray( `${ statusCheck.code }` ),
            chalk.redBright( `<error>` ), chalk.gray( `${ statusCheck.error }` ),
            chalk.redBright( `<url>` ), chalk.gray( `${ req.url }` ) );

        res.end( JSON.stringify( statusCheck ) );
    }
}

/*
    cookies > headers > parse
*/

function cookieHeadersSetParse( values )
{
    if ( !Array.isArray( values ) ) return;
    values.forEach( ( line ) =>
    {
        const [cookiePair] = line.split( ';' );
        if ( cookiePair )
        {
            const [ key, val ] = cookiePair.split( '=' );
            if ( key && val )
            {
                gCookies[key.trim()] = val.trim();
            }
        }
    });
}

/*
    cookies > headers > build
*/

function cookieHeadersBuild()
{
    const pairs = [];
    for ( const [ k, v ] of Object.entries( gCookies ) )
    {
        pairs.push( `${ k }=${ v }` );
    }
    return pairs.join( '; ' );
}

/*
    fetch > page
*/

function fetchPage( url, req )
{
    return new Promise( ( resolve, reject ) =>
    {
        Log.info( `http`, chalk.yellow( `[generate]` ), chalk.white( `ℹ️` ),
            chalk.blueBright( `<msg>` ), chalk.gray( `Preparing to fetch remote page` ),
            chalk.blueBright( `<client>` ), chalk.gray( `${ clientIp( req ) }` ),
            chalk.blueBright( `<url>` ), chalk.gray( `${ url }` ) );

        const opts = {
            method: 'GET',
            headers: {
                'User-Agent': USERAGENT,
                Accept: '*/*',
                Cookie: cookieHeadersBuild()
            }
        };
        https
            .get( url, opts, ( res ) =>
            {
                Log.info( `http`, chalk.yellow( `[retrieve]` ), chalk.white( `ℹ️` ),
                    chalk.blueBright( `<msg>` ), chalk.gray( `Status code returned` ),
                    chalk.blueBright( `<client>` ), chalk.gray( `${ clientIp( req ) }` ),
                    chalk.blueBright( `<code>` ), chalk.gray( `${ res.statusCode }` ),
                    chalk.blueBright( `<url>` ), chalk.gray( `${ url }` ) );

                if ( res.statusCode !== 200 )
                {
                    Log.debug( `http`, chalk.yellow( `[retrieve]` ), chalk.white( `⚙️` ),
                        chalk.blueBright( `<msg>` ), chalk.gray( `Failed to load url; status 200 was not returned` ),
                        chalk.blueBright( `<client>` ), chalk.gray( `${ clientIp( req ) }` ),
                        chalk.blueBright( `<code>` ), chalk.gray( `${ res.statusCode }` ),
                        chalk.blueBright( `<url>` ), chalk.gray( `${ url }` ) );

                    return reject( new Error( `page did not return code 200 status ${ res.statusCode } => ${ url }` ) );
                }

                if ( res.headers['set-cookie'])
                {
                    Log.debug( `http`, chalk.yellow( `[retrieve]` ), chalk.white( `⚙️` ),
                        chalk.blueBright( `<msg>` ), chalk.gray( `Setting headers` ),
                        chalk.blueBright( `<client>` ), chalk.gray( `${ clientIp( req ) }` ),
                        chalk.blueBright( `<code>` ), chalk.gray( `${ res.statusCode }` ),
                        chalk.blueBright( `<url>` ), chalk.gray( `${ url }` ),
                        chalk.blueBright( `<header>` ), chalk.gray( `set-cookie` ) );

                    cookieHeadersSetParse( res.headers['set-cookie']);
                }

                let data = '';
                res.on( 'data', ( chunk ) => ( data += chunk ) );
                res.on( 'end', () => resolve( data ) );
            })
            .on( 'error', reject );
    });
}

/*
    tokenized url > get
*/

async function getTokenizedUrl( channelUrl, req )
{
    try
    {
        const html = await fetchPage( channelUrl, req );
        let streamName;
        let streamHost;

        Log.debug( `play`, chalk.yellow( `[tokenize]` ), chalk.white( `⚙️` ),
            chalk.blueBright( `<msg>` ), chalk.gray( `Requesting to get tokenize url` ),
            chalk.blueBright( `<client>` ), chalk.gray( `${ clientIp( req ) }` ),
            chalk.blueBright( `<channelUrl>` ), chalk.gray( `${ channelUrl }` ) );

        if ( channelUrl.includes( 'espn-' ) )
        {
            streamName = 'ESPN';
        }
        else if ( channelUrl.includes( 'espn2-' ) )
        {
            streamName = 'ESPN2';
        }
        else
        {
            const streamNameMatch = html.match( /id="stream_name" name="([^"]+)"/ );
            if ( !streamNameMatch )
            {
                Log.error( `play`, chalk.yellow( `[tokenize]` ), chalk.white( `❌` ),
                    chalk.redBright( `<msg>` ), chalk.gray( `Cannot find streamNameMatch; returned empty` ),
                    chalk.redBright( `<client>` ), chalk.gray( `${ clientIp( req ) }` ),
                    chalk.redBright( `<url>` ), chalk.grey( `${ channelUrl }` ),
                    chalk.redBright( `<streamNameMatch>` ), chalk.grey( `missing / var empty` ) );

                return null;
            }

            streamName = streamNameMatch[1];

            Log.debug( `play`, chalk.yellow( `[tokenize]` ), chalk.white( `⚙️` ),
                chalk.blueBright( `<msg>` ), chalk.gray( `streamName found` ),
                chalk.blueBright( `<client>` ), chalk.gray( `${ clientIp( req ) }` ),
                chalk.blueBright( `<channelUrl>` ), chalk.gray( `${ channelUrl }` ),
                chalk.blueBright( `<streamHost>` ), chalk.gray( `not yet assigned` ),
                chalk.blueBright( `<streamName>` ), chalk.gray( `${ streamName }` ) );
        }

        if ( channelUrl.match( 'tvpass\.org' ) )
        {
            streamHost = 'tvpass.org';
        };

        if ( channelUrl.match( 'thetvapp\.to' ) )
        {
            streamHost = 'thetvapp.to';
        };

        const tokenUrl = `https://${ streamHost }/token/${ streamName }?quality=${ envStreamQuality.toLowerCase() }`;
        const tokenResponse = await fetchPage( tokenUrl, req );
        let tokenizedUrl;

        Log.debug( `play`, chalk.yellow( `[tokenize]` ), chalk.white( `⚙️` ),
            chalk.blueBright( `<msg>` ), chalk.gray( `Generating tokenized final stream URL` ),
            chalk.blueBright( `<client>` ), chalk.gray( `${ clientIp( req ) }` ),
            chalk.blueBright( `<channelUrl>` ), chalk.gray( `${ channelUrl }` ),
            chalk.blueBright( `<streamHost>` ), chalk.gray( `${ streamHost }` ),
            chalk.blueBright( `<streamName>` ), chalk.gray( `${ streamName }` ),
            chalk.blueBright( `<streamQuality>` ), chalk.gray( `${ envStreamQuality.toLowerCase() }` ),
            chalk.blueBright( `<tokenUrl>` ), chalk.gray( `${ tokenUrl }` ),
            chalk.blueBright( `<tokenizedUrl>` ), chalk.gray( `not yet assigned` ) );

        try
        {
            const json = JSON.parse( tokenResponse );
            tokenizedUrl = json.url;

            Log.debug( `play`, chalk.yellow( `[tokenize]` ), chalk.white( `⚙️` ),
                chalk.blueBright( `<msg>` ), chalk.gray( `Returned token response in json format` ),
                chalk.blueBright( `<client>` ), chalk.gray( `${ clientIp( req ) }` ),
                chalk.blueBright( `<channelUrl>` ), chalk.gray( `${ channelUrl }` ),
                chalk.blueBright( `<streamHost>` ), chalk.gray( `${ streamHost }` ),
                chalk.blueBright( `<streamName>` ), chalk.gray( `${ streamName }` ),
                chalk.blueBright( `<streamQuality>` ), chalk.gray( `${ envStreamQuality.toLowerCase() }` ),
                chalk.blueBright( `<tokenUrl>` ), chalk.gray( `${ tokenUrl }` ),
                chalk.blueBright( `<tokenResponse>` ), chalk.gray( `${ json }` ),
                chalk.blueBright( `<tokenizedUrl>` ), chalk.gray( `${ tokenizedUrl }` ) );
        }
        catch ( err )
        {
            Log.error( `play`, chalk.redBright( `[tokenize]` ), chalk.white( `❌` ),
                chalk.redBright( `<msg>` ), chalk.gray( `Failed to parse token JSON for channel` ),
                chalk.redBright( `<client>` ), chalk.gray( `${ clientIp( req ) }` ),
                chalk.redBright( `<channelUrl>` ), chalk.gray( `${ channelUrl }` ),
                chalk.redBright( `<streamHost>` ), chalk.gray( `${ streamHost }` ),
                chalk.redBright( `<streamName>` ), chalk.gray( `${ streamName }` ),
                chalk.redBright( `<streamQuality>` ), chalk.gray( `${ envStreamQuality.toLowerCase() }` ),
                chalk.redBright( `<tokenUrl>` ), chalk.gray( `${ tokenUrl }` ),
                chalk.redBright( `<tokenizedUrl>` ), chalk.gray( `not yet assigned` ) );

            return null;
        }

        if ( !tokenizedUrl )
        {
            Log.error( `play`, chalk.redBright( `[tokenize]` ), chalk.white( `❌` ),
                chalk.redBright( `<msg>` ), chalk.gray( `No URL found in token JSON for channel` ),
                chalk.redBright( `<client>` ), chalk.gray( `${ clientIp( req ) }` ),
                chalk.redBright( `<channelUrl>` ), chalk.gray( `${ channelUrl }` ),
                chalk.redBright( `<streamHost>` ), chalk.gray( `${ streamHost }` ),
                chalk.redBright( `<streamName>` ), chalk.gray( `${ streamName }` ),
                chalk.redBright( `<streamQuality>` ), chalk.gray( `${ envStreamQuality.toLowerCase() }` ),
                chalk.redBright( `<tokenUrl>` ), chalk.gray( `${ tokenUrl }` ),
                chalk.redBright( `<tokenizedUrl>` ), chalk.gray( `missing` ) );

            return null;
        }

        Log.ok( `play`, chalk.yellow( `[tokenize]` ), chalk.white( `✅` ),
            chalk.greenBright( `<msg>` ), chalk.gray( `Successfully generated token for stream` ),
            chalk.greenBright( `<client>` ), chalk.gray( `${ clientIp( req ) }` ),
            chalk.greenBright( `<channelUrl>` ), chalk.gray( `${ channelUrl }` ),
            chalk.greenBright( `<streamHost>` ), chalk.gray( `${ streamHost }` ),
            chalk.greenBright( `<streamName>` ), chalk.gray( `${ streamName }` ),
            chalk.greenBright( `<streamQuality>` ), chalk.gray( `${ envStreamQuality.toLowerCase() }` ),
            chalk.greenBright( `<host>` ), chalk.gray( `${ streamHost }` ),
            chalk.greenBright( `<url>` ), chalk.gray( `${ tokenizedUrl }` ),
            chalk.greenBright( `<tokenUrl>` ), chalk.gray( `${ tokenUrl }` ) );

        return tokenizedUrl;
    }
    catch ( err )
    {
        Log.error( `play`, chalk.redBright( `[tokenize]` ), chalk.white( `❌` ),
            chalk.redBright( `<msg>` ), chalk.gray( `Fatal error fetching token` ),
            chalk.redBright( `<client>` ), chalk.gray( `${ clientIp( req ) }` ),
            chalk.redBright( `<error>` ), chalk.gray( `${ err.message }` ),
            chalk.redBright( `<channelUrl>` ), chalk.gray( `${ channelUrl }` ),
            chalk.redBright( `<streamHost>` ), chalk.gray( `not defined` ),
            chalk.redBright( `<streamName>` ), chalk.gray( `not defined` ),
            chalk.redBright( `<streamQuality>` ), chalk.gray( `${ envStreamQuality.toLowerCase() }` ),
            chalk.redBright( `<tokenUrl>` ), chalk.gray( `not defined` ) );

        return null;
    }
}

/*
    serve > m3u playlist
*/

async function serveM3UPlaylist( req, res )
{
    await semaphore.acquire();
    try
    {
        const method = req.method || 'GET';
        Log.debug( `plst`, chalk.yellow( `[requests]` ), chalk.white( `⚙️` ),
            chalk.blueBright( `<msg>` ), chalk.gray( `Requesting to serve M3U playlist` ),
            chalk.blueBright( `<client>` ), chalk.gray( `${ clientIp( req ) }` ),
            chalk.blueBright( `<url>` ), chalk.gray( `${ req.url }` ),
            chalk.blueBright( `<method>` ), chalk.gray( `${ method }` ) );

        /*
            paramUrl > decodedUrl > tokenizedUrl
        */

        const paramUrl = new URL( req.url, `http://${ req.headers.host }` ).searchParams.get( 'url' );
        if ( !paramUrl )
        {
            const statusCheck =
            {
                ip: envIpContainer,
                gateway: envIpGateway,
                client: clientIp( req ),
                message: `Missing ?url= parameter for var paramUrl`,
                status: `unhealthy`,
                ref: req.url,
                method: req.method || 'GET',
                code: 404,
                uptime: Math.round( process.uptime() ),
                uptimeShort: timeAgo.format( Date.now() - process.uptime() * 1000, 'twitter' ),
                uptimeLong: timeAgo.format( Date.now() - process.uptime() * 1000, 'round' ),
                timestamp: Date.now()
            };

            res.writeHead( statusCheck.code, {
                'Content-Type': 'application/json'
            });

            Log.error( `plst`, chalk.redBright( `[response]` ), chalk.white( `❌` ),
                chalk.redBright( `<msg>` ), chalk.gray( `${ statusCheck.message }` ),
                chalk.redBright( `<cat>` ), chalk.gray( `serveM3UPlaylist` ),
                chalk.redBright( `<code>` ), chalk.gray( `${ statusCheck.code }` ),
                chalk.redBright( `<client>` ), chalk.gray( `${ clientIp( req ) }` ),
                chalk.redBright( `<expected>` ), chalk.gray( `http://${ req.headers.host }/channel?url=XXXX` ),
                chalk.redBright( `<method>` ), chalk.gray( `${ method }` ) );

            res.end( JSON.stringify( statusCheck ) );
            return;
        }

        const decodedUrl = decodeURIComponent( paramUrl );
        if ( decodedUrl.endsWith( '.ts' ) )
        {
            res.writeHead( 302, {
                Location: decodedUrl
            });

            Log.notice( `plst`, chalk.yellow( `[response]` ), chalk.white( `📌` ),
                chalk.yellowBright( `<msg>` ), chalk.gray( `decodedUrl ends with .ts script; (302) redirecting` ),
                chalk.yellowBright( `<cat>` ), chalk.gray( `serveM3UPlaylist` ),
                chalk.yellowBright( `<code>` ), chalk.gray( `302` ),
                chalk.yellowBright( `<client>` ), chalk.gray( `${ clientIp( req ) }` ),
                chalk.yellowBright( `<paramUrl>` ), chalk.gray( `${ paramUrl }` ),
                chalk.yellowBright( `<decodedUrl>` ), chalk.gray( `${ decodedUrl }` ),
                chalk.yellowBright( `<method>` ), chalk.gray( `${ method }` ) );

            res.end();
            return;
        }

        const cachedUrl = getCache( req, decodedUrl );
        if ( cachedUrl )
        {
            const rewrittenPlaylist = await rewriteM3U( cachedUrl, req );
            res.writeHead( 200,
            {
                'Content-Type': 'application/vnd.apple.mpegurl',
                'Content-Disposition': 'inline; filename="' + envFileM3U
            });

            Log.debug( `plst`, chalk.yellow( `[response]` ), chalk.white( `⚙️` ),
                chalk.blueBright( `<msg>` ), chalk.gray( `Serving cachedUrl m3u playlist to client` ),
                chalk.blueBright( `<cat>` ), chalk.gray( `serveM3UPlaylist` ),
                chalk.blueBright( `<code>` ), chalk.gray( `200` ),
                chalk.blueBright( `<client>` ), chalk.gray( `${ clientIp( req ) }` ),
                chalk.blueBright( `<paramUrl>` ), chalk.gray( `${ paramUrl }` ),
                chalk.blueBright( `<decodedUrl>` ), chalk.gray( `${ decodedUrl }` ),
                chalk.blueBright( `<cachedUrl>` ), chalk.gray( `${ cachedUrl }` ),
                chalk.blueBright( `<method>` ), chalk.gray( `${ method }` ) );

            res.end( rewrittenPlaylist );
            return;
        }

        Log.info( `plst`, chalk.yellow( `[response]` ), chalk.white( `ℹ️` ),
            chalk.blueBright( `<msg>` ), chalk.gray( `Request not cached; generating new tokenizedUrl for m3u playlist to client` ),
            chalk.blueBright( `<client>` ), chalk.gray( `${ clientIp( req ) }` ),
            chalk.blueBright( `<cat>` ), chalk.gray( `serveM3UPlaylist` ),
            chalk.blueBright( `<paramUrl>` ), chalk.gray( `${ paramUrl }` ),
            chalk.blueBright( `<decodedUrl>` ), chalk.gray( `${ decodedUrl }` ),
            chalk.blueBright( `<cachedUrl>` ), chalk.gray( `${ cachedUrl }` ),
            chalk.blueBright( `<method>` ), chalk.gray( `${ method }` ) );

        /*
            get tokenized url
        */

        const tokenizedUrl = await getTokenizedUrl( decodedUrl, req );
        if ( !tokenizedUrl )
        {
            const statusCheck =
            {
                ip: envIpContainer,
                gateway: envIpGateway,
                client: clientIp( req ),
                message: `Failed to retrieve tokenized URL.`,
                status: `unhealthy`,
                ref: req.url,
                method: req.method || 'GET',
                code: 500,
                uptime: Math.round( process.uptime() ),
                uptimeShort: timeAgo.format( Date.now() - process.uptime() * 1000, 'twitter' ),
                uptimeLong: timeAgo.format( Date.now() - process.uptime() * 1000, 'round' ),
                timestamp: Date.now()
            };

            res.writeHead( statusCheck.code, {
                'Content-Type': 'application/json'
            });

            Log.error( `plst`, chalk.redBright( `[response]` ), chalk.white( `❌` ),
                chalk.redBright( `<msg>` ), chalk.gray( `${ statusCheck.message }` ),
                chalk.redBright( `<cat>` ), chalk.gray( `serveM3UPlaylist` ),
                chalk.redBright( `<code>` ), chalk.gray( `${ statusCheck.code }` ),
                chalk.redBright( `<client>` ), chalk.gray( `${ clientIp( req ) }` ),
                chalk.redBright( `<decodedUrl>` ), chalk.gray( `${ decodedUrl }` ),
                chalk.redBright( `<tokenizedUrl>` ), chalk.gray( `${ tokenizedUrl }` ),
                chalk.redBright( `<method>` ), chalk.gray( `${ method }` ) );

            res.end( JSON.stringify( statusCheck ) );
            return;
        }

        setCache( req, decodedUrl, tokenizedUrl, 4 * 60 * 60 * 1000 );
        const hdUrl = tokenizedUrl.replace( 'tracks-v2a1', 'tracks-v1a1' );
        const rewrittenPlaylist = await rewriteM3U( hdUrl, req );

        res.writeHead( 200, {
            'Content-Type': 'application/vnd.apple.mpegurl',
            'Content-Disposition': 'inline; filename="' + envFileM3U
        });

        Log.ok( `plst`, chalk.yellow( `[response]` ), chalk.white( `✅` ),
            chalk.greenBright( `<msg>` ), chalk.gray( `Serving new tokenizedUrl with m3u playlist to client` ),
            chalk.greenBright( `<cat>` ), chalk.gray( `serveM3UPlaylist` ),
            chalk.greenBright( `<client>` ), chalk.gray( `${ clientIp( req ) }` ),
            chalk.greenBright( `<code>` ), chalk.gray( `200` ),
            chalk.greenBright( `<playlist>` ), chalk.gray( `${ envFileM3U }` ),
            chalk.greenBright( `<paramUrl>` ), chalk.gray( `${ paramUrl }` ),
            chalk.greenBright( `<decodedUrl>` ), chalk.gray( `${ decodedUrl }` ),
            chalk.greenBright( `<tokenizedUrl>` ), chalk.gray( `${ tokenizedUrl }` ),
            chalk.greenBright( `<method>` ), chalk.gray( `${ method }` ) );

        res.end( rewrittenPlaylist );
    }
    catch ( err )
    {
        if ( !res.headersSent )
        {
            const statusCheck =
            {
                ip: envIpContainer,
                gateway: envIpGateway,
                client: clientIp( req ),
                message: `Cannot process request when fetching channel playlist`,
                error: `${ err.message }`,
                status: 'unhealthy',
                ref: req.url,
                method: req.method || 'GET',
                code: 500,
                uptime: Math.round( process.uptime() ),
                uptimeShort: timeAgo.format( Date.now() - process.uptime() * 1000, 'twitter' ),
                uptimeLong: timeAgo.format( Date.now() - process.uptime() * 1000, 'round' ),
                timestamp: Date.now()
            };

            res.writeHead( statusCheck.code, {
                'Content-Type': 'application/json'
            });

            Log.error( `plst`, chalk.redBright( `[response]` ), chalk.white( `❌` ),
                chalk.redBright( `<msg>` ), chalk.gray( `Failed to serve m3u playlist` ),
                chalk.redBright( `<cat>` ), chalk.gray( `serveM3UPlaylist` ),
                chalk.redBright( `<error>` ), chalk.gray( `${ statusCheck.message }` ),
                chalk.redBright( `<code>` ), chalk.gray( `${ statusCheck.code }` ) );

            res.end( JSON.stringify( statusCheck ) );
        }
    }
    finally
    {
        semaphore.release();
    }
}

/*
    serve > health check
*/

async function serveHealthCheck( req, res )
{
    await semaphore.acquire();
    try
    {
        const paramUrl = new URL( req.url, `http://${ req.headers.host }` ).searchParams.get( 'api' );
        const paramSilent = new URL( req.url, `http://${ req.headers.host }` ).searchParams.get( 'silent' );

        if ( !paramUrl )
        {
            if ( Utils.str2bool( paramSilent ) !== true )
            {
                Log.debug( `/api`, chalk.yellow( `[health]` ), chalk.white( `⚙️` ),
                    chalk.blueBright( `<msg>` ), chalk.gray( `No api-key passed to health check` ) );
            }
        }

        const statusCheck =
        {
            ip: envIpContainer,
            gateway: envIpGateway,
            client: clientIp( req ),
            message: `healthy`,
            status: `healthy`,
            ref: req.url,
            method: req.method || 'GET',
            code: 200,
            uptime: Math.round( process.uptime() ),
            uptimeShort: timeAgo.format( Date.now() - process.uptime() * 1000, 'twitter' ),
            uptimeLong: timeAgo.format( Date.now() - process.uptime() * 1000, 'round' ),
            timestamp: Date.now()
        };

        res.writeHead( statusCheck.code, {
            'Content-Type': 'application/json'
        });

        if ( Utils.str2bool( paramSilent ) !== true )
        {
            Log.ok( `/api`, chalk.yellow( `[health]` ), chalk.white( `✅` ),
                chalk.greenBright( `<msg>` ), chalk.gray( `Response` ),
                chalk.greenBright( `<client>` ), chalk.gray( `${ clientIp( req ) }` ),
                chalk.greenBright( `<code>` ), chalk.gray( `${ statusCheck.code }` ),
                chalk.greenBright( `<status>` ), chalk.gray( `${ statusCheck.status }` ),
                chalk.greenBright( `<uptime>` ), chalk.gray( `${ process.uptime() }` ) );
        }

        res.end( JSON.stringify( statusCheck ) );
        return;
    }
    catch ( err )
    {
        if ( !res.headersSent )
        {
            const statusCheck =
            {
                ip: envIpContainer,
                gateway: envIpGateway,
                client: clientIp( req ),
                message: `health check failed`,
                error: `${ err.message }`,
                status: `unhealthy`,
                ref: req.url,
                method: req.method || 'GET',
                code: 503,
                uptime: Math.round( process.uptime() ),
                uptimeShort: timeAgo.format( Date.now() - process.uptime() * 1000, 'twitter' ),
                uptimeLong: timeAgo.format( Date.now() - process.uptime() * 1000, 'round' ),
                timestamp: Date.now()
            };

            res.writeHead( statusCheck.code, {
                'Content-Type': 'application/json'
            });

            Log.error( `/api`, chalk.redBright( `[health]` ), chalk.white( `❌` ),
                chalk.redBright( `<msg>` ), chalk.gray( `${ statusCheck.message } response` ),
                chalk.redBright( `<code>` ), chalk.gray( `${ statusCheck.code }` ),
                chalk.redBright( `<status>` ), chalk.gray( `${ statusCheck.status }` ),
                chalk.redBright( `<client>` ), chalk.gray( `${ clientIp( req ) }` ),
                chalk.redBright( `<error>` ), chalk.gray( `${ err.message }` ),
                chalk.redBright( `<uptime>` ), chalk.gray( `${ process.uptime() }` ) );

            res.end( JSON.stringify( statusCheck ) );
        }
    }
    finally
    {
        semaphore.release();
    }
}

/*
    Rewrites the URLs
*/

async function rewriteM3U( originalUrl, req )
{
    const rawData = await fetchRemote( originalUrl, req );
    const protocol = req.headers['x-forwarded-proto']?.split( ',' )[0] || ( req.socket.encrypted ? 'https' : 'http' );
    const host = req.headers.host;
    const baseUrl = `${ protocol }://${ host }`;
    const playlistContent = rawData.toString( 'utf8' );
    return playlistContent
        .replace( /URI="([^"]+)"/g, ( match, uri ) =>
        {
            const resolvedUri = new URL( uri, originalUrl ).href;
            return `URI="${ baseUrl }/key?uri=${ encodeURIComponent( resolvedUri ) }"`;
        })
        .replace( /^([^#].*\.m3u8)(\?.*)?$/gm, ( match, uri ) =>
        {
            const resolvedUri = new URL( uri, originalUrl ).href;
            return `${ baseUrl }/channel?url=${ encodeURIComponent( resolvedUri ) }`;
        })
        .replace( /^([^#].*\.ts)(\?.*)?$/gm, ( match, uri ) =>
        {
            const resolvedUri = new URL( uri, originalUrl ).href;
            return `${ baseUrl }/channel?url=${ encodeURIComponent( resolvedUri ) }`;
        });
}

/*
    serve > m3u

    Serves IPTV .m3u playlist
*/

async function serveM3U( res, req )
{
    try
    {
        const protocol = req.headers['x-forwarded-proto']?.split( ',' )[0] || ( req.socket.encrypted ? 'https' : 'http' );
        const host = req.headers.host;
        const baseUrl = `${ protocol }://${ host }`;
        const formattedContent = fs.readFileSync( FILE_M3U, 'utf-8' );
        const updatedContent = formattedContent
            .replace( /(https?:\/\/[^\s]*thetvapp[^\s]*)/g, ( fullUrl ) =>
            {
                Log.debug( `.m3u`, chalk.yellow( `[rewriter]` ), chalk.white( `⚙️` ),
                    chalk.blueBright( `<msg>` ), chalk.gray( `Rewriting url for keyword` ),
                    chalk.blueBright( `<keyword>` ), chalk.gray( `*thetvapp` ),
                    chalk.blueBright( `<from>` ), chalk.gray( `${ fullUrl }` ),
                    chalk.blueBright( `<to>` ), chalk.gray( `${ baseUrl }/channel?url=${ encodeURIComponent( fullUrl ) }` ) );

                return `${ baseUrl }/channel?url=${ encodeURIComponent( fullUrl ) }`;
            })
            .replace( /(https?:\/\/[^\s]*tvpass[^\s]*)/g, ( fullUrl ) =>
            {
                Log.debug( `.m3u`, chalk.yellow( `[rewriter]` ), chalk.white( `⚙️` ),
                    chalk.blueBright( `<msg>` ), chalk.gray( `Rewriting url for keyword` ),
                    chalk.blueBright( `<keyword>` ), chalk.gray( `*tvpass` ),
                    chalk.blueBright( `<from>` ), chalk.gray( `${ fullUrl }` ),
                    chalk.blueBright( `<to>` ), chalk.gray( `${ baseUrl }/channel?url=${ encodeURIComponent( fullUrl ) }` ) );

                return `${ baseUrl }/channel?url=${ encodeURIComponent( fullUrl ) }`;
            });
            /*
            .replace( /(https?:\/\/fl\d+\.moveonjoy\.com[^\s]*)/g, ( fullUrl ) =>
            {
                const urlRewrite = fullUrl.replace( /fl\d+\.moveonjoy\.com/, 'fl25.moveonjoy.com' );
                Log.debug( `.m3u`, chalk.yellow( `[rewriter]` ), chalk.white( `⚙️` ),
                    chalk.blueBright( `<msg>` ), chalk.gray( `Rewriting url for keyword` ),
                    chalk.blueBright( `<keyword>` ), chalk.gray( `*fl1.moveonjoy` ),
                    chalk.blueBright( `<from>` ), chalk.gray( `${ fullUrl }` ),
                    chalk.blueBright( `<to>` ), chalk.gray( `${ urlRewrite }` ) );

                return `${ urlRewrite }`;
            });
            */

            res.writeHead( 200, {
                'Content-Type': 'application/x-mpegURL',
                'Content-Disposition': 'inline; filename="' + envFileM3U
            });

        Log.ok( `.m3u`, chalk.yellow( `[response]` ), chalk.white( `✅` ),
            chalk.greenBright( `<msg>` ), chalk.gray( `Successfully served m3u8 channel playlist data` ),
            chalk.greenBright( `<cat>` ), chalk.gray( `serveM3U` ),
            chalk.greenBright( `<code>` ), chalk.gray( `200` ),
            chalk.greenBright( `<host>` ), chalk.gray( `${ host }` ),
            chalk.greenBright( `<url>` ), chalk.gray( `${ req.url }` ),
            chalk.greenBright( `<path>` ), chalk.gray( `${ FILE_M3U }` ),
            chalk.greenBright( `<file>` ), chalk.gray( `${ envFileM3U }` ) );

        res.end( updatedContent );
    }
    catch ( err )
    {
        const statusCheck =
        {
            ip: envIpContainer,
            gateway: envIpGateway,
            client: clientIp( req ),
            message: `Fatal serving m3u8 channel playlist data`,
            error: `${ err.message }`,
            status: 'unhealthy',
            ref: req.url,
            method: req.method || 'GET',
            code: 500,
            uptime: Math.round( process.uptime() ),
            uptimeShort: timeAgo.format( Date.now() - process.uptime() * 1000, 'twitter' ),
            uptimeLong: timeAgo.format( Date.now() - process.uptime() * 1000, 'round' ),
            timestamp: Date.now()
        };

        res.writeHead( statusCheck.code, {
            'Content-Type': 'application/json'
        });

        Log.error( `.m3u`, chalk.yellow( `[response]` ), chalk.white( `❌` ),
            chalk.redBright( `<msg>` ), chalk.gray( `${ statusCheck.message }` ),
            chalk.redBright( `<cat>` ), chalk.gray( `serveM3U` ),
            chalk.redBright( `<code>` ), chalk.gray( `${ statusCheck.code }` ),
            chalk.redBright( `<error>` ), chalk.gray( `${ err.message }` ),
            chalk.redBright( `<url>` ), chalk.gray( `${ req.url }` ),
            chalk.redBright( `<path>` ), chalk.gray( `${ FILE_XML }` ),
            chalk.redBright( `<file>` ), chalk.gray( `${ envFileXML }` ) );

        res.end( JSON.stringify( statusCheck ) );
    }
}

/*
    serve > xml

    Serves IPTV uncompressed .xml guide data
*/

async function serveXML( res, req )
{
    try
    {
        const protocol = req.headers['x-forwarded-proto']?.split( ',' )[0] || ( req.socket.encrypted ? 'https' : 'http' );
        const host = req.headers.host;
        const baseUrl = `${ protocol }://${ host }`;
        const formattedContent = fs.readFileSync( FILE_XML, 'utf-8' );

        res.writeHead( 200, {
            'Content-Type': 'application/xml',
            'Content-Disposition': 'inline; filename="' + envFileXML
        });

        Log.ok( `.xml`, chalk.yellow( `[response]` ), chalk.white( `✅` ),
            chalk.greenBright( `<msg>` ), chalk.gray( `Successfully served uncompressed xml / epg guide data` ),
            chalk.greenBright( `<cat>` ), chalk.gray( `serveXML` ),
            chalk.greenBright( `<code>` ), chalk.gray( `200` ),
            chalk.greenBright( `<host>` ), chalk.gray( `${ host }` ),
            chalk.greenBright( `<url>` ), chalk.gray( `${ req.url }` ),
            chalk.greenBright( `<path>` ), chalk.gray( `${ FILE_XML }` ),
            chalk.greenBright( `<file>` ), chalk.gray( `${ envFileXML }` ) );

        res.end( formattedContent );
    }
    catch ( err )
    {
        const statusCheck =
        {
            ip: envIpContainer,
            gateway: envIpGateway,
            client: clientIp( req ),
            message: `Fatal serving uncompressed xml / epg guide data`,
            error: `${ err.message }`,
            status: 'unhealthy',
            ref: req.url,
            method: req.method || 'GET',
            code: 500,
            uptime: Math.round( process.uptime() ),
            uptimeShort: timeAgo.format( Date.now() - process.uptime() * 1000, 'twitter' ),
            uptimeLong: timeAgo.format( Date.now() - process.uptime() * 1000, 'round' ),
            timestamp: Date.now()
        };

        res.writeHead( statusCheck.code, {
            'Content-Type': 'text/plain'
        });

        Log.error( `.xml`, chalk.yellow( `[response]` ), chalk.white( `❌` ),
            chalk.redBright( `<msg>` ), chalk.gray( `${ statusCheck.message }` ),
            chalk.redBright( `<cat>` ), chalk.gray( `serveXML` ),
            chalk.redBright( `<code>` ), chalk.gray( `${ statusCheck.code }` ),
            chalk.redBright( `<error>` ), chalk.gray( `${ err.message }` ),
            chalk.redBright( `<url>` ), chalk.gray( `${ req.url }` ),
            chalk.redBright( `<path>` ), chalk.gray( `${ FILE_XML }` ),
            chalk.redBright( `<file>` ), chalk.gray( `${ envFileXML }` ) );

        res.end( JSON.stringify( statusCheck ) );
    }
};

/*
    serve > gzip

    Serves IPTV compressed .gz guide data
*/

async function serveGZP( res, req )
{
    try
    {
        const protocol = req.headers['x-forwarded-proto']?.split( ',' )[0] || ( req.socket.encrypted ? 'https' : 'http' );
        const host = req.headers.host;
        const baseUrl = `${ protocol }://${ host }`;
        const formattedContent = fs.readFileSync( FILE_GZP );

        res.writeHead( 200, {
            'Content-Type': 'application/gzip',
            'Content-Disposition': 'inline; filename="' + envFileGZP
        });

        Log.ok( `.gzp`, chalk.yellow( `[response]` ), chalk.white( `✅` ),
            chalk.greenBright( `<msg>` ), chalk.gray( `Successfully served compressed gzip xml/epg guide data` ),
            chalk.greenBright( `<cat>` ), chalk.gray( `serveGZP` ),
            chalk.greenBright( `<code>` ), chalk.gray( `200` ),
            chalk.greenBright( `<host>` ), chalk.gray( `${ host }` ),
            chalk.greenBright( `<url>` ), chalk.gray( `${ req.url }` ),
            chalk.greenBright( `<path>` ), chalk.gray( `${ FILE_GZP }` ),
            chalk.greenBright( `<file>` ), chalk.gray( `${ envFileGZP }` ) );

        res.end( formattedContent );
    }
    catch ( err )
    {
        const statusCheck =
        {
            ip: envIpContainer,
            gateway: envIpGateway,
            client: clientIp( req ),
            message: `Fatal serving compressed gzip xml/epg guide data`,
            error: `${ err.message }`,
            status: 'unhealthy',
            ref: req.url,
            method: req.method || 'GET',
            code: 500,
            uptime: Math.round( process.uptime() ),
            uptimeShort: timeAgo.format( Date.now() - process.uptime() * 1000, 'twitter' ),
            uptimeLong: timeAgo.format( Date.now() - process.uptime() * 1000, 'round' ),
            timestamp: Date.now()
        };

        res.writeHead( statusCheck.code, {
            'Content-Type': 'text/plain'
        });

        Log.error( `.gzp`, chalk.yellow( `[response]` ), chalk.white( `❌` ),
            chalk.redBright( `<msg>` ), chalk.gray( `${ statusCheck.message }` ),
            chalk.redBright( `<cat>` ), chalk.gray( `serveGZP` ),
            chalk.redBright( `<code>` ), chalk.gray( `${ statusCheck.code }` ),
            chalk.redBright( `<error>` ), chalk.gray( `${ err.message }` ),
            chalk.redBright( `<url>` ), chalk.gray( `${ req.url }` ),
            chalk.redBright( `<path>` ), chalk.gray( `${ FILE_GZP }` ),
            chalk.redBright( `<file>` ), chalk.gray( `${ envFileGZP }` ) );

        res.end( JSON.stringify( statusCheck ) );
    }
};

/*
    cache > set
*/

function setCache( req, key, value, ttl )
{
    const expiry = Date.now() + ttl;
    cache.set( key, {
        value,
        expiry
    });

    Log.debug( `cache`, chalk.yellow( `[assigner]` ), chalk.white( `⚙️` ),
        chalk.blueBright( `<msg>` ), chalk.gray( `New key created` ),
        chalk.blueBright( `<cat>` ), chalk.gray( `setCache` ),
        chalk.blueBright( `<client>` ), chalk.gray( `${ clientIp( req ) }` ),
        chalk.blueBright( `<key>` ), chalk.gray( `${ key }` ),
        chalk.blueBright( `<expire>` ), chalk.gray( `${ ttl / 1000 } seconds` ) );
}

/*
    cache > get
*/

function getCache( req, key )
{
    const cached = cache.get( key );
    if ( cached && cached.expiry > Date.now() )
    {
        return cached.value;
    }
    else
    {
        if ( cached )
            Log.debug( `cache`, chalk.yellow( `[get]` ), chalk.white( `⚙️` ),
                chalk.blueBright( `<msg>` ), chalk.gray( `Key has expired, marked for deletion` ),
                chalk.blueBright( `<cat>` ), chalk.gray( `getCache` ),
                chalk.blueBright( `<client>` ), chalk.gray( `${ clientIp( req ) }` ),
                chalk.blueBright( `<key>` ), chalk.gray( `${ key }` ) );

        cache.delete( key );
        return null;
    }
}

/*
    Initialization

    this is the starting method to prepare tvapp2
*/

async function initialize()
{
    const start = performance.now();
    try
    {
        const validation = crons.validateCronExpression( envTaskCronSync );
        if ( !validation.valid )
        {
            Log.error( `core`, chalk.yellow( `[schedule]` ), chalk.white( `❌` ),
                chalk.redBright( `<msg>` ), chalk.gray( `Specified cron schedule is not valid` ),
                chalk.redBright( `<schedule>` ), chalk.whiteBright.bgBlack( ` ${ envTaskCronSync } ` ) );
        }
        else
        {
            const cronNextRunDt = new Date( crons.sendAt( envTaskCronSync ) );
            const cronNextRun = moment( cronNextRunDt ).format( 'MM-DD-YYYY h:mm A' );

            Log.info( `core`, chalk.yellow( `[schedule]` ), chalk.white( `ℹ️` ),
                chalk.blueBright( `<msg>` ), chalk.gray( `TVApp2 will refresh channel and guide data at` ),
                chalk.blueBright( `<schedule>` ), chalk.whiteBright.gray( ` ${ envTaskCronSync } ` ),
                chalk.blueBright( `<nextrun>` ), chalk.whiteBright.gray( ` ${ cronNextRun } ` ),
                chalk.blueBright( `<nextrunIso>` ), chalk.whiteBright.gray( ` ${ cronNextRunDt } ` ) );
        }

        Log.info( `core`, chalk.yellow( `[initiate]` ), chalk.white( `ℹ️` ),
            chalk.blueBright( `<msg>` ), chalk.gray( `Starting TVApp2 container. Assigning bound IP to host network adapter` ),
            chalk.blueBright( `<hostIp>` ), chalk.gray( `${ envWebIP }` ),
            chalk.blueBright( `<containerIp>` ), chalk.gray( `${ envIpContainer }` ),
            chalk.blueBright( `<port>` ), chalk.gray( `${ envWebPort }` ) );

        /*
            Debug > network
        */

        Log.debug( `.net`, chalk.yellow( `[assigner]` ), chalk.white( `⚙️` ), chalk.blueBright( `<name>` ), chalk.gray( `IP_CONTAINER` ), chalk.blueBright( `<value>` ), chalk.gray( `${ envIpContainer }` ) );
        Log.debug( `.net`, chalk.yellow( `[assigner]` ), chalk.white( `⚙️` ), chalk.blueBright( `<name>` ), chalk.gray( `IP_GATEWAY` ), chalk.blueBright( `<value>` ), chalk.gray( `${ envIpGateway }` ) );
        Log.debug( `.env`, chalk.yellow( `[assigner]` ), chalk.white( `⚙️` ), chalk.blueBright( `<name>` ), chalk.gray( `RELEASE` ), chalk.blueBright( `<value>` ), chalk.gray( `${ envAppRelease }` ) );

        /*
            Debug > Verbose > environment vars
        */

        const env = process.env;
        Object.keys( env ).forEach( ( key  ) =>
        {
            Log.verbose( `.env`, chalk.yellow( `[assigner]` ), chalk.white( `📣` ), chalk.blueBright( `<name>` ), chalk.gray( `${ key }` ), chalk.blueBright( `<value>` ), chalk.gray( `${ env[key] }` ) );
        });

        /*
            Debug > environment vars

            we could just loop process.env; but that will show every container env var. We just want this app
        */

        Log.debug( `.env`, chalk.yellow( `[assigner]` ), chalk.white( `⚙️` ), chalk.blueBright( `<name>` ), chalk.gray( `URL_REPO` ), chalk.blueBright( `<value>` ), chalk.gray( `${ envUrlRepo }` ) );
        Log.debug( `.env`, chalk.yellow( `[assigner]` ), chalk.white( `⚙️` ), chalk.blueBright( `<name>` ), chalk.gray( `WEB_IP` ), chalk.blueBright( `<value>` ), chalk.gray( `${ envWebIP }` ) );
        Log.debug( `.env`, chalk.yellow( `[assigner]` ), chalk.white( `⚙️` ), chalk.blueBright( `<name>` ), chalk.gray( `WEB_PORT` ), chalk.blueBright( `<value>` ), chalk.gray( `${ envWebPort }` ) );
        Log.debug( `.env`, chalk.yellow( `[assigner]` ), chalk.white( `⚙️` ), chalk.blueBright( `<name>` ), chalk.gray( `WEB_FOLDER` ), chalk.blueBright( `<value>` ), chalk.gray( `${ envWebFolder }` ) );
        Log.debug( `.env`, chalk.yellow( `[assigner]` ), chalk.white( `⚙️` ), chalk.blueBright( `<name>` ), chalk.gray( `WEB_ENCODING` ), chalk.blueBright( `<value>` ), chalk.gray( `${ envWebEncoding }` ) );
        Log.debug( `.env`, chalk.yellow( `[assigner]` ), chalk.white( `⚙️` ), chalk.blueBright( `<name>` ), chalk.gray( `WEB_PROXY_HEADER` ), chalk.blueBright( `<value>` ), chalk.gray( `${ envProxyHeader }` ) );
        Log.debug( `.env`, chalk.yellow( `[assigner]` ), chalk.white( `⚙️` ), chalk.blueBright( `<name>` ), chalk.gray( `STREAM_QUALITY` ), chalk.blueBright( `<value>` ), chalk.gray( `${ envStreamQuality }` ) );
        Log.debug( `.env`, chalk.yellow( `[assigner]` ), chalk.white( `⚙️` ), chalk.blueBright( `<name>` ), chalk.gray( `API_KEY` ), chalk.blueBright( `<value>` ), chalk.gray( `${ envApiKey }` ) );
        Log.debug( `.env`, chalk.yellow( `[assigner]` ), chalk.white( `⚙️` ), chalk.blueBright( `<name>` ), chalk.gray( `FILE_URL` ), chalk.blueBright( `<value>` ), chalk.gray( `${ envFileURL }` ) );
        Log.debug( `.env`, chalk.yellow( `[assigner]` ), chalk.white( `⚙️` ), chalk.blueBright( `<name>` ), chalk.gray( `FILE_M3U` ), chalk.blueBright( `<value>` ), chalk.gray( `${ envFileM3U }` ) );
        Log.debug( `.env`, chalk.yellow( `[assigner]` ), chalk.white( `⚙️` ), chalk.blueBright( `<name>` ), chalk.gray( `FILE_EPG` ), chalk.blueBright( `<value>` ), chalk.gray( `${ envFileXML }` ) );
        Log.debug( `.env`, chalk.yellow( `[assigner]` ), chalk.white( `⚙️` ), chalk.blueBright( `<name>` ), chalk.gray( `FILE_GZP` ), chalk.blueBright( `<value>` ), chalk.gray( `${ envFileGZP }` ) );
        Log.debug( `.env`, chalk.yellow( `[assigner]` ), chalk.white( `⚙️` ), chalk.blueBright( `<name>` ), chalk.gray( `HEALTH_TIMER` ), chalk.blueBright( `<value>` ), chalk.gray( `${ envHealthTimer }` ) );
        Log.debug( `.env`, chalk.yellow( `[assigner]` ), chalk.white( `⚙️` ), chalk.blueBright( `<name>` ), chalk.gray( `LOG_LEVEL` ), chalk.blueBright( `<value>` ), chalk.gray( `${ LOG_LEVEL }` ) );
        Log.debug( `.env`, chalk.yellow( `[assigner]` ), chalk.white( `⚙️` ), chalk.blueBright( `<name>` ), chalk.gray( `USERAGENT` ), chalk.blueBright( `<value>` ), chalk.gray( `${ USERAGENT }` ) );

        /*
            Debug > vars > external urls
        */

        Log.debug( `.var`, chalk.yellow( `[assigner]` ), chalk.white( `⚙️` ), chalk.blueBright( `<name>` ), chalk.gray( `extURL` ), chalk.blueBright( `<value>` ), chalk.gray( `${ extURL }` ) );
        Log.debug( `.var`, chalk.yellow( `[assigner]` ), chalk.white( `⚙️` ), chalk.blueBright( `<name>` ), chalk.gray( `extXML` ), chalk.blueBright( `<value>` ), chalk.gray( `${ extXML }` ) );
        Log.debug( `.var`, chalk.yellow( `[assigner]` ), chalk.white( `⚙️` ), chalk.blueBright( `<name>` ), chalk.gray( `extM3U` ), chalk.blueBright( `<value>` ), chalk.gray( `${ extM3U }` ) );

        /*
            Debug > vars > subdomain keywords
        */

        Log.debug( `.var`, chalk.yellow( `[assigner]` ), chalk.white( `⚙️` ), chalk.blueBright( `<name>` ), chalk.gray( `subdomainGZP` ), chalk.blueBright( `<value>` ), chalk.gray( `${ subdomainGZP.join() }` ) );
        Log.debug( `.var`, chalk.yellow( `[assigner]` ), chalk.white( `⚙️` ), chalk.blueBright( `<name>` ), chalk.gray( `subdomainM3U` ), chalk.blueBright( `<value>` ), chalk.gray( `${ subdomainM3U.join() }` ) );
        Log.debug( `.var`, chalk.yellow( `[assigner]` ), chalk.white( `⚙️` ), chalk.blueBright( `<name>` ), chalk.gray( `subdomainEPG` ), chalk.blueBright( `<value>` ), chalk.gray( `${ subdomainEPG.join() }` ) );
        Log.debug( `.var`, chalk.yellow( `[assigner]` ), chalk.white( `⚙️` ), chalk.blueBright( `<name>` ), chalk.gray( `subdomainKey` ), chalk.blueBright( `<value>` ), chalk.gray( `${ subdomainKey.join() }` ) );
        Log.debug( `.var`, chalk.yellow( `[assigner]` ), chalk.white( `⚙️` ), chalk.blueBright( `<name>` ), chalk.gray( `subdomainChan` ), chalk.blueBright( `<value>` ), chalk.gray( `${ subdomainChan.join() }` ) );
        Log.debug( `.var`, chalk.yellow( `[assigner]` ), chalk.white( `⚙️` ), chalk.blueBright( `<name>` ), chalk.gray( `subdomainHealth` ), chalk.blueBright( `<value>` ), chalk.gray( `${ subdomainHealth.join() }` ) );
        Log.debug( `.var`, chalk.yellow( `[assigner]` ), chalk.white( `⚙️` ), chalk.blueBright( `<name>` ), chalk.gray( `subdomainRestart` ), chalk.blueBright( `<value>` ), chalk.gray( `${ subdomainRestart.join() }` ) );

        /*
            get files
        */

        await getFile( extURL, FILE_URL );
        await getFile( extXML, FILE_XML );
        await getFile( extM3U, FILE_M3U );
        await getGzip();

        urls = fs.readFileSync( FILE_URL, 'utf-8' ).split( '\n' ).filter( Boolean );
        if ( urls.length === 0 )
            throw new Error( `No valid URLs found in ${ FILE_URL }` );

        /*
            Calculate Sizes
        */

        FILE_M3U_SIZE = getFileSizeHuman( FILE_M3U );
        FILE_XML_SIZE = getFileSizeHuman( FILE_XML );
        FILE_GZP_SIZE = getFileSizeHuman( FILE_GZP );

        FILE_M3U_MODIFIED = getFileModified( FILE_M3U );
        FILE_XML_MODIFIED = getFileModified( FILE_XML );
        FILE_GZP_MODIFIED = getFileModified( FILE_GZP );

        const end = performance.now();
        serverStartup = `${ end - start }`;
        Log.info( `core`, chalk.yellow( `[initiate]` ), chalk.white( `ℹ️` ),
            chalk.blueBright( `<msg>` ), chalk.gray( `TVApp2 container is ready` ),
            chalk.blueBright( `<time>` ), chalk.gray( `took ${ serverStartup }ms` ),
            chalk.blueBright( `<ip>` ), chalk.gray( `${ envIpContainer }` ),
            chalk.blueBright( `<gateway>` ), chalk.gray( `${ envIpGateway }` ),
            chalk.blueBright( `<port>` ), chalk.gray( `${ envWebPort }` ) );
    }
    catch ( err )
    {
        const end = performance.now();
        Log.error( `core`, chalk.yellow( `[initiate]` ), chalk.white( `❌` ),
            chalk.redBright( `<msg>` ), chalk.gray( `Could not start up TVApp2 container due to error` ),
            chalk.redBright( `<time>` ), chalk.gray( `took ${ end - start }ms` ),
            chalk.redBright( `<error>` ), chalk.gray( `${ err }` ),
            chalk.redBright( `<ip>` ), chalk.gray( `${ envIpContainer }` ),
            chalk.redBright( `<gateway>` ), chalk.gray( `${ envIpGateway }` ),
            chalk.redBright( `<port>` ), chalk.gray( `${ envWebPort }` ) );
    }
}

/*
    Webserver

    @todo           possibility of switching out http.createserver with express

                    import express from 'express';
                    const app = express()
                    app.use(express.static('www'));
                    const server = app.listen(8000, function () {
                        const host = server.address().address
                        const port = server.address().port

                        console.log('Express listening at http://%s:%s', host, port)
                    })
*/

const server = http.createServer( ( req, resp ) =>
{
    /*
        If request.url === '/'; load index.html as default page

        request.url returns
                /
                /www/css/tvapp2.fonts.min.css
                /www/css/tvapp2.min.css
    */

    const method = req.method || 'GET';
    let reqUrl = req.url;
    if ( reqUrl === '/' )
        reqUrl = 'index.html';

    /*
        Remove leading forward slash
    */

    const loadFile = reqUrl.replace( /^\/+/, '' );

    const handleRequest = async() =>
    {
        /*
            Define the different routes.
            Place the template system last. Getting TVApp data should take priority.

            subdomainM3U        array []
            loadFile            channel?url=https%3A%2F%2Ftvpass.org%2Fchannel%2Fabc-wabc-new-york-ny%2F
        */

        const paramSilent = new URL( req.url, `http://${ req.headers.host }` ).searchParams.get( 'silent' );
        if ( Utils.str2bool( paramSilent ) !== true )
        {
            Log.debug( `http`, chalk.yellow( `[requests]` ), chalk.white( `⚙️` ),
                chalk.blueBright( `<msg>` ), chalk.gray( `New request` ),
                chalk.blueBright( `<client>` ), chalk.gray( `${ clientIp( req ) }` ),
                chalk.blueBright( `<request.url>` ), chalk.gray( `${ req.url }` ),
                chalk.blueBright( `<reqUrl>` ), chalk.gray( `${ reqUrl }` ),
                chalk.blueBright( `<file>` ), chalk.gray( `${ loadFile }` ),
                chalk.blueBright( `<method>` ), chalk.gray( `${ method }` ) );
        }

        if ( subdomainRestart.some( ( urlKeyword ) => loadFile.startsWith( urlKeyword ) ) )
        {
            /*
                Not highly technical, but good enough for starting out until Express is integrated.
                    if restart command is triggered using website, allow it to pass through without an API key.
                    if restart command is triggered by using

                referer         = if activated from webpage via clicking icon
                no referer      = if activated using URL

                referer is check just as an added aspect of the api key, but really this doesn't even need to be here
                as the referer can be easily spoofed. remove once express and the new api system are added. right now
                it does no harm for a user to even bypass this.

                @todo               integrate real api system after express replaces node http
            */

            const apiKey = new URL( req.url, `http://${ req.headers.host }` ).searchParams.get( 'key' );
            const referer = req.headers.referer || null;

            if ( ( !referer && envApiKey && !apiKey ) || ( referer && !referer.includes( req.headers.host ) ) )
            {
                const statusCheck =
                {
                    ip: envIpContainer, gateway: envIpGateway, client: clientIp( req ),
                    message: `must specify api key: http://${ req.headers.host }/api/restart?key=XXXXXXXX`,
                    status: `unauthorized`, ref: req.url, method: method || 'GET', code: 401,
                    uptime: Math.round( process.uptime() ), timestamp: Date.now(),
                    uptimeShort: timeAgo.format( Date.now() - process.uptime() * 1000, 'twitter' ),
                    uptimeLong: timeAgo.format( Date.now() - process.uptime() * 1000, 'round' )
                };

                resp.writeHead( statusCheck.code, {
                    'Content-Type': 'application/json'
                });

                Log.error( `http`, chalk.yellow( `[requests]` ), chalk.white( `❌` ),
                    chalk.redBright( `<msg>` ), chalk.gray( `Unauthorized (401): restart attempt did not specify api key using ?key=XXX parameter` ),
                    chalk.redBright( `<type>` ), chalk.gray( `api/restart` ),
                    chalk.redBright( `<client>` ), chalk.gray( `${ clientIp( req ) }` ),
                    chalk.redBright( `<file>` ), chalk.gray( `${ loadFile }` ),
                    chalk.redBright( `<method>` ), chalk.gray( `${ method }` ) );

                resp.end( JSON.stringify( statusCheck ) );

                return;
            }

            /*
                no referer, api key in url specified, api key set up with tvapp2 do not match
            */

            if ( !referer && ( envApiKey !== apiKey ) )
            {
                const statusCheck =
                {
                    ip: envIpContainer, gateway: envIpGateway, client: clientIp( req ),
                    message: `incorrect api key specified: http://${ req.headers.host }/api/restart?key=XXXXXXXX`,
                    status: `unauthorized`, ref: req.url, method: method || 'GET', code: 401,
                    uptime: Math.round( process.uptime() ), timestamp: Date.now(),
                    uptimeShort: timeAgo.format( Date.now() - process.uptime() * 1000, 'twitter' ),
                    uptimeLong: timeAgo.format( Date.now() - process.uptime() * 1000, 'round' )
                };

                resp.writeHead( statusCheck.code, {
                    'Content-Type': 'application/json'
                });

                Log.error( `http`, chalk.yellow( `[requests]` ), chalk.white( `❌` ),
                    chalk.redBright( `<msg>` ), chalk.gray( `Unauthorized (401): incorrect api key specified` ),
                    chalk.redBright( `<type>` ), chalk.gray( `api/restart` ),
                    chalk.redBright( `<client>` ), chalk.gray( `${ clientIp( req ) }` ),
                    chalk.redBright( `<file>` ), chalk.gray( `${ loadFile }` ),
                    chalk.redBright( `<method>` ), chalk.gray( `${ method }` ) );

                resp.end( JSON.stringify( statusCheck ) );
                return;
            }

            await initialize();

            const statusCheck =
            {
                ip: envIpContainer,
                gateway: envIpGateway,
                client: clientIp( req ),
                message: 'Restart command received',
                status: 'ok',
                ref: req.url,
                method: method || 'GET',
                code: 200,
                uptime: Math.round( process.uptime() ),
                uptimeShort: timeAgo.format( Date.now() - process.uptime() * 1000, 'twitter' ),
                uptimeLong: timeAgo.format( Date.now() - process.uptime() * 1000, 'round' ),
                timestamp: Date.now()
            };

            resp.writeHead( statusCheck.code, {
                'Content-Type': 'application/json'
            });

            Log.info( `http`, chalk.yellow( `[requests]` ), chalk.white( `ℹ️` ),
                chalk.blueBright( `<msg>` ), chalk.gray( `Requesting to access restart api` ),
                chalk.blueBright( `<type>` ), chalk.gray( `api/restart` ),
                chalk.blueBright( `<client>` ), chalk.gray( `${ clientIp( req ) }` ),
                chalk.blueBright( `<file>` ), chalk.gray( `${ loadFile }` ),
                chalk.blueBright( `<method>` ), chalk.gray( `${ method }` ) );

            resp.end( JSON.stringify( statusCheck ) );
            return;
        }

        if ( subdomainM3U.some( ( urlKeyword ) => loadFile.startsWith( urlKeyword ) ) && method === 'GET' )
        {
            Log.info( `http`, chalk.yellow( `[requests]` ), chalk.white( `ℹ️` ),
                chalk.blueBright( `<msg>` ), chalk.gray( `Requesting to access m3u playlist` ),
                chalk.blueBright( `<type>` ), chalk.gray( `m3u playlist` ),
                chalk.blueBright( `<client>` ), chalk.gray( `${ clientIp( req ) }` ),
                chalk.blueBright( `<file>` ), chalk.gray( `${ loadFile }` ),
                chalk.blueBright( `<method>` ), chalk.gray( `${ method }` ) );

            await serveM3U( resp, req );
            return;
        }

        if ( subdomainChan.some( ( urlKeyword ) => loadFile.startsWith( urlKeyword ) ) )
        {
            Log.info( `http`, chalk.yellow( `[requests]` ), chalk.white( `ℹ️` ),
                chalk.blueBright( `<msg>` ), chalk.gray( `Requesting to access channel` ),
                chalk.blueBright( `<type>` ), chalk.gray( `channel` ),
                chalk.blueBright( `<client>` ), chalk.gray( `${ clientIp( req ) }` ),
                chalk.blueBright( `<file>` ), chalk.gray( `${ loadFile }` ),
                chalk.blueBright( `<method>` ), chalk.gray( `${ method }` ) );

            await serveM3UPlaylist( req, resp );
            return;
        }

        if ( subdomainKey.some( ( urlKeyword ) => loadFile.startsWith( urlKeyword ) ) && method === 'GET' )
        {
            Log.info( `http`, chalk.yellow( `[requests]` ), chalk.white( `ℹ️` ),
                chalk.blueBright( `<msg>` ), chalk.gray( `Requesting to access key` ),
                chalk.blueBright( `<type>` ), chalk.gray( `key` ),
                chalk.blueBright( `<client>` ), chalk.gray( `${ clientIp( req ) }` ),
                chalk.blueBright( `<file>` ), chalk.gray( `${ loadFile }` ),
                chalk.blueBright( `<method>` ), chalk.gray( `${ method }` ) );

            await serveKey( req, resp );
            return;
        }

        if ( subdomainEPG.some( ( urlKeyword ) => loadFile.startsWith( urlKeyword ) ) && method === 'GET' )
        {
            Log.info( `http`, chalk.yellow( `[requests]` ), chalk.white( `ℹ️` ),
                chalk.blueBright( `<msg>` ), chalk.gray( `Requesting to access epg (uncompressed)` ),
                chalk.blueBright( `<type>` ), chalk.gray( `epg (uncompressed)` ),
                chalk.blueBright( `<client>` ), chalk.gray( `${ clientIp( req ) }` ),
                chalk.blueBright( `<file>` ), chalk.gray( `${ loadFile }` ),
                chalk.blueBright( `<method>` ), chalk.gray( `${ method }` ) );

            await serveXML( resp, req );
            return;
        }

        if ( subdomainGZP.some( ( urlKeyword ) => loadFile.startsWith( urlKeyword ) ) && method === 'GET' )
        {
            Log.info( `http`, chalk.yellow( `[requests]` ), chalk.white( `ℹ️` ),
                chalk.blueBright( `<msg>` ), chalk.gray( `Requesting to access epg gzip (compressed)` ),
                chalk.blueBright( `<type>` ), chalk.gray( `epg (compressed)` ),
                chalk.blueBright( `<client>` ), chalk.gray( `${ clientIp( req ) }` ),
                chalk.blueBright( `<file>` ), chalk.gray( `${ loadFile }` ),
                chalk.blueBright( `<method>` ), chalk.gray( `${ method }` ) );

            await serveGZP( resp, req );
            return;
        }

        /*
            Endpoint > Health Check

            paramQuery          specifies what type of query is triggered
                                    options:
                                        uptime
                                        healthcheck
                                        sync

            paramSilent         specifies if logs should be silenced. useful for docker-compose.yml healthcheck so that console
                                    is not spammed every 30 seconds.
        */

        if ( subdomainHealth.some( ( urlKeyword ) => loadFile.startsWith( urlKeyword ) ) && method === 'GET' )
        {
            const paramSilent = new URL( req.url, `http://${ req.headers.host }` ).searchParams.get( 'silent' );

            // do not show log if query is `uptime`, since uptime runs every 1 second.
            // do not show logs if query has striggered `silent?=true` in url

            if ( Utils.str2bool( paramSilent ) !== true )
            {
                Log.info( `http`, chalk.yellow( `[requests]` ), chalk.white( `ℹ️` ),
                    chalk.blueBright( `<msg>` ), chalk.gray( `Requesting to access health api` ),
                    chalk.blueBright( `<type>` ), chalk.gray( `api/health` ),
                    chalk.blueBright( `<client>` ), chalk.gray( `${ clientIp( req ) }` ),
                    chalk.blueBright( `<file>` ), chalk.gray( `${ loadFile }` ),
                    chalk.blueBright( `<method>` ), chalk.gray( `${ method }` ) );
            }

            await serveHealthCheck( req, resp );
            return;
        }

        /*
            the request wasn't part of any of our pre-defined subdomains; see if the request is to load a html / css / js file
        */

        Log.debug( `http`, chalk.yellow( `[requests]` ), chalk.white( `⚙️` ),
            chalk.blueBright( `<msg>` ), chalk.gray( `Request not captured by subdomain keyword checks; sending request to ejs` ),
            chalk.blueBright( `<client>` ), chalk.gray( `${ clientIp( req ) }` ),
            chalk.blueBright( `<file>` ), chalk.gray( `${ loadFile }` ),
            chalk.blueBright( `<method>` ), chalk.gray( `${ method }` ) );

        /*
            General Template & .html / .css / .js
            read the loaded asset file
        */

        ejs.renderFile( `./${ envWebFolder }/${ loadFile }`,
            {
                fileM3U: envFileM3U,
                sizeM3U: FILE_M3U_SIZE,
                dateM3U: FILE_M3U_MODIFIED,

                fileXML: envFileXML,
                sizeXML: FILE_XML_SIZE,
                dateXML: FILE_XML_MODIFIED,

                fileGZP: envFileGZP,
                sizeGZP: FILE_GZP_SIZE,
                dateGZP: FILE_GZP_MODIFIED,

                healthTimer: envHealthTimer,
                appRelease: envAppRelease,
                appName: name,
                appVersion: version,
                appUrlGithub: repository.url.substr( 0, repository.url.lastIndexOf( '.' ) ),
                appUrlDiscord: discord.url,
                appUrlDocs: docs.url,
                appGitHashShort: envGitSHA1.substring( 0, 9 ),
                appGitHashLong: envGitSHA1,
                appUptimeShort: timeAgo.format( Date.now() - Math.round( process.uptime() ) * 1000, 'twitter' ),
                appUptimeLong: timeAgo.format( Date.now() - process.uptime() * 1000, 'twitter' ),
                appStartup: Math.round( serverStartup ) / 1000,
                serverOs: serverOs
            }, ( err, data ) =>
        {
            if ( !err )
            {
                Log.debug( `http`, chalk.yellow( `[requests]` ), chalk.white( `⚙️` ),
                    chalk.blueBright( `<msg>` ), chalk.gray( `Request accepted by ejs` ),
                    chalk.blueBright( `<client>` ), chalk.gray( `${ clientIp( req ) }` ),
                    chalk.blueBright( `<file>` ), chalk.gray( `${ loadFile }` ),
                    chalk.blueBright( `<method>` ), chalk.gray( `${ method }` ) );

                /*
                    This allows us to serve all files locally: css, js, etc.
                    the file loaded is dependent on what comes to the right of the period.
                */

                const fileExt = loadFile.lastIndexOf( '.' );
                const fileMime = fileExt === -1
                                ? 'text/plain'
                                : {
                                    '.html' : 'text/html',
                                    '.htm' : 'text/html',
                                    '.ico' : 'image/x-icon',
                                    '.jpg' : 'image/jpeg',
                                    '.png' : 'image/png',
                                    '.gif' : 'image/gif',
                                    '.css' : 'text/css',
                                    '.scss' : 'text/x-sass',
                                    '.gz' : 'application/gzip',
                                    '.js' : 'text/javascript',
                                    '.txt' : 'text/plain',
                                    '.xml' : 'application/xml',
                                    '.m3u' : 'text/plain',
                                    '.m3u8' : 'text/plain'
                                    }[loadFile.substring( fileExt )];

                /*
                    ejs is only for templates; if we want to load an binary data (like images); we must use fs.readFile
                */

                if ( fileMime !== 'text/html' )
                    data = fs.readFileSync( `./${ envWebFolder }/${ loadFile }` );

                resp.setHeader( 'Content-type', fileMime );
                resp.end( data );

                if ( fileMime === 'text/html' || fileMime === 'application/xml' || fileMime === 'application/json' )
                {
                    Log.ok( `http`, chalk.yellow( `[requests]` ), chalk.white( `✅` ),
                        chalk.greenBright( `<msg>` ), chalk.gray( `Request to load file` ),
                        chalk.greenBright( `<client>` ), chalk.gray( `${ clientIp( req ) }` ),
                        chalk.greenBright( `<file>` ), chalk.gray( `${ loadFile }` ),
                        chalk.greenBright( `<mime>` ), chalk.gray( `${ fileMime }` ),
                        chalk.greenBright( `<method>` ), chalk.gray( `${ method }` ) );
                }
                else
                {
                    Log.debug( `http`, chalk.yellow( `[requests]` ), chalk.white( `⚙️` ),
                        chalk.blueBright( `<msg>` ), chalk.gray( `Request to load file` ),
                        chalk.blueBright( `<client>` ), chalk.gray( `${ clientIp( req ) }` ),
                        chalk.blueBright( `<file>` ), chalk.gray( `${ loadFile }` ),
                        chalk.blueBright( `<mime>` ), chalk.gray( `${ fileMime }` ),
                        chalk.blueBright( `<method>` ), chalk.gray( `${ method }` ) );
                }
            }
            else
            {
                Log.debug( `http`, chalk.yellow( `[requests]` ), chalk.white( `⚙️` ),
                    chalk.blueBright( `<msg>` ), chalk.gray( `Request rejected by ejs` ),
                    chalk.blueBright( `<client>` ), chalk.gray( `${ clientIp( req ) }` ),
                    chalk.blueBright( `<error>` ), chalk.gray( `${ err }` ),
                    chalk.blueBright( `<file>` ), chalk.gray( `${ loadFile }` ),
                    chalk.blueBright( `<method>` ), chalk.gray( `${ method }` ) );

                /*
                    Main Server › Discovery.json
                */

                if ( loadFile === 'discovery.json' )
                {
                    Log.notice( `http`, chalk.yellowBright( `[notice]` ), chalk.white( `📌` ),
                        chalk.yellowBright( `<msg>` ), chalk.gray( `If you are attempting to load TVApp2 using an HDHomeRun tuner, please switch to the` ), chalk.yellowBright( `M3U Tuner` ) );

                    const tunerInstance = new Tuner();  // <-- use a different name
                    const hdHomeRun =
                    {
                        FriendlyName: tunerInstance.FriendlyName,
                        ModelNumber: tunerInstance.ModelNumber,
                        FirmwareName: tunerInstance.FirmwareName,
                        FirmwareVersion: tunerInstance.FirmwareVersion,
                        DeviceID: tunerInstance.GetDeviceId(),
                        TunerCount: tunerInstance.SlotsMax,
                        BaseURL: `${ envIpContainer }:${ envHdhrPort }`,
                        LineupURL: `${ envIpContainer }:${ envHdhrPort }/lineup.json`,
                        client: clientIp( req ),
                        message: 'Connected to HDHomeRun server',
                        status: 'healthy',
                        code: 200,
                        uptime: Math.round( process.uptime() ),
                        uptimeShort: timeAgo.format( Date.now() - process.uptime() * 1000, 'twitter' ),
                        uptimeLong: timeAgo.format( Date.now() - process.uptime() * 1000, 'round' ),
                        timestamp: Date.now()
                    };

                    resp.writeHead( hdHomeRun.code, {
                        'Content-Type': 'application/json'
                    });

                    resp.end( JSON.stringify( hdHomeRun ) );

                    return; // <- Prevent further code from executing
                }

                const statusCheck =
                {
                    ip: envIpContainer,
                    gateway: envIpGateway,
                    client: clientIp( req ),
                    message: 'Page not found',
                    status: 'healthy',
                    ref: req.url,
                    method: method || 'GET',
                    code: 404,
                    uptime: Math.round( process.uptime() ),
                    uptimeShort: timeAgo.format( Date.now() - process.uptime() * 1000, 'twitter' ),
                    uptimeLong: timeAgo.format( Date.now() - process.uptime() * 1000, 'round' ),
                    timestamp: Date.now()
                };

                resp.writeHead( statusCheck.code, {
                    'Content-Type': 'application/json'
                });

                Log.error( `http`, chalk.redBright( `[requests]` ), chalk.white( `❌` ),
                    chalk.redBright( `<msg>` ), chalk.gray( `${ statusCheck.message }` ),
                    chalk.redBright( `<client>` ), chalk.gray( `${ clientIp( req ) }` ),
                    chalk.redBright( `<code>` ), chalk.gray( `${ statusCheck.code }` ),
                    chalk.redBright( `<error>` ), chalk.gray( `${ err }` ),
                    chalk.redBright( `<file>` ), chalk.gray( `${ loadFile }` ),
                    chalk.redBright( `<method>` ), chalk.gray( `${ method }` ) );

                resp.end( JSON.stringify( statusCheck ) );
            }
        });
    };
    handleRequest().catch( ( err ) =>
    {
        resp.writeHead( 500, {
            'Content-Type': 'text/plain'
        });

        Log.error( `http`, chalk.redBright( `[requests]` ), chalk.white( `❌` ),
            chalk.redBright( `<msg>` ), chalk.gray( `Cannot handle request` ),
            chalk.redBright( `<code>` ), chalk.gray( `500` ),
            chalk.redBright( `<error>` ), chalk.gray( `${ err }` ) );

        resp.end( 'Internal Server Error' );
    });
});

/*
    Server > HDHomeRun

    this server will serve up the HDHomeRun lineup.json for people wishing to
    see the IPTV streams using the HDHomeRun tuner.
*/

const serverHdHomeRun = http.createServer( ( req, resp ) =>
{
    const method = req.method || 'GET';
    let reqUrl = req.url;
    if ( reqUrl === '/' )
        reqUrl = 'hdhomerun.html';

    /*
        Remove leading forward slash
    */

    const loadFile = reqUrl.replace( /^\/+/, '' );

    const handleRequest = async() =>
    {
        /*
            Define the different routes.
            Place the template system last. Getting TVApp data should take priority.

            subdomainM3U        array []
            loadFile            channel?url=https%3A%2F%2Ftvpass.org%2Fchannel%2Fabc-wabc-new-york-ny%2F
        */

        Log.debug( `hdjr`, chalk.yellow( `[requests]` ), chalk.white( `⚙️` ),
            chalk.blueBright( `<msg>` ), chalk.gray( `Request sent to HDHomeRun` ),
            chalk.blueBright( `<client>` ), chalk.gray( `${ clientIp( req ) }` ),
            chalk.blueBright( `<request.url>` ), chalk.gray( `${ req.url }` ),
            chalk.blueBright( `<reqUrl>` ), chalk.gray( `${ reqUrl }` ),
            chalk.blueBright( `<file>` ), chalk.gray( `${ loadFile }` ),
            chalk.blueBright( `<method>` ), chalk.gray( `${ method }` ) );

        if ( subdomainHealth.some( ( urlKeyword ) => loadFile.startsWith( urlKeyword ) ) && method === 'GET' )
        {
            const paramSilent = new URL( req.url, `http://${ req.headers.host }` ).searchParams.get( 'silent' );

            // do not show log if query is `uptime`, since uptime runs every 1 second.
            // do not show logs if query has striggered `silent?=true` in url

            if ( Utils.str2bool( paramSilent ) !== true )
            {
                Log.info( `http`, chalk.yellow( `[requests]` ), chalk.white( `ℹ️` ),
                    chalk.blueBright( `<msg>` ), chalk.gray( `Requesting to access health api` ),
                    chalk.blueBright( `<type>` ), chalk.gray( `api/health` ),
                    chalk.blueBright( `<client>` ), chalk.gray( `${ clientIp( req ) }` ),
                    chalk.blueBright( `<file>` ), chalk.gray( `${ loadFile }` ),
                    chalk.blueBright( `<method>` ), chalk.gray( `${ method }` ) );
            }

            await serveHealthCheck( req, resp );
            return;
        }

        /*
            General Template & .html / .css / .js
            read the loaded asset file
        */

        const tunerInstance = new Tuner();
        ejs.renderFile( `./${ envWebFolder }/${ loadFile }`,
            {
                friendlyName: tunerInstance.FriendlyName,
                modelNumber: tunerInstance.ModelNumber,
                firmwareName: tunerInstance.FirmwareName,
                firmwareVersion: tunerInstance.FirmwareVersion,
                slotsConnected: tunerInstance.SlotsConnected,
                slotsMax: tunerInstance.SlotsMax,
                deviceId: tunerInstance.GetDeviceId( ),
                hdhrIp: `${ envIpContainer }`,
                hdhrPort: `${ envHdhrPort }`,

                healthTimer: envHealthTimer,
                appRelease: envAppRelease,
                appName: name,
                appVersion: version,
                appUrlGithub: repository.url.substr( 0, repository.url.lastIndexOf( '.' ) ),
                appUrlDiscord: discord.url,
                appUrlDocs: docs.url,
                appGitHashShort: envGitSHA1.substring( 0, 9 ),
                appGitHashLong: envGitSHA1,
                appUptimeShort: timeAgo.format( Date.now() - Math.round( process.uptime() ) * 1000, 'twitter' ),
                appUptimeLong: timeAgo.format( Date.now() - process.uptime() * 1000, 'twitter' ),
                appUptimeFull: timeAgo.format( Date.now() - process.uptime() * 1000 ),
                appStartup: Math.round( serverStartup ) / 1000,
                serverOs: serverOs
            }, ( err, data ) =>
        {
            if ( !err )
            {
                Log.debug( `http`, chalk.yellow( `[requests]` ), chalk.white( `⚙️` ),
                    chalk.blueBright( `<msg>` ), chalk.gray( `Request accepted by ejs` ),
                    chalk.blueBright( `<client>` ), chalk.gray( `${ clientIp( req ) }` ),
                    chalk.blueBright( `<file>` ), chalk.gray( `${ loadFile }` ),
                    chalk.blueBright( `<method>` ), chalk.gray( `${ method }` ) );

                /*
                    This allows us to serve all files locally: css, js, etc.
                    the file loaded is dependent on what comes to the right of the period.
                */

                const fileExt = loadFile.lastIndexOf( '.' );
                const fileMime = fileExt === -1
                                ? 'text/plain'
                                : {
                                    '.html' : 'text/html',
                                    '.htm' : 'text/html',
                                    '.ico' : 'image/x-icon',
                                    '.jpg' : 'image/jpeg',
                                    '.png' : 'image/png',
                                    '.gif' : 'image/gif',
                                    '.css' : 'text/css',
                                    '.scss' : 'text/x-sass',
                                    '.gz' : 'application/gzip',
                                    '.js' : 'text/javascript',
                                    '.txt' : 'text/plain',
                                    '.xml' : 'application/xml',
                                    '.json' : 'application/json',
                                    '.m3u' : 'text/plain',
                                    '.m3u8' : 'text/plain'
                                    }[loadFile.substring( fileExt )];

                /*
                    ejs is only for templates; if we want to load an binary data (like images); we must use fs.readFile
                */

                if ( fileMime !== 'text/html' )
                    data = fs.readFileSync( `./${ envWebFolder }/${ loadFile }` );

                resp.setHeader( 'Content-type', fileMime );
                resp.end( data );

                /*
                    silence logs if loading css or js files; otherwise they'll spam console each time you load
                    a page by the client.
                */

                if ( fileMime === 'text/html' || fileMime === 'application/xml' || fileMime === 'application/json' )
                {
                    Log.ok( `http`, chalk.yellow( `[requests]` ), chalk.white( `✅` ),
                        chalk.greenBright( `<msg>` ), chalk.gray( `Request to load file` ),
                        chalk.greenBright( `<client>` ), chalk.gray( `${ clientIp( req ) }` ),
                        chalk.greenBright( `<file>` ), chalk.gray( `${ loadFile }` ),
                        chalk.greenBright( `<mime>` ), chalk.gray( `${ fileMime }` ),
                        chalk.greenBright( `<method>` ), chalk.gray( `${ method }` ) );
                }
                else
                {
                    Log.debug( `http`, chalk.yellow( `[requests]` ), chalk.white( `⚙️` ),
                        chalk.blueBright( `<msg>` ), chalk.gray( `Request to load file` ),
                        chalk.blueBright( `<client>` ), chalk.gray( `${ clientIp( req ) }` ),
                        chalk.blueBright( `<file>` ), chalk.gray( `${ loadFile }` ),
                        chalk.blueBright( `<mime>` ), chalk.gray( `${ fileMime }` ),
                        chalk.blueBright( `<method>` ), chalk.gray( `${ method }` ) );
                }
            }
            else
            {
                Log.debug( `http`, chalk.yellow( `[requests]` ), chalk.white( `⚙️` ),
                    chalk.blueBright( `<msg>` ), chalk.gray( `Request rejected by ejs` ),
                    chalk.blueBright( `<client>` ), chalk.gray( `${ clientIp( req ) }` ),
                    chalk.blueBright( `<error>` ), chalk.gray( `${ err }` ),
                    chalk.blueBright( `<file>` ), chalk.gray( `${ loadFile }` ),
                    chalk.blueBright( `<method>` ), chalk.gray( `${ method }` ) );

                /*
                    HDHomeRun › Discovery.json
                */

                if ( loadFile === 'discovery.json' )
                {
                    Log.notice( `http`, chalk.yellowBright( `[notice]` ), chalk.white( `📌` ),
                        chalk.yellowBright( `<msg>` ), chalk.gray( `If you are attempting to load TVApp2 using an HDHomeRun tuner, please switch to the` ), chalk.yellowBright( `M3U Tuner` ) );

                    const tunerInstance = new Tuner();
                    const hdHomeRun =
                    {
                        FriendlyName: tunerInstance.FriendlyName,
                        ModelNumber: tunerInstance.ModelNumber,
                        FirmwareName: tunerInstance.FirmwareName,
                        FirmwareVersion: tunerInstance.FirmwareVersion,
                        DeviceID: tunerInstance.GetDeviceId(),
                        TunerCount: tunerInstance.SlotsMax,
                        BaseURL: `${ envIpContainer }:${ envHdhrPort }`,
                        LineupURL: `${ envIpContainer }:${ envHdhrPort }/lineup.json`,
                        client: clientIp( req ),
                        message: 'Connected to HDHomeRun server',
                        status: 'healthy',
                        code: 200,
                        uptime: Math.round( process.uptime() ),
                        uptimeShort: timeAgo.format( Date.now() - process.uptime() * 1000, 'twitter' ),
                        uptimeLong: timeAgo.format( Date.now() - process.uptime() * 1000, 'round' ),
                        timestamp: Date.now()
                    };

                    resp.writeHead( hdHomeRun.code, {
                        'Content-Type': 'application/json'
                    });

                    Log.ok( `http`, chalk.yellow( `[requests]` ), chalk.white( `✅` ),
                        chalk.blueBright( `<msg>` ), chalk.gray( `Established connection to HDHomeRun` ),
                        chalk.blueBright( `<client>` ), chalk.gray( `${ clientIp( req ) }` ),
                        chalk.blueBright( `<friendlyName>` ), chalk.gray( `${ hdHomeRun.FriendlyName }` ),
                        chalk.blueBright( `<modelNumber>` ), chalk.gray( `${ hdHomeRun.ModelNumber }` ),
                        chalk.blueBright( `<deviceID>` ), chalk.gray( `${ hdHomeRun.DeviceID }` ),
                        chalk.blueBright( `<tunerCount>` ), chalk.gray( `${ hdHomeRun.TunerCount }` ),
                        chalk.blueBright( `<urlBase>` ), chalk.whiteBright.bgBlack( ` ${ hdHomeRun.BaseURL } ` ),
                        chalk.blueBright( `<urlLineup>` ), chalk.whiteBright.bgBlack( ` ${ hdHomeRun.LineupURL } ` ) );

                    resp.end( JSON.stringify( hdHomeRun ) );
                    return;
                }

                /*
                    HDHomeRun › Lineup.json
                */

                if ( loadFile === 'lineup.json' )
                {
                    const tunerInstance = new Tuner();
                    const hdHomeRun =
                    {
                        FriendlyName: tunerInstance.FriendlyName,
                        ModelNumber: tunerInstance.ModelNumber,
                        FirmwareName: tunerInstance.FirmwareName,
                        FirmwareVersion: tunerInstance.FirmwareVersion,
                        DeviceID: tunerInstance.GetDeviceId(),
                        TunerCount: tunerInstance.SlotsMax,
                        BaseURL: `${ envIpContainer }:${ envHdhrPort }`,
                        LineupURL: `${ envIpContainer }:${ envHdhrPort }/lineup.json`,
                        client: clientIp( req ),
                        status: 'healthy',
                        code: 200,
                        uptime: Math.round( process.uptime() ),
                        uptimeShort: timeAgo.format( Date.now() - process.uptime() * 1000, 'twitter' ),
                        uptimeLong: timeAgo.format( Date.now() - process.uptime() * 1000, 'round' ),
                        timestamp: Date.now(),
                        channels: `[]`
                    };

                    resp.writeHead( hdHomeRun.code, {
                        'Content-Type': 'application/json'
                    });

                    Log.ok( `http`, chalk.yellow( `[requests]` ), chalk.white( `✅` ),
                        chalk.blueBright( `<msg>` ), chalk.gray( `Lineup requested` ),
                        chalk.blueBright( `<client>` ), chalk.gray( `${ clientIp( req ) }` ),
                        chalk.blueBright( `<friendlyName>` ), chalk.gray( `${ hdHomeRun.FriendlyName }` ),
                        chalk.blueBright( `<modelNumber>` ), chalk.gray( `${ hdHomeRun.ModelNumber }` ),
                        chalk.blueBright( `<deviceID>` ), chalk.gray( `${ hdHomeRun.DeviceID }` ),
                        chalk.blueBright( `<tunerCount>` ), chalk.gray( `${ hdHomeRun.TunerCount }` ),
                        chalk.blueBright( `<urlBase>` ), chalk.whiteBright.bgBlack( ` ${ hdHomeRun.BaseURL } ` ),
                        chalk.blueBright( `<urlLineup>` ), chalk.whiteBright.bgBlack( ` ${ hdHomeRun.LineupURL } ` ) );

                    resp.end( JSON.stringify( hdHomeRun ) );
                    return;
                }

                const statusCheck =
                {
                    ip: envIpContainer,
                    gateway: envIpGateway,
                    client: clientIp( req ),
                    message: 'Page not found',
                    status: 'healthy',
                    ref: req.url,
                    method: method || 'GET',
                    code: 404,
                    uptime: Math.round( process.uptime() ),
                    uptimeShort: timeAgo.format( Date.now() - process.uptime() * 1000, 'twitter' ),
                    uptimeLong: timeAgo.format( Date.now() - process.uptime() * 1000, 'round' ),
                    timestamp: Date.now()
                };

                resp.writeHead( statusCheck.code, {
                    'Content-Type': 'application/json'
                });

                Log.error( `http`, chalk.redBright( `[requests]` ), chalk.white( `❌` ),
                    chalk.redBright( `<msg>` ), chalk.gray( `${ statusCheck.message }` ),
                    chalk.redBright( `<client>` ), chalk.gray( `${ clientIp( req ) }` ),
                    chalk.redBright( `<code>` ), chalk.gray( `${ statusCheck.code }` ),
                    chalk.redBright( `<error>` ), chalk.gray( `${ err }` ),
                    chalk.redBright( `<file>` ), chalk.gray( `${ loadFile }` ),
                    chalk.redBright( `<method>` ), chalk.gray( `${ method }` ) );

                resp.end( JSON.stringify( statusCheck ) );
            }
        });
    };
    handleRequest().catch( ( err ) =>
    {
        resp.writeHead( 500, {
            'Content-Type': 'text/plain'
        });

        Log.error( `http`, chalk.redBright( `[requests]` ), chalk.white( `❌` ),
            chalk.redBright( `<msg>` ), chalk.gray( `Cannot handle request` ),
            chalk.redBright( `<code>` ), chalk.gray( `500` ),
            chalk.redBright( `<error>` ), chalk.gray( `${ err }` ) );

        resp.end( 'Internal Server Error' );
    });
});

/*
    Initialize Webserver
*/

( async() =>
{
    /*
        check if api key has been provided as env var
    */

    if ( !envApiKey )
        Log.warn( `/api`, chalk.yellow( `[callback]` ), chalk.white( `⚠️` ),
            chalk.yellowBright( `<msg>` ), chalk.gray( `API_KEY environment variable not defined for api, leaving blank` ) );
    else
        Log.ok( `/api`, chalk.yellow( `[callback]` ), chalk.white( `✅` ),
            chalk.greenBright( `<msg>` ), chalk.gray( `API_KEY environment variable successfully assigned` ) );

    /*
        initialize
    */

    await new Storage( envWebFolder, FILE_CFG ).Initialize();
    await new Tuner( Storage.Get( 'deviceId' ) ).Initialize();
    await initialize();

    /*
        check service status that we depend on
    */

    hosts.forEach( ( host ) => hostCheck( host.name, host.url ) );

    /*
        start web server
    */

    server.listen( envWebPort, envWebIP, () =>
    {
        Log.ok( `core`, chalk.yellow( `[initiate]` ), chalk.white( `✅` ),
            chalk.blueBright( `<msg>` ), chalk.gray( `Server is now running on` ),
            chalk.blueBright( `<ipPublic>` ), chalk.whiteBright.bgBlack( ` ${ envWebIP }:${ envWebPort } ` ),
            chalk.blueBright( `<ipDocker>` ), chalk.whiteBright.bgBlack( ` ${ envIpContainer }:${ envWebPort } ` ) );

        Log.info( `core`, chalk.yellow( `[initiate]` ), chalk.white( `ℹ️` ),
            chalk.blueBright( `<msg>` ), chalk.gray( `Running TVApp2 version` ),
            chalk.blueBright( `<version>` ), chalk.gray( ` ${ version } ` ),
            chalk.blueBright( `<release>` ), chalk.gray( ` ${ envAppRelease } ` ) );
    });

    serverHdHomeRun.listen( `${ envHdhrPort }`, envWebIP, () =>
    {
        Log.ok( `core`, chalk.yellow( `[initiate]` ), chalk.white( `✅` ),
            chalk.blueBright( `<msg>` ), chalk.gray( `Starting HDHomeRun server on` ),
            chalk.blueBright( `<ipPublic>` ), chalk.whiteBright.bgBlack( ` ${ envWebIP }:${ envHdhrPort } ` ),
            chalk.blueBright( `<ipDocker>` ), chalk.whiteBright.bgBlack( ` ${ envIpContainer }:${ envHdhrPort } ` ) );
    });
})();

/*
    Crons > Next Sync
*/

cron.schedule( envTaskCronSync, async() =>
{
    Log.ok( `task`, chalk.yellow( `[resync]` ), chalk.white( `✅` ),
        chalk.blueBright( `<msg>` ), chalk.gray( `Ran cron / task to re-sync IPTV data` ),
        chalk.blueBright( `<schedule>` ), chalk.whiteBright.bgBlack( ` ${ envTaskCronSync } ` ) );

    await initialize();
});

/*
    Crons > Announce Next Sync
    should show every 30 minutes
*/

cron.schedule( '*/30 * * * *', async() =>
{
    const validation = crons.validateCronExpression( envTaskCronSync );
    if ( !validation.valid )
    {
        Log.error( `core`, chalk.yellow( `[schedule]` ), chalk.white( `❌` ),
            chalk.redBright( `<msg>` ), chalk.gray( `Specified cron schedule is not valid. Re-write the cron so that it is properly formatted` ),
            chalk.redBright( `<env>` ), chalk.gray( `TASK_CRON_SYNC` ),
            chalk.redBright( `<schedule>` ), chalk.whiteBright.bgBlack( ` ${ envTaskCronSync } ` ) );
    }
    else
    {
        const cronNextRunDt = new Date( crons.sendAt( envTaskCronSync ) );
        const cronNextRun = moment( cronNextRunDt ).format( 'MM-DD-YYYY h:mm A' );

        Log.info( `core`, chalk.yellow( `[schedule]` ), chalk.white( `ℹ️` ),
            chalk.blueBright( `<msg>` ), chalk.gray( `Next IPTV data refresh at` ),
            chalk.blueBright( `<schedule>` ), chalk.whiteBright.gray( ` ${ envTaskCronSync } ` ),
            chalk.blueBright( `<nextrun>` ), chalk.whiteBright.gray( ` ${ cronNextRun } ` ),
            chalk.blueBright( `<nextrunIso>` ), chalk.whiteBright.gray( ` ${ cronNextRunDt } ` ) );
    }
});
