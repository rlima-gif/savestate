import { CatalogSearchResponse, CatalogGameDetails, CatalogGameSummary } from '@savestate/shared';

// Honest curated sample data for local development/test only (No stock photos or invented duration claims)
const DEV_MOCK_GAMES: CatalogGameDetails[] = [
  {
    id: 'mock-1',
    providerId: 1,
    provider: 'mock',
    title: 'The Legend of Zelda: Breath of the Wild',
    releaseDate: '2017-03-03',
    platforms: ['Nintendo Switch', 'Wii U'],
    genres: ['Ação', 'Aventura', 'Mundo Aberto'],
    rating: 4.8,
    metacritic: 97,
    description: 'Entre no mundo de descoberta, exploração e aventura em The Legend of Zelda: Breath of the Wild.',
    developers: ['Nintendo EPD'],
    publishers: ['Nintendo'],
    screenshots: [],
    attribution: 'Dados de desenvolvimento SaveState (Demonstração Local)',
  },
  {
    id: 'mock-2',
    providerId: 2,
    provider: 'mock',
    title: 'Hollow Knight',
    releaseDate: '2017-02-24',
    platforms: ['PC', 'Nintendo Switch', 'PS4', 'Xbox One'],
    genres: ['Metroidvania', 'Ação', 'Indie'],
    rating: 4.7,
    metacritic: 90,
    description: 'Forje seu próprio caminho em Hollow Knight! Uma épica aventura de ação através de um vasto reino arruinado de insetos e heróis.',
    developers: ['Team Cherry'],
    publishers: ['Team Cherry'],
    screenshots: [],
    attribution: 'Dados de desenvolvimento SaveState (Demonstração Local)',
  },
  {
    id: 'mock-3',
    providerId: 3,
    provider: 'mock',
    title: 'Elden Ring',
    releaseDate: '2022-02-25',
    platforms: ['PC', 'PS4', 'PS5', 'Xbox One', 'Xbox Series X/S'],
    genres: ['RPG de Ação', 'Souls-like', 'Mundo Aberto'],
    rating: 4.6,
    metacritic: 96,
    description: 'Levante-se, Maculado, e seja guiado pela graça para portar o poder do Anel Prístino e se tornar um Lorde Prístino nas Terras Intermédias.',
    developers: ['FromSoftware Inc.'],
    publishers: ['Bandai Namco Entertainment'],
    screenshots: [],
    attribution: 'Dados de desenvolvimento SaveState (Demonstração Local)',
  },
  {
    id: 'mock-4',
    providerId: 4,
    provider: 'mock',
    title: 'Chrono Trigger',
    releaseDate: '1995-03-11',
    platforms: ['SNES', 'PlayStation', 'Nintendo DS', 'PC', 'Android', 'iOS'],
    genres: ['JRPG', 'Clássico'],
    rating: 4.9,
    metacritic: 92,
    description: 'Um clássico RPG atemporal desenvolvido por uma equipe dos sonhos: Yuji Horii, Hironobu Sakaguchi e Akira Toriyama.',
    developers: ['Square'],
    publishers: ['Square'],
    screenshots: [],
    attribution: 'Dados de desenvolvimento SaveState (Demonstração Local)',
  },
  {
    id: 'mock-5',
    providerId: 5,
    provider: 'mock',
    title: 'Celeste',
    releaseDate: '2018-01-25',
    platforms: ['PC', 'Nintendo Switch', 'PS4', 'Xbox One'],
    genres: ['Plataforma', 'Indie', 'Aventura'],
    rating: 4.8,
    metacritic: 94,
    description: 'Ajude Madeline a enfrentar seus demônios internos em sua jornada até o topo da Montanha Celeste.',
    developers: ['Maddy Makes Games'],
    publishers: ['Maddy Makes Games'],
    screenshots: [],
    attribution: 'Dados de desenvolvimento SaveState (Demonstração Local)',
  },
];

export async function searchCatalog(
  db: D1Database | undefined,
  query: string,
  page = 1,
  pageSize = 20,
  rawgApiKey?: string,
  allowMock = false
): Promise<CatalogSearchResponse> {
  const cleanQuery = (query || '').trim().slice(0, 100);
  const safePage = Math.max(1, Math.min(50, isNaN(page) ? 1 : Math.floor(page)));
  const safePageSize = Math.max(1, Math.min(40, isNaN(pageSize) ? 20 : Math.floor(pageSize)));

  const cacheKey = `search:${cleanQuery.toLowerCase()}:${safePage}:${safePageSize}`;

  // 1. Check D1 Catalog Cache
  if (db) {
    try {
      const cached = await db
        .prepare('SELECT response_json, expires_at FROM catalog_cache WHERE cache_key = ?')
        .bind(cacheKey)
        .first<{ response_json: string; expires_at: number }>();

      const nowSec = Math.floor(Date.now() / 1000);
      if (cached && cached.expires_at > nowSec) {
        return JSON.parse(cached.response_json) as CatalogSearchResponse;
      }
    } catch (_err) {
      // Non-fatal cache lookup failure
    }
  }

  // 2. Query RAWG API when key is configured
  if (rawgApiKey) {
    try {
      const url = new URL('https://api.rawg.io/api/games');
      url.searchParams.set('key', rawgApiKey);
      if (cleanQuery) {
        url.searchParams.set('search', cleanQuery);
      }
      url.searchParams.set('page', String(safePage));
      url.searchParams.set('page_size', String(safePageSize));

      const response = await fetch(url.toString(), {
        headers: { 'User-Agent': 'SaveState-App/0.1.0' },
        signal: AbortSignal.timeout(8000),
      });

      if (response.ok) {
        const data = (await response.json()) as any;
        const results: CatalogGameSummary[] = (data.results || []).map((item: any) => ({
          id: `rawg-${item.id}`,
          providerId: item.id,
          provider: 'rawg' as const,
          title: item.name,
          coverUrl: item.background_image || undefined,
          releaseDate: item.released || undefined,
          platforms: (item.platforms || []).map((p: any) => p.platform?.name).filter(Boolean),
          genres: (item.genres || []).map((g: any) => g.name).filter(Boolean),
          rating: item.rating ? Number(item.rating) : undefined,
          metacritic: item.metacritic ? Number(item.metacritic) : undefined,
        }));

        const responseObj: CatalogSearchResponse = {
          results,
          total: data.count || results.length,
          page: safePage,
          pageSize: safePageSize,
          hasMore: Boolean(data.next),
          provider: 'rawg',
          isLive: true,
          attribution: 'Dados providos pela RAWG Video Games Database (https://rawg.io)',
        };

        // Cache in D1 for 24 hours (86,400 seconds)
        if (db) {
          try {
            const expiresAt = Math.floor(Date.now() / 1000) + 86400;
            await db
              .prepare(
                `INSERT INTO catalog_cache (cache_key, provider, query, response_json, expires_at, created_at)
                 VALUES (?, 'rawg', ?, ?, ?, CURRENT_TIMESTAMP)
                 ON CONFLICT(cache_key) DO UPDATE SET response_json = excluded.response_json, expires_at = excluded.expires_at, created_at = CURRENT_TIMESTAMP`
              )
              .bind(cacheKey, cleanQuery, JSON.stringify(responseObj), expiresAt)
              .run();
          } catch (_err) {
            // Cache write non-fatal
          }
        }

        return responseObj;
      }
    } catch (_err) {
      if (!allowMock) {
        return {
          results: [],
          total: 0,
          page: safePage,
          pageSize: safePageSize,
          hasMore: false,
          provider: 'unavailable',
          isLive: false,
          message: 'Falha temporária ao comunicar com o catálogo da RAWG API.',
          attribution: 'RAWG indisponível',
        };
      }
    }
  }

  // 3. Fallback when no RAWG key is present
  if (!allowMock) {
    return {
      results: [],
      total: 0,
      page: safePage,
      pageSize: safePageSize,
      hasMore: false,
      provider: 'unavailable',
      isLive: false,
      message:
        'Busca online de catálogo indisponível (chave RAWG_API_KEY não configurada no servidor). Jogos podem ser cadastrados manualmente com capa e metadados na aba Biblioteca (+ Adicionar Jogo).',
      attribution: 'Catálogo online não configurado',
    };
  }

  // 4. Development-only mock data
  const normalizedQuery = cleanQuery.toLowerCase();
  const filtered = normalizedQuery
    ? DEV_MOCK_GAMES.filter((g) =>
        g.title.toLowerCase().includes(normalizedQuery) ||
        g.genres.some((genre) => genre.toLowerCase().includes(normalizedQuery))
      )
    : DEV_MOCK_GAMES;

  const startIndex = (safePage - 1) * safePageSize;
  const paginated = filtered.slice(startIndex, startIndex + safePageSize);

  return {
    results: paginated,
    total: filtered.length,
    page: safePage,
    pageSize: safePageSize,
    hasMore: startIndex + safePageSize < filtered.length,
    provider: 'mock',
    isLive: false,
    attribution: 'Catálogo de demonstração local SaveState',
  };
}

export async function getGameDetails(
  db: D1Database | undefined,
  id: string,
  rawgApiKey?: string,
  allowMock = false
): Promise<CatalogGameDetails | null> {
  const safeId = (id || '').trim().slice(0, 100);
  if (!safeId) return null;

  const cacheKey = `game:${safeId}`;

  // 1. Check D1 Catalog Cache
  if (db) {
    try {
      const cached = await db
        .prepare('SELECT response_json, expires_at FROM catalog_cache WHERE cache_key = ?')
        .bind(cacheKey)
        .first<{ response_json: string; expires_at: number }>();

      const nowSec = Math.floor(Date.now() / 1000);
      if (cached && cached.expires_at > nowSec) {
        return JSON.parse(cached.response_json) as CatalogGameDetails;
      }
    } catch (_err) {
      // Non-fatal
    }
  }

  // 2. Fetch from RAWG API
  if (safeId.startsWith('rawg-') && rawgApiKey) {
    const rawgId = safeId.replace('rawg-', '');
    try {
      const url = `https://api.rawg.io/api/games/${rawgId}?key=${rawgApiKey}`;
      const response = await fetch(url, {
        headers: { 'User-Agent': 'SaveState-App/0.1.0' },
        signal: AbortSignal.timeout(8000),
      });

      if (response.ok) {
        const item = (await response.json()) as any;
        const details: CatalogGameDetails = {
          id: `rawg-${item.id}`,
          providerId: item.id,
          provider: 'rawg',
          title: item.name,
          coverUrl: item.background_image || undefined,
          releaseDate: item.released || undefined,
          platforms: (item.platforms || []).map((p: any) => p.platform?.name).filter(Boolean),
          genres: (item.genres || []).map((g: any) => g.name).filter(Boolean),
          rating: item.rating ? Number(item.rating) : undefined,
          metacritic: item.metacritic ? Number(item.metacritic) : undefined,
          description: item.description_raw || item.description || '',
          developers: (item.developers || []).map((d: any) => d.name),
          publishers: (item.publishers || []).map((p: any) => p.name),
          website: item.website || undefined,
          screenshots: [],
          attribution: 'Dados providos pela RAWG Video Games Database (https://rawg.io)',
        };

        // Cache in D1 for 24 hours
        if (db) {
          try {
            const expiresAt = Math.floor(Date.now() / 1000) + 86400;
            await db
              .prepare(
                `INSERT INTO catalog_cache (cache_key, provider, query, response_json, expires_at, created_at)
                 VALUES (?, 'rawg', ?, ?, ?, CURRENT_TIMESTAMP)
                 ON CONFLICT(cache_key) DO UPDATE SET response_json = excluded.response_json, expires_at = excluded.expires_at, created_at = CURRENT_TIMESTAMP`
              )
              .bind(cacheKey, safeId, JSON.stringify(details), expiresAt)
              .run();
          } catch (_err) {}
        }

        return details;
      }
    } catch (_err) {
      // Non-fatal
    }
  }

  // 3. Fallback to mock only in development/test
  if (allowMock) {
    const found = DEV_MOCK_GAMES.find((g) => g.id === safeId || `rawg-${g.providerId}` === safeId);
    return found || null;
  }

  return null;
}
