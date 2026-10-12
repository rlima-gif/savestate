export interface SteamGameRaw {
  appid: number;
  name: string;
  playtime_forever: number; // in minutes
  img_icon_url?: string;
  rtime_last_played?: number;
}

export interface SteamImportSummary {
  added: number;
  updated: number;
  skipped: number;
  total: number;
}

export interface NormalizedSteamGame {
  externalId: number;
  title: string;
  playtimeMinutes: number;
  coverUrl: string;
  lastPlayedAt?: string;
}

export function normalizeSteamGames(rawGames: SteamGameRaw[]): NormalizedSteamGame[] {
  return rawGames.map((g) => {
    // Steam image icon or header
    const coverUrl = g.appid
      ? `https://cdn.cloudflare.steamstatic.com/steam/apps/${g.appid}/header.jpg`
      : '';
    const lastPlayedAt = g.rtime_last_played
      ? new Date(g.rtime_last_played * 1000).toISOString()
      : undefined;

    return {
      externalId: g.appid,
      title: g.name,
      playtimeMinutes: g.playtime_forever || 0,
      coverUrl,
      lastPlayedAt,
    };
  });
}
