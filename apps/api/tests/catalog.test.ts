import { describe, it, expect, vi } from 'vitest';
import app from '../src/index';

describe('Catalog routes and fallback behavior', () => {
  it('returns a safe unavailable state when IGDB owner credentials are not configured', async () => {
    const res = await app.request('/api/catalog/search?q=zelda', {}, { ENVIRONMENT: 'production' });
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.provider).toBe('unavailable');
    expect(data.results).toEqual([]);
    expect(data.message).toContain('manualmente');
    expect(JSON.stringify(data)).not.toMatch(/TWITCH_CLIENT_SECRET|RAWG_API_KEY/);
  });

  it('rejects queries longer than 100 characters', async () => {
    const res = await app.request(`/api/catalog/search?q=${'A'.repeat(101)}`, {}, {});
    expect(res.status).toBe(400);
  });

  it('clamps invalid pagination and limits mock results to test/development', async () => {
    const res = await app.request('/api/catalog/search?q=zelda&page=-5&pageSize=999', {}, { ENVIRONMENT: 'test' });
    const data = await res.json() as any;
    expect(data.page).toBe(1);
    expect(data.pageSize).toBe(40);
    expect(data.provider).toBe('mock');
  });

  it('never returns mock games in production, even when mock=true is requested', async () => {
    const res = await app.request('/api/catalog/search?q=zelda&mock=true', {}, { ENVIRONMENT: 'production' });
    const data = await res.json() as any;
    expect(data.provider).toBe('unavailable');
    expect(data.results).toEqual([]);
  });

  it('uses cached IGDB search results without calling the provider', async () => {
    const cached = {
      results: [{ id: 'igdb-123', providerId: 123, provider: 'igdb', title: 'Cached Chrono Trigger', platforms: ['SNES'], genres: ['JRPG'] }],
      total: 1, page: 1, pageSize: 20, hasMore: false, provider: 'igdb', isLive: true, attribution: 'IGDB',
    };
    const db = {
      prepare: () => ({
        bind: () => ({
          first: async () => ({ response_json: JSON.stringify(cached), expires_at: Math.floor(Date.now() / 1000) + 3600 }),
        }),
      }),
    } as unknown as D1Database;
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const res = await app.request('/api/catalog/search?q=chrono', {}, { DB: db, ENVIRONMENT: 'production' });
    const data = await res.json() as any;
    expect(data.results[0].title).toBe('Cached Chrono Trigger');
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('calls IGDB with the configured owner credentials and returns normalized game data', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'token', expires_in: 3600 }) } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: 9, name: 'Metroid Prime', platforms: [{ name: 'GameCube' }], genres: [{ name: 'Shooter' }] }],
      } as Response);
    const res = await app.request('/api/catalog/search?q=Metroid&page=1&pageSize=20', {}, {
      ENVIRONMENT: 'staging', TWITCH_CLIENT_ID: 'owner-client-id', TWITCH_CLIENT_SECRET: 'owner-secret',
    });
    const data = await res.json() as any;
    expect(res.status).toBe(200);
    expect(data.provider).toBe('igdb');
    expect(data.results[0]).toMatchObject({ id: 'igdb-9', title: 'Metroid Prime', platforms: ['GameCube'] });
    expect(JSON.stringify(data)).not.toContain('owner-secret');
  });

  it('does not call IGDB when the shared D1 request budget is exceeded', async () => {
    const db = {
      prepare: (sql: string) => ({
        bind: () => ({
          first: async () => sql.includes('catalog_cache') ? null : { request_count: 4 },
        }),
      }),
    } as unknown as D1Database;
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const res = await app.request('/api/catalog/search?q=Metroid', {}, {
      DB: db, ENVIRONMENT: 'staging', TWITCH_CLIENT_ID: 'owner-client-id', TWITCH_CLIENT_SECRET: 'owner-secret',
    });
    const data = await res.json() as any;
    expect(data.provider).toBe('unavailable');
    expect(data.message).toContain('alguns segundos');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns a useful message for empty queries', async () => {
    const res = await app.request('/api/catalog/search?q=%20%20', {}, { ENVIRONMENT: 'production' });
    const data = await res.json() as any;
    expect(data.results).toEqual([]);
    expect(data.message).toContain('Digite');
  });

  it('returns local mock details only in test/development', async () => {
    const res = await app.request('/api/catalog/games/mock-2', {}, { ENVIRONMENT: 'test' });
    expect(res.status).toBe(200);
    expect((await res.json() as any).title).toBe('Hollow Knight');
  });
});
