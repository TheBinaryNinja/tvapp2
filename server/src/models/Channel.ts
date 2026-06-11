import { Schema, model } from 'mongoose';

const ChannelSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    tvg_name: { type: String, required: true },
    group: { type: String, required: true },
    channel: { type: Number, required: true },
    tvg_id: { type: String, default: null },
    state: { type: String, enum: ['active', 'disabled'], required: true },
    epg: { type: String, enum: ['matched', 'unmatched'], required: true },
    source: { type: String, required: true },
    url: { type: String, required: true, unique: true },
    status: { type: String, required: true },
    res: { type: String, required: true },
    logoColor: { type: String, required: true },
    initials: { type: String, required: true },
  },
  { versionKey: false },
);

export const Channel = model('Channel', ChannelSchema);
