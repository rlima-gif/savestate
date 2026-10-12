import { Hono } from 'hono';
import { Env } from '../types';
import { normalizeSteamGames, normalizeRetroAchievementsGames } from '@savestate/shared';

export const integrationsRouter = new Hono<{ Bindings: Env }>();

// Steam profile / library sync
integrationsRouter.post('/integrations/steam/sync', async (c) => {
  let body: { steamId?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Corpo da requisição inválido.' }, 400);
  }

  const { steamId } = body;
  if (!steamId || !steamId.trim()) {
    return c.json({ error: 'SteamID ou identificador de perfil é obrigatório.' }, 400);
  }

  let cleanInput = steamId.trim();

  // Support pasting full Steam profile URLs
  // e.g. https://steamcommunity.com/profiles/76561197960287930/ or https://steamcommunity.com/id/custom_name/
  if (cleanInput.includes('steamcommunity.com/profiles/')) {
    const match = cleanInput.match(/steamcommunity\.com\/profiles\/(\d+)/);
    if (match) cleanInput = match[1];
  } else if (cleanInput.includes('steamcommunity.com/id/')) {
    const match = cleanInput.match(/steamcommunity\.com\/id\/([a-zA-Z0-9_-]+)/);
    if (match) cleanInput = match[1];
  }

  // Validate format (numeric SteamID64 or alphanumeric vanity name)
  const isSteamId64 = /^\d{17}$/.test(cleanInput);
  const isValidVanity = /^[a-zA-Z0-9_-]{2,64}$/.test(cleanInput);

  if (!isSteamId64 && !isValidVanity) {
    return c.json(
      {
        error:
          'Identificador Steam inválido. Informe seu SteamID64 de 17 dígitos ou o nome personalizado do seu perfil (vanity ID).',
      },
      400
    );
  }

  try {
    // Official public community XML endpoint for games list
    const xmlUrl = isSteamId64
      ? `https://steamcommunity.com/profiles/${cleanInput}/games?tab=all&xml=1`
      : `https://steamcommunity.com/id/${cleanInput}/games?tab=all&xml=1`;

    const response = await fetch(xmlUrl, {
      headers: { 'User-Agent': 'SaveState-App/0.1.0' },
      signal: AbortSignal.timeout(12000),
    });

    if (!response.ok) {
      return c.json(
        {
          error:
            'Não foi possível acessar o perfil da Steam. Verifique se o identificador está correto e se o perfil está público em "Detalhes dos Jogos".',
        },
        response.status === 404 ? 404 : 502
      );
    }

    const xmlText = await response.text();

    // Check for private profile XML state
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

    // Parse games from XML safely
    const gameBlocks = xmlText.match(/<game>([\s\S]*?)<\/game>/g) || [];
    if (gameBlocks.length === 0) {
      return c.json({
        games: [],
        total: 0,
        message: 'Nenhum jogo encontrado na biblioteca informada.',
      });
    }

    const rawGames = gameBlocks.map((block) => {
      const appidMatch = block.match(/<appID>(\d+)<\/appID>/);
      const nameMatch =
        block.match(/<name><!\[CDATA\[(.*?)\]\]><\/name>/) || block.match(/<name>(.*?)<\/name>/);
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
      steamId: cleanInput,
      total: normalized.length,
      games: normalized,
      attribution: 'Dados importados da Comunidade Steam',
    });
  } catch (_err) {
    return c.json(
      {
        error: 'Falha temporária ao conectar aos servidores da Steam.',
      },
      504
    );
  }
});

// RetroAchievements user progress / completed games sync
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
  if (!/^[a-zA-Z0-9_-]{2,64}$/.test(cleanUser)) {
    return c.json({ error: 'Nome de usuário do RetroAchievements inválido.' }, 400);
  }

  // If user provided a Web API key, call official RetroAchievements API
  if (webApiKey && webApiKey.trim()) {
    const cleanKey = webApiKey.trim();
    try {
      const url = `https://retroachievements.org/API/API_GetUserCompletedGames.php?u=${encodeURIComponent(
        cleanUser
      )}&y=${encodeURIComponent(cleanKey)}`;

      const response = await fetch(url, { signal: AbortSignal.timeout(10000) });

      if (response.ok) {
        const raw = (await response.json()) as any[];
        const normalized = normalizeRetroAchievementsGames(Array.isArray(raw) ? raw : []);
        return c.json({
          username: cleanUser,
          total: normalized.length,
          games: normalized,
          notice:
            'Importação de registros de jogos completados (100% de conquistas). Sua chave de API foi utilizada de forma efêmera e não foi salva no servidor.',
          attribution: 'Dados providos pela API oficial do RetroAchievements.org',
        });
      }
    } catch (_err) {
      // Never log sensitive key or upstream body
    }
  }

  // Without personal API key, return explanation and instructions
  return c.json({
    username: cleanUser,
    total: 0,
    games: [],
    requiresKey: true,
    message:
      'Para importar jogos completados do RetroAchievements, informe sua Web API Key obtida gratuitamente nas configurações do seu perfil em retroachievements.org/controlpanel.php',
    notice: 'Sua chave de API é usada apenas durante esta consulta direta e não fica salva no servidor.',
  });
});
