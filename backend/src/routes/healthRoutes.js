import { Router } from 'express';
import { databaseStatus } from '../config/database.js';

export const healthRoutes = Router();
healthRoutes.get('/', (req, res) => {
  const database = databaseStatus();
  const available = database === 'conectada';
  res.status(available ? 200 : 503).json({
    status: available ? 'ok' : 'degradado',
    service: 'ProspectorAI',
    database,
  });
});
