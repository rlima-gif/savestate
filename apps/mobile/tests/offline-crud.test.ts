import { describe, it, expect, beforeEach } from 'vitest';
import { migrateDatabase, DatabaseAdapter } from '../src/db/migrations';
import { exportToJson, parseJsonBackup } from '@savestate/shared';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { DatabaseSync } = require('node:sqlite');

function createNodeSqliteAdapter(rawDb: any): DatabaseAdapter {
  return {
    execSync: (sql: string) => rawDb.exec(sql),
    getFirstSync: <T = any>(sql: string) => {
      const stmt = rawDb.prepare(sql);
      const row = stmt.get();
      return (row as T) || null;
    },
  };
}

describe('Offline-First Database CRUD & Persistence', () => {
  let rawDb: any;
  let adapter: DatabaseAdapter;

  beforeEach(() => {
    rawDb = new DatabaseSync(':memory:');
    adapter = createNodeSqliteAdapter(rawDb);
    migrateDatabase(adapter);
  });

  it('performs full game and playthrough lifecycle offline', () => {
    // 1. Insert a game
    rawDb.exec(`
      INSERT INTO games (id, title, genres, platforms, source, externalIds, fetchedAt, createdAt, updatedAt)
      VALUES ('g-1', 'Castlevania: Symphony of the Night', '["Metroidvania"]', '["PlayStation"]', 'manual', '{}', '2026-01-01', '2026-01-01', '2026-01-01');
    `);

    const game = adapter.getFirstSync<{ id: string; title: string }>(
      "SELECT id, title FROM games WHERE id = 'g-1';"
    );
    expect(game?.title).toBe('Castlevania: Symphony of the Night');

    // 2. Create Playthrough in backlog
    rawDb.exec(`
      INSERT INTO playthroughs (id, gameId, status, priority, noteToFutureSelf, currentChapter, nextObjective, totalPlaytimeMinutes, createdAt, updatedAt)
      VALUES ('pt-1', 'g-1', 'backlog', 'high', 'Lembrar de pegar o Holy Glasses com a Maria', 'Castelo Normal', 'Derrotar Richter', 0, '2026-01-01', '2026-01-01');
    `);

    const initialPt = adapter.getFirstSync<{ status: string; currentChapter: string; noteToFutureSelf: string }>(
      "SELECT status, currentChapter, noteToFutureSelf FROM playthroughs WHERE id = 'pt-1';"
    );
    expect(initialPt?.status).toBe('backlog');
    expect(initialPt?.noteToFutureSelf).toContain('Holy Glasses');

    // 3. Update status to 'playing'
    rawDb.exec("UPDATE playthroughs SET status = 'playing', updatedAt = '2026-01-02' WHERE id = 'pt-1';");
    const playingPt = adapter.getFirstSync<{ status: string }>("SELECT status FROM playthroughs WHERE id = 'pt-1';");
    expect(playingPt?.status).toBe('playing');

    // 4. Record a gaming session
    rawDb.exec(`
      INSERT INTO sessions (id, playthroughId, startTime, endTime, durationMinutes, progressNote, createdAt)
      VALUES ('sess-1', 'pt-1', '2026-01-02T20:00:00Z', '2026-01-02T21:30:00Z', 90, 'Explorei o Castelo Invertido', '2026-01-02');
      UPDATE playthroughs SET totalPlaytimeMinutes = 90 WHERE id = 'pt-1';
    `);

    const session = adapter.getFirstSync<{ durationMinutes: number; progressNote: string }>(
      "SELECT durationMinutes, progressNote FROM sessions WHERE id = 'sess-1';"
    );
    expect(session?.durationMinutes).toBe(90);
    expect(session?.progressNote).toBe('Explorei o Castelo Invertido');

    // 5. Manage checklists
    rawDb.exec(`
      INSERT INTO checklists (id, playthroughId, title, category, isCompleted, isMissable, createdAt, updatedAt)
      VALUES ('chk-1', 'pt-1', 'Encontrar a Crissaegrim', 'item', 0, 0, '2026-01-02', '2026-01-02');
    `);

    let check = adapter.getFirstSync<{ isCompleted: number }>(
      "SELECT isCompleted FROM checklists WHERE id = 'chk-1';"
    );
    expect(check?.isCompleted).toBe(0);

    // Toggle checklist completed
    rawDb.exec("UPDATE checklists SET isCompleted = 1 WHERE id = 'chk-1';");
    check = adapter.getFirstSync<{ isCompleted: number }>(
      "SELECT isCompleted FROM checklists WHERE id = 'chk-1';"
    );
    expect(check?.isCompleted).toBe(1);

    // 6. Complete playthrough (beaten)
    rawDb.exec("UPDATE playthroughs SET status = 'completed' WHERE id = 'pt-1';");
    const completedPt = adapter.getFirstSync<{ status: string }>("SELECT status FROM playthroughs WHERE id = 'pt-1';");
    expect(completedPt?.status).toBe('completed');
  });

  it('persists and recovers active timer state across app restarts', () => {
    const startedAt = 1770000000000;
    // Set timer running
    rawDb.exec(`
      INSERT INTO active_timer (id, playthroughId, startedAtTimestamp, accumulatedSeconds, isRunning)
      VALUES (1, 'pt-test', ${startedAt}, 120, 1)
      ON CONFLICT(id) DO UPDATE SET playthroughId = 'pt-test', startedAtTimestamp = ${startedAt}, accumulatedSeconds = 120, isRunning = 1;
    `);

    const timer = adapter.getFirstSync<{
      playthroughId: string;
      startedAtTimestamp: number;
      accumulatedSeconds: number;
      isRunning: number;
    }>('SELECT * FROM active_timer WHERE id = 1;');

    expect(timer?.playthroughId).toBe('pt-test');
    expect(timer?.startedAtTimestamp).toBe(startedAt);
    expect(timer?.accumulatedSeconds).toBe(120);
    expect(timer?.isRunning).toBe(1);
  });

  it('exports and validates full backup JSON structure using exportToJson and parseJsonBackup', () => {
    const backupData = {
      includesAttachments: false,
      games: [
        {
          id: 'game-10',
          title: 'Metroid Prime',
          genres: ['Action', 'Sci-Fi'],
          platforms: ['GameCube'],
          source: 'manual' as const,
          externalIds: {},
          fetchedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      ownedCopies: [],
      playthroughs: [],
      sessions: [],
      checklists: [],
      devices: [],
    };

    const jsonStr = exportToJson(backupData, '0.1.0');
    expect(jsonStr).toContain('Metroid Prime');

    const parseResult = parseJsonBackup(jsonStr);
    expect(parseResult.success).toBe(true);
    if (parseResult.success) {
      expect(parseResult.data.games.length).toBe(1);
      expect(parseResult.data.games[0].title).toBe('Metroid Prime');
    }
  });
});
