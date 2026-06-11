import { Router } from 'express';
import { Channel } from '../models/Channel.js';
import { SourceChannel } from '../models/SourceChannel.js';
export const channelsRouter = Router();
// GET /api/channels            → legacy mock channels (drives the existing dashboard bootstrap)
// GET /api/channels?source=<id> → canonical normalized SourceChannel docs for a (Default) source
//                                 playlist (the d-combine "path forward" contract, served over Mongo)
channelsRouter.get('/', async (req, res, next) => {
    try {
        const source = typeof req.query.source === 'string' ? req.query.source : null;
        if (source) {
            const docs = await SourceChannel.find({ source }).sort({ groupKey: 1, name: 1 }).lean();
            return res.json(docs);
        }
        const docs = await Channel.find({}, { _id: 0 }).lean();
        res.json(docs);
    }
    catch (err) {
        next(err);
    }
});
//# sourceMappingURL=channels.js.map