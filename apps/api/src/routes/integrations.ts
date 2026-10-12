import { Hono } from 'hono';
import { Env } from '../types';
import { normalizeSteamGames, normalizeRetroAchievementsGames } from '@savestate/shared';

export const integrationsRouter = new Hono<{ Bindings: Env }>();

// Steam profile / library sync
integrationsRouter.post('/integrations/steam/sync', async (c) => {
  let body: { steamId?: string; steamApiKey?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Corpo da requisição inválido.' }, 400);
  }

  const { steamId } = body;
  if (!steamId || !steamId.trim()) {
    return c.json({ error: 'SteamID é obrigatório.' }, 400);
  }

  const cleanSteamId = steamId.trim();

  try {
    // Try public community XML endpoint (works for any public Steam profile without developer key!)
    const xmlUrl = `https://steamcommunity.com/profiles/${cleanSteamId}/games?tab=all&xml=1`;
    const response = await fetch(xmlUrl, {
      headers: { 'User-Agent': 'SaveState-App/0.1.0' },
      signal: AbortSignal.timeout(12000),
    });

    if (!response.ok) {
      return c.json(
        {
          error:
            'Não foi possível acessar o perfil da Steam. Verifique se o SteamID está correto e se o perfil está público em "Detalhes dos Jogos".',
        },
        response.status === 404 ? 404 : 502
      );
    }

    const xmlText = await response.text();

    // Parse games from XML (lightweight regex extractor to avoid heavy XML parser deps in Workers)
    const gameBlocks = xmlText.match(/<game>([\s\S]*?)<\/game>/g) || [];
    if (gameBlocks.length === 0) {
      if (xmlText.includes('<privacyState>private</privacyState>')) {
        return c.json(
          {
            error:
              'O perfil da Steam informado é PRIVADO. Acesse as configurações de privacidade da sua conta Steam e defina "Detalhes dos Jogos" como "Público".',
            isPrivate: true,
          },
          403
        );
      }

      return c.json({
        games: [],
        total: 0,
        message: 'Nenhum jogo encontrado na biblioteca informada.',
      });
    }

    const rawGames = gameBlocks.map((block) => {
      const appidMatch = block.match(/<appID>(\d+)<\/appID>/);
      const nameMatch = block.match(/<name><!\[CDATA\[(.*?)\]\]><\/name>/) || block.match(/<name>(.*?)<\/name>/);
      const hoursMatch = block.match(/<hoursOnRecord>([\d.,]+)<\/hoursOnRecord>/);

      const appid = appidMatch ? parseInt(appidMatch[1], 10) : 0;
      const name = nameMatch ? nameMatch[1] : `App ${appid}`;
      const hours = hoursMatch ? parseFloat(hoursMatch[1].replace(',', '.')) : 0;

      return {
        appid,
        name,
        playtime_forever: Math.round(hours * 60),
      };
    });

    const normalized = normalizeSteamGames(rawGames.filter((g) => g.appid > 0));

    return c.json({
      steamId: cleanSteamId,
      total: normalized.length,
      games: normalized,
      attribution: 'Dados importados da Comunidade Steam',
    });
  } catch (err: any) {
    console.error('Steam sync error:', err);
    return c.json(
      {
        error: `Falha ao conectar aos servidores da Steam (${err.message || 'tempo limite'}).`,
      },
      504
    );
  }
});

// RetroAchievements user progress sync
integrationsRouter.post('/integrations/retroachievements/sync', async (c) => {
  let body: { username?: string; webApiKey?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Corpo da requisição inválido.' }, 400);
  }

  const { username, webApiKey } = body;
  if (!username || !username.trim()) {
    return c.json({ error: 'Nome de usuário do RetroAchievements é obrigatório.' }, 400);
  }

  const cleanUser = username.trim();

  // If user provided a Web API key, call official RA API
  if (webApiKey && webApiKey.trim()) {
    try {
      const url = `https://retroachievements.org/API/API_GetUserCompletedGames.php?u=${encodeURIComponent(
        cleanUser
      )}&y=${encodeURIComponent(webApiKey.trim())}`;
      const response = await fetch(url, { signal: AbortSignal.timeout(10000) });

      if (response.ok) {
        const raw = (await response.json()) as any[];
        const normalized = normalizeRetroAchievementsGames(Array.isArray(raw) ? raw : []);
        return c.json({
          username: cleanUser,
          total: normalized.length,
          games: normalized,
          attribution: 'Dados providos pela API oficial do RetroAchievements.org',
        });
      }
    } catch (err: any) {
      console.warn('RA API call failed:', err);
    }
  }

  // Without personal API key, return explanation and instructions
  return c.json({
    username: cleanUser,
    total: 0,
    games: [],
    requiresKey: true,
    message:
      'Para importar conquistas do RetroAchievements, informe sua Web API Key obtida gratuitamente nas configurações do seu perfil em retroachievements.org/controlpanel.php',
  });
});
