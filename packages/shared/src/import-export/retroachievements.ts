export interface RetroAchievementsGameRaw {
  GameID: number;
  Title: string;
  ConsoleID: number;
  ConsoleName: string;
  ImageIcon?: string;
  NumAchievements: number;
  NumAwardedToUser: number;
  PctWon: string;
}

export interface NormalizedRetroGame {
  externalId: number;
  title: string;
  consoleName: string;
  numAchievements: number;
  numAwarded: number;
  isMastered: boolean;
  coverUrl?: string;
}

export function normalizeRetroAchievementsGames(raw: RetroAchievementsGameRaw[]): NormalizedRetroGame[] {
  return raw.map((item) => ({
    externalId: item.GameID,
    title: item.Title,
    consoleName: item.ConsoleName,
    numAchievements: item.NumAchievements,
    numAwarded: item.NumAwardedToUser,
    isMastered: item.NumAchievements > 0 && item.NumAwardedToUser === item.NumAchievements,
    coverUrl: item.ImageIcon ? `https://media.retroachievements.org/Images/${item.ImageIcon}` : undefined,
  }));
}
