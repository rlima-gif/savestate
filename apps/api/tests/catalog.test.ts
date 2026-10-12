import { describe, it, expect } from 'vitest';
import app from '../src/index';

describe('Catalog Routes', () => {
  it('GET /api/catalog/search returns honest unavailable state when RAWG key is absent', async () => {
    const res = await app.request('/api/catalog/search?q=zelda', {}, {});
    expect(res.status).toBe(200);

    const data = (await res.json()) as any;
    expect(data.provider).toBe('unavailable');
    expect(data.isLive).toBe(false);
    expect(data.results.length).toBe(0);
    expect(data.message).toContain('RAWG_API_KEY');
  });

  it('GET /api/catalog/search?mock=true returns curated mock results for offline preview', async () => {
    const res = await app.request('/api/catalog/search?q=zelda&mock=true', {}, {});
    expect(res.status).toBe(200);

    const data = (await res.json()) as any;
    expect(data.provider).toBe('mock');
    expect(data.results.length).toBeGreaterThan(0);
    expect(data.results[0].title).toContain('Zelda');
  });

  it('GET /api/catalog/games/:id returns details for valid ID', async () => {
    const res = await app.request('/api/catalog/games/mock-2', {}, {});
    expect(res.status).toBe(200);

    const data = (await res.json()) as any;
    expect(data.title).toBe('Hollow Knight');
    expect(data.estimatedDurationHours.mainStory).toBe(27);
  });

  it('GET /api/catalog/games/:id returns 404 for unknown game', async () => {
    const res = await app.request('/api/catalog/games/non-existent-999', {}, {});
    expect(res.status).toBe(404);
  });
});
