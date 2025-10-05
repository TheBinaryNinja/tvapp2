class Utils
{
    /*
        Returns the name of the function that this function was called from.
        used for Log.verbose
    */

    static getFuncName()
    {
        return ( new Error() ).stack.match( /at (\S+)/g )[1].slice( 3 );
    }

    /*
        Returns the name of the constructor that this function was called from.
        used for Log.verbose
    */

    static getConstructorName()
    {
        return ( new Error() ).stack.match( /new\s+(\w+)/g )[0];
    }

    /*
        helper > str2bool
    */

    static str2bool( str )
    {
        if ( typeof str === 'string' )
        {
            const lower = str.toLowerCase();
            if ([
                '1', 'true', 'yes', 'y', 't'
                ].includes( lower ) )
                str = true;
            if ([
                '0', 'false', 'no', 'n', 'f'
                ].includes( lower ) )
                str = false;
            return str;
        }
        else return Boolean( str );
    }
}

// eslint-disable-next-line no-restricted-syntax
export default Utils;
