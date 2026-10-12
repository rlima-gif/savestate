import { CatalogSearchResponse, CatalogGameDetails, CatalogGameSummary } from '@savestate/shared';

// High quality curated mock data for offline/test/no-key mode
const MOCK_GAMES: CatalogGameDetails[] = [
  {
    id: 'mock-1',
    providerId: 1,
    provider: 'mock',
    title: 'The Legend of Zelda: Breath of the Wild',
    coverUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80',
    releaseDate: '2017-03-03',
    platforms: ['Nintendo Switch', 'Wii U'],
    genres: ['Ação', 'Aventura', 'Mundo Aberto'],
    rating: 4.8,
    metacritic: 97,
    description: 'Entre no mundo de descoberta, exploração e aventura em The Legend of Zelda: Breath of the Wild.',
    developers: ['Nintendo EPD'],
    publishers: ['Nintendo'],
    screenshots: [],
    estimatedDurationHours: { mainStory: 50, mainExtra: 95, completionist: 190 },
    attribution: 'Dados locais SaveState (Offline)',
  },
  {
    id: 'mock-2',
    providerId: 2,
    provider: 'mock',
    title: 'Hollow Knight',
    coverUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80',
    releaseDate: '2017-02-24',
    platforms: ['PC', 'Nintendo Switch', 'PS4', 'Xbox One'],
    genres: ['Metroidvania', 'Ação', 'Indie'],
    rating: 4.7,
    metacritic: 90,
    description: 'Forje seu próprio caminho em Hollow Knight! Uma épica aventura de ação através de um vasto reino arruinado de insetos e heróis.',
    developers: ['Team Cherry'],
    publishers: ['Team Cherry'],
    screenshots: [],
    estimatedDurationHours: { mainStory: 27, mainExtra: 42, completionist: 63 },
    attribution: 'Dados locais SaveState (Offline)',
  },
  {
    id: 'mock-3',
    providerId: 3,
    provider: 'mock',
    title: 'Elden Ring',
    coverUrl: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=600&auto=format&fit=crop&q=80',
    releaseDate: '2022-02-25',
    platforms: ['PC', 'PS4', 'PS5', 'Xbox One', 'Xbox Series X/S'],
    genres: ['RPG de Ação', 'Souls-like', 'Mundo Aberto'],
    rating: 4.6,
    metacritic: 96,
    description: 'Levante-se, Maculado, e seja guiado pela graça para portar o poder do Anel Prístino e se tornar um Lorde Prístino nas Terras Intermédias.',
    developers: ['FromSoftware Inc.'],
    publishers: ['Bandai Namco Entertainment'],
    screenshots: [],
    estimatedDurationHours: { mainStory: 58, mainExtra: 101, completionist: 133 },
    attribution: 'Dados locais SaveState (Offline)',
  },
  {
    id: 'mock-4',
    providerId: 4,
    provider: 'mock',
    title: 'Chrono Trigger',
    coverUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&auto=format&fit=crop&q=80',
    releaseDate: '1995-03-11',
    platforms: ['SNES', 'PlayStation', 'Nintendo DS', 'PC', 'Android', 'iOS'],
    genres: ['JRPG', 'Clássico'],
    rating: 4.9,
    metacritic: 92,
    description: 'Um clássico RPG atemporal desenvolvido por uma equipe dos sonhos: Yuji Horii, Hironobu Sakaguchi e Akira Toriyama.',
    developers: ['Square'],
    publishers: ['Square'],
    screenshots: [],
    estimatedDurationHours: { mainStory: 23, mainExtra: 27, completionist: 43 },
    attribution: 'Dados locais SaveState (Offline)',
  },
  {
    id: 'mock-5',
    providerId: 5,
    provider: 'mock',
    title: 'Celeste',
    coverUrl: 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=600&auto=format&fit=crop&q=80',
    releaseDate: '2018-01-25',
    platforms: ['PC', 'Nintendo Switch', 'PS4', 'Xbox One'],
    genres: ['Plataforma', 'Indie', 'Aventura'],
    rating: 4.8,
    metacritic: 94,
    description: 'Ajude Madeline a enfrentar seus demônios internos em sua jornada até o topo da Montanha Celeste.',
    developers: ['Maddy Makes Games'],
    publishers: ['Maddy Makes Games'],
    screenshots: [],
    estimatedDurationHours: { mainStory: 8, mainExtra: 14, completionist: 38 },
    attribution: 'Dados locais SaveState (Offline)',
  },
];

export async function searchCatalog(
  query: string,
  page = 1,
  pageSize = 20,
  rawgApiKey?: string,
  allowMock = false
): Promise<CatalogSearchResponse> {
  // If RAWG API key is configured, query RAWG
  if (rawgApiKey) {
    try {
      const url = new URL('https://api.rawg.io/api/games');
      url.searchParams.set('key', rawgApiKey);
      url.searchParams.set('search', query);
      url.searchParams.set('page', String(page));
      url.searchParams.set('page_size', String(pageSize));

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

        return {
          results,
          total: data.count || results.length,
          page,
          pageSize,
          hasMore: Boolean(data.next),
          provider: 'rawg',
          isLive: true,
          attribution: 'Dados providos pela RAWG Video Games Database (https://rawg.io)',
        };
      }
    } catch (err) {
      console.warn('RAWG API request failed:', err);
      if (!allowMock) {
        return {
          results: [],
          total: 0,
          page,
          pageSize,
          hasMore: false,
          provider: 'unavailable',
          isLive: false,
          message: 'Falha temporária ao comunicar com o catálogo da RAWG API.',
          attribution: 'RAWG indisponível',
        };
      }
    }
  }

  // If no credentials and mock is not requested, return honest unavailable state
  if (!allowMock) {
    return {
      results: [],
      total: 0,
      page,
      pageSize,
      hasMore: false,
      provider: 'unavailable',
      isLive: false,
      message:
        'Busca online de catálogo indisponível (chave RAWG_API_KEY não configurada no servidor). Jogos podem ser cadastrados manualmente com capa e metadados na aba Biblioteca (+ Adicionar Jogo).',
      attribution: 'Catálogo online não configurado',
    };
  }

  // Fallback to local curated mock catalog only when explicitly requested
  const normalizedQuery = query.toLowerCase().trim();
  const filtered = normalizedQuery
    ? MOCK_GAMES.filter((g) =>
        g.title.toLowerCase().includes(normalizedQuery) ||
        g.genres.some((genre) => genre.toLowerCase().includes(normalizedQuery))
      )
    : MOCK_GAMES;

  const startIndex = (page - 1) * pageSize;
  const paginated = filtered.slice(startIndex, startIndex + pageSize);

  return {
    results: paginated,
    total: filtered.length,
    page,
    pageSize,
    hasMore: startIndex + pageSize < filtered.length,
    provider: 'mock',
    isLive: false,
    attribution: 'Catálogo de demonstração local SaveState',
  };
}

export async function getGameDetails(id: string, rawgApiKey?: string): Promise<CatalogGameDetails | null> {
  if (id.startsWith('rawg-') && rawgApiKey) {
    const rawgId = id.replace('rawg-', '');
    try {
      const url = `https://api.rawg.io/api/games/${rawgId}?key=${rawgApiKey}`;
      const response = await fetch(url, {
        headers: { 'User-Agent': 'SaveState-App/0.1.0' },
        signal: AbortSignal.timeout(8000),
      });

      if (response.ok) {
        const item = (await response.json()) as any;
        return {
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
      }
    } catch (err) {
      console.warn('RAWG detail fetch failed:', err);
    }
  }

  // Lookup in mock games
  const found = MOCK_GAMES.find((g) => g.id === id || `rawg-${g.providerId}` === id);
  return found || null;
}
