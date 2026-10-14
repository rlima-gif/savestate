import { CatalogGameDetails, CatalogGameSummary, CatalogSearchResponse } from '@savestate/shared';
import { getIgdbGameDetails, searchIgdb } from './igdb';

const SEARCH_TTL_SECONDS = 6 * 60 * 60;
const DETAILS_TTL_SECONDS = 7 * 24 * 60 * 60;
const IGDB_REQUESTS_PER_SECOND = 3;
const ATTRIBUTION = 'Game metadata provided by IGDB.com';

// Only used by local tests and explicitly enabled local development.
const DEV_MOCK_GAMES: CatalogGameDetails[] = [
  {
    id: 'mock-1', providerId: 1, provider: 'mock', title: 'The Legend of Zelda: Breath of the Wild',
    releaseDate: '2017-03-03', platforms: ['Nintendo Switch', 'Wii U'], genres: ['Ação', 'Aventura', 'Mundo Aberto'],
    rating: 4.8, description: 'Amostra local de desenvolvimento.', developers: ['Nintendo EPD'], publishers: ['Nintendo'], screenshots: [],
    attribution: 'Dados demonstrativos locais do SaveState',
  },
  {
    id: 'mock-2', providerId: 2, provider: 'mock', title: 'Hollow Knight', releaseDate: '2017-02-24',
    platforms: ['PC', 'Nintendo Switch', 'PS4', 'Xbox One'], genres: ['Metroidvania', 'Ação', 'Indie'], rating: 4.7,
    description: 'Amostra local de desenvolvimento.', developers: ['Team Cherry'], publishers: ['Team Cherry'], screenshots: [],
    attribution: 'Dados demonstrativos locais do SaveState',
  },
  {
    id: 'mock-3', providerId: 3, provider: 'mock', title: 'Elden Ring', releaseDate: '2022-02-25',
    platforms: ['PC', 'PS4', 'PS5', 'Xbox One', 'Xbox Series X/S'], genres: ['RPG de Ação', 'Souls-like', 'Mundo Aberto'], rating: 4.6,
    description: 'Amostra local de desenvolvimento.', developers: ['FromSoftware'], publishers: ['Bandai Namco'], screenshots: [],
    attribution: 'Dados demonstrativos locais do SaveState',
  },
  {
    id: 'mock-4', providerId: 4, provider: 'mock', title: 'Chrono Trigger', releaseDate: '1995-03-11',
    platforms: ['SNES', 'PlayStation', 'Nintendo DS', 'PC', 'Android', 'iOS'], genres: ['JRPG', 'Clássico'], rating: 4.9,
    description: 'Amostra local de desenvolvimento.', developers: ['Square'], publishers: ['Square'], screenshots: [],
    attribution: 'Dados demonstrativos locais do SaveState',
  },
  {
    id: 'mock-5', providerId: 5, provider: 'mock', title: 'Celeste', releaseDate: '2018-01-25',
    platforms: ['PC', 'Nintendo Switch', 'PS4', 'Xbox One'], genres: ['Plataforma', 'Indie', 'Aventura'], rating: 4.8,
    description: 'Amostra local de desenvolvimento.', developers: ['Maddy Makes Games'], publishers: ['Maddy Makes Games'], screenshots: [],
    attribution: 'Dados demonstrativos locais do SaveState',
  },
];

interface CacheRow {
  response_json: string;
  expires_at: number;
}

function unavailableResponse(page: number, pageSize: number, message: string): CatalogSearchResponse {
  return {
    results: [], total: 0, page, pageSize, hasMore: false, provider: 'unavailable', isLive: false,
    message, attribution: ATTRIBUTION,
  };
}

function staleResponse(
  response: CatalogSearchResponse | undefined,
  page: number,
  pageSize: number,
  message: string
): CatalogSearchResponse {
  return response
    ? { ...response, isLive: false, message }
    : unavailableResponse(page, pageSize, message);
}

async function readCache<T>(db: D1Database | undefined, key: string): Promise<{ fresh?: T; stale?: T }> {
  if (!db) return {};
  try {
    const row = await db.prepare(
      'SELECT response_json, expires_at FROM catalog_cache WHERE cache_key = ?'
    ).bind(key).first<CacheRow>();
    if (!row) return {};
    const parsed = JSON.parse(row.response_json) as T;
    return row.expires_at > Math.floor(Date.now() / 1000) ? { fresh: parsed } : { stale: parsed };
  } catch {
    return {};
  }
}

async function writeCache(
  db: D1Database | undefined,
  key: string,
  query: string,
  value: unknown,
  ttlSeconds: number
): Promise<void> {
  if (!db) return;
  try {
    const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
    await db.prepare(
      `INSERT INTO catalog_cache (cache_key, provider, query, response_json, expires_at, created_at)
       VALUES (?, 'igdb', ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(cache_key) DO UPDATE SET provider = 'igdb', response_json = excluded.response_json,
       expires_at = excluded.expires_at, created_at = CURRENT_TIMESTAMP`
    ).bind(key, query, JSON.stringify(value), expiresAt).run();
  } catch {
    // Catalog must still work if the optional cache write fails.
  }
}

/**
 * IGDB allows four requests per second per app. Use an atomic D1 counter to
 * keep the shared app credentials below that ceiling across Worker isolates.
 */
async function takeIgdbSlot(db: D1Database | undefined): Promise<boolean> {
  if (!db) return true; // local development; the UI debounces requests
  try {
    const second = Math.floor(Date.now() / 1000);
    const row = await db.prepare(
      `INSERT INTO catalog_rate_limit (id, window_start, request_count)
       VALUES (1, ?, 1)
       ON CONFLICT(id) DO UPDATE SET
         request_count = CASE WHEN window_start = excluded.window_start THEN request_count + 1 ELSE 1 END,
         window_start = excluded.window_start
       RETURNING request_count`
    ).bind(second).first<{ request_count: number }>();
    return Boolean(row && row.request_count <= IGDB_REQUESTS_PER_SECOND);
  } catch {
    // Fail closed for outbound provider calls if shared rate protection is unavailable.
    return false;
  }
}

function mockSearch(query: string, page: number, pageSize: number): CatalogSearchResponse {
  const normalized = query.toLocaleLowerCase();
  const matches = DEV_MOCK_GAMES.filter((game) =>
    game.title.toLocaleLowerCase().includes(normalized) || game.genres.some((genre) => genre.toLocaleLowerCase().includes(normalized))
  );
  const offset = (page - 1) * pageSize;
  const results: CatalogGameSummary[] = matches.slice(offset, offset + pageSize);
  return {
    results, total: matches.length, page, pageSize, hasMore: offset + pageSize < matches.length,
    provider: 'mock', isLive: false, attribution: 'Dados demonstrativos locais do SaveState',
  };
}

export async function searchCatalog(
  db: D1Database | undefined,
  query: string,
  page = 1,
  pageSize = 20,
  twitchClientId?: string,
  twitchClientSecret?: string,
  allowMock = false
): Promise<CatalogSearchResponse> {
  const cleanQuery = (query || '').trim().replace(/\s+/g, ' ').slice(0, 100);
  const safePage = Math.max(1, Math.min(50, Number.isFinite(page) ? Math.floor(page) : 1));
  const safePageSize = Math.max(1, Math.min(40, Number.isFinite(pageSize) ? Math.floor(pageSize) : 20));
  if (!cleanQuery) return unavailableResponse(safePage, safePageSize, 'Digite o nome de um jogo para pesquisar.');

  const key = `igdb:search:${cleanQuery.toLocaleLowerCase()}:${safePage}:${safePageSize}`;
  const cached = await readCache<CatalogSearchResponse>(db, key);
  if (cached.fresh) return cached.fresh;

  if (allowMock) return mockSearch(cleanQuery, safePage, safePageSize);
  if (!twitchClientId || !twitchClientSecret) {
    return staleResponse(cached.stale,
      safePage,
      safePageSize,
      'A busca online está temporariamente indisponível. Você ainda pode cadastrar o jogo manualmente.'
    );
  }
  if (!(await takeIgdbSlot(db))) {
    return staleResponse(cached.stale,
      safePage,
      safePageSize,
      'Muitas buscas estão acontecendo agora. Aguarde alguns segundos e tente novamente.'
    );
  }

  try {
    const fetched = await searchIgdb(
      db,
      twitchClientId,
      twitchClientSecret,
      cleanQuery,
      safePageSize + 1,
      (safePage - 1) * safePageSize
    );
    const hasMore = fetched.length > safePageSize;
    const results = fetched.slice(0, safePageSize);
    const result: CatalogSearchResponse = {
      results, total: (safePage - 1) * safePageSize + results.length, page: safePage, pageSize: safePageSize,
      hasMore, provider: 'igdb', isLive: true, attribution: ATTRIBUTION,
    };
    await writeCache(db, key, cleanQuery, result, SEARCH_TTL_SECONDS);
    return result;
  } catch (error) {
    const status = error instanceof Error ? error.message : '';
    if (cached.stale) return staleResponse(cached.stale, safePage, safePageSize, 'Exibindo resultados salvos. A busca online está temporariamente indisponível.');
    if (status.includes('(429)')) {
      return unavailableResponse(safePage, safePageSize, 'O catálogo está recebendo muitas buscas. Tente novamente em alguns segundos.');
    }
    return unavailableResponse(safePage, safePageSize, 'Não foi possível consultar o catálogo agora. Verifique sua conexão e tente novamente.');
  }
}

export async function getGameDetails(
  db: D1Database | undefined,
  id: string,
  twitchClientId?: string,
  twitchClientSecret?: string,
  allowMock = false
): Promise<CatalogGameDetails | null> {
  const safeId = (id || '').trim().slice(0, 100);
  const key = `igdb:game:${safeId}`;
  const cached = await readCache<CatalogGameDetails>(db, key);
  if (cached.fresh) return cached.fresh;

  if (safeId.startsWith('mock-') && allowMock) return DEV_MOCK_GAMES.find((game) => game.id === safeId) || null;
  if (!safeId.startsWith('igdb-') || !twitchClientId || !twitchClientSecret) return cached.stale || null;
  if (!(await takeIgdbSlot(db))) return cached.stale || null;

  const gameId = Number(safeId.slice('igdb-'.length));
  try {
    const details = await getIgdbGameDetails(db, twitchClientId, twitchClientSecret, gameId);
    if (details) await writeCache(db, key, safeId, details, DETAILS_TTL_SECONDS);
    return details || cached.stale || null;
  } catch {
    return cached.stale || null;
  }
}
