import { describe, it, expect, vi } from 'vitest';
import app from '../src/index';

describe('Integrations Routes', () => {
  it('POST /api/integrations/steam/sync returns 400 when steamId is missing', async () => {
    const res = await app.request('/api/integrations/steam/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
    const data = (await res.json()) as any;
    expect(data.error).toBe('SteamID é obrigatório.');
  });

  it('POST /api/integrations/retroachievements/sync returns 400 when username is missing', async () => {
    const res = await app.request('/api/integrations/retroachievements/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
    const data = (await res.json()) as any;
    expect(data.error).toBe('Nome de usuário do RetroAchievements é obrigatório.');
  });

  it('POST /api/integrations/steam/sync handles invalid JSON gracefully', async () => {
    const res = await app.request('/api/integrations/steam/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid-json',
    });
    expect(res.status).toBe(400);
    const data = (await res.json()) as any;
    expect(data.error).toBe('Corpo da requisição inválido.');
  });
});
