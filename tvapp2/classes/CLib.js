/*
    Compress / Uncompress String with base64

    these functions use a unique character table. moving the letters around will cause strings to not
    be in the correct order once uncompressed.

    @usage          new CLib().compress( 'https://daddylive.mp/' )
                    new CLib().uncompress( 'burS7u6FvUHhZfrhkfJoYz8CswTD=' )
                    new CLib().translate( '=', plugin.defTrans, plugin.tvaTrans )

                    a custom character set can be specified with two additional parameters. however, anything prior
                    that was encoded will not be decoded by the new character set.

                    const strCompress = new CLib().compress( 'test.com' );
                    const strUncompress = new CLib().uncompress( strCompress );

                    new CLib().compress( 'test.com', 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/', 'rXzxP9ZdvehYlstwiTuV1c07j45Abo2Ama6k3gqpyf8n+/NMSEIUHBQRJDLFCGKO' )
                    new CLib().uncompress( 'oZcUozDkAQH=', 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/', 'rXzxP9ZdvehYlstwiTuV1c07j45Abo2Ama6k3gqpyf8n+/NMSEIUHBQRJDLFCGKO' )
*/

import chalk from 'chalk';
import Log from './Log.js';

/*
    Class > CLib
*/

class CLib
{
    constructor()
    {
        this.defTrans = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
        this.tvaTrans = 'TVAPp29uqXiv6g5adr1j8nfwZ0bs7Ykm3xl4hczAtoey+/CDKJULSEMBQRFGIHNO';
    }

    compress( data, defTrans, tvaTrans )
    {
        if ( typeof data === 'string' )
            data = Buffer.from( data, 'utf8' );

        const transDef = defTrans || this.defTrans;
        const transTva = tvaTrans || this.tvaTrans;

        try
        {
            const dataCompress = this.translate( data.toString( 'base64' ), transDef, transTva );

            Log.ok( `clib`, chalk.yellow( `[compress]` ), chalk.white( `⚙️` ),
                chalk.blueBright( `<msg>` ), chalk.gray( `Compress string` ),
                chalk.blueBright( `<strRaw>` ), chalk.gray( `${ data }` ),
                chalk.blueBright( `<strCompress>` ), chalk.gray( `${ dataCompress }` ) );

            return dataCompress;
        }
        catch ( err )
        {
            Log.error( `clib`, chalk.redBright( `[compress]` ), chalk.white( `❌` ),
                chalk.redBright( `<msg>` ), chalk.gray( `Could not compress string; bad string ${ data }` ),
                chalk.redBright( `<error>` ), chalk.gray( `${ err.message }` ),
                chalk.redBright( `<strCompress>` ), chalk.gray( `${ data }` ) );

            return null;
        }
    }

    uncompress( data, defTrans, tvaTrans )
    {
        if ( Buffer.isBuffer( data ) )
            data = data.toString();

        const transDef = defTrans || this.defTrans;
        const transTva = tvaTrans || this.tvaTrans;

        try
        {
            const dataTranslated = this.translate( data, transTva, transDef );
            const dataUncompress = Buffer.from( dataTranslated, 'base64' ).toString( 'utf8' );

            Log.ok( `clib`, chalk.yellow( `[decompss]` ), chalk.white( `⚙️` ),
                chalk.blueBright( `<msg>` ), chalk.gray( `Uncompress string` ),
                chalk.blueBright( `<strCompress>` ), chalk.gray( `${ data }` ),
                chalk.blueBright( `<strRaw>` ), chalk.gray( `${ dataUncompress }` ) );

            return dataUncompress;
        }
        catch ( err )
        {
            Log.error( `clib`, chalk.redBright( `[decompss]` ), chalk.white( `❌` ),
                chalk.redBright( `<msg>` ), chalk.gray( `Could not uncompress string; bad string ${ data }` ),
                chalk.redBright( `<error>` ), chalk.gray( `${ err.message }` ),
                chalk.redBright( `<strCompress>` ), chalk.gray( `${ data }` ) );

            return null;
        }
    }

    /*
        Translate

        compresses or decompresses encoded strings for the functions:
            - compress
            - uncompress
    */

    translate( str, fromChars, toChars )
    {
        let res = '';
        for ( let i = 0;i < str.length;i++ )
        {
            const char = str[i];
            const index = fromChars.indexOf( char );
            if ( index !== -1 )
                res += toChars[index];
            else
            res += char;
        }

        return res;
    }

    /*
        Encode: String > Hex > Base64

        encodes a human-readable string into a hex value, and then to base64

        @usage                  const clib = new CLib()
                                const encoded = clib.encodeToHexBase64('hello');                // Njg2NTZjNmM2Zg==
                                const decoded = clib.decodeFromHexBase64(`${ encoded }`);       // hello
    */

    encodeToHexBase64( str )
    {
        const hex = [...str].map( ( char ) =>
        {
            const code = char.charCodeAt( 0 ).toString( 16 );
            return code.padStart( 2, '0' );
        }).join( '' );

        const base64 = btoa( hex );
        return base64;
    }

    /*
        Decode: Base64 > Hex > String

        decodes a base64 value to hex, and then back into a human readable string

        @usage                  const clib = new CLib()
                                const encoded = clib.encodeToHexBase64('hello');                // Njg2NTZjNmM2Zg==
                                const decoded = clib.decodeFromHexBase64(`${ encoded }`);       // hello
    */

    decodeFromHexBase64( base64Str )
    {
        const hex = atob( base64Str );
        const chars = hex.match( /.{1,2}/g ); // every 2 hex chars = 1 byte

        return chars.map( ( byte ) => String.fromCharCode( parseInt( byte, 16 ) ) ).join( '' );
    }
}

/*
    export class

    @usage          import CLib from './classes/CLib.js';
*/

// eslint-disable-next-line no-restricted-syntax
export default CLib;
