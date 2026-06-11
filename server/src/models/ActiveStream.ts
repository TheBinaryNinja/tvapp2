import { Schema, model } from 'mongoose';

const ActiveStreamSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    channelId: { type: String, required: true, index: true },
    status: { type: String, required: true },
    uptime: { type: String, required: true },
    uptimeMin: { type: Number, required: true },
    viewers: { type: Number, required: true },
    peakViewers: { type: Number, required: true },
    bitrate: { type: Number, required: true },
    targetBitrate: { type: Number, required: true },
    codec: { type: String, required: true },
    audio: { type: String, required: true },
    container: { type: String, required: true },
    resolution: { type: String, required: true },
    fps: { type: Number, required: true },
    sourceUrl: { type: String, required: true },
    sourceHost: { type: String, required: true },
    droppedFrames: { type: Number, required: true },
    droppedRatio: { type: Number, required: true },
    latency: { type: Number, required: true },
    bandwidth: { type: Number, required: true },
  },
  { versionKey: false },
);

export const ActiveStream = model('ActiveStream', ActiveStreamSchema);
