/*
    Class › Tuner

    Handles HDHomeRun device management and deviceId lifecycle.

    @purpose
        - Generate / format HDHomeRun device IDs.
        - Validate device IDs against HDHomeRun rules (length, hex chars, checksum).
        - Persist device IDs using Storage class.
        - Automatically generate new device ID if missing, invalid, or uninitialized (FFFFFFFF).
        - Initialize tuner instances with validated device IDs.

    @usage
        await new Tuner( Storage.Get( 'deviceId' ) ).Initialize( );
        const tuner = new Tuner( );
        await tuner.Initialize( );
        const validId = await tuner.VerifyDeviceId( );

    @notes
        - Device IDs are persisted via the Storage class (config.json).
        - User's device id must be valid before HDHomeRun will initialize.
*/


import chalk from 'chalk';
import Storage from './Storage.js';
import Utils from './Utils.js';
import Log from './Log.js';

/*
    Class › Tuner

    constructor         ( str:deviceId )
    Initialize          ( )
    Start               ( )
    _GenerateDeviceId   ( int:len )
    GenerateDeviceId    ( )
    GetDeviceId         ( )
    FormatDeviceId      ( str:deviceid )
    IsDeviceIdValid     ( )
    VerifyDeviceId      ( )
*/

class Tuner
{
    constructor( deviceId )
    {
        Log.verbose( `func`, chalk.yellow( `[executed]` ), chalk.white( `📣` ), chalk.blueBright( `<name>` ), chalk.gray( `${ Utils.getConstructorName( ) }` ) );

        this.Name = `HDHomeRun`;
        this.FriendlyName = `TVApp2`;
        this.ModelNumber = `HDHR5-4US`;
        this.FirmwareName = `hdhomerun5_atsc`;
        this.FirmwareVersion = `0.9.15.00-RC04`;
        this.SlotsConnected = 0;
        this.SlotsMax = 10;
        this.DeviceId = deviceId || Storage.Get( 'deviceId' );
    }

    /*
        Initialize › Setup and Start Tuner

        Initializes the tuner by calling the Start( ) method.
        Catches and logs any errors encountered during startup.

        @args
            none

        @returns
            (void)              Logs status; does not return a value.

        @usage
            await tuner.Initialize( );
    */

    async Initialize( )
    {
        Log.verbose( `func`, chalk.yellow( `[executed]` ), chalk.white( `📣` ), chalk.blueBright( `<name>` ), chalk.gray( `${ Utils.getFuncName( ) }` ) );

        try
        {
            await this.Start( );
        }
        catch ( err )
        {
            Log.error( `hdhr`, chalk.redBright( `[initiate]` ), chalk.white( `❌` ),
                chalk.redBright( `<msg>` ), chalk.gray( `Failure initializing tuner` ),
                chalk.redBright( `<error>` ), chalk.gray( `${ err.message }` ) );
        }
    }

    /*
        Start › Initialize and Verify Device ID

        Starts the tuner by verifying the current deviceId.
        If the deviceId is missing or invalid, it will be regenerated and validated.
        Logs the status of the deviceId once verification completes.

        @args
            none

        @returns
            (bool)              true if deviceId is valid after verification, false otherwise.

        @usage
            await tuner.Start( );
    */

    async Start( )
    {
        Log.verbose( `func`, chalk.yellow( `[executed]` ), chalk.white( `📣` ), chalk.blueBright( `<name>` ), chalk.gray( `${ Utils.getFuncName( ) }` ) );

        const verifiedId = await new Tuner( ).VerifyDeviceId( this.DeviceId );

        if ( await this.IsDeviceIdValid( verifiedId ) )
        {
            Log.ok( `conf`, chalk.yellow( `[validate]` ), chalk.white( `✅` ),
                chalk.greenBright( `<msg>` ), chalk.gray( `User has valid deviceId` ),
                chalk.greenBright( `<deviceId>` ), chalk.gray( `${ verifiedId }` ) );
        }
    }

    /*
        _GenerateDeviceId › Generate Raw Random Hexadecimal String

        Generates a raw random hexadecimal string using Node.js crypto module.
        This is typically used as the random portion of a deviceId.

        @args
            len (int)           Optional number of bytes to generate. Defaults to 4 bytes.

        @returns
            (str)               Uppercase hexadecimal string, length = len * 2 characters.

        @usage
            const randomHex = Tuner._GenerateDeviceId( 4 );  // 8-character hex string
    */

    static _GenerateDeviceId( len )
    {
        Log.verbose( `func`, chalk.yellow( `[executed]` ), chalk.white( `📣` ), chalk.blueBright( `<name>` ), chalk.gray( `${ Utils.getFuncName( ) }` ) );

        return crypto.randomBytes( len || 4 ).toString( 'hex' ).toUpperCase( );
    }

    /*
        GenerateDeviceId › Generate New HDHomeRun Device ID

        Generates a new, properly formatted HDHomeRun deviceId.

        Steps:
            - Generates 4 random hexadecimal characters.
            - Prepends '105' and appends '0' to form base deviceId.
            - Passes baseId to Tuner.FormatDeviceId( ) to ensure correct checksum and 8-character format.

        @args
            None

        @returns
            (str)               A valid, 8-character HDHomeRun deviceId in uppercase hexadecimal.

        @usage
            const newDeviceId = Tuner.GenerateDeviceId( );
    */

    static GenerateDeviceId( )
    {
        Log.verbose( `func`, chalk.yellow( `[executed]` ), chalk.white( `📣` ), chalk.blueBright( `<name>` ), chalk.gray( `${ Utils.getFuncName( ) }` ) );

        const chars = '0123456789ABCDEF';
        let randomHex = '';

        // generate 4 random hexadecimal chars
        for ( let i = 0;i < 4;i++ )
        {
            randomHex += chars[Math.floor( Math.random( ) * chars.length )];
        }

        const baseId =  '105' + randomHex + '0';
        return this.FormatDeviceId( baseId );
    }

    /*
        GetDeviceId › Retrieve Stored HDHomeRun Device ID

        Fetches the current deviceId from persistent storage (via Storage.Get).

        @args
            None

        @returns
            (str)               The current deviceId stored in configuration.

        @usage
            const deviceId = await tuner.GetDeviceId( );
    */

    GetDeviceId( )
    {
        Log.verbose( `func`, chalk.yellow( `[executed]` ), chalk.white( `📣` ), chalk.blueBright( `<name>` ), chalk.gray( `${ Utils.getFuncName( ) }` ) );

        return Storage.Get( 'deviceId' );
    }

    /*
        FormatDeviceId › Validate and Format HDHomeRun Device ID

        Fetches the provided deviceId (or instance default) and ensures it is valid
        according to HDHomeRun rules, then returns a properly formatted ID.

        Steps:
            - Input must be exactly 8 hexadecimal characters.
            - All characters must be 0-9 or A-F/a-f.
            - Computes checksum using HDHomeRun-specific lookup table.
            - Generates a new deviceId integer with checksum applied.
            - Converts back to 8-character uppercase hexadecimal string.

        Logs detailed errors if the input deviceId is invalid.

        @args
            deviceid (str)      Optional deviceId to format. Defaults to instance deviceId.

        @returns
            (str|int)           Formatted 8-character hex deviceId, or 0 if input invalid.

        @usage
            const formattedId = Tuner.FormatDeviceId( someDeviceId );
    */

    static FormatDeviceId( deviceid )
    {
        Log.verbose( `func`, chalk.yellow( `[executed]` ), chalk.white( `📣` ), chalk.blueBright( `<name>` ), chalk.gray( `${ Utils.getFuncName( ) }` ) );

        const deviceId = deviceid || this.DeviceId;

        /*
            Validate input length
        */

        if ( !deviceId || deviceId.length !== 8 )
        {
            Log.error( `hdhr`, chalk.redBright( `[validate]` ), chalk.white( `❌` ),
                chalk.redBright( `<msg>` ), chalk.gray( `HDHomeRun deviceId must be 8 hexadecimals` ),
                chalk.redBright( `<deviceId>` ), chalk.gray( `${ deviceId }` ) );

            return 0;
        }

        /*
            All chars should be valid hexadecimal
        */

        const hexPattern = /^[0-9A-Fa-f]+$/;
        if ( !hexPattern.test( deviceId ) )
        {
            Log.error( `hdhr`, chalk.redBright( `[validate]` ), chalk.white( `❌` ),
                chalk.redBright( `<msg>` ), chalk.gray( `HDHomeRun deviceId must contain all hex (0-9, A-F, a-f)` ),
                chalk.redBright( `<deviceId>` ), chalk.gray( `${ deviceId }` ) );

            return 0;
        }

        /*
            Hex string to integer
        */

        const deviceIdInt = parseInt( deviceId, 16 );

        /*
            Checksum lookup table
        */

        const checksumLookup =
        [
            0xA, 0x5, 0xF, 0x6, 0x7, 0xC, 0x1, 0xB, 0x9, 0x2, 0x8, 0xD, 0x4, 0x3, 0xE, 0x0
        ];

        /*
            Calc checksum
        */

        let checksum = 0;
        checksum ^= checksumLookup[( deviceIdInt >> 28 ) & 0x0F];
        checksum ^= ( deviceIdInt >> 24 ) & 0x0F;
        checksum ^= checksumLookup[( deviceIdInt >> 20 ) & 0x0F];
        checksum ^= ( deviceIdInt >> 16 ) & 0x0F;
        checksum ^= checksumLookup[( deviceIdInt >> 12 ) & 0x0F];
        checksum ^= ( deviceIdInt >> 8 ) & 0x0F;
        checksum ^= checksumLookup[( deviceIdInt >> 4 ) & 0x0F];

        /*
            Calc new device ID
        */

        const newDevId = ( deviceIdInt & 0xFFFFFFF0 ) + checksum;

        /*
            Convert back to hex string; ensure we get 8 characters with leading zeros; convert to uppercase
        */

        return newDevId.toString( 16 ).toUpperCase( ).padStart( 8, '0' );
    }

    /*
        IsDeviceIdValid › Validate HDHomeRun Device ID

        Checks if the current deviceId on this instance is valid according to HDHomeRun rules.

        Validation steps:
            - Must be exactly 8 characters long.
            - All characters must be hexadecimal (0-9, A-F, a-f).
            - Computes checksum using HDHomeRun-specific lookup table; must equal 0.

        Logs detailed errors if the deviceId fails any validation step.

        @returns
            (bool)              true if deviceId is valid, false otherwise.

        @usage
            const isValid = await tuner.IsDeviceIdValid( );
    */

    async IsDeviceIdValid( )
    {
        Log.verbose( `func`, chalk.yellow( `[executed]` ), chalk.white( `📣` ), chalk.blueBright( `<name>` ), chalk.gray( `${ Utils.getFuncName( ) }` ) );

        /*
            Define Hexadecimal charset (0-9, A-F, a-f)
        */

        const hexDigits = new Set( '0123456789ABCDEFabcdef' );
        const deviceId = this.DeviceId;

        /*
            Check if device ID is exactly 8 characters
        */

        if ( !deviceId || deviceId.length !== 8 )
        {
            Log.error( `hdhr`, chalk.redBright( `[validate]` ), chalk.white( `❌` ),
                chalk.redBright( `<msg>` ), chalk.gray( `HDHomeRun deviceId must be 8 hexadecimals` ),
                chalk.redBright( `<deviceId>` ), chalk.gray( `${ deviceId }` ) );

            return false;
        }

        /*
            Check if all characters are hexadecimal
        */

        if ( !Array.from( deviceId ).every( ( c ) => hexDigits.has( c ) ) )
        {
            Log.error( `hdhr`, chalk.redBright( `[validate]` ), chalk.white( `❌` ),
                chalk.redBright( `<msg>` ), chalk.gray( `HDHomeRun deviceId must contain all hex (0-A)` ),
                chalk.redBright( `<deviceId>` ), chalk.gray( `${ deviceId }` ) );

            return false;
        }

        /*
            Convert hex string to integer (equivalent to int.from_bytes with big endian)
        */

        const deviceIdInt = parseInt( deviceId, 16 );

        /*
            Checksum lookup table
        */

        const checksumLookup =
        [
            0xA, 0x5, 0xF, 0x6, 0x7, 0xC, 0x1, 0xB, 0x9, 0x2, 0x8, 0xD, 0x4, 0x3, 0xE, 0x0
        ];

        /*
            Calc checksum
        */

        let checksum = 0;
        checksum ^= checksumLookup[( deviceIdInt >>> 28 ) & 0x0F];
        checksum ^= ( deviceIdInt >>> 24 ) & 0x0F;
        checksum ^= checksumLookup[( deviceIdInt >>> 20 ) & 0x0F];
        checksum ^= ( deviceIdInt >>> 16 ) & 0x0F;
        checksum ^= checksumLookup[( deviceIdInt >>> 12 ) & 0x0F];
        checksum ^= ( deviceIdInt >>> 8 ) & 0x0F;
        checksum ^= checksumLookup[( deviceIdInt >>> 4 ) & 0x0F];
        checksum ^= ( deviceIdInt >>> 0 ) & 0x0F;

        return checksum === 0;
    }

    /*
        VerifyDeviceId › Validate / Generate Device ID

        Checks if the current deviceId on this instance is valid. 

        If missing, uninitialized ('FFFFFFFF'), or fails validation:
            a new deviceId is generated via the static Tuner.GenerateDeviceId( ) method. 

        New deviceId is saved to persistent storage via Storage.Set( ) and 
        updated on the instance.
        
        Function also recursively verifies until a valid deviceId is established.

        @returns
            (str)               A valid deviceId for this tuner instance.

        @usage
            const validId = await tuner.VerifyDeviceId( );
    */

    async VerifyDeviceId( )
    {
        Log.verbose( `func`, chalk.yellow( `[executed]` ), chalk.white( `📣` ), chalk.blueBright( `<name>` ), chalk.gray( `${ Utils.getFuncName( ) }` ) );
    
        const deviceId = this.DeviceId;
    
        if ( !deviceId || deviceId === 'FFFFFFFF' || !await this.IsDeviceIdValid( ) )
        {
            const deviceIdNew = Tuner.GenerateDeviceId( );   // static generates a properly formatted ID
            if ( deviceId === 'FFFFFFFF' )
            {
                Log.info( `conf`, chalk.yellow( `[generate]` ), chalk.white( `📣` ),
                    chalk.yellow( `<msg>` ), chalk.gray( `Generating HDHomeRun deviceId for the first time` ),
                    chalk.yellow( `<deviceId>` ), chalk.gray( `${ deviceIdNew }` ) );
            }
            else
            {
                Log.error( `conf`, chalk.redBright( `[generate]` ), chalk.white( `❌` ),
                    chalk.redBright( `<msg>` ), chalk.gray( `Invalid deviceId; generating new` ),
                    chalk.redBright( `<oldDeviceId>` ), chalk.gray( `${ deviceId }` ),
                    chalk.redBright( `<deviceIdNew>` ), chalk.gray( `${ deviceIdNew }` ) );
            }
    
            Storage.Set( 'deviceId', deviceIdNew );        // save to JSON via nconf
            this.DeviceId = deviceIdNew;                   // update the instance so validation works
    
            // verify recursively until valid
            const verifiedId = await this.VerifyDeviceId( );
            return verifiedId;
        }
    
        return deviceId;
    }
}

/*
    export class

    @image
        import Tuner from './classes/Tuner.js';
*/

// eslint-disable-next-line no-restricted-syntax
export default Tuner;
