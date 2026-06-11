import { Schema, model } from 'mongoose';
const SourceChannelSchema = new Schema({
    _id: { type: String, required: true },
    source: { type: String, required: true },
    sourceChannelId: { type: String, required: true },
    name: { type: String, required: true },
    category: { type: String, default: null },
    groupKey: { type: String, required: true },
    groupLabel: { type: String, required: true },
    logoUrl: { type: String, default: null },
    streamEntryUrl: { type: String, required: true },
    isPlayable: { type: Boolean, required: true },
    sourceCreatedAt: { type: String, default: null },
    sourceUpdatedAt: { type: String, default: null },
    ingestedAt: { type: String, required: true },
}, { versionKey: false });
// Covers the per-source grouped/ordered listing query (source → groupKey → name).
SourceChannelSchema.index({ source: 1, groupKey: 1, name: 1 });
// Dead-channel / playable filtering per source.
SourceChannelSchema.index({ source: 1, isPlayable: 1 });
export const SourceChannel = model('SourceChannel', SourceChannelSchema);
//# sourceMappingURL=SourceChannel.js.map