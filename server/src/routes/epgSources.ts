import { Router } from 'express';
import { EpgSource } from '../models/EpgSource.js';

export const epgSourcesRouter = Router();

epgSourcesRouter.get('/', async (_req, res, next) => {
  try {
    const docs = await EpgSource.find({}, { _id: 0 }).lean();
    res.json(docs);
  } catch (err) {
    next(err);
  }
});
