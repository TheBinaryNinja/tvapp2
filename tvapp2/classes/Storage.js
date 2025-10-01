/*
    Class › Storage

    The storage classes allows you to save specific settings into a json file. These settings are better off being stored in
    a local file, instead of using up the resources being saved in a database.

    Class supports multiple storage files, but by default, it will save settings in `www/config.json`.

    Settings include Tuner / HDHomeRun device information, etc.

    @usage
        const storage = new Storage( envWebFolder, FILE_CFG );
*/

import chalk from 'chalk';
import path from 'path';
import nconf from 'nconf';
import fs from 'fs';
import Log from './Log.js';
import Utils from './Utils.js';
import { fileURLToPath } from 'url';

/*
    CJS › ESM
*/

const __filename = fileURLToPath( import.meta.url );    // get resolved path to file
const __dirname = path.dirname( __filename );           // get name of directory

/*
    Class › Storage

    constructor     ( str:folder, str:file )
    Initialize      ( bool:bForceNew )
    Setup           ( bool:bForceNew )
    Get             ( str:key )
    Set             ( str:key, any:value )
    Save            ( )
    GetConfig       ( )
    isJsonString    ( json:str )
    isJsonEmpty     ( obj:json )
*/

class Storage
{
    /*
        Constructor › Storage

        Initializes a Storage instance for managing the config.json file.
        Determines the full path to the config file based on folder and file arguments,
        or uses the default static fileConfig if none are provided.

        Handles Node.js packaged apps (process.pkg) by adjusting paths accordingly.

        @args
            folder  (str)   Optional folder where config.json will be stored. Defaults to 'www'.
            file    (str)   Optional config file name. Defaults to static Storage.fileConfig.

        @usage
            const storage = new Storage(envWebFolder, FILE_CFG);
    */

    static fileConfig = path.resolve( process.cwd( ), 'www', 'config.json' );

    constructor( folder, file )
    {
        this.folderWeb = folder || 'www';
        this.fileConfig = file ? path.resolve( folder, file ) : Storage.fileConfig;

        if ( process.pkg )
            this.fileConfig = path.join( path.dirname( process.execPath ), this.folderWeb, this.fileConfig );
        else
            this.fileConfig = path.resolve( process.cwd( ), this.folderWeb, this.fileConfig );
    }

    /*
        Initialize › Activate Config Setup with Logging

        Activates the Storage.Setup( ) function while providing detailed logging.
        Ensures the user's config.json file exists, is valid, and is initialized
        with default values if missing or corrupt.

        Steps:
            - Logs the start of initialization.
            - Calls Setup( ) with optional force flag to recreate config.
            - Catches and logs any errors during setup.

        @args
            bForceNew  (bool)   Optional. If true, forces the config file to be removed
                                and regenerated from defaults.

        @returns
            (Promise)  Resolves when initialization completes, or logs an error if setup fails.

        @usage
            const storage = new Storage(envWebFolder, FILE_CFG);
            await storage.Initialize(false);
    */

    async Initialize( bForceNew )
    {
        Log.verbose( `func`, chalk.yellow( `[executed]` ), chalk.white( `📣` ), chalk.blueBright( `<name>` ), chalk.gray( `${ Utils.getFuncName( ) }` ) );

        const bForce = bForceNew || false;

        try
        {
            Log.info( `conf`, chalk.yellow( `[initiate]` ), chalk.white( `ℹ️` ),
                chalk.blueBright( `<msg>` ), chalk.gray( `Initializing config file` ),
                chalk.blueBright( `<file>` ), chalk.gray( `${ this.fileConfig }` ) );

            await new Storage( ).Setup( bForce );
        }
        catch ( err )
        {
            console.log( 'Error writing Metadata.json:' + err.message );
        }
    }

    /*
        Initialize › Setup User Config File

        Sets up a user's config.json file, ensuring it exists and is valid JSON.
        If the file is missing, empty, or invalid, it will be created or replaced.
        Typically, you should call this via Storage( ).Initialize( ) rather than Setup( ) directly.

        Steps:
            - Creates parent directory if it doesn't exist.
            - Removes existing config if bForceNew is true.
            - Validates existing JSON; backs up invalid files.
            - Creates default config if missing.
            - Wires up nconf with argv, env, file, and default values.

        @args
            bForceNew  (bool)   Optional flag to force recreate the config file, wiping all existing data.

        @returns
            (Promise)  Resolves true when initialization completes successfully.

        @usage
            const storage = new Storage(envWebFolder, FILE_CFG);
            await storage.Initialize(false);
    */

    async Setup( bForceNew )
    {
        Log.verbose( `func`, chalk.yellow( `[executed]` ), chalk.white( `📣` ), chalk.blueBright( `<name>` ), chalk.gray( `${ Utils.getFuncName( ) }` ) );

        return new Promise( ( resolve, reject ) =>
        {
            try
            {
                Log.info( `conf`, chalk.yellow( `[generate]` ), chalk.white( `ℹ️` ),
                    chalk.blueBright( `<msg>` ), chalk.gray( `Initializing storage setup` ),
                    chalk.blueBright( `<force>` ), chalk.gray( `${ bForceNew }` ),
                    chalk.blueBright( `<file>` ), chalk.gray( `${ this.fileConfig }` ) );

                /*
                    ensure parent directory exists
                */
                const dirPath = path.dirname( this.fileConfig );

                if ( !fs.existsSync( dirPath ) )
                {
                    fs.mkdirSync( dirPath, { recursive: true });
                }

                /*
                    if force flag is true, remove existing config file (force)
                */

                if ( bForceNew === true && fs.existsSync( this.fileConfig ) )
                {
                    Log.ok( `conf`, chalk.yellow( `[generate]` ), chalk.white( `✅` ),
                        chalk.greenBright( `<msg>` ), chalk.gray( `Remove original config; force new` ),
                        chalk.greenBright( `<file>` ), chalk.gray( `${ this.fileConfig }` ) );

                    try
                    {
                        fs.unlinkSync( this.fileConfig );
                    }
                    catch ( e )
                    {
                        Log.error( `conf`, chalk.redBright( `[generate]` ), chalk.white( `❌` ),
                            chalk.redBright( `<msg>` ), chalk.gray( `Failed to unlink existing config` ),
                            chalk.redBright( `<error>` ), chalk.gray( `${ e.message }` ),
                            chalk.redBright( `<file>` ), chalk.gray( `${ this.fileConfig }` ) );
                    }
                }

                /*
                    if config exists, validate JSON; if invalid, move to backup and recreate
                */

                if ( fs.existsSync( this.fileConfig ) )
                {
                    let raw = null;
                    let parsed = null;

                    try
                    {
                        raw = fs.readFileSync( this.fileConfig, { encoding: 'utf8' });

                        if ( typeof raw !== 'string' || raw.trim( ).length === 0 )
                        {
                            throw new Error( 'Empty config file' );
                        }

                        parsed = JSON.parse( raw );
                    }
                    catch ( e )
                    {
                        const backupPath = `${ this.fileConfig }.corrupt.${ Date.now( ) }`;

                        try
                        {
                            fs.renameSync( this.fileConfig, backupPath );
                            Log.error( `conf`, chalk.redBright( `[generate]` ), chalk.white( `❌` ),
                                chalk.redBright( `<msg>` ), chalk.gray( `Config file invalid; moved to backup` ),
                                chalk.redBright( `<backup>` ), chalk.gray( `${ backupPath }` ),
                                chalk.redBright( `<file>` ), chalk.gray( `${ this.fileConfig }` ) );
                        }
                        catch ( renameErr )
                        {
                            Log.error( `conf`, chalk.redBright( `[generate]` ), chalk.white( `❌` ),
                                chalk.redBright( `<msg>` ), chalk.gray( `Unable to backup invalid config file` ),
                                chalk.redBright( `<error>` ), chalk.gray( `${ renameErr.message }` ),
                                chalk.redBright( `<file>` ), chalk.gray( `${ this.fileConfig }` ) );
                            if ( this.rejected )
                            {
                                reject( renameErr );
                                return;
                            }
                        }
                    }
                }

                /*
                    if config does not exist (or was just moved because it was corrupt), create it atomically
                */

                if ( !fs.existsSync( this.fileConfig ) )
                {
                    const defaults =
                    {
                        deviceId: 'FFFFFFFF'
                    };

                    const tempPath = `${ this.fileConfig }.tmp`;

                    try
                    {
                        fs.writeFileSync( tempPath, JSON.stringify( defaults, null, 4 ), { encoding: 'utf8' });
                        fs.renameSync( tempPath, this.fileConfig );

                        Log.ok( `conf`, chalk.yellow( `[generate]` ), chalk.white( `✅` ),
                            chalk.greenBright( `<msg>` ), chalk.gray( `Created new config file with defaults` ),
                            chalk.greenBright( `<file>` ), chalk.gray( `${ this.fileConfig }` ) );
                    }
                    catch ( writeErr )
                    {
                        Log.error( `conf`, chalk.redBright( `[generate]` ), chalk.white( `❌` ),
                            chalk.redBright( `<msg>` ), chalk.gray( `Failed to create config file` ),
                            chalk.redBright( `<error>` ), chalk.gray( `${ writeErr.message }` ),
                            chalk.redBright( `<file>` ), chalk.gray( `${ this.fileConfig }` ) );

                        if ( this.rejected )
                        {
                            reject( writeErr );
                            return;
                        }
                    }
                }

                /*
                    now that file exists and is valid JSON, wire up nconf
                */

                nconf.argv( ).env({ parseValues: true }).file({ file: this.fileConfig }).defaults(
                {
                    deviceId: 'FFFFFFFF'
                });
            }
            catch ( err )
            {
                Log.error( `conf`, chalk.redBright( `[generate]` ), chalk.white( `❌` ),
                    chalk.redBright( `<msg>` ), chalk.gray( `Could not generate and write to new config file` ),
                    chalk.redBright( `<error>` ), chalk.gray( `${ err.message }` ),
                    chalk.redBright( `<file>` ), chalk.gray( `${ this.fileConfig }` ) );

                if ( this.rejected )
                {
                    reject( err );
                    return;
                }
            }

            resolve( true );
        });
    }

    /*
        Get › Retrieve Configuration Value

        Fetches a stored value from the application's persistent configuration
        using the provided key via the nconf module.

        This function is static, so it can be called without creating a Storage instance.

        @args
            key (str)            The configuration key to retrieve.

        @returns
            (any)                The value associated with the key, or undefined if the key does not exist.

        @usage
            const deviceId = Storage.Get('deviceId');
    */

    static Get( key )
    {
        Log.verbose( `func`, chalk.yellow( `[executed]` ), chalk.white( `📣` ), chalk.blueBright( `<name>` ), chalk.gray( `${ Utils.getFuncName( ) }` ) );

        return nconf.get( key );
    }

    /*
        Set › Store Configuration Value

        Stores a value in the application's persistent configuration using
        the provided key via the nconf module. Automatically saves the
        updated configuration to disk by calling Storage.Save( ).

        This function is static, so it can be called without creating a Storage instance.

        @args
            key   (str)         The configuration key to set.
            value (any)         The value to store under the specified key.

        @returns
            (void)              No return value.

        @usage
            Storage.Set('deviceId', '105B35EF');
    */

    static Set( key, value )
    {
        Log.verbose( `func`, chalk.yellow( `[executed]` ), chalk.white( `📣` ),
            chalk.blueBright( `<name>` ), chalk.gray( `${ Utils.getFuncName( ) }` ) );
    
        nconf.set( key, value );
        Storage.Save( );
    }

    /*
        Save › Persist Configuration to Disk

        Saves the current configuration stored in nconf to disk.
        After saving, the method reads back the file to verify it is valid JSON 
        and logs detailed status messages about success or errors.

        @purpose
            - Calls nconf.save() to write the current configuration.
            - Reads back the saved file.
            - Parses the file as JSON to confirm validity.
            - Logs success or detailed error messages for failures.

        @args
            none

        @returns
            (void)              Logs success or error; does not return a value.

        @usage
            Storage.Save();
    */

    static Save( )
    {
        const filePath = this.fileConfig;
    
        Log.verbose( `func`, chalk.yellow( `[executed]` ), chalk.white( `📣` ),
            chalk.blueBright( `<name>` ), chalk.gray( `${ Utils.getFuncName( ) }` ) );
    
        nconf.save( ( err ) =>
        {
            if ( err )
            {
                Log.error( `conf`, chalk.redBright( `[snapshot]` ), chalk.white( `❌` ),
                    chalk.redBright( `<msg>` ), chalk.gray( `Could not save config` ),
                    chalk.redBright( `<error>` ), chalk.gray( `${ err }` ),
                    chalk.redBright( `<file>` ), chalk.gray( `${ filePath }` ) );
                return;
            }
    
            fs.readFile( filePath, ( err, data ) =>
            {
                if ( err )
                {
                    Log.error( `conf`, chalk.redBright( `[snapshot]` ), chalk.white( `❌` ),
                        chalk.redBright( `<msg>` ), chalk.gray( `Unable to read config file` ),
                        chalk.redBright( `<error>` ), chalk.gray( `${ err }` ),
                        chalk.redBright( `<file>` ), chalk.gray( `${ filePath }` ) );
                    return;
                }
    
                try
                {
                    const parsed = JSON.parse( data.toString( ) );
    
                    Log.ok( `conf`, chalk.yellow( `[snapshot]` ), chalk.white( `✅` ),
                        chalk.greenBright( `<msg>` ), chalk.gray( `Save to config file successful` ),
                        chalk.greenBright( `<file>` ), chalk.gray( `${ filePath }` ) );
    
                    Log.debug( `conf`, chalk.yellow( `[snapshot]` ), chalk.white( `⚙️` ),
                        chalk.blueBright( `<msg>` ), chalk.gray( `Read values from saved config file` ),
                        chalk.blueBright( `<file>` ), chalk.gray( `${ filePath }` ),
                        chalk.blueBright( `<values>` ), chalk.gray( `${ JSON.stringify( parsed ) }` ) );
                }
                catch ( parseErr )
                {
                    Log.error( `conf`, chalk.redBright( `[snapshot]` ), chalk.white( `❌` ),
                        chalk.redBright( `<msg>` ), chalk.gray( `Config file is not valid JSON` ),
                        chalk.redBright( `<error>` ), chalk.gray( `${ parseErr.message }` ),
                        chalk.redBright( `<file>` ), chalk.gray( `${ filePath }` ) );
                }
            });
        });
    }

    /*
        GetConfig › Return Full Path to Config File

        Returns the full path to the currently used config.json file for this Storage instance.
        This is useful when you need to know the exact file location without reading its contents.

        @args
            none

        @returns
            (str)               Absolute path to the config.json file.

        @usage
            const storage_config = Storage.GetConfig();
    */

    static GetConfig( )
    {
        Log.verbose( `func`, chalk.yellow( `[executed]` ), chalk.white( `📣` ), chalk.blueBright( `<name>` ), chalk.gray( `${ Utils.getFuncName( ) }` ) );

        return this.fileConfig;
    }

    /*
        isJsonString › Check if Input is Valid JSON

        Determines whether a given string is valid JSON by attempting
        to parse it. Returns true if parsing succeeds, false if it throws
        an error.

        @args
            json (str)          The string to test for valid JSON.

        @returns
            (bool)              True if input is valid JSON, false otherwise.

        @usage
            const valid = Storage.isJsonString('{"key":"value"}');  // returns true
    */

    static isJsonString( json )
    {
        Log.verbose( `func`, chalk.yellow( `[executed]` ), chalk.white( `📣` ), chalk.blueBright( `<name>` ), chalk.gray( `${ Utils.getFuncName( ) }` ) );

        try
        {
            JSON.parse( json );
        }
        catch ( e )
        {
            return false;
        }

        return true;
    }

    /*
        helper › json object empty
    */

    static isJsonEmpty( json )
    {
        Log.verbose( `func`, chalk.yellow( `[executed]` ), chalk.white( `📣` ), chalk.blueBright( `<name>` ), chalk.gray( `${ Utils.getFuncName( ) }` ) );

        if ( Object.keys( json ).length === 0 )
            return true;

        if ( JSON.stringify( json ) === '\"{}\"' )
            return true;

        for ( const key in json )
        {
            if ( ! Object.prototype.hasOwnProperty.call( json, key ) )
                return true;
        }

        return false;
    }
}

/*
    export class

    @import
        import Storage from './classes/Storage.js';
*/

// eslint-disable-next-line no-restricted-syntax
export default Storage;
