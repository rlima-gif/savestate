import { describe, it, expect } from 'vitest';
import app from '../src/index';

describe('Catalog Routes & D1 Caching', () => {
  it('GET /api/catalog/search returns honest unavailable state when RAWG key is absent in non-mock mode', async () => {
    const res = await app.request('/api/catalog/search?q=zelda', {}, {
      ENVIRONMENT: 'production',
    });
    expect(res.status).toBe(200);

    const data = (await res.json()) as any;
    expect(data.provider).toBe('unavailable');
    expect(data.isLive).toBe(false);
    expect(data.results.length).toBe(0);
    expect(data.message).toContain('RAWG_API_KEY');
  });

  it('GET /api/catalog/search rejects queries longer than 100 characters with 400', async () => {
    const longQuery = 'A'.repeat(101);
    const res = await app.request(`/api/catalog/search?q=${longQuery}`, {}, {});
    expect(res.status).toBe(400);

    const data = (await res.json()) as any;
    expect(data.error).toContain('100 caracteres');
  });

  it('GET /api/catalog/search clamps invalid page and pageSize parameters gracefully', async () => {
    const res = await app.request('/api/catalog/search?q=zelda&page=-5&pageSize=999&mock=true', {}, {
      ENVIRONMENT: 'test',
    });
    expect(res.status).toBe(200);

    const data = (await res.json()) as any;
    expect(data.page).toBe(1);
    expect(data.pageSize).toBe(40);
  });

  it('GET /api/catalog/search?mock=true strictly prohibits mock data in production environment', async () => {
    const res = await app.request('/api/catalog/search?q=zelda&mock=true', {}, {
      ENVIRONMENT: 'production',
    });
    expect(res.status).toBe(200);

    const data = (await res.json()) as any;
    // In production, mock data is never returned
    expect(data.provider).toBe('unavailable');
    expect(data.results.length).toBe(0);
  });

  it('GET /api/catalog/search uses D1 cached results when available', async () => {
    const cachedResponse = {
      results: [
        {
          id: 'rawg-123',
          providerId: 123,
          provider: 'rawg',
          title: 'Cached Chrono Trigger',
          platforms: ['SNES'],
          genres: ['JRPG'],
        },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
      hasMore: false,
      provider: 'rawg',
      isLive: true,
      attribution: 'Dados em cache',
    };

    const mockDb = {
      prepare: () => ({
        bind: () => ({
          first: async () => ({
            response_json: JSON.stringify(cachedResponse),
            expires_at: Math.floor(Date.now() / 1000) + 3600,
          }),
        }),
      }),
    } as unknown as D1Database;

    const res = await app.request('/api/catalog/search?q=chrono', {}, {
      DB: mockDb,
      ENVIRONMENT: 'production',
    });

    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.results.length).toBe(1);
    expect(data.results[0].title).toBe('Cached Chrono Trigger');
  });

  it('GET /api/catalog/games/:id returns details for valid mock ID in test environment', async () => {
    const res = await app.request('/api/catalog/games/mock-2', {}, {
      ENVIRONMENT: 'test',
    });
    expect(res.status).toBe(200);

    const data = (await res.json()) as any;
    expect(data.title).toBe('Hollow Knight');
  });

  it('GET /api/catalog/games/:id returns 404 for unknown game', async () => {
    const res = await app.request('/api/catalog/games/non-existent-999', {}, {
      ENVIRONMENT: 'test',
    });
    expect(res.status).toBe(404);
  });
});
