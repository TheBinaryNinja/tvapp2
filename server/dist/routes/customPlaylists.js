import { Router } from 'express';
import { CustomPlaylist } from '../models/CustomPlaylist.js';
export const customPlaylistsRouter = Router();
customPlaylistsRouter.get('/', async (_req, res, next) => {
    try {
        const docs = await CustomPlaylist.find({}, { _id: 0 }).lean();
        res.json(docs);
    }
    catch (err) {
        next(err);
    }
});
//# sourceMappingURL=customPlaylists.js.map