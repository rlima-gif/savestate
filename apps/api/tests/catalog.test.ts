import { describe, it, expect } from 'vitest';
import app from '../src/index';

describe('Catalog Routes', () => {
  it('GET /api/catalog/search returns paginated results from mock fallback', async () => {
    const res = await app.request('/api/catalog/search?q=zelda', {}, {});
    expect(res.status).toBe(200);

    const data = (await res.json()) as any;
    expect(Array.isArray(data.results)).toBe(true);
    expect(data.results.length).toBeGreaterThan(0);
    expect(data.results[0].title).toContain('Zelda');
    expect(data.provider).toBe('mock');
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
