#!/usr/bin/env node

/*
    build by running
        npm run build

    guid and uuid will be automatically generated and placed
    inside .env file which will then be read by the github workflow
    build script.
*/

/*
    This script handles the following:
        - read package.json
        - create .env file
        - return uuid, guid, version

    can be called with the following external commands:
        - node root.js                 returns version of root
        - node root.js generate        generates uuid / guid and shows all env vars in console
        - node root.js uuid            returns root uuid
        - node root.js guid            returns root guid
        - node root.js version         returns version of root

    can be called with the following root commands:
        - npm run root
        - npm run root:generate
        - npm run env-root
        - npm run env-uuid
        - npm run env-guid
        - npm run env-version
*/

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import { v5 as uuidv5 } from 'uuid';

/*
*    declarations › package.json
*/

// Only use fs in Node.js environment (not available in mobile runtimes)
const isNode = process?.release?.name === 'node';
let version = '0.0.0';
let repository = { url: '' };
let packageReadError = null;

if ( isNode )
{
    try
    {
        const pkg = JSON.parse( require( 'fs' ).readFileSync( 'package.json', 'utf8' ) );
        version = pkg.version;
        repository = pkg.repository || { url: '' };
    }
    catch ( e )
    {
        packageReadError = e;
    }
}

const args = typeof process !== 'undefined' && process.argv ? process.argv.slice(2, process.argv.length) : [];
const action = args[0];
// const a       = args[ 1 ];
// const b       = args[ 2 ];

if (action === 'guid') {
    console.log(`${process.env.GUID}`)
} else if (action === 'setup') {
    if ( isNode )
    {
        try {
            require('fs').writeFileSync('.env', '')
            console.log(`Wrote to .env successfully`)
        } catch (err) {
            console.error('Error writing .env:', err)
        }
    } else {
        console.error(`'setup' action not available in non-Node.js environment`)
    }
} else if (action === 'generate') {
    if ( isNode && packageReadError )
    {
        console.error( `Unable to read package.json in Node.js environment: ${ packageReadError.message }` );
        process.exit( 1 );
    }

    // Fail fast if using placeholder values in non-Node environment
    if ( !isNode && ( repository.url === '' || version === '0.0.0' ) )
    {
        console.error( `'generate' action requires running in Node.js to read package.json for version and repository URL` );
        process.exit( 1 );
    }

    {
        const buildGuid = uuidv5( `${repository.url}`, uuidv5.URL );
        const buildUuid = uuidv5( version, buildGuid );

        const ids = `
VERSION=${version}
GUID=${buildGuid}
UUID=${buildUuid}
`

        console.log( version );
        console.log( buildGuid );
        console.log( buildUuid );

        if ( isNode )
        {
            try
            {
                require( 'fs' ).writeFileSync( '.env', ids );
                console.log( `Wrote env vars to .env` );
            }
            catch ( err )
            {
                console.error( 'Error writing .env:', err );
            }
        }
        else
        {
            console.warn( `.env file not written - 'generate' action requires Node.js environment` );
        }
    }
} else if (action === 'uuid') {
    console.log(`${process.env.UUID}`)
} else {
    console.log(version)
}

if (typeof process !== 'undefined' && typeof process.exit === 'function') {
    process.exit(0)
}
