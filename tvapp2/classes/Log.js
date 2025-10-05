/*
    Define > Logs

    When assigning text colors, terminals and the windows command prompt can display any color; however apps
    such as Portainer console cannot. If you use 16 million colors and are viewing console in Portainer, colors will
    not be the same as the rgb value. It's best to just stick to Chalk's default colors.

    Various levels of logs with the following usage:
        Log.verbose(`This is verbose`)
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

import fs from 'fs';
import chalk from 'chalk';

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
    Define
*/

const LOG_LEVEL = process.env.LOG_LEVEL || 4;
const { name } = JSON.parse( fs.readFileSync( './package.json' ) );

/*
    Class > Log
*/

class Log
{
    static now()
    {
        const now = new Date();
        return chalk.gray( `[${ now.toLocaleTimeString() }]` );
    }

    static verbose( ...msg )
    {
        if ( LOG_LEVEL >= 6 )
            console.debug( chalk.white.bgBlack.blackBright.bold( ` ${ name } ` ), chalk.white( `⚙️` ), this.now(), chalk.gray( msg.join( ' ' ) ) );
    }

    static debug( ...msg )
    {
        if ( LOG_LEVEL >= 7 )
            console.trace( chalk.white.bgMagenta.bold( ` ${ name } ` ), chalk.white( `⚙️` ), this.now(), chalk.magentaBright( msg.join( ' ' ) ) );
        else if ( LOG_LEVEL >= 5 )
            console.debug( chalk.white.bgGray.bold( ` ${ name } ` ), chalk.white( `⚙️` ), this.now(), chalk.gray( msg.join( ' ' ) ) );
    }

    static info( ...msg )
    {
        if ( LOG_LEVEL >= 4 )
            console.info( chalk.white.bgBlueBright.bold( ` ${ name } ` ), chalk.white( `ℹ️` ), this.now(), chalk.blueBright( msg.join( ' ' ) ) );
    }

    static ok( ...msg )
    {
        if ( LOG_LEVEL >= 4 )
            console.log( chalk.white.bgGreen.bold( ` ${ name } ` ), chalk.white( `✅` ), this.now(), chalk.greenBright( msg.join( ' ' ) ) );
    }

    static notice( ...msg )
    {
        if ( LOG_LEVEL >= 3 )
            console.log( chalk.white.bgYellow.bold( ` ${ name } ` ), chalk.white( `📌` ), this.now(), chalk.yellowBright( msg.join( ' ' ) ) );
    }

    static warn( ...msg )
    {
        if ( LOG_LEVEL >= 2 )
            console.warn( chalk.white.bgYellow.bold( ` ${ name } ` ), chalk.white( `⚠️` ), this.now(), chalk.yellowBright( msg.join( ' ' ) ) );
    }

    static error( ...msg )
    {
        if ( LOG_LEVEL >= 1 )
            console.error( chalk.white.bgRedBright.bold( ` ${ name } ` ), chalk.white( `❌` ), this.now(), chalk.redBright( msg.join( ' ' ) ) );
    }
}

/*
    export class

    @usage          import Log from './classes/Log.js';
*/

// eslint-disable-next-line no-restricted-syntax
export default Log;
