import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getIgdbGameDetails, resetIgdbTokenCacheForTests, searchIgdb } from '../src/services/igdb';

describe('IGDB provider adapter', () => {
  beforeEach(() => {
    resetIgdbTokenCacheForTests();
    vi.restoreAllMocks();
  });

  it('gets an app token server-side and maps search metadata, platforms, dates, and covers', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'private-app-token', expires_in: 3600 }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{
          id: 42,
          name: 'Example Game',
          cover: { url: '//images.igdb.com/igdb/image/upload/t_thumb/co1.jpg' },
          first_release_date: 1704067200,
          platforms: [{ name: 'PC' }, { name: 'PlayStation 5' }],
          genres: [{ name: 'Adventure' }],
          aggregated_rating: 86,
        }],
      } as Response);

    const result = await searchIgdb(undefined, 'client-id', 'client-secret', 'Example Game', 20, 0);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'igdb-42', providerId: 42, provider: 'igdb', title: 'Example Game',
      coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big_2x/co1.jpg',
      releaseDate: '2024-01-01', platforms: ['PC', 'PlayStation 5'], genres: ['Adventure'], rating: 4.3,
    });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(String(fetchSpy.mock.calls[0][0])).toContain('oauth2/token');
    expect(String(fetchSpy.mock.calls[1][0])).toBe('https://api.igdb.com/v4/games');
    expect((fetchSpy.mock.calls[1][1] as RequestInit).headers).toMatchObject({
      'Client-ID': 'client-id', Authorization: 'Bearer private-app-token',
    });
    expect((fetchSpy.mock.calls[1][1] as RequestInit).body).toContain('search "Example Game"');
  });

  it('escapes user input before placing it in the IGDB query language', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'token', expires_in: 3600 }) } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => [] } as Response);
    await searchIgdb(undefined, 'id', 'secret', 'A"; fields id;\nB', 20, 0);
    const body = String((fetchSpy.mock.calls[1][1] as RequestInit).body);
    expect(body).toContain('search "A\\"; fields id; B";');
  });

  it('maps details and never returns the secret as part of a game object', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'token', expires_in: 3600 }) } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{
          id: 7, name: 'Game', summary: 'A description', rating: 80,
          involved_companies: [
            { developer: true, company: { name: 'Studio' } },
            { publisher: true, company: { name: 'Publisher' } },
          ],
          websites: [{ url: 'https://example.test' }],
          screenshots: [{ url: '//images.igdb.com/screenshot.jpg' }],
        }],
      } as Response);
    const result = await getIgdbGameDetails(undefined, 'id', 'never-return-this-secret', 7);
    expect(result).toMatchObject({
      id: 'igdb-7', title: 'Game', description: 'A description', developers: ['Studio'],
      publishers: ['Publisher'], website: 'https://example.test',
      screenshots: ['https://images.igdb.com/screenshot.jpg'],
    });
    expect(JSON.stringify(result)).not.toContain('never-return-this-secret');
  });

  it('rejects malformed provider responses and reports provider status failures', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'token', expires_in: 3600 }) } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ results: [] }) } as Response);
    await expect(searchIgdb(undefined, 'id', 'secret', 'Game', 20, 0)).rejects.toThrow('invalid response');
  });
});
