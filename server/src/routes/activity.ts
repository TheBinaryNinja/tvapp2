import { Router } from 'express';
import { Activity } from '../models/Activity.js';

export const activityRouter = Router();

activityRouter.get('/', async (_req, res, next) => {
  try {
    const docs = await Activity.find({}, { _id: 0, order: 0 }).sort({ order: 1 }).lean();
    res.json(docs);
  } catch (err) {
    next(err);
  }
});
