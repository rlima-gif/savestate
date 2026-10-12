import { Hono } from 'hono';
import { Env } from '../types';
import { searchCatalog, getGameDetails } from '../services/catalog';

export const catalogRouter = new Hono<{ Bindings: Env }>();

catalogRouter.get('/catalog/search', async (c) => {
  const rawQ = c.req.query('q') || '';
  if (rawQ.length > 100) {
    return c.json(
      { error: 'O termo de busca não pode exceder 100 caracteres.' },
      400
    );
  }

  const rawPage = c.req.query('page') || '1';
  const parsedPage = parseInt(rawPage, 10);
  const page = isNaN(parsedPage) ? 1 : Math.max(1, Math.min(50, parsedPage));

  const rawPageSize = c.req.query('pageSize') || '20';
  const parsedPageSize = parseInt(rawPageSize, 10);
  const pageSize = isNaN(parsedPageSize) ? 20 : Math.max(1, Math.min(40, parsedPageSize));

  // Only allow mock data in local development or automated tests when explicitly requested
  const isDevOrTest = c.env.ENVIRONMENT === 'development' || c.env.ENVIRONMENT === 'test';
  const allowMock = isDevOrTest && (c.req.query('mock') === 'true' || c.env.ENVIRONMENT === 'test');

  const result = await searchCatalog(
    c.env.DB,
    rawQ,
    page,
    pageSize,
    c.env.RAWG_API_KEY,
    allowMock
  );

  return c.json(result);
});

catalogRouter.get('/catalog/games/:id', async (c) => {
  const id = c.req.param('id');
  if (!id || id.trim().length === 0 || id.length > 100) {
    return c.json({ error: 'Identificador de jogo inválido' }, 400);
  }

  const isDevOrTest = c.env.ENVIRONMENT === 'development' || c.env.ENVIRONMENT === 'test';
  const allowMock = isDevOrTest && (c.req.query('mock') === 'true' || c.env.ENVIRONMENT === 'test');

  const details = await getGameDetails(c.env.DB, id, c.env.RAWG_API_KEY, allowMock);

  if (!details) {
    return c.json({ error: 'Jogo não encontrado no catálogo' }, 404);
  }

  return c.json(details);
});
