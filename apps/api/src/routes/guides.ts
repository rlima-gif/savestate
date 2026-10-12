import { Hono } from 'hono';
import { Env } from '../types';
import { generateExternalSearchLinks } from '../services/gemini';

export const guidesRouter = new Hono<{ Bindings: Env }>();

guidesRouter.get('/guides/search', (c) => {
  const game = c.req.query('game') || '';
  const query = c.req.query('q') || '';

  if (!game) {
    return c.json({ error: 'Parâmetro "game" é obrigatório.' }, 400);
  }

  const links = generateExternalSearchLinks(game, query);
  return c.json({
    game,
    query,
    links,
  });
});
