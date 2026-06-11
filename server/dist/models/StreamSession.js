import { Schema, model } from 'mongoose';
const StreamSessionSchema = new Schema({
    ip: { type: String, required: true },
    region: { type: String, required: true },
    client: { type: String, required: true },
    joined: { type: String, required: true },
    bitrate: { type: String, required: true },
    order: { type: Number, required: true, index: true },
}, { versionKey: false });
export const StreamSession = model('StreamSession', StreamSessionSchema);
//# sourceMappingURL=StreamSession.js.map