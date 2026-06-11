import { Router } from 'express';
import { Program } from '../models/Program.js';

export const programsRouter = Router();

// All programs, grouped by channelId — matches the EPG_PROGRAMS shape the SPA expects.
programsRouter.get('/', async (_req, res, next) => {
  try {
    const docs = await Program.find({}, { _id: 0 }).sort({ channelId: 1, start: 1 }).lean();
    const grouped: Record<string, Array<{ start: number; end: number; title: string; cat: string }>> = {};
    for (const d of docs) {
      const list = grouped[d.channelId] ?? (grouped[d.channelId] = []);
      list.push({ start: d.start, end: d.end, title: d.title, cat: d.cat });
    }
    res.json(grouped);
  } catch (err) {
    next(err);
  }
});
