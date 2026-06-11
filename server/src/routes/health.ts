import { Router } from 'express';
import { isConnected } from '../db.js';

export const healthRouter = Router();

healthRouter.get('/', (_req, res) => {
  res.json({ ok: true, mongo: isConnected() ? 'connected' : 'disconnected' });
});
