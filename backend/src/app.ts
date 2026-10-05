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

  // Health check endpoint (support both /api/health and /health)
  const healthHandler = (_req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      system: 'VAANI™ Adaptive AI Interview & Assessment Intelligence',
      aiProvider: config.aiProvider,
      geminiConfigured: Boolean(config.geminiApiKey),
      groqConfigured: Boolean(config.groqApiKey),
      database: db.getEngineType(),
      timestamp: new Date().toISOString(),
    });
  };

  app.get('/api/health', healthHandler);
  app.get('/health', healthHandler);
  app.get('/', (_req: Request, res: Response) => {
    res.json({ status: 'healthy', service: 'vaani-backend' });
  });

  // Mount routers (support both with and without /api prefix for flexible Vercel reverse proxy / services rewrites)
  app.use('/api/sessions', sessionRouter);
  app.use('/sessions', sessionRouter);
  app.use('/api/audio', audioRouter);
  app.use('/audio', audioRouter);

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

const app = createApp();
export default app;
