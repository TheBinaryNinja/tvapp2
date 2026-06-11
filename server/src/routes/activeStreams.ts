import { Router } from 'express';
import { ActiveStream } from '../models/ActiveStream.js';

export const activeStreamsRouter = Router();

activeStreamsRouter.get('/', async (_req, res, next) => {
  try {
    const docs = await ActiveStream.find({}, { _id: 0 }).lean();
    res.json(docs);
  } catch (err) {
    next(err);
  }
});
