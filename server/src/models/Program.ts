import { Schema, model } from 'mongoose';

const ProgramSchema = new Schema(
  {
    channelId: { type: String, required: true, index: true },
    start: { type: Number, required: true },
    end: { type: Number, required: true },
    title: { type: String, required: true },
    cat: { type: String, required: true },
  },
  { versionKey: false },
);

ProgramSchema.index({ channelId: 1, start: 1 });

export const Program = model('Program', ProgramSchema);
