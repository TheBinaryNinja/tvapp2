import { spawn } from 'child_process';
import http from 'http';

const port = process.env.WEB_PORT || 4124;
const server = spawn( 'node', ['index.js'], {
  stdio: 'inherit',
  env: { ...process.env, LOG_LEVEL: '1' }
});

const timeout = setTimeout( () =>
{
  console.error( 'Smoke test timed out' );
  server.kill();
  process.exit( 1 );
}, 30000 );

server.on( 'error', ( err ) =>
{
    console.error( 'Failed to start server:', err );
    clearTimeout( timeout );
    process.exit( 1 );
});

server.on( 'exit', ( code ) =>
{
    if ( code !== null && code !== 0 )
    {
        console.error( `Server exited with code ${ code }` );
        clearTimeout( timeout );
        process.exit( 1 );
    }
});

const checkServer = () =>
{
    http.get( `http://localhost:${ port }/api/health?silent=true`, ( res ) =>
{
    if ( res.statusCode === 200 )
{
      console.log( 'Server is healthy!' );
      clearTimeout( timeout );
      server.kill();
      process.exit( 0 );
    }
 else
{
      setTimeout( checkServer, 1000 );
    }
  }).on( 'error', () =>
{
    setTimeout( checkServer, 1000 );
  });
};

setTimeout( checkServer, 2000 );
