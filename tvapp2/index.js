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
let FILE_TAR;
let FILE_M3U_SIZE = 0;
let FILE_XML_SIZE = 0;
let FILE_TAR_SIZE = 0;
let FILE_M3U_MODIFIED = 0;
let FILE_XML_MODIFIED = 0;
let FILE_TAR_MODIFIED = 0;
const FOLDER_WWW = 'www';

/*
    Define > Environment Variables || Defaults
*/

const envUrlRepo = process.env.URL_REPO || 'https://git.binaryninja.net/binaryninja';
const envStreamQuality = process.env.STREAM_QUALITY || 'hd';
const envFileURL = process.env.FILE_URL || 'urls.txt';
const envFileM3U = process.env.FILE_M3U || 'playlist.m3u8';
const envFileXML = process.env.FILE_EPG || 'xmltv.xml';
const envFileTAR = process.env.FILE_TAR || 'xmltv.xml.gz';
const envWebEncoding = process.env.WEB_ENCODING || 'deflate, br';
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
*/

const subdomainRestart = [ 'restart', 'sync', 'resync' ];
const subdomainGZ = [ 'gzip', 'gz' ];
const subdomainM3U = [ 'playlist', 'm3u', 'm3u8' ];
const subdomainEPG = [ 'guide', 'epg', 'xml' ];
const subdomainKey = [ 'key', 'keys' ];
const subdomainChan = [ 'channels', 'channel' ];

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
    Log.info( `Processing Package` );
    const basePath = path.dirname( process.execPath );

    FILE_URL = path.join( basePath, FOLDER_WWW, `${ envFileURL }` );
    FILE_M3U = path.join( basePath, FOLDER_WWW, `${ envFileM3U }` );
    FILE_XML = path.join( basePath, FOLDER_WWW, `${ envFileXML }` );
    FILE_XML.length;
    FILE_TAR = path.join( basePath, FOLDER_WWW, `${ envFileTAR }` );
}
else
{
    Log.info( `Processing Locals` );

    FILE_URL = path.resolve( __dirname, FOLDER_WWW, `${ envFileURL }` );
    FILE_M3U = path.resolve( __dirname, FOLDER_WWW, `${ envFileM3U }` );
    FILE_XML = path.resolve( __dirname, FOLDER_WWW, `${ envFileXML }` );
    FILE_TAR = path.resolve( __dirname, FOLDER_WWW, `${ envFileTAR }` );
}

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
    Log.info( `Fetching`, chalk.white( `→` ), chalk.grey( `Downloading external file` ), chalk.blueBright( `${ url }` ), chalk.grey( `to` ), chalk.blueBright( `${ filePath }` ) );

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
                    Log.error( `Failed to download file: ${ url }`, chalk.white( `→` ), chalk.grey( `Status code: ${ response.statusCode }` ) );
                    return reject( new Error( `Failed to download file: ${ url }. Status code: ${ response.statusCode }` ) );
                }
                response.pipe( file );
                file.on( 'finish', () =>
                {
                    Log.ok( `Received`, chalk.white( `→` ), chalk.grey( `Successfully wrote data to file` ), chalk.blueBright( `${ filePath }` ) );
                    file.close( () => resolve( true ) );
                });
            })
            .on( 'error', ( err ) =>
            {
                Log.error( `Error downloading file: ${ url }`, chalk.white( `→` ), chalk.grey( `Status code: ${ err.message }` ) );
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
    Func > Ensure File Exists

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
            Log.warn( `Using existing local file ${ filePath }, download failed`, chalk.white( `→` ), chalk.grey( `${ url }` ) );
        }
        else
        {
            Log.error( `Failed to download file, and no local file exists; aborting`, chalk.white( `→` ), chalk.grey( `${ url }` ) );
            throw err;
        }
    }
}

/*
    Func > Package GZip

    locates the xmltv.xml and packages it into a xmltv.gz archive
*/

async function createGzip( )
{
    Log.debug( `Preparing to gzip`, chalk.white( `→` ), chalk.grey( `${ envFileXML }` ) );

    return new Promise( ( resolve, reject ) =>
    {
        Log.debug( `createGzip[promise]`, chalk.white( `→` ), chalk.grey( `${ envFileXML }` ) );

        fs.readFile( FILE_XML, ( err, buf ) =>
        {
            Log.debug( `createGzip[fs.readFile]`, chalk.white( `→` ), chalk.grey( `${ envFileXML }` ) );

            if ( err )
            {
                Log.error( `Could not read file ${ envFileXML }. Error: `, chalk.white( `→` ), chalk.grey( `${ err }` ) );
                return reject( new Error( `Could not read file ${ envFileXML }. Error: ${ err }` ) );
            }

            zlib.gzip( buf, ( err, buf ) =>
            {
                Log.debug( `createGzip[zlib.gzip]`, chalk.white( `→` ), chalk.grey( `${ envFileXML }` ), chalk.white( `→` ), chalk.grey( `${ envFileTAR }` ) );
                if ( err )
                {
                    Log.error( `Could not write to archive. Error: `, chalk.white( `→` ), chalk.grey( `${ err }` ) );
                    return reject( new Error( `Could not create ${ envFileTAR }. Error: ${ err }` ) );
                }

                Log.info( `Compressing`, chalk.white( `→` ), `${ envFileXML }`, chalk.white( `→` ), `${ FILE_TAR }` );
                fs.writeFile( `${ FILE_TAR }`, buf, ( err ) =>
                {
                    if ( err )
                    {
                        Log.error( `Could not write XML file to archive. Error: `, chalk.white( `→` ), chalk.grey( `${ err }` ) );
                        return reject( new Error( `Could not write XML file ${ envFileXML } to ${ envFileTAR }. Error: ${ err }` ) );
                    }

                    Log.ok( `Compressed`, chalk.white( `→` ), `${ envFileXML }`, chalk.white( `→` ), `${ FILE_TAR }` );
                    resolve( true );
                });
            });
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
    @ret        none
*/

async function prepareGzip( )
{
    try
    {
        await createGzip( );
    }
    catch ( err )
    {
        if ( fs.existsSync( FILE_XML ) )
        {
            Log.warn( `XML file found, but gzip failed to compress XML`, chalk.white( `→` ), chalk.grey( `${ FILE_XML }` ) );
        }
        else
        {
            Log.error( `XML file not found`, chalk.white( `→` ), chalk.grey( `${ FILE_XML }` ) );
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
                    Log.error( `Server returned status code other than 200`, chalk.white( `→` ), chalk.grey( `${ url } - ${ resp.statusCode }` ) );
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
            res.writeHead( 400, {
                'Content-Type': 'text/plain'
            });

            Log.error( `Missing "uri" parameter for key download`, chalk.white( `→` ), chalk.grey( `${ req.url }` ) );

            return res.end( 'Error: Missing "uri" parameter for key download.' );
        }

        const keyData = await fetchRemote( uriParam );
        res.writeHead( 200, {
            'Content-Type': 'application/octet-stream'
        });

        res.end( keyData );
    }
    catch ( err )
    {
        Log.error( `ServeKey Error:`, chalk.white( `→` ), chalk.grey( `${ err.message }` ) );

        res.writeHead( 500, {
            'Content-Type': 'text/plain'
        });

        res.end( 'Error fetching key.' );
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
                Log.error( `Cannot find "stream_name"`, chalk.white( `→` ), chalk.grey( `${ channelUrl }` ) );
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

        const tokenUrl = `https://${ streamHost }/token/${ streamName }?quality=${ envStreamQuality }`;
        const tokenResponse = await fetchPage( tokenUrl );
        let finalUrl;

        try
        {
            const json = JSON.parse( tokenResponse );
            finalUrl = json.url;
        }
        catch ( err )
        {
            Log.error( `Failed to parse token JSON for channel`, chalk.white( `→` ), chalk.grey( `${ channelUrl } - ${ err.message }` ) );
            return null;
        }

        if ( !finalUrl )
        {
            Log.error( `No URL found in token JSON for channel`, chalk.white( `→` ), chalk.grey( `${ channelUrl }` ) );
            return null;
        }

        Log.debug( `Tokenized URL:`, chalk.white( `→` ), chalk.grey( `${ finalUrl }` ) );

        return finalUrl;
    }
    catch ( err )
    {
        Log.error( `Fatal error fetching token:`, chalk.white( `→` ), chalk.grey( `${ err.message }` ) );
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
            Log.error( `Missing parameter`, chalk.white( `→` ), chalk.grey( `URL` ) );
            res.writeHead( 400, {
                'Content-Type': 'text/plain'
            });
            res.end( 'Error: Missing URL parameter.' );
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

            res.end( rewrittenPlaylist );
            return;
        }

        Log.info( `Fetching stream:`, chalk.white( `→` ), chalk.grey( `${ urlParam }` ) );

        const finalUrl = await getTokenizedUrl( decodedUrl );
        if ( !finalUrl )
        {
            Log.error( `Failed to retrieve tokenized URL` );

            res.writeHead( 500, {
                'Content-Type': 'text/plain'
            });

            res.end( 'Error: Failed to retrieve tokenized URL.' );
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
        Log.error( `Error processing request:`, chalk.white( `→` ), chalk.grey( `${ err.message }` ) );

        if ( !res.headersSent )
        {
            res.writeHead( 500, {
                'Content-Type': 'text/plain'
            });

            res.end( 'Error processing request.' );
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

async function serveM3U( response, req )
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

        response.writeHead( 200, {
            'Content-Type': 'application/x-mpegURL',
            'Content-Disposition': 'inline; filename="' + envFileM3U
        });

        response.end( updatedContent );
    }
    catch ( err )
    {
        Log.error( `Error in serveM3U:`, chalk.white( `→` ), chalk.grey( `${ err.message }` ) );

        response.writeHead( 500, {
            'Content-Type': 'text/plain'
        });

        response.end( `Error serving playlist: ${ err.message }` );
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
        Log.error( `Error in serveM3U:`, chalk.white( `→` ), chalk.grey( `${ err.message }` ) );

        response.writeHead( 500, {
            'Content-Type': 'text/plain'
        });

        response.end( `Error serving playlist: ${ err.message }` );
    }
};

/*
    Serves IPTV .gz guide data
*/

async function serveTAR( response, req )
{
    try
    {
        const protocol = req.headers['x-forwarded-proto']?.split( ',' )[0] || ( req.socket.encrypted ? 'https' : 'http' );
        const host = req.headers.host;
        const baseUrl = `${ protocol }://${ host }`;
        const formattedContent = fs.readFileSync( FILE_TAR );

        response.writeHead( 200, {
            'Content-Type': 'application/gzip',
            'Content-Disposition': 'inline; filename="' + envFileTAR
        });

        response.end( formattedContent );
    }
    catch ( err )
    {
        Log.error( `Error in serveTAR:`, chalk.white( `→` ), chalk.grey( `${ err.message }` ) );

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

    Log.debug( `Cache set for key ${ key } which expires in`, chalk.white( `→` ), chalk.grey( `${ ttl / 1000 } seconds` ) );
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
            Log.debug( `Cache expired for key`, chalk.white( `→` ), chalk.grey( `${ key }` ) );

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
        Log.info( `Initialization Started` );

        await getFile( extURL, FILE_URL );
        await getFile( extXML, FILE_XML );
        await getFile( extM3U, FILE_M3U );
        await prepareGzip();

        urls = fs.readFileSync( FILE_URL, 'utf-8' ).split( '\n' ).filter( Boolean );
        if ( urls.length === 0 )
            throw new Error( `No valid URLs found in ${ FILE_URL }` );

        /*
            Calculate Sizes
        */

        FILE_M3U_SIZE = getFileSizeHuman( FILE_M3U );
        FILE_XML_SIZE = getFileSizeHuman( FILE_XML );
        FILE_TAR_SIZE = getFileSizeHuman( FILE_TAR );

        FILE_M3U_MODIFIED = getFileModified( FILE_M3U );
        FILE_XML_MODIFIED = getFileModified( FILE_XML );
        FILE_TAR_MODIFIED = getFileModified( FILE_TAR );

        Log.ok( `Initialization Complete` );
    }
    catch ( err )
    {
        Log.error( `Initialization error:`, chalk.white( `→` ), chalk.grey( `${ err.message }` ) );
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

    Log.debug( `www`, chalk.blueBright( `[REQUEST]` ), chalk.white( `→` ), chalk.grey( `asset>` ), chalk.greenBright( `${ loadFile }` ), chalk.grey( `<method>` ), chalk.greenBright( `${ method }` ) );

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
            Log.info( `Toggled restart`, chalk.white( `→` ), chalk.grey( `${ loadFile }` ) );

            const envWebIP = process.env.WEB_IP || '0.0.0.0';
            const envWebPort = process.env.WEB_PORT || `4124`;

            Log.debug( `env`, chalk.blueBright( `[SET]` ), chalk.white( `→` ), chalk.grey( `FILE_URL` ), chalk.blueBright( `${ FILE_URL }` ) );
            Log.debug( `env`, chalk.blueBright( `[SET]` ), chalk.white( `→` ), chalk.grey( `FILE_M3U` ), chalk.blueBright( `${ FILE_M3U }` ) );
            Log.debug( `env`, chalk.blueBright( `[SET]` ), chalk.white( `→` ), chalk.grey( `FILE_XML` ), chalk.blueBright( `${ FILE_XML }` ) );
            Log.debug( `env`, chalk.blueBright( `[SET]` ), chalk.white( `→` ), chalk.grey( `FILE_TAR` ), chalk.blueBright( `${ FILE_TAR }` ) );

            await initialize();

            return;
        }

        if ( subdomainM3U.some( ( urlKeyword ) => loadFile.startsWith( urlKeyword ) ) && method === 'GET' )
        {
            Log.info( `Received request for m3u playlist data`, chalk.white( `→` ), chalk.grey( `${ loadFile }` ) );

            await serveM3U( response, request );
            return;
        }

        if ( subdomainChan.some( ( urlKeyword ) => loadFile.startsWith( urlKeyword ) ) && method === 'GET' )
        {
            Log.info( `Received request for channel data`, chalk.white( `→` ), chalk.grey( `${ loadFile }` ) );

            await serveM3UPlaylist( request, response );
            return;
        }

        if ( subdomainKey.some( ( urlKeyword ) => loadFile.startsWith( urlKeyword ) ) && method === 'GET' )
        {
            Log.info( `Received request for key data`, chalk.white( `→` ), chalk.grey( `${ loadFile }` ) );

            await serveKey( request, response );
            return;
        }

        if ( subdomainEPG.some( ( urlKeyword ) => loadFile.startsWith( urlKeyword ) ) && method === 'GET' )
        {
            Log.info( `Received request for raw EPG data`, chalk.white( `→` ), chalk.grey( `${ loadFile }` ) );

            await serveXML( response, request );
            return;
        }

        if ( subdomainGZ.some( ( urlKeyword ) => loadFile.startsWith( urlKeyword ) ) && method === 'GET' )
        {
            Log.info( `Received request for compressed EPG data`, chalk.white( `→` ), chalk.grey( `${ loadFile }` ) );

            await serveTAR( response, request );
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

                fileTAR: envFileTAR,
                sizeTAR: FILE_TAR_SIZE,
                dateTAR: FILE_TAR_MODIFIED,

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

                Log.ok( `www`, chalk.greenBright( ` [LOAD] ` ), chalk.white( `→` ), chalk.grey( `<asset>` ), chalk.greenBright( `${ loadFile }` ), chalk.grey( `<mime>` ), chalk.greenBright( `${ fileMime }` ) );
            }
            else
            {
                if ( loadFile === 'discovery.json' )
                {
                    Log.notice( `www`, chalk.yellowBright( ` [NOTICE] ` ), chalk.white( `→` ), chalk.grey( `If you are attempting to load TVApp2 using an HDHomeRun tuner, please switch to the` ), chalk.yellowBright( `M3U Tuner` ) );
                }

                Log.error( `www`, chalk.redBright( ` [ERROR] ` ), chalk.white( `→` ), chalk.grey( `File not found:` ), chalk.redBright( `${ request.url }` ) );
                response.writeHead( 404, 'Not Found' );
                response.end();
            }
        });
    };
    handleRequest().catch( ( err ) =>
    {
        Log.error( `Error handling request:`, chalk.white( `→` ), chalk.grey( `${ err }` ) );

        response.writeHead( 500, {
            'Content-Type': 'text/plain'
        });

        response.end( 'Internal Server Error' );
    });
});

/*
    Initialize Webserver
*/

( async() =>
{
    const envWebIP = process.env.WEB_IP || '0.0.0.0';
    const envWebPort = process.env.WEB_PORT || `4124`;

    Log.debug( `env`, chalk.blueBright( `[SET]` ), chalk.white( `→` ), chalk.grey( `FILE_URL` ), chalk.blueBright( `${ FILE_URL }` ) );
    Log.debug( `env`, chalk.blueBright( `[SET]` ), chalk.white( `→` ), chalk.grey( `FILE_M3U` ), chalk.blueBright( `${ FILE_M3U }` ) );
    Log.debug( `env`, chalk.blueBright( `[SET]` ), chalk.white( `→` ), chalk.grey( `FILE_XML` ), chalk.blueBright( `${ FILE_XML }` ) );
    Log.debug( `env`, chalk.blueBright( `[SET]` ), chalk.white( `→` ), chalk.grey( `FILE_TAR` ), chalk.blueBright( `${ FILE_TAR }` ) );

    await initialize();
    server.listen( envWebPort, envWebIP, () =>
    {
        Log.info( `Server now running on`, chalk.white( `→` ), chalk.whiteBright.bgBlack( ` ${ envWebIP }:${ envWebPort } ` ) );
    });
})();
