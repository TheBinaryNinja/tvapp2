import { Router } from 'express';
import { StreamSession } from '../models/StreamSession.js';
export const streamSessionsRouter = Router();
streamSessionsRouter.get('/', async (_req, res, next) => {
    try {
        const docs = await StreamSession.find({}, { _id: 0, order: 0 }).sort({ order: 1 }).lean();
        res.json(docs);
    }
    catch (err) {
        next(err);
    }
});
//# sourceMappingURL=streamSessions.js.map