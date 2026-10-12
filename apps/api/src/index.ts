import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Env } from './types';
import { healthRouter } from './routes/health';
import { catalogRouter } from './routes/catalog';
import { assistantRouter } from './routes/assistant';
import { guidesRouter } from './routes/guides';

const app = new Hono<{ Bindings: Env }>();

// Permissive CORS for native mobile app & local dev
app.use(
  '*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// Global Error Handler
app.onError((err, c) => {
  console.error('Unhandled API Error:', err);
  return c.json(
    {
      error: 'Erro interno no servidor.',
      message: err.message,
    },
    500
  );
});

// Mount Routes
app.route('/', healthRouter);
app.route('/api', catalogRouter);
app.route('/api', assistantRouter);
app.route('/api', guidesRouter);

export default app;
