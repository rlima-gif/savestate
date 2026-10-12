import {
  AssistantChatRequest,
  AssistantChatResponse,
  CatalogSearchResponse,
  CatalogGameDetails,
} from '@savestate/shared';

const DEFAULT_API_URL =
  process.env.EXPO_PUBLIC_API_URL || 'https://savestate-api-staging.safeloot.workers.dev';

export const ApiService = {
  getBaseUrl(): string {
    return DEFAULT_API_URL;
  },

  async searchCatalog(query: string, page = 1, pageSize = 20): Promise<CatalogSearchResponse> {
    const url = new URL(`${DEFAULT_API_URL}/api/catalog/search`);
    url.searchParams.set('q', query);
    url.searchParams.set('page', String(page));
    url.searchParams.set('pageSize', String(pageSize));

    const response = await fetch(url.toString(), {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Erro na busca do catálogo (${response.status})`);
    }

    return response.json();
  },

  async getGameDetails(id: string): Promise<CatalogGameDetails> {
    const response = await fetch(`${DEFAULT_API_URL}/api/catalog/games/${encodeURIComponent(id)}`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Jogo não encontrado no catálogo (${response.status})`);
    }

    return response.json();
  },

  async askAssistant(request: AssistantChatRequest): Promise<AssistantChatResponse> {
    const response = await fetch(`${DEFAULT_API_URL}/api/assistant/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(20000),
    });

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
    const url = new URL(`${DEFAULT_API_URL}/api/guides/search`);
    url.searchParams.set('game', gameTitle);
    if (query) url.searchParams.set('q', query);

    const response = await fetch(url.toString(), {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      throw new Error('Falha ao obter guias');
    }

    return response.json();
  },

  async syncSteam(steamId: string): Promise<any> {
    const response = await fetch(`${DEFAULT_API_URL}/api/integrations/steam/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ steamId }),
      signal: AbortSignal.timeout(15000),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Erro ao sincronizar com a Steam.');
    }
    return data;
  },

  async syncRetroAchievements(username: string, webApiKey?: string): Promise<any> {
    const response = await fetch(`${DEFAULT_API_URL}/api/integrations/retroachievements/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, webApiKey }),
      signal: AbortSignal.timeout(15000),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Erro ao sincronizar com RetroAchievements.');
    }
    return data;
  },
};
