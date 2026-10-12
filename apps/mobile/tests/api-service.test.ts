import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiService } from '../src/services/api';

describe('ApiService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('constructs correct catalog search URL and handles success', async () => {
    const mockResponse = {
      results: [
        {
          id: 'mock-1',
          providerId: 1,
          provider: 'mock',
          title: 'Zelda',
          platforms: ['Switch'],
          genres: ['Adventure'],
        },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
      hasMore: false,
      provider: 'mock',
      attribution: 'Test',
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
    expect(result.results[0].title).toBe('Zelda');
  });

  it('handles unavailable catalog response gracefully without throwing', async () => {
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

  it('handles network failure with clear Portuguese error', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network request failed'));

    await expect(ApiService.searchCatalog('Halo')).rejects.toThrow('Network request failed');
  });

  it('handles HTTP error status codes with clean error message', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as any);

    await expect(ApiService.searchCatalog('Doom')).rejects.toThrow('Erro na busca do catálogo (500)');
  });
});
