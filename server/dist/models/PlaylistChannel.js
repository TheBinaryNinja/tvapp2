import { Schema, model } from 'mongoose';
const PlaylistChannelSchema = new Schema({
    playlistId: { type: String, required: true, index: true },
    channelId: { type: String, required: true, index: true },
    order: { type: Number, required: true },
}, { versionKey: false });
PlaylistChannelSchema.index({ playlistId: 1, channelId: 1 }, { unique: true });
PlaylistChannelSchema.index({ playlistId: 1, order: 1 });
export const PlaylistChannel = model('PlaylistChannel', PlaylistChannelSchema);
//# sourceMappingURL=PlaylistChannel.js.map