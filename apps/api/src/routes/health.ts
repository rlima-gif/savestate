import { Hono } from 'hono';
import { Env } from '../types';

export const healthRouter = new Hono<{ Bindings: Env }>();

healthRouter.get('/health', (c) => {
  return c.json({
    status: 'ok',
    app: 'SaveState Backend API',
    version: '0.1.0',
    environment: c.env.ENVIRONMENT || 'development',
    timestamp: new Date().toISOString(),
    features: {
      aiAssistant: c.env.AI_FEATURE_ENABLED !== 'false',
      geminiConfigured: Boolean(c.env.GEMINI_API_KEY),
      rawgConfigured: Boolean(c.env.RAWG_API_KEY),
      d1Connected: Boolean(c.env.DB),
    },
  });
});
