#!/usr/bin/env node

/*
    Import Packages
*/

import fs from 'fs';
import https from 'https';
import path from 'path';
import http from 'http';
import zlib from 'zlib';
import chalk from 'chalk';
import ejs from 'ejs';

/*
    Old CJS variables converted to ESM
*/

import { fileURLToPath } from 'url';
const cache = new Map();

/*
    Import package.json values
*/

const { name, author, version, repository } = JSON.parse( fs.readFileSync( './package.json' ) );
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
const LOG_LEVEL = process.env.LOG_LEVEL || 10;

/*
    Define > Externals
*/

const extURL = `${ envUrlRepo }/tvapp2-externals/raw/branch/main/urls.txt`;
const extEPG = `${ envUrlRepo }/XMLTV-EPG/raw/branch/main/xmltv.1.xml`;
const extFormatted = `${ envUrlRepo }/tvapp2-externals/raw/branch/main/formatted.dat`;
const extEvents = '';

/*
    Define > Defaults
*/

let urls = [];
const gCookies = {};
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
            console.trace( chalk.white.bgMagenta.bold( ` ${ name } ` ), chalk.white( ` → ` ), this.now(), chalk.magentaBright( msg.join( ' ' ) ) );
    }

    static debug( ...msg )
    {
        if ( LOG_LEVEL >= 5 )
            console.debug( chalk.white.bgGray.bold( ` ${ name } ` ), chalk.white( ` → ` ), this.now(), chalk.gray( msg.join( ' ' ) ) );
    }

    static info( ...msg )
    {
        if ( LOG_LEVEL >= 4 )
            console.info( chalk.white.bgBlueBright.bold( ` ${ name } ` ), chalk.white( ` → ` ), this.now(), chalk.blueBright( msg.join( ' ' ) ) );
    }

    static ok( ...msg )
    {
        if ( LOG_LEVEL >= 4 )
            console.log( chalk.white.bgGreen.bold( ` ${ name } ` ), chalk.white( ` → ` ), this.now(), chalk.greenBright( msg.join( ' ' ) ) );
    }

    static notice( ...msg )
    {
        if ( LOG_LEVEL >= 3 )
            console.log( chalk.white.bgYellow.bold( ` ${ name } ` ), chalk.white( ` → ` ), this.now(), chalk.yellowBright( msg.join( ' ' ) ) );
    }

    static warn( ...msg )
    {
        if ( LOG_LEVEL >= 2 )
            console.warn( chalk.white.bgYellow.bold( ` ${ name } ` ), chalk.white( ` → ` ), this.now(), chalk.yellow( msg.join( ' ' ) ) );
    }

    static error( ...msg )
    {
        if ( LOG_LEVEL >= 1 )
            console.error( chalk.white.bgRedBright.bold( ` ${ name } ` ), chalk.white( ` → ` ), this.now(), chalk.red( msg.join( ' ' ) ) );
    }
}

/*
    Process
*/

if ( process.pkg )
{
    Log.info( `Processing Package` );
    const basePath = path.dirname( process.execPath );
    URLS_FILE = path.join( basePath, 'urls.txt' );
    FORMATTED_FILE = path.join( basePath, 'formatted.dat' );
    EPG_FILE = path.join( basePath, 'xmltv.1.xml' );
    EPG_FILE.length;
}
else
{
    Log.info( `Processing Locals` );
    URLS_FILE = path.resolve( __dirname, 'urls.txt' );
    FORMATTED_FILE = path.resolve( __dirname, 'formatted.dat' );
    EPG_FILE = path.resolve( __dirname, 'xmltv.1.xml' );
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
    @return     Promise<>
*/

async function downloadFile( url, filePath )
{
    Log.info( `Fetching ${ url }` );

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
                    Log.error( `Failed to download file: ${ url }`, chalk.white( ` → ` ), chalk.grey( `Status code: ${ response.statusCode }` ) );
                    return reject( new Error( `Failed to download file: ${ url }. Status code: ${ response.statusCode }` ) );
                }
                response.pipe( file );
                file.on( 'finish', () =>
                {
                    Log.ok( `Successfully fetched ${ filePath }` );
                    file.close( () => resolve( true ) );
                });
            })
            .on( 'error', ( err ) =>
            {
                Log.error( `Error downloading file: ${ url }`, chalk.white( ` → ` ), chalk.grey( `Status code: ${ err.message }` ) );
                fs.unlink( filePath, () => reject( err ) );
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

async function ensureFileExists( url, filePath )
{
    try
    {
        await downloadFile( url, filePath );
    }
    catch ( error )
    {
        if ( fs.existsSync( filePath ) )
        {
            Log.warn( `Using existing local file ${ filePath }, download failed`, chalk.white( ` → ` ), chalk.grey( `${ url }` ) );
        }
        else
        {
            Log.error( `Failed to download file, and no local file exists; aborting`, chalk.white( ` → ` ), chalk.grey( `${ url }` ) );
            throw error;
        }
    }
}

async function fetchRemote( url )
{
    return new Promise( ( resolve, reject ) =>
    {
        const mod = url.startsWith( 'https' ) ? https : http;
        mod
            .get( url, {
                headers: {
                    'Accept-Encoding': 'gzip, deflate, br'
                }
            }, ( resp ) =>
            {
                if ( resp.statusCode !== 200 )
                {
                    Log.error( `Server returned status code other than 200`, chalk.white( ` → ` ), chalk.grey( `${ url } - ${ resp.statusCode }` ) );
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

            Log.error( `Missing "uri" parameter for key download`, chalk.white( ` → ` ), chalk.grey( `${ req.url }` ) );

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
        Log.error( `ServeKey Error:`, chalk.white( ` → ` ), chalk.grey( `${ err.message }` ) );

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
                Log.error( `Cannot find "stream_name"`, chalk.white( ` → ` ), chalk.grey( `${ channelUrl }` ) );
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
            Log.error( `Failed to parse token JSON for channel`, chalk.white( ` → ` ), chalk.grey( `${ channelUrl } - ${ err.message }` ) );
            return null;
        }

        if ( !finalUrl )
        {
            Log.error( `No URL found in token JSON for channel`, chalk.white( ` → ` ), chalk.grey( `${ channelUrl }` ) );
            return null;
        }

        Log.debug( `Tokenized URL:`, chalk.white( ` → ` ), chalk.grey( `${ finalUrl }` ) );

        return finalUrl;
    }
    catch ( err )
    {
        Log.error( `Fatal error fetching token:`, chalk.white( ` → ` ), chalk.grey( `${ err.message }` ) );
        return null;
    }
}

async function serveChannelPlaylist( req, res )
{
    await semaphore.acquire();
    try
    {
        const urlParam = new URL( req.url, `http://${ req.headers.host }` ).searchParams.get( 'url' );
        if ( !urlParam )
        {
            Log.error( `Missing parameter`, chalk.white( ` → ` ), chalk.grey( `URL` ) );
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
            const rewrittenPlaylist = await rewritePlaylist( cachedUrl, req );
            res.writeHead( 200,
            {
                'Content-Type': 'application/vnd.apple.mpegurl',
                'Content-Disposition': 'inline; filename="' + envFilePlaylist
            });

            res.end( rewrittenPlaylist );
            return;
        }

        Log.info( `Fetching stream:`, chalk.white( ` → ` ), chalk.grey( `${ urlParam }` ) );

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
        const rewrittenPlaylist = await rewritePlaylist( hdUrl, req );
        res.writeHead( 200, {
            'Content-Type': 'application/vnd.apple.mpegurl',
            'Content-Disposition': 'inline; filename="' + envFilePlaylist
        });

        res.end( rewrittenPlaylist );
        Log.ok( `Served playlist` );
    }
    catch ( error )
    {
        Log.error( `Error processing request:`, chalk.white( ` → ` ), chalk.grey( `${ error.message }` ) );

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

async function rewritePlaylist( originalUrl, req )
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

async function servePlaylist( response, req )
{
    try
    {
        const protocol = req.headers['x-forwarded-proto']?.split( ',' )[0] || ( req.socket.encrypted ? 'https' : 'http' );
        const host = req.headers.host;
        const baseUrl = `${ protocol }://${ host }`;
        const formattedContent = fs.readFileSync( FORMATTED_FILE, 'utf-8' );
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
            'Content-Disposition': 'inline; filename="' + envFilePlaylist
        });

        response.end( updatedContent );
    }
    catch ( error )
    {
        Log.error( `Error in servePlaylist:`, chalk.white( ` → ` ), chalk.grey( `${ error.message }` ) );

        response.writeHead( 500, {
            'Content-Type': 'text/plain'
        });

        response.end( `Error serving playlist: ${ error.message }` );
    }
}

/*
    Serves IPTV .xml guide data
*/

async function serveXmltv( response, req )
{
    try
    {
        const protocol = req.headers['x-forwarded-proto']?.split( ',' )[0] || ( req.socket.encrypted ? 'https' : 'http' );
        const host = req.headers.host;
        const baseUrl = `${ protocol }://${ host }`;
        const formattedContent = fs.readFileSync( EPG_FILE, 'utf-8' );

        response.writeHead( 200, {
            'Content-Type': 'application/xml',
            'Content-Disposition': 'inline; filename="xmltv.1.xml"'
        });

        response.end( formattedContent );
    }
    catch ( error )
    {
        Log.error( `Error in servePlaylist:`, chalk.white( ` → ` ), chalk.grey( `${ error.message }` ) );

        response.writeHead( 500, {
            'Content-Type': 'text/plain'
        });

        response.end( `Error serving playlist: ${ error.message }` );
    }
};

function setCache( key, value, ttl )
{
    const expiry = Date.now() + ttl;
    cache.set( key, {
        value,
        expiry
    });

    Log.debug( `Cache set for key ${ key } which expires in`, chalk.white( ` → ` ), chalk.grey( `${ ttl / 1000 } seconds` ) );
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
            Log.debug( `Cache expired for key`, chalk.white( ` → ` ), chalk.grey( `${ key }` ) );

        cache.delete( key );
        return null;
    }
}

async function initialize()
{
    try
    {
        Log.info( `Initializing server...` );

        await ensureFileExists( extURL, URLS_FILE );
        await ensureFileExists( extFormatted, FORMATTED_FILE );
        await ensureFileExists( extEPG, EPG_FILE );

        urls = fs.readFileSync( URLS_FILE, 'utf-8' ).split( '\n' ).filter( Boolean );
        if ( urls.length === 0 )
        {
            throw new Error( `No valid URLs found in ${ URLS_FILE }` );
        }

        Log.info( `Initializing Complete` );
    }
    catch ( error )
    {
        Log.error( `Initialization error:`, chalk.white( ` → ` ), chalk.grey( `${ error.message }` ) );
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
    let loadAsset = request.url;
    if ( loadAsset === '/' )
        loadAsset = 'index.html';

    Log.debug( `www`, chalk.yellow( ` [GET]  ` ), chalk.white( ` → ` ), chalk.grey( `${ loadAsset }` ) );

    const handleRequest = async() =>
    {
        /*
            Define the different routes.
            Place the template system last. Getting TVApp data should take priority.
        */

        if ( loadAsset === '/playlist' && method === 'GET' )
        {
            Log.info( `Received request for playlist data`, chalk.white( ` → ` ), chalk.grey( `/playlist` ) );

            await servePlaylist( response, request );
            return;
        }

        if ( loadAsset.startsWith( '/channel' ) && method === 'GET' )
        {
            Log.info( `Received request for channel data`, chalk.white( ` → ` ), chalk.grey( `/channel` ) );

            await serveChannelPlaylist( request, response );
            return;
        }

        if ( loadAsset.startsWith( '/key' ) && method === 'GET' )
        {
            Log.info( `Received request for key data`, chalk.white( ` → ` ), chalk.grey( `/key` ) );

            await serveKey( request, response );
            return;
        }

        if ( loadAsset === '/epg' && method === 'GET' )
        {
            Log.info( `Received request for EPG data`, chalk.white( ` → ` ), chalk.grey( `/epg` ) );

            await serveXmltv( response, request );
            return;
        }

        /*
            General Template & .html / .css / .js
            read the loaded asset file
        */

        ejs.renderFile( './www/' + loadAsset, { fileEPG: envFilePlaylist, fileM3U: envFileEPG, appName: name, appVersion: version }, ( err, data ) =>
        {
            if ( !err )
            {
                const html = data.toString();

                /*
                    This allows us to serve all files locally: css, js, etc.
                    the file loaded is dependent on what comes to the right of the period.
                */

                const fileExt = loadAsset.lastIndexOf( '.' );
                const fileMime = fileExt === -1
                                ? 'text/plain'
                                : {
                                    '.html' : 'text/html',
                                    '.ico' : 'image/x-icon',
                                    '.jpg' : 'image/jpeg',
                                    '.png' : 'image/png',
                                    '.gif' : 'image/gif',
                                    '.css' : 'text/css',
                                    '.js' : 'text/javascript'
                                    }[loadAsset.substr( fileExt )];

                response.setHeader( 'Content-type', fileMime );
                response.end( html );

                Log.debug( `www`, chalk.green( ` [LOAD] ` ), chalk.white( ` → ` ), chalk.grey( `asset:${ loadAsset } mime:${ fileMime }` ) );
            }
            else
            {
                Log.error( `www file not found:`, chalk.white( ` → ` ), chalk.grey( `${ request.url }` ) );
                response.writeHead( 404, 'Not Found' );
                response.end();
            }
        });
    };
    handleRequest().catch( ( error ) =>
    {
        Log.error( `Error handling request:`, chalk.white( ` → ` ), chalk.grey( `${ error }` ) );

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

    await initialize();
    server.listen( envWebPort, envWebIP, () =>
    {
        Log.info( `Server is running on ${ envWebIP }:${ envWebPort }` );
    });
})();
