import { Schema, model } from 'mongoose';
const EpgSourceSchema = new Schema({
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    url: { type: String, required: true },
    channels: { type: Number, required: true },
    programs: { type: Number, required: true },
    lastSync: { type: String, required: true },
    status: { type: String, required: true },
    auto: { type: Boolean, required: true },
    interval: { type: String, required: true },
    builtin: { type: Boolean },
}, { versionKey: false });
export const EpgSource = model('EpgSource', EpgSourceSchema);
//# sourceMappingURL=EpgSource.js.map