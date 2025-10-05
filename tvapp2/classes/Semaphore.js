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
    export class

    @usage          import Log from './classes/Log.js';
*/

// eslint-disable-next-line no-restricted-syntax
export default Semaphore;

