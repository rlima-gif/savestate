import { CatalogGameDetails, CatalogGameSummary } from '@savestate/shared';

type CatalogDb = D1Database | undefined;

const IGDB_API = 'https://api.igdb.com/v4';
const TWITCH_TOKEN_URL = 'https://id.twitch.tv/oauth2/token';
const CATALOG_ATTRIBUTION = 'Game metadata provided by IGDB.com';

interface CachedToken {
  value: string;
  expiresAt: number;
}

interface IgdbGame {
  id: number;
  name?: string;
  cover?: { url?: string };
  first_release_date?: number;
  platforms?: Array<{ name?: string }>;
  genres?: Array<{ name?: string }>;
  rating?: number;
  aggregated_rating?: number;
  summary?: string;
  involved_companies?: Array<{
    developer?: boolean;
    publisher?: boolean;
    company?: { name?: string };
  }>;
  websites?: Array<{ url?: string }>;
  screenshots?: Array<{ url?: string }>;
}

let cachedToken: CachedToken | undefined;
let tokenRequest: Promise<string> | undefined;

async function getAccessToken(db: CatalogDb, clientId: string, clientSecret: string): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 30_000) return cachedToken.value;
  if (tokenRequest) return tokenRequest;

  tokenRequest = (async () => {
    if (db) {
      try {
        const stored = await db.prepare(
          'SELECT access_token, expires_at FROM catalog_auth_tokens WHERE client_id = ?'
        ).bind(clientId).first<{ access_token: string; expires_at: number }>();
        if (stored?.access_token && stored.expires_at > Math.floor(now / 1000) + 30) {
          cachedToken = { value: stored.access_token, expiresAt: stored.expires_at * 1000 };
          return stored.access_token;
        }
      } catch {
        // Local/legacy D1 deployments can still authenticate without persistent token cache.
      }
    }

    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials',
    });
    const response = await fetch(TWITCH_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(`Twitch token request failed (${response.status})`);

    const data = (await response.json()) as { access_token?: string; expires_in?: number };
    if (!data.access_token || typeof data.expires_in !== 'number' || !Number.isFinite(data.expires_in)) {
      throw new Error('Twitch returned an invalid app token');
    }
    cachedToken = {
      value: data.access_token,
      expiresAt: Date.now() + Math.max(60, data.expires_in - 60) * 1000,
    };
    if (db) {
      try {
        await db.prepare(
          `INSERT INTO catalog_auth_tokens (client_id, access_token, expires_at, updated_at)
           VALUES (?, ?, ?, CURRENT_TIMESTAMP)
           ON CONFLICT(client_id) DO UPDATE SET access_token = excluded.access_token,
           expires_at = excluded.expires_at, updated_at = CURRENT_TIMESTAMP`
        ).bind(clientId, cachedToken.value, Math.floor(cachedToken.expiresAt / 1000)).run();
      } catch {
        // The per-isolate cache remains usable if the persistent cache write fails.
      }
    }
    return data.access_token;
  })();

  try {
    return await tokenRequest;
  } finally {
    tokenRequest = undefined;
  }
}

function coverUrl(url?: string): string | undefined {
  if (!url) return undefined;
  const secureUrl = url.startsWith('//') ? `https:${url}` : url;
  return secureUrl.replace('/t_thumb/', '/t_cover_big_2x/');
}

function mediaUrl(url?: string): string | undefined {
  if (!url) return undefined;
  return url.startsWith('//') ? `https:${url}` : url;
}

function releaseDate(timestamp?: number): string | undefined {
  if (!timestamp || !Number.isFinite(timestamp)) return undefined;
  const date = new Date(timestamp * 1000);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString().slice(0, 10);
}

function toSummary(game: IgdbGame): CatalogGameSummary {
  const score = game.aggregated_rating ?? game.rating;
  return {
    id: `igdb-${game.id}`,
    providerId: game.id,
    provider: 'igdb',
    title: game.name?.trim() || 'Unknown game',
    coverUrl: coverUrl(game.cover?.url),
    releaseDate: releaseDate(game.first_release_date),
    platforms: (game.platforms || []).map((item) => item.name).filter((v): v is string => Boolean(v)),
    genres: (game.genres || []).map((item) => item.name).filter((v): v is string => Boolean(v)),
    rating: score === undefined ? undefined : Math.round((score / 20) * 10) / 10,
  };
}

function toDetails(game: IgdbGame): CatalogGameDetails {
  const summary = toSummary(game);
  const companies = game.involved_companies || [];
  return {
    ...summary,
    description: game.summary || '',
    developers: companies
      .filter((item) => item.developer)
      .map((item) => item.company?.name)
      .filter((v): v is string => Boolean(v)),
    publishers: companies
      .filter((item) => item.publisher)
      .map((item) => item.company?.name)
      .filter((v): v is string => Boolean(v)),
    website: game.websites?.find((item) => item.url)?.url,
    screenshots: (game.screenshots || [])
      .map((item) => mediaUrl(item.url))
      .filter((v): v is string => Boolean(v)),
    attribution: CATALOG_ATTRIBUTION,
  };
}

async function igdbRequest(
  clientId: string,
  token: string,
  endpoint: 'games',
  query: string
): Promise<IgdbGame[]> {
  const response = await fetch(`${IGDB_API}/${endpoint}`, {
    method: 'POST',
    headers: {
      'Client-ID': clientId,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'text/plain',
      Accept: 'application/json',
    },
    body: query,
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`IGDB request failed (${response.status})`);
  const data = (await response.json()) as unknown;
  if (!Array.isArray(data)) throw new Error('IGDB returned an invalid response');
  return data as IgdbGame[];
}

export async function searchIgdb(
  db: CatalogDb,
  clientId: string,
  clientSecret: string,
  term: string,
  limit: number,
  offset: number
): Promise<CatalogGameSummary[]> {
  const token = await getAccessToken(db, clientId, clientSecret);
  const safeTerm = term.replace(/[\r\n\0]/g, ' ').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const query = [
    `search "${safeTerm}";`,
    'fields id,name,cover.url,first_release_date,platforms.name,genres.name,rating,aggregated_rating;',
    `limit ${limit};`,
    `offset ${offset};`,
  ].join('\n');
  const games = await igdbRequest(clientId, token, 'games', query);
  return games.filter((game) => Number.isInteger(game.id) && game.id > 0).map(toSummary);
}

export async function getIgdbGameDetails(
  db: CatalogDb,
  clientId: string,
  clientSecret: string,
  gameId: number
): Promise<CatalogGameDetails | null> {
  if (!Number.isInteger(gameId) || gameId <= 0) return null;
  const token = await getAccessToken(db, clientId, clientSecret);
  const query = [
    'fields id,name,cover.url,first_release_date,platforms.name,genres.name,rating,aggregated_rating,summary,involved_companies.developer,involved_companies.publisher,involved_companies.company.name,websites.url,screenshots.url;',
    `where id = ${gameId};`,
    'limit 1;',
  ].join('\n');
  const games = await igdbRequest(clientId, token, 'games', query);
  return games[0] ? toDetails(games[0]) : null;
}

// Exposed for deterministic tests; never called by application code.
export function resetIgdbTokenCacheForTests(): void {
  cachedToken = undefined;
  tokenRequest = undefined;
}
