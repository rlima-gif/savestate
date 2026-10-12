import {
  AssistantChatRequest,
  AssistantChatResponse,
  CatalogSearchResponse,
  CatalogGameDetails,
} from '@savestate/shared';

const DEFAULT_API_URL =
  process.env.EXPO_PUBLIC_API_URL || 'https://savestate-api-staging.safeloot.workers.dev';

async function safeFetch(
  url: string,
  options: RequestInit = {},
  timeoutMs = 12000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw new Error('A requisição demorou muito para responder (tempo limite excedido).');
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function buildUrl(path: string, params: Record<string, string | number | undefined>): string {
  const base = DEFAULT_API_URL.replace(/\/+$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const searchParts: string[] = [];
  for (const [key, val] of Object.entries(params)) {
    if (val !== undefined && val !== null && val !== '') {
      searchParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(val))}`);
    }
  }
  return searchParts.length > 0 ? `${base}${cleanPath}?${searchParts.join('&')}` : `${base}${cleanPath}`;
}

export const ApiService = {
  getBaseUrl(): string {
    return DEFAULT_API_URL;
  },

  async searchCatalog(query: string, page = 1, pageSize = 20): Promise<CatalogSearchResponse> {
    const url = buildUrl('/api/catalog/search', {
      q: query,
      page,
      pageSize,
    });

    const response = await safeFetch(url, {
      headers: { 'Accept': 'application/json' },
    }, 10000);

    if (!response.ok) {
      throw new Error(`Erro na busca do catálogo (${response.status})`);
    }

    return response.json();
  },

  async getGameDetails(id: string): Promise<CatalogGameDetails> {
    const base = DEFAULT_API_URL.replace(/\/+$/, '');
    const url = `${base}/api/catalog/games/${encodeURIComponent(id)}`;

    const response = await safeFetch(url, {
      headers: { 'Accept': 'application/json' },
    }, 10000);

    if (!response.ok) {
      throw new Error(`Jogo não encontrado no catálogo (${response.status})`);
    }

    return response.json();
  },

  async askAssistant(request: AssistantChatRequest): Promise<AssistantChatResponse> {
    const base = DEFAULT_API_URL.replace(/\/+$/, '');
    const url = `${base}/api/assistant/chat`;

    const response = await safeFetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(request),
    }, 25000);

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      if (response.status === 429) {
        throw new Error(errJson.error || 'Limite diário de perguntas atingido. Tente novamente amanhã.');
      }
      if (response.status === 503) {
        throw new Error(errJson.error || 'Assistente temporariamente indisponível.');
      }
      throw new Error(errJson.error || `Erro de conexão com o assistente (${response.status})`);
    }

    return response.json();
  },

  async getGuides(gameTitle: string, query = ''): Promise<any> {
    const url = buildUrl('/api/guides/search', {
      game: gameTitle,
      q: query || undefined,
    });

    const response = await safeFetch(url, {
      headers: { 'Accept': 'application/json' },
    }, 8000);

    if (!response.ok) {
      throw new Error('Falha ao obter guias');
    }

    return response.json();
  },

  async syncSteam(steamId: string): Promise<any> {
    const base = DEFAULT_API_URL.replace(/\/+$/, '');
    const url = `${base}/api/integrations/steam/sync`;

    const response = await safeFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ steamId }),
    }, 15000);

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Erro ao sincronizar com a Steam.');
    }
    return data;
  },

  async syncRetroAchievements(username: string, webApiKey?: string): Promise<any> {
    const base = DEFAULT_API_URL.replace(/\/+$/, '');
    const url = `${base}/api/integrations/retroachievements/sync`;

    const response = await safeFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, webApiKey }),
    }, 15000);

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Erro ao sincronizar com RetroAchievements.');
    }
    return data;
  },
};
