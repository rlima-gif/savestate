import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiService } from '../src/services/api';

describe('ApiService Catalog & Search Regressions', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('constructs correct catalog search URL and handles success', async () => {
    const mockResponse = {
      results: [
        {
          id: 'rawg-1',
          providerId: 1,
          provider: 'rawg',
          title: 'The Legend of Zelda',
          platforms: ['Switch'],
          genres: ['Adventure'],
        },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
      hasMore: false,
      provider: 'rawg',
      attribution: 'RAWG',
    };

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as any);

    const result = await ApiService.searchCatalog('Zelda', 1, 20);

    expect(fetchSpy).toHaveBeenCalled();
    const calledUrl = fetchSpy.mock.calls[0][0] as string;
    expect(calledUrl).toContain('/api/catalog/search?q=Zelda&page=1&pageSize=20');
    expect(result.results.length).toBe(1);
    expect(result.results[0].title).toBe('The Legend of Zelda');
  });

  it('handles empty results without throwing or crashing', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [],
        total: 0,
        page: 1,
        pageSize: 20,
        hasMore: false,
        provider: 'rawg',
        attribution: 'RAWG',
      }),
    } as any);

    const result = await ApiService.searchCatalog('NonExistentGameXYZ');
    expect(result.results).toEqual([]);
    expect(result.total).toBe(0);
  });

  it('handles unavailable catalog response (no RAWG key) gracefully', async () => {
    const mockUnavailableResponse = {
      results: [],
      total: 0,
      page: 1,
      pageSize: 20,
      hasMore: false,
      provider: 'unavailable',
      isLive: false,
      message: 'Catálogo online indisponível.',
      attribution: 'RAWG não configurada',
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockUnavailableResponse,
    } as any);

    const result = await ApiService.searchCatalog('Metroid');
    expect(result.provider).toBe('unavailable');
    expect(result.results).toEqual([]);
    expect(result.message).toContain('indisponível');
  });

  it('handles network timeout failure with clean error message', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Timeout fetching catalog'));

    await expect(ApiService.searchCatalog('Chrono')).rejects.toThrow('Timeout fetching catalog');
  });

  it('handles malformed API response gracefully', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => {
        throw new Error('Unexpected token in JSON');
      },
    } as any);

    await expect(ApiService.searchCatalog('Elden Ring')).rejects.toThrow('Unexpected token in JSON');
  });

  it('supports retry on subsequent attempt after a transient failure', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(new Error('Temporary network drop'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [{ id: 'rawg-1', title: 'Halo', provider: 'rawg' }],
          total: 1,
          page: 1,
          pageSize: 20,
        }),
      } as any);

    await expect(ApiService.searchCatalog('Halo')).rejects.toThrow('Temporary network drop');

    // Retry succeeds
    const retryResult = await ApiService.searchCatalog('Halo');
    expect(retryResult.results.length).toBe(1);
    expect(retryResult.results[0].title).toBe('Halo');
  });

  it('handles getGameDetails successfully', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 'rawg-123',
        provider: 'rawg',
        title: 'Dark Souls',
        description: 'Prepare to Die',
      }),
    } as any);

    const details = await ApiService.getGameDetails('rawg-123');
    expect(details?.title).toBe('Dark Souls');
    expect(details?.description).toBe('Prepare to Die');
  });
});
