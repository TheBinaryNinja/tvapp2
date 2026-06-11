import mongoose from 'mongoose';
export async function connect(uri) {
    mongoose.connection.on('error', (err) => {
        console.error('[mongo] connection error:', err.message);
    });
    mongoose.connection.on('disconnected', () => {
        console.warn('[mongo] disconnected');
    });
    mongoose.connection.on('reconnected', () => {
        console.info('[mongo] reconnected');
    });
    await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000,
        maxPoolSize: 10,
    });
    console.info('[mongo] connected');
}
export async function disconnect() {
    await mongoose.disconnect();
}
export function isConnected() {
    return mongoose.connection.readyState === 1;
}
//# sourceMappingURL=db.js.map