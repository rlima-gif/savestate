import { describe, it, expect } from 'vitest';
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
    expect(data.error).toContain('obrigatório');
  });

  it('POST /api/integrations/steam/sync returns 400 for invalid characters in steam identifier', async () => {
    const res = await app.request('/api/integrations/steam/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ steamId: 'invalid!user@name' }),
    });
    expect(res.status).toBe(400);
    const data = (await res.json()) as any;
    expect(data.error).toContain('Identificador Steam inválido');
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

  it('POST /api/integrations/retroachievements/sync returns transient key notice when key is missing', async () => {
    const res = await app.request('/api/integrations/retroachievements/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'PlayerOne' }),
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.requiresKey).toBe(true);
    expect(data.notice).toContain('não fica salva no servidor');
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
