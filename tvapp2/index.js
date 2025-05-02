#!/usr/bin/env node

/*
    Import Packages
*/

import fs from 'fs';
import path from 'path';
import http from 'http';
import https from 'https';
import zlib from 'zlib';
import chalk from 'chalk';
import ejs from 'ejs';
import moment from 'moment';

/*
    Old CJS variables converted to ESM
*/

import { fileURLToPath } from 'url';
const cache = new Map();

/*
    Import package.json values
*/

const { name, author, version, repository, discord, docs } = JSON.parse( fs.readFileSync( './package.json' ) );
const __filename = fileURLToPath( import.meta.url ); // get resolved path to file
const __dirname = path.dirname( __filename ); // get name of directory

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
    Define > General

    @note       if you change `FOLDER_WWW`; ensure you re-name the folder where the
                website assets are stored.
*/

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
const FOLDER_WWW = 'www';

/*
    Define > Environment Variables || Defaults
*/

const envAppRelease = process.env.RELEASE || 'stable';
const envUrlRepo = process.env.URL_REPO || 'https://git.binaryninja.net/binaryninja';
const envStreamQuality = process.env.STREAM_QUALITY || 'hd';
const envFileURL = process.env.FILE_URL || 'urls.txt';
const envFileM3U = process.env.FILE_M3U || 'playlist.m3u8';
const envFileXML = process.env.FILE_EPG || 'xmltv.xml';
const envFileGZP = process.env.FILE_GZP || 'xmltv.xml.gz';
const envApiKey = process.env.API_KEY || null;
const envWebIP = process.env.WEB_IP || '0.0.0.0';
const envWebPort = process.env.WEB_PORT || `4124`;
const envWebEncoding = process.env.WEB_ENCODING || 'deflate, br';
const envProxyHeader = process.env.WEB_PROXY_HEADER || 'x-forwarded-for';
const envHealthTimer = process.env.HEALTH_TIMER || 600000;
const LOG_LEVEL = process.env.LOG_LEVEL || 10;

/*
    Define > Externals
*/

const extURL = `${ envUrlRepo }/tvapp2-externals/raw/branch/main/urls.txt`;
const extXML = `${ envUrlRepo }/XMLTV-EPG/raw/branch/main/xmltv.1.xml`;
const extM3U = `${ envUrlRepo }/tvapp2-externals/raw/branch/main/formatted.dat`;

/*
    Define > Defaults
*/

let urls = [];
const gCookies = {};
const USERAGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

/*
    Web url shortcuts

    using any of the following subdomains / subpaths will trigger the download for that specific file

    @example    http://127.0.0.1:4124/gzip
                http://127.0.0.1:4124/gz
                http://127.0.0.1:4124/playlist
                http://127.0.0.1:4124/key
                http://127.0.0.1:4124/channel
                http://127.0.0.1:4124/health
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
            chalk.white(`→`),
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

class Log
{
    static now()
    {
        const now = new Date();
        return chalk.gray( `[${ now.toLocaleTimeString() }]` );
    }

    static trace( ...msg )
    {
        if ( LOG_LEVEL >= 6 )
            console.trace( chalk.white.bgMagenta.bold( ` ${ name } ` ), chalk.white( `→` ), this.now(), chalk.magentaBright( msg.join( ' ' ) ) );
    }

    static debug( ...msg )
    {
        if ( LOG_LEVEL >= 5 )
            console.debug( chalk.white.bgGray.bold( ` ${ name } ` ), chalk.white( `→` ), this.now(), chalk.gray( msg.join( ' ' ) ) );
    }

    static info( ...msg )
    {
        if ( LOG_LEVEL >= 4 )
            console.info( chalk.white.bgBlueBright.bold( ` ${ name } ` ), chalk.white( `→` ), this.now(), chalk.blueBright( msg.join( ' ' ) ) );
    }

    static ok( ...msg )
    {
        if ( LOG_LEVEL >= 4 )
            console.log( chalk.white.bgGreen.bold( ` ${ name } ` ), chalk.white( `→` ), this.now(), chalk.greenBright( msg.join( ' ' ) ) );
    }

    static notice( ...msg )
    {
        if ( LOG_LEVEL >= 3 )
            console.log( chalk.white.bgYellow.bold( ` ${ name } ` ), chalk.white( `→` ), this.now(), chalk.yellowBright( msg.join( ' ' ) ) );
    }

    static warn( ...msg )
    {
        if ( LOG_LEVEL >= 2 )
            console.warn( chalk.white.bgYellow.bold( ` ${ name } ` ), chalk.white( `→` ), this.now(), chalk.yellowBright( msg.join( ' ' ) ) );
    }

    static error( ...msg )
    {
        if ( LOG_LEVEL >= 1 )
            console.error( chalk.white.bgRedBright.bold( ` ${ name } ` ), chalk.white( `→` ), this.now(), chalk.redBright( msg.join( ' ' ) ) );
    }
}

/*
    Process
*/

if ( process.pkg )
{
    Log.info( `core`, chalk.yellow( `[init]` ), chalk.white( `→` ), chalk.blueBright( `<message>` ), chalk.gray( `Starting server utilizing process.execPath` ) );
    const basePath = path.dirname( process.execPath );

    FILE_URL = path.join( basePath, FOLDER_WWW, `${ envFileURL }` );
    FILE_M3U = path.join( basePath, FOLDER_WWW, `${ envFileM3U }` );
    FILE_XML = path.join( basePath, FOLDER_WWW, `${ envFileXML }` );
    FILE_XML.length;
    FILE_GZP = path.join( basePath, FOLDER_WWW, `${ envFileGZP }` );
}
else
{
    Log.info( `core`, chalk.yellow( `[init]` ), chalk.white( `→` ), chalk.blueBright( `<message>` ), chalk.gray( `Starting server utilizing processed locals` ) );

    FILE_URL = path.resolve( __dirname, FOLDER_WWW, `${ envFileURL }` );
    FILE_M3U = path.resolve( __dirname, FOLDER_WWW, `${ envFileM3U }` );
    FILE_XML = path.resolve( __dirname, FOLDER_WWW, `${ envFileXML }` );
    FILE_GZP = path.resolve( __dirname, FOLDER_WWW, `${ envFileGZP }` );
}

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
    Semaphore > Declare

    allows multiple threads to work with the same shared resources
*/

class Semaphore
{
    constructor( max )
    {
        this.max = max;
        this.queue = [];
        this.active = 0;
    }
    async acquire()
    {
        if ( this.active < this.max )
        {
            this.active++;
            return;
        }
        return new Promise( ( resolve ) => this.queue.push( resolve ) );
    }
    release()
    {
        this.active--;
        if ( this.queue.length > 0 )
        {
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

const semaphore = new Semaphore( 5 );

/*
    Func > Download File

    @arg        str url                         https://git.binaryninja.net/binaryninja/tvapp2-externals/raw/branch/main/urls.txt
    @arg        str filePath                    H:\Repos\github\BinaryNinja\tvapp2\tvapp2\urls.txt
    @ret        Promise<>
*/

async function downloadFile( url, filePath )
{
    Log.info( `netw`, chalk.yellow( `[start]` ), chalk.white( `→` ), chalk.blueBright( `<message>` ), chalk.gray( `Downloading external file` ), chalk.blueBright( `<source>` ), chalk.gray( `${ url }` ), chalk.blueBright( `<destination>` ), chalk.gray( `${ filePath }` ) );

    return new Promise( ( resolve, reject ) =>
    {
        const isHttps = new URL( url ).protocol === 'https:';
        const httpModule = isHttps ? https : http;
        const file = fs.createWriteStream( filePath );
        httpModule
            .get( url, ( response ) =>
            {
                if ( response.statusCode !== 200 )
                {
                    Log.error( `netw`, chalk.yellow( `[error]` ), chalk.white( `→` ), chalk.blueBright( `<message>` ), chalk.gray( `Failed to download source file` ), chalk.blueBright( `<source>` ), chalk.gray( `${ url }` ), chalk.blueBright( `<destination>` ), chalk.gray( `${ filePath }` ), chalk.blueBright( `<statusCode>` ), chalk.gray( `${ response.statusCode }` ) );
                    return reject( new Error( `Failed to download file: ${ url }. Status code: ${ response.statusCode }` ) );
                }
                response.pipe( file );
                file.on( 'finish', () =>
                {
                    Log.ok( `netw`, chalk.yellow( `[finish]` ), chalk.white( `→` ), chalk.blueBright( `<message>` ), chalk.gray( `Successfully downloaded and wrote new file` ), chalk.blueBright( `<source>` ), chalk.gray( `${ url }` ), chalk.blueBright( `<destination>` ), chalk.gray( `${ filePath }` ) );
                    file.close( () => resolve( true ) );
                });
            })
            .on( 'error', ( err ) =>
            {
                Log.error( `netw`, chalk.yellow( `[error]` ), chalk.white( `→` ), chalk.blueBright( `<message>` ), chalk.gray( `Failed to download source file` ), chalk.blueBright( `<error>` ), chalk.gray( `${ err.message }`, chalk.blueBright( `<source>` ), chalk.gray( `${ url }` ), chalk.blueBright( `<destination>` ), chalk.gray( `${ filePath }` ) ) );
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

    @arg        str filename                    filename to get size in bytes for
    @arg        bool si                         divides the bytes of a file by 1000 instead of 2024
    @arg        int decimal                     specifies the decimal point
    @ret        str                             111.9 KB

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
        await downloadFile( url, filePath );
    }
    catch ( err )
    {
        if ( fs.existsSync( filePath ) )
        {
            Log.warn( `netw`, chalk.yellow( `[get]` ), chalk.white( `→` ), chalk.blueBright( `<message>` ), chalk.gray( `Download failed - Using existing local file ${ filePath }` ), chalk.blueBright( `<source>` ), chalk.gray( `${ url }` ), chalk.blueBright( `<destination>` ), chalk.gray( `${ filePath }` ) );
        }
        else
        {
            Log.error( `netw`, chalk.yellow( `[error]` ), chalk.white( `→` ), chalk.blueBright( `<message>` ), chalk.gray( `Download filed and no local backup exists, aborting` ), chalk.blueBright( `<error>` ), chalk.redBright( `${ err.message }` ), chalk.blueBright( `<source>` ), chalk.gray( `${ url }` ), chalk.blueBright( `<destination>` ), chalk.gray( `${ filePath }` ) );
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
    Log.info( `gzip`, chalk.yellow( `[create]` ), chalk.white( `→` ), chalk.blueBright( `<message>` ), chalk.gray( `Preparing to create compressed XML gz file` ), chalk.blueBright( `<source>` ), chalk.gray( `${ envFileXML }` ), chalk.blueBright( `<destination>` ), chalk.gray( `${ envFileGZP }` ) );
    return new Promise( ( resolve, reject ) =>
    {
        Log.debug( `gzip`, chalk.yellow( `[create]` ), chalk.white( `→` ), chalk.blueBright( `<message>` ), chalk.gray( `Promise to create compressed gz started` ), chalk.blueBright( `<source>` ), chalk.gray( `${ envFileXML }` ), chalk.blueBright( `<destination>` ), chalk.gray( `${ envFileGZP }` ) );
        fs.readFile( FILE_XML, ( err, buf ) =>
        {
            Log.debug( `gzip`, chalk.yellow( `[create]` ), chalk.white( `→` ), chalk.blueBright( `<message>` ), chalk.gray( `Reading source XML file` ), chalk.blueBright( `<source>` ), chalk.gray( `${ envFileXML }` ), chalk.blueBright( `<destination>` ), chalk.gray( `${ envFileGZP }` ) );
            if ( err )
            {
                Log.error( `gzip`, chalk.yellow( `[create]` ), chalk.white( `→` ), chalk.blueBright( `<message>` ), chalk.gray( `Could not read source XML file` ), chalk.blueBright( `<error>` ), chalk.redBright( `${ err }` ), chalk.blueBright( `<source>` ), chalk.gray( `${ envFileXML }` ), chalk.blueBright( `<destination>` ), chalk.gray( `${ envFileGZP }` ) );
                return reject( new Error( `Could not read file ${ envFileXML }. Error: ${ err }` ) );
            }

            zlib.gzip( buf, ( err, buf ) =>
            {
                Log.debug( `gzip`, chalk.yellow( `[create]` ), chalk.white( `→` ), chalk.blueBright( `<message>` ), chalk.gray( `Starting zlib.gzip` ), chalk.blueBright( `<source>` ), chalk.gray( `${ envFileXML }` ), chalk.blueBright( `<destination>` ), chalk.gray( `${ envFileGZP }` ) );
                if ( err )
                {
                    Log.error( `gzip`, chalk.yellow( `[create]` ), chalk.white( `→` ), chalk.blueBright( `<message>` ), chalk.gray( `Could not create gz archive` ), chalk.blueBright( `<error>` ), chalk.redBright( `${ err }` ), chalk.blueBright( `<source>` ), chalk.gray( `${ envFileXML }` ), chalk.blueBright( `<destination>` ), chalk.gray( `${ envFileGZP }` ) );
                    return reject( new Error( `Could not create ${ envFileGZP }. Error: ${ err }` ) );
                }

                Log.info( `gzip`, chalk.yellow( `[create]` ), chalk.white( `→` ), chalk.blueBright( `<message>` ), chalk.gray( `Started creating gz archive from XML source` ), chalk.blueBright( `<source>` ), chalk.gray( `${ envFileXML }` ), chalk.blueBright( `<destination>` ), chalk.gray( `${ envFileGZP }` ) );
                fs.writeFile( `${ FILE_GZP }`, buf, ( err ) =>
                {
                    if ( err )
                    {
                        Log.error( `gzip`, chalk.yellow( `[create]` ), chalk.white( `→` ), chalk.blueBright( `<message>` ), chalk.gray( `Could not write to and create gz archive` ), chalk.blueBright( `<error>` ), chalk.redBright( `${ err }` ), chalk.blueBright( `<source>` ), chalk.gray( `${ envFileXML }` ), chalk.blueBright( `<destination>` ), chalk.gray( `${ envFileGZP }` ) );
                        return reject( new Error( `Could not write XML file ${ envFileXML } to ${ envFileGZP }. Error: ${ err }` ) );
                    }

                    Log.ok( `gzip`, chalk.yellow( `[create]` ), chalk.white( `→` ), chalk.blueBright( `<message>` ), chalk.gray( `Successfully created compressed gz archive from XML source file` ), chalk.blueBright( `<source>` ), chalk.gray( `${ envFileXML }` ), chalk.blueBright( `<destination>` ), chalk.gray( `${ envFileGZP }` ) );
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
        await createGzip( );
    }
    catch ( err )
    {
        if ( fs.existsSync( FILE_XML ) )
        {
            Log.warn( `gzip`, chalk.yellow( `[compress]` ), chalk.white( `→` ), chalk.blueBright( `<message>` ), chalk.yellowBright( `Source xml file found, but gzip failed generate a compressed .gz fileL` ), chalk.blueBright( `<source>` ), chalk.gray( `${ FILE_XML }` ) );
        }
        else
        {
            Log.error( `gzip`, chalk.yellow( `[error]` ), chalk.white( `→` ), chalk.blueBright( `<message>` ), chalk.redBright( `Source XML file not found; cannot create compressed gzip` ), chalk.blueBright( `<error>` ), chalk.redBright( `${ err.message }` ), chalk.blueBright( `<source>` ), chalk.gray( `${ FILE_XML }` ) );
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

async function fetchRemote( url )
{
    return new Promise( ( resolve, reject ) =>
    {
        const mod = url.startsWith( 'https' ) ? https : http;
        mod
            .get( url, {
                headers: {
                    'Accept-Encoding': envWebEncoding
                }
            }, ( resp ) =>
            {
                if ( resp.statusCode !== 200 )
                {
                    Log.error( `core`, chalk.yellow( `[fetch]` ), chalk.white( `→` ), chalk.blueBright( `<message>` ), chalk.redBright( `Server returned status code other than 200` ), chalk.blueBright( `<statusCode>` ), chalk.redBright( `${ resp.statusCode }` ), chalk.blueBright( `<url>` ), chalk.gray( `${ url }` ) );
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
                            if ( err ) return reject( err );
                            resolve( decoded );
                        });
                    }
                    else if ( encoding === 'deflate' )
                    {
                        zlib.inflate( buffer, ( err, decoded ) =>
                        {
                            if ( err ) return reject( err );
                            resolve( decoded );
                        });
                    }
                    else if ( encoding === 'br' )
                    {
                        zlib.brotliDecompress( buffer, ( err, decoded ) =>
                        {
                            if ( err ) return reject( err );
                            resolve( decoded );
                        });
                    }
                    else
                    {
                        resolve( buffer );
                    }
                });
            })
            .on( 'error', reject );
    });
}

async function serveKey( req, res )
{
    try
    {
        const uriParam = new URL( req.url, `http://${ req.headers.host }` ).searchParams.get( 'uri' );
        if ( !uriParam )
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
                timestamp: Date.now()
            };

            res.writeHead( statusCheck.code, {
                'Content-Type': 'application/json'
            });

            Log.error( `key`, chalk.yellow( `[error]` ), chalk.white( `→` ), chalk.blueBright( `<message>` ), chalk.redBright( `${ statusCheck.message }` ), chalk.blueBright( `<url>` ), chalk.gray( `${ req.url }` ), chalk.blueBright( `<statusCode>` ), chalk.gray( `${ statusCheck.code }` ) );

            return res.end( JSON.stringify( statusCheck ) );
        }

        const keyData = await fetchRemote( uriParam );
        res.writeHead( 200, {
            'Content-Type': 'application/octet-stream'
        });

        res.end( keyData );
    }
    catch ( err )
    {
        const statusCheck =
        {
            ip: envIpContainer,
            gateway: envIpGateway,
            client: clientIp( req ),
            message: `Failed to serve key`,
            error: `${ err.message }`,
            status: 'unhealthy',
            ref: req.url,
            method: req.method || 'GET',
            code: 500,
            uptime: Math.round( process.uptime() ),
            timestamp: Date.now()
        };

        res.writeHead( statusCheck.code, {
            'Content-Type': 'application/json'
        });

        Log.error( `key`, chalk.yellow( `[error]` ), chalk.white( `→` ), chalk.blueBright( `<message>` ), chalk.redBright( `${ statusCheck.message }` ), chalk.blueBright( `<error>` ), chalk.redBright( `${ statusCheck.error }` ), chalk.blueBright( `<url>` ), chalk.gray( `${ req.url }` ), chalk.blueBright( `<statusCode>` ), chalk.gray( `${ statusCheck.code }` ) );

        res.end( JSON.stringify( statusCheck ) );
    }
}

function parseSetCookieHeaders( setCookieValues )
{
    if ( !Array.isArray( setCookieValues ) ) return;
    setCookieValues.forEach( ( line ) =>
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

function buildCookieHeader()
{
    const pairs = [];
    for ( const [ k, v ] of Object.entries( gCookies ) )
    {
        pairs.push( `${ k }=${ v }` );
    }
    return pairs.join( '; ' );
}

function fetchPage( url )
{
    return new Promise( ( resolve, reject ) =>
    {
        const opts = {
            method: 'GET',
            headers: {
                'User-Agent': USERAGENT,
                Accept: '*/*',
                Cookie: buildCookieHeader()
            }
        };
        https
            .get( url, opts, ( res ) =>
            {
                if ( res.statusCode !== 200 )
                {
                    return reject( new Error( `Non-200 status ${ res.statusCode } => ${ url }` ) );
                }

                if ( res.headers['set-cookie'])
                {
                    parseSetCookieHeaders( res.headers['set-cookie']);
                }

                let data = '';
                res.on( 'data', ( chunk ) => ( data += chunk ) );
                res.on( 'end', () => resolve( data ) );
            })
            .on( 'error', reject );
    });
}

async function getTokenizedUrl( channelUrl )
{
    try
    {
        const html = await fetchPage( channelUrl );

        let streamName;
        let streamHost;

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
                Log.error( `playlist`, chalk.yellow( `[error]` ), chalk.white( `→` ), chalk.blueBright( `<message>` ), chalk.redBright( `Cannot find "stream_name` ), chalk.blueBright( `<url>` ), chalk.grey( `${ channelUrl }` ) );
                return null;
            }
            streamName = streamNameMatch[1];
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
        const tokenResponse = await fetchPage( tokenUrl );
        let finalUrl;

        Log.debug( `playlist`, chalk.yellow( `[tokenize]` ), chalk.white( `→` ), chalk.blueBright( `<message>` ), chalk.gray( `Generating tokenized final stream URL` ), chalk.blueBright( `<streamName>` ), chalk.gray( `${ streamName }` ), chalk.blueBright( `<quality>` ), chalk.gray( `${ envStreamQuality }` ), chalk.blueBright( `<host>` ), chalk.gray( `${ streamHost }` ) );
            chalk.blueBright( `<streamQuality>` ), chalk.gray( `${ envStreamQuality.toLowerCase() }` ),

        try
        {
            const json = JSON.parse( tokenResponse );
            finalUrl = json.url;
                chalk.blueBright( `<streamQuality>` ), chalk.gray( `${ envStreamQuality.toLowerCase() }` ),
        }
        catch ( err )
        {
            Log.error( `playlist`, chalk.yellow( `[error]` ), chalk.white( `→` ), chalk.blueBright( `<message>` ), chalk.redBright( `Failed to parse token JSON for channel` ), chalk.blueBright( `<error>` ), chalk.redBright( `${ err.message }` ), chalk.blueBright( `<url>` ), chalk.gray( `${ channelUrl }` ) );
                chalk.redBright( `<streamQuality>` ), chalk.gray( `${ envStreamQuality.toLowerCase() }` ),
            return null;
        }

        if ( !finalUrl )
        {
            Log.error( `playlist`, chalk.yellow( `[error]` ), chalk.white( `→` ), chalk.blueBright( `<message>` ), chalk.redBright( `No URL found in token JSON for channel` ), chalk.blueBright( `<url>` ), chalk.gray( `${ channelUrl }` ) );
                chalk.redBright( `<streamQuality>` ), chalk.gray( `${ envStreamQuality.toLowerCase() }` ),
            return null;
        }

        Log.debug( `playlist`, chalk.yellow( `[tokenize]` ), chalk.white( `→` ), chalk.blueBright( `<message>` ), chalk.gray( `Completed generated tokenized final stream URL` ), chalk.blueBright( `<streamName>` ), chalk.gray( `${ streamName }` ), chalk.blueBright( `<quality>` ), chalk.gray( `${ envStreamQuality }` ), chalk.blueBright( `<host>` ), chalk.gray( `${ streamHost }` ), chalk.blueBright( `<url>` ), chalk.gray( `${ finalUrl }` ) );
            chalk.blueBright( `<quality>` ), chalk.gray( `${ envStreamQuality.toLowerCase() }` ),
        return finalUrl;
    }
    catch ( err )
    {
        Log.error( `playlist`, chalk.yellow( `[error]` ), chalk.white( `→` ), chalk.blueBright( `<message>` ), chalk.redBright( `Fatal error fetching token` ), chalk.blueBright( `<error>` ), chalk.redBright( `${ err.message }` ), chalk.blueBright( `<url>` ), chalk.grey( `${ channelUrl }` ) );
        chalk.redBright( `<streamQuality>` ), chalk.gray( `${ envStreamQuality.toLowerCase() }` ),
        return null;
    }
}

async function serveM3UPlaylist( req, res )
{
    await semaphore.acquire();
    try
    {
        const urlParam = new URL( req.url, `http://${ req.headers.host }` ).searchParams.get( 'url' );
        if ( !urlParam )
        {
            const statusCheck =
            {
                ip: envIpContainer,
                gateway: envIpGateway,
                client: clientIp( req ),
                message: `Missing ?url= parameter`,
                status: `unhealthy`,
                ref: req.url,
                method: req.method || 'GET',
                code: 404,
                uptime: Math.round( process.uptime() ),
                timestamp: Date.now()
            };

            res.writeHead( statusCheck.code, {
                'Content-Type': 'application/json'
            });

            Log.error( `channel`, chalk.yellow( `[error]` ), chalk.white( `→` ), chalk.blueBright( `<message>` ), chalk.redBright( `${ statusCheck.message }` ), chalk.blueBright( `<expected>` ), chalk.grey( `http://${ req.headers.host }/channel?url=XXXX` ), chalk.blueBright( `<statusCode>` ), chalk.gray( `${ statusCheck.code }` ) );

            res.end( JSON.stringify( statusCheck ) );
            return;
        }

        const decodedUrl = decodeURIComponent( urlParam );
        if ( decodedUrl.endsWith( '.ts' ) )
        {
            res.writeHead( 302, {
                Location: decodedUrl
            });
            res.end();
            return;
        }

        const cachedUrl = getCache( decodedUrl );
        if ( cachedUrl )
        {
            const rewrittenPlaylist = await rewriteM3U( cachedUrl, req );
            res.writeHead( 200,
            {
                'Content-Type': 'application/vnd.apple.mpegurl',
                'Content-Disposition': 'inline; filename="' + envFileM3U
            });

            Log.debug( `playlist`, chalk.yellow( `[fetch]` ), chalk.white( `→` ), chalk.blueBright( `<message>` ), chalk.redBright( `retrieving cached playlist` ), chalk.blueBright( `<cachedUrl>` ), chalk.gray( `${ cachedUrl }` ), chalk.blueBright( `<stream>` ), chalk.gray( `${ urlParam }` ), chalk.blueBright( `<statusCode>` ), chalk.gray( `200` ) );

            res.end( rewrittenPlaylist );
            return;
        }

        Log.info( `playlist`, chalk.yellow( `[fetch]` ), chalk.white( `→` ), chalk.blueBright( `<stream>` ), chalk.gray( `${ urlParam }` ) );

        const finalUrl = await getTokenizedUrl( decodedUrl );
        if ( !finalUrl )
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
                timestamp: Date.now()
            };

            res.writeHead( statusCheck.code, {
                'Content-Type': 'application/json'
            });

            Log.error( `playlist`, chalk.yellow( `[error]` ), chalk.white( `→` ), chalk.blueBright( `<message>` ), chalk.redBright( `${ statusCheck.message }` ), chalk.blueBright( `<stream>` ), chalk.gray( `${ urlParam }` ), chalk.blueBright( `<statusCode>` ), chalk.gray( `${ statusCheck.code }` ) );

            res.end( JSON.stringify( statusCheck ) );

            return;
        }

        setCache( decodedUrl, finalUrl, 4 * 60 * 60 * 1000 );
        const hdUrl = finalUrl.replace( 'tracks-v2a1', 'tracks-v1a1' );
        const rewrittenPlaylist = await rewriteM3U( hdUrl, req );
        res.writeHead( 200, {
            'Content-Type': 'application/vnd.apple.mpegurl',
            'Content-Disposition': 'inline; filename="' + envFileM3U
        });

        res.end( rewrittenPlaylist );
        Log.ok( `Served playlist` );
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
                timestamp: Date.now()
            };

            res.writeHead( statusCheck.code, {
                'Content-Type': 'application/json'
            });

            Log.error( `playlist`, chalk.yellow( `[error]` ), chalk.white( `→` ), chalk.blueBright( `<message>` ), chalk.redBright( `${ statusCheck.message }` ), chalk.blueBright( `<error>` ), chalk.redBright( `${ statusCheck.message }` ), chalk.blueBright( `<statusCode>` ), chalk.gray( `${ statusCheck.code }` ) );

            res.end( JSON.stringify( statusCheck ) );
        }
    }
    finally
    {
        semaphore.release();
    }
}

async function serveHealthCheck( req, res )
{
    await semaphore.acquire();
    try
    {
        const urlParam = new URL( req.url, `http://${ req.headers.host }` ).searchParams.get( 'api' );
        if ( !urlParam )
        {
            Log.debug( `health`, chalk.yellow( `[api]` ), chalk.white( `→` ), chalk.blueBright( `<message>` ), chalk.gray( `No API key passed to health check` ) );
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
            timestamp: Date.now()
        };

        res.writeHead( statusCheck.code, {
            'Content-Type': 'application/json'
        });

        Log.ok( `health`, chalk.yellow( `[api]` ), chalk.white( `→` ), chalk.blueBright( `<message>` ), chalk.gray( `health check returned` ), chalk.greenBright( `${ statusCheck.status }` ), chalk.blueBright( `<client>` ), chalk.gray( `${ clientIp( req ) }` ), chalk.blueBright( `<statusCode>` ), chalk.gray( `${ statusCheck.code }` ), chalk.blueBright( `<uptime>` ), chalk.gray( Math.round( process.uptime() ) ) );

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
                timestamp: Date.now()
            };

            res.writeHead( statusCheck.code, {
                'Content-Type': 'application/json'
            });

            Log.error( `health`, chalk.yellow( `[error]` ), chalk.white( `→` ), chalk.blueBright( `<message>` ), chalk.gray( `${ statusCheck.message }; returned` ), chalk.redBright( `${ statusCheck.status }` ), chalk.blueBright( `<error>` ), chalk.redBright( `${ err.message }` ), chalk.blueBright( `<statusCode>` ), chalk.gray( `${ statusCheck.code }` ), chalk.blueBright( `<uptime>` ), chalk.gray( `${ process.uptime() }` ) );

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
    const rawData = await fetchRemote( originalUrl );
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
                return `${ baseUrl }/channel?url=${ encodeURIComponent( fullUrl ) }`;
            })
            .replace( /(https?:\/\/[^\s]*tvpass[^\s]*)/g, ( fullUrl ) =>
            {
                return `${ baseUrl }/channel?url=${ encodeURIComponent( fullUrl ) }`;
            });

            res.writeHead( 200, {
                'Content-Type': 'application/x-mpegURL',
                'Content-Disposition': 'inline; filename="' + envFileM3U
            });

        res.end( updatedContent );
    }
    catch ( err )
    {
        const statusCheck =
        {
            ip: envIpContainer,
            gateway: envIpGateway,
            client: clientIp( req ),
            message: `Fatal error serving playlist`,
            error: `${ err.message }`,
            status: 'unhealthy',
            ref: req.url,
            method: req.method || 'GET',
            code: 500,
            uptime: Math.round( process.uptime() ),
            timestamp: Date.now()
        };

        Log.error( `playlist`, chalk.yellow( `[serve]` ), chalk.white( `→` ), chalk.blueBright( `<message>` ), chalk.redBright( `${ statusCheck.message }` ), chalk.blueBright( `<error>` ), chalk.redBright( `${ statusCheck.message }` ), chalk.blueBright( `<url>` ), chalk.gray( `${ req.url }` ), chalk.blueBright( `<statusCode>` ), chalk.gray( `${ statusCheck.code }` ) );

        res.writeHead( statusCheck.code, {
            'Content-Type': 'application/json'
        });

        res.end( JSON.stringify( statusCheck ) );
    }
}

/*
    Serves IPTV .xml guide data
*/

async function serveXML( response, req )
{
    try
    {
        const protocol = req.headers['x-forwarded-proto']?.split( ',' )[0] || ( req.socket.encrypted ? 'https' : 'http' );
        const host = req.headers.host;
        const baseUrl = `${ protocol }://${ host }`;
        const formattedContent = fs.readFileSync( FILE_XML, 'utf-8' );

        response.writeHead( 200, {
            'Content-Type': 'application/xml',
            'Content-Disposition': 'inline; filename="' + envFileXML
        });

        response.end( formattedContent );
    }
    catch ( err )
    {
        Log.error( `playlist`, chalk.yellow( `[serve]` ), chalk.white( `→` ), chalk.blueBright( `<message>` ), chalk.redBright( `Fatal serving xml / epg guide data` ), chalk.blueBright( `<error>` ), chalk.redBright( `${ err.message }` ), chalk.blueBright( `<url>` ), chalk.gray( `${ req.url }` ) );

        response.writeHead( 500, {
            'Content-Type': 'text/plain'
        });

        response.end( `Error serving xml/epg guide data: ${ err.message }` );
    }
};

/*
    Serves IPTV .gz guide data
*/

async function serveGZP( response, req )
{
    try
    {
        const protocol = req.headers['x-forwarded-proto']?.split( ',' )[0] || ( req.socket.encrypted ? 'https' : 'http' );
        const host = req.headers.host;
        const baseUrl = `${ protocol }://${ host }`;
        const formattedContent = fs.readFileSync( FILE_GZP );

        response.writeHead( 200, {
            'Content-Type': 'application/gzip',
            'Content-Disposition': 'inline; filename="' + envFileGZP
        });

        response.end( formattedContent );
    }
    catch ( err )
    {
        Log.error( `playlist`, chalk.yellow( `[serve]` ), chalk.white( `→` ), chalk.blueBright( `<message>` ), chalk.redBright( `Fatal serving compressed gzip file` ), chalk.blueBright( `<error>` ), chalk.redBright( `${ err.message }` ), chalk.blueBright( `<url>` ), chalk.gray( `${ req.url }` ) );

        response.writeHead( 500, {
            'Content-Type': 'text/plain'
        });

        response.end( `Error serving gzip: ${ err.message }` );
    }
};

function setCache( key, value, ttl )
{
    const expiry = Date.now() + ttl;
    cache.set( key, {
        value,
        expiry
    });

    Log.debug( `cache`, chalk.yellow( `[set]` ), chalk.white( `→` ), chalk.blueBright( `<message>` ), chalk.gray( `new key created` ), chalk.blueBright( `<key>` ), chalk.gray( `${ key }` ), chalk.blueBright( `<expire>` ), chalk.gray( `${ ttl / 1000 } seconds` ) );
}

function getCache( key )
{
    const cached = cache.get( key );
    if ( cached && cached.expiry > Date.now() )
    {
        return cached.value;
    }
    else
    {
        if ( cached )
            Log.debug( `cache`, chalk.yellow( `[get]` ), chalk.white( `→` ), chalk.blueBright( `<message>` ), chalk.gray( `key has expired, marked for deletion` ), chalk.blueBright( `<key>` ), chalk.gray( `${ key }` ) );

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
    try
    {
        const start = performance.now();
        Log.info( `core`, chalk.yellow( `[init]` ), chalk.white( `→` ), chalk.blueBright( `<message>` ), chalk.gray( `Starting TVApp2 container. Assigning bound IP to host network adapter` ), chalk.blueBright( `<hostIp>` ), chalk.gray( `${ envWebIP }` ), chalk.blueBright( `<containerIp>` ), chalk.gray( `${ envIpContainer }` ), chalk.blueBright( `<port>` ), chalk.gray( `${ envWebPort }` ) );

        Log.debug( `.env`, chalk.yellow( `[set]` ), chalk.white( `→` ), chalk.blueBright( `<variable>` ), chalk.gray( `FILE_URL` ), chalk.blueBright( `<value>` ), chalk.gray( `${ FILE_URL }` ) );
        Log.debug( `.env`, chalk.yellow( `[set]` ), chalk.white( `→` ), chalk.blueBright( `<variable>` ), chalk.gray( `FILE_M3U` ), chalk.blueBright( `<value>` ), chalk.gray( `${ FILE_M3U }` ) );
        Log.debug( `.env`, chalk.yellow( `[set]` ), chalk.white( `→` ), chalk.blueBright( `<variable>` ), chalk.gray( `FILE_XML` ), chalk.blueBright( `<value>` ), chalk.gray( `${ FILE_XML }` ) );
        Log.debug( `.env`, chalk.yellow( `[set]` ), chalk.white( `→` ), chalk.blueBright( `<variable>` ), chalk.gray( `FILE_GZP` ), chalk.blueBright( `<value>` ), chalk.gray( `${ FILE_GZP }` ) );

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
        Log.info( `core`, chalk.yellow( `[init]` ), chalk.white( `→` ), chalk.blueBright( `<message>` ), chalk.gray( `TVApp2 container is ready` ), chalk.blueBright( `took ${ end - start }ms` ), chalk.blueBright( `<ip>` ), chalk.gray( `${ envIpContainer }` ), chalk.blueBright( `<gateway>` ), chalk.gray( `${ envIpGateway }` ), chalk.blueBright( `<port>` ), chalk.gray( `${ envWebPort }` ) );
    }
    catch ( err )
    {
        Log.error( `core`, chalk.yellow( `[init]` ), chalk.white( `→` ), chalk.blueBright( `<message>` ), chalk.redBright( `Could not start up TVApp2 container due to error` ), chalk.blueBright( `<error>` ), chalk.redBright( `${ err }` ), chalk.blueBright( `<ip>` ), chalk.gray( `${ envIpContainer }` ), chalk.blueBright( `<gateway>` ), chalk.gray( `${ envIpGateway }` ), chalk.blueBright( `<port>` ), chalk.gray( `${ envWebPort }` ) );
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

const server = http.createServer( ( request, response ) =>
{
    /*
        If request.url === '/'; load index.html as default page

        request.url returns
                /
                /www/css/tvapp2.fonts.min.css
                /www/css/tvapp2.min.css
    */

    const method = request.method || 'GET';
    let reqUrl = request.url;
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

            const apiKey = new URL( request.url, `http://${ request.headers.host }` ).searchParams.get( 'key' );
            const referer = request.headers.referer || null;

            if ( ( !referer && envApiKey && !apiKey ) || ( referer && !referer.includes( request.headers.host ) ) )
            {
                const statusCheck =
                {
                    ip: envIpContainer, gateway: envIpGateway, client: clientIp( request ),
                    message: `must specify api key: http://${ request.headers.host }/api/restart?key=XXXXXXXX`,
                    status: `unauthorized`, ref: request.url, method: method || 'GET', code: 401,
                    uptime: Math.round( process.uptime() ), timestamp: Date.now()
                };

                response.writeHead( statusCheck.code, {
                    'Content-Type': 'application/json'
                });

                Log.error( `www`, chalk.yellow( `[req]` ), chalk.white( `→` ), chalk.blueBright( `<message>` ), chalk.redBright( `unauthorized (401): restart attempt did not specify api key using ?key=XXX parameter` ), chalk.blueBright( `<client>` ), chalk.gray( `${ clientIp( request ) }` ), chalk.blueBright( `<type>` ), chalk.gray( `api/restart` ), chalk.blueBright( `<file>` ), chalk.gray( `${ loadFile }` ), chalk.blueBright( `<method>` ), chalk.gray( `${ method }` ) );
                response.end( JSON.stringify( statusCheck ) );

                return;
            }

            /*
                no referer, api key in url specified, api key set up with tvapp2 do not match
            */

            if ( !referer && ( envApiKey !== apiKey ) )
            {
                const statusCheck =
                {
                    ip: envIpContainer, gateway: envIpGateway, client: clientIp( request ),
                    message: `incorrect api key specified: http://${ request.headers.host }/api/restart?key=XXXXXXXX`,
                    status: `unauthorized`, ref: request.url, method: method || 'GET', code: 401,
                    uptime: Math.round( process.uptime() ), timestamp: Date.now()
                };

                response.writeHead( statusCheck.code, {
                    'Content-Type': 'application/json'
                });

                Log.error( `www`, chalk.yellow( `[req]` ), chalk.white( `→` ), chalk.blueBright( `<message>` ), chalk.redBright( `unauthorized (401): incorrect api key specified` ), chalk.blueBright( `<type>` ), chalk.gray( `api/restart` ), chalk.blueBright( `<file>` ), chalk.gray( `${ loadFile }` ), chalk.blueBright( `<method>` ), chalk.gray( `${ method }` ) );
                response.end( JSON.stringify( statusCheck ) );
                return;
            }

            await initialize();

            const statusCheck =
            {
                ip: envIpContainer,
                gateway: envIpGateway,
                client: clientIp( request ),
                message: 'Restart command received',
                status: 'ok',
                ref: request.url,
                method: method || 'GET',
                code: 200,
                uptime: Math.round( process.uptime() ),
                timestamp: Date.now()
            };

            response.writeHead( statusCheck.code, {
                'Content-Type': 'application/json'
            });

            Log.info( `www`, chalk.yellow( `[req]` ), chalk.white( `→` ), chalk.blueBright( `<type>` ), chalk.gray( `api/restart` ), chalk.blueBright( `<file>` ), chalk.gray( `${ loadFile }` ), chalk.blueBright( `<method>` ), chalk.gray( `${ method }` ) );
            response.end( JSON.stringify( statusCheck ) );

            return;
        }

        if ( subdomainHealth.some( ( urlKeyword ) => loadFile.startsWith( urlKeyword ) ) && method === 'GET' )
        {
            Log.info( `www`, chalk.yellow( `[req]` ), chalk.white( `→` ), chalk.blueBright( `<type>` ), chalk.gray( `api` ), chalk.blueBright( `<file>` ), chalk.gray( `${ loadFile }` ), chalk.blueBright( `<method>` ), chalk.gray( `${ method }` ) );

            await serveHealthCheck( request, response );
            return;
        }

        if ( subdomainM3U.some( ( urlKeyword ) => loadFile.startsWith( urlKeyword ) ) && method === 'GET' )
        {
            Log.info( `www`, chalk.yellow( `[req]` ), chalk.white( `→` ), chalk.blueBright( `<type>` ), chalk.gray( `m3u playlist` ), chalk.blueBright( `<file>` ), chalk.gray( `${ loadFile }` ), chalk.blueBright( `<method>` ), chalk.gray( `${ method }` ) );

            await serveM3U( response, request );
            return;
        }

        if ( subdomainChan.some( ( urlKeyword ) => loadFile.startsWith( urlKeyword ) ) && method === 'GET' )
        {
            Log.info( `www`, chalk.yellow( `[req]` ), chalk.white( `→` ), chalk.blueBright( `<type>` ), chalk.gray( `channel` ), chalk.blueBright( `<file>` ), chalk.gray( `${ loadFile }` ), chalk.blueBright( `<method>` ), chalk.gray( `${ method }` ) );

            await serveM3UPlaylist( request, response );
            return;
        }

        if ( subdomainKey.some( ( urlKeyword ) => loadFile.startsWith( urlKeyword ) ) && method === 'GET' )
        {
            Log.info( `www`, chalk.yellow( `[req]` ), chalk.white( `→` ), chalk.blueBright( `<type>` ), chalk.gray( `key` ), chalk.blueBright( `<file>` ), chalk.gray( `${ loadFile }` ), chalk.blueBright( `<method>` ), chalk.gray( `${ method }` ) );

            await serveKey( request, response );
            return;
        }

        if ( subdomainEPG.some( ( urlKeyword ) => loadFile.startsWith( urlKeyword ) ) && method === 'GET' )
        {
            Log.info( `www`, chalk.yellow( `[req]` ), chalk.white( `→` ), chalk.blueBright( `<type>` ), chalk.gray( `epg-uncompressed` ), chalk.blueBright( `<file>` ), chalk.gray( `${ loadFile }` ), chalk.blueBright( `<method>` ), chalk.gray( `${ method }` ) );

            await serveXML( response, request );
            return;
        }

        if ( subdomainGZP.some( ( urlKeyword ) => loadFile.startsWith( urlKeyword ) ) && method === 'GET' )
        {
            Log.info( `www`, chalk.yellow( `[req]` ), chalk.white( `→` ), chalk.blueBright( `<type>` ), chalk.gray( `epg-compressed` ), chalk.blueBright( `<file>` ), chalk.gray( `${ loadFile }` ), chalk.blueBright( `<method>` ), chalk.gray( `${ method }` ) );

            await serveGZP( response, request );
            return;
        }

        /*
            General Template & .html / .css / .js
            read the loaded asset file
        */

        ejs.renderFile( `./${ FOLDER_WWW }/${ loadFile }`,
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
                appUrlGithub: repository.url,
                appUrlDiscord: discord.url,
                appUrlDocs: docs.url
            }, ( err, data ) =>
        {
            if ( !err )
            {
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
                    data = fs.readFileSync( `./${ FOLDER_WWW }/${ loadFile }` );

                response.setHeader( 'Content-type', fileMime );
                response.end( data );

                Log.ok( `www`, chalk.yellow( `[load]` ), chalk.white( `→` ), chalk.blueBright( `<client>` ), chalk.gray( `${ clientIp( request ) }` ), chalk.blueBright( `<file>` ), chalk.gray( `${ loadFile }` ), chalk.blueBright( `<mime>` ), chalk.gray( `${ fileMime }` ) );
            }
            else
            {
                if ( loadFile === 'discovery.json' )
                {
                    Log.notice( `www`, chalk.yellowBright( `[notice]` ), chalk.white( `→` ), chalk.grey( `If you are attempting to load TVApp2 using an HDHomeRun tuner, please switch to the` ), chalk.yellowBright( `M3U Tuner` ) );
                }

                const statusCheck =
                {
                    ip: envIpContainer,
                    gateway: envIpGateway,
                    client: clientIp( request ),
                    message: 'Page not found',
                    status: 'healthy',
                    ref: request.url,
                    method: method || 'GET',
                    code: 404,
                    uptime: Math.round( process.uptime() ),
                    timestamp: Date.now()
                };

                response.writeHead( statusCheck.code, {
                    'Content-Type': 'application/json'
                });

                Log.error( `www`, chalk.redBright( `[error]` ), chalk.white( `→` ), chalk.grey( `${ statusCheck.message }` ), chalk.redBright( `${ loadFile }` ), chalk.blueBright( `<statusCode>` ), chalk.gray( `${ statusCheck.code }` ) );

                response.end( JSON.stringify( statusCheck ) );
            }
        });
    };
    handleRequest().catch( ( err ) =>
    {
        response.writeHead( 500, {
            'Content-Type': 'text/plain'
        });

        Log.error( `Error handling request:`, chalk.white( `→` ), chalk.grey( `${ err }` ) );

        response.end( 'Internal Server Error' );
    });
});

/*
    Initialize Webserver
*/

( async() =>
{
    if ( !envApiKey )
        Log.warn( `core`, chalk.yellow( `[api]` ), chalk.white( `→` ), chalk.blueBright( `<message>` ), chalk.gray( `API_KEY environment variable not defined for api, leaving blank` ) );
    else
        Log.ok( `core`, chalk.yellow( `[api]` ), chalk.white( `→` ), chalk.blueBright( `<message>` ), chalk.gray( `API_KEY environment variable successfully assigned` ) );

    await initialize();

    server.listen( envWebPort, envWebIP, () =>
    {
        Log.warn( `core`, chalk.yellow( `[init]` ), chalk.white( `→` ), chalk.blueBright( `<message>` ), chalk.gray( `server is now running on` ), chalk.whiteBright.bgBlack( ` ${ envWebIP }:${ envWebPort } ` ) );
    });
})();
