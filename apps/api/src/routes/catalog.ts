import { Hono } from 'hono';
import { Env } from '../types';
import { searchCatalog, getGameDetails } from '../services/catalog';

export const catalogRouter = new Hono<{ Bindings: Env }>();

catalogRouter.get('/catalog/search', async (c) => {
  const query = c.req.query('q') || '';
  const page = Math.max(1, parseInt(c.req.query('page') || '1', 10));
  const pageSize = Math.min(40, Math.max(1, parseInt(c.req.query('pageSize') || '20', 10)));
  const allowMock = c.req.query('mock') === 'true' || c.env.ENVIRONMENT === 'test';

  const result = await searchCatalog(query, page, pageSize, c.env.RAWG_API_KEY, allowMock);
  return c.json(result);
});

catalogRouter.get('/catalog/games/:id', async (c) => {
  const id = c.req.param('id');
  const details = await getGameDetails(id, c.env.RAWG_API_KEY);

  if (!details) {
    return c.json({ error: 'Jogo não encontrado no catálogo' }, 404);
  }

  return c.json(details);
});
