import { Schema, model } from 'mongoose';

const ActivitySchema = new Schema(
  {
    when: { type: String, required: true },
    icon: { type: String, required: true },
    html: { type: String, required: true },
    order: { type: Number, required: true, index: true },
  },
  { versionKey: false },
);

export const Activity = model('Activity', ActivitySchema);
