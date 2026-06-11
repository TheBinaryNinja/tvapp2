import { Schema, model } from 'mongoose';
const CustomPlaylistSchema = new Schema({
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    slug: { type: String, required: true, index: true },
    channels: { type: Number, required: true },
    updated: { type: String, required: true },
}, { versionKey: false });
export const CustomPlaylist = model('CustomPlaylist', CustomPlaylistSchema);
//# sourceMappingURL=CustomPlaylist.js.map