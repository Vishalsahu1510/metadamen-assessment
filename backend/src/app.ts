import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { sessionRouter } from './routes/sessionRoutes.js';
import { audioRouter } from './routes/audioRoutes.js';
import { config } from './config/env.js';

import { db } from './db/database.js';

export const createApp = (): Express => {
  const app = express();

  // Middleware
  app.use(cors({ origin: '*' }));
  app.use(express.json());

  // Health check endpoint
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      system: 'VAANI™ Adaptive AI Interview & Assessment Intelligence',
      aiProvider: config.aiProvider,
      geminiConfigured: Boolean(config.geminiApiKey),
      groqConfigured: Boolean(config.groqApiKey),
      database: db.getEngineType(),
      timestamp: new Date().toISOString(),
    });
  });

  // Mount routers
  app.use('/api/sessions', sessionRouter);
  app.use('/api/audio', audioRouter);

  // 404 handler
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Endpoint not found' });
  });

  // Global Error Handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Unhandled Server Error:', err);
    res.status(err.status || 500).json({
      error: 'Internal Server Error',
      message: err.message || 'An unexpected error occurred.',
    });
  });

  return app;
};
