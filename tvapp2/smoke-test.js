import { spawn } from 'child_process';
import http from 'http';

const server = spawn( 'node', ['index.js'], {
  stdio: 'inherit',
  env: { ...process.env, LOG_LEVEL: '1' } // Error level to reduce noise
});

const timeout = setTimeout( () =>
{
  console.error( 'Smoke test timed out' );
  server.kill();
  process.exit( 1 );
}, 30000 );

const checkServer = () =>
{
  http.get( 'http://localhost:4124/api/health?silent=true', ( res ) =>
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
