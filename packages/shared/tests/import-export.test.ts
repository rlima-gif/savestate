import { describe, it, expect } from 'vitest';
import { exportToJson, parseJsonBackup, exportGamesToCsv } from '../src/import-export/backup';
import { normalizeSteamGames } from '../src/import-export/steam';
import { normalizeRetroAchievementsGames } from '../src/import-export/retroachievements';
import { CanonicalGame, Playthrough } from '../src/types/game';

describe('Backup and Import/Export', () => {
  const mockGame: CanonicalGame = {
    id: 'game-1',
    title: 'Hollow Knight',
    genres: ['Metroidvania', 'Action'],
    platforms: ['PC', 'Nintendo Switch'],
    source: 'manual',
    fetchedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    externalIds: {},
  };

  const mockPlaythrough: Playthrough = {
    id: 'pt-1',
    gameId: 'game-1',
    status: 'playing',
    priority: 'high',
    totalPlaytimeMinutes: 300,
    currentChapter: 'Cidade das Lágrimas',
    isReplay: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it('performs full round-trip JSON serialization and parsing', () => {
    const jsonStr = exportToJson({
      includesAttachments: false,
      games: [mockGame],
      ownedCopies: [],
      playthroughs: [mockPlaythrough],
      sessions: [],
      checklists: [],
      devices: [],
    });

    const parsed = parseJsonBackup(jsonStr);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.games.length).toBe(1);
      expect(parsed.data.games[0].title).toBe('Hollow Knight');
      expect(parsed.data.playthroughs[0].currentChapter).toBe('Cidade das Lágrimas');
    }
  });

  it('exports valid CSV with UTF-8 BOM and escaped headers', () => {
    const csv = exportGamesToCsv([mockGame], [mockPlaythrough]);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('Hollow Knight');
    expect(csv).toContain('Cidade das Lágrimas');
    expect(csv).toContain('playing');
  });

  it('normalizes Steam game payloads correctly', () => {
    const normalized = normalizeSteamGames([
      {
        appid: 367520,
        name: 'Hollow Knight',
        playtime_forever: 240,
        rtime_last_played: 1672531199,
      },
    ]);
    expect(normalized.length).toBe(1);
    expect(normalized[0].externalId).toBe(367520);
    expect(normalized[0].title).toBe('Hollow Knight');
    expect(normalized[0].playtimeMinutes).toBe(240);
    expect(normalized[0].coverUrl).toContain('367520/header.jpg');
  });

  it('normalizes RetroAchievements payload correctly', () => {
    const normalized = normalizeRetroAchievementsGames([
      {
        GameID: 1448,
        Title: 'Super Mario World',
        ConsoleID: 3,
        ConsoleName: 'SNES',
        NumAchievements: 50,
        NumAwardedToUser: 50,
        PctWon: '100.00%',
        ImageIcon: '/Images/001448.png',
      },
    ]);
    expect(normalized.length).toBe(1);
    expect(normalized[0].isMastered).toBe(true);
    expect(normalized[0].consoleName).toBe('SNES');
  });
});
