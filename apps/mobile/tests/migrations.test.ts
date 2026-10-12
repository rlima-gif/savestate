import { describe, it, expect } from 'vitest';
import { migrateDatabase, LATEST_SCHEMA_VERSION, DatabaseAdapter } from '../src/db/migrations';
import { SQL_SCHEMA_V1 } from '../src/db/schema';

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

describe('SQLite Migrations System', () => {
  it('applies all migrations on a fresh database (version 0 -> latest)', () => {
    const rawDb = new DatabaseSync(':memory:');
    const adapter = createNodeSqliteAdapter(rawDb);

    const result = migrateDatabase(adapter);
    expect(result.fromVersion).toBe(0);
    expect(result.toVersion).toBe(LATEST_SCHEMA_VERSION);

    // Verify PRAGMA user_version is updated
    const versionRow = adapter.getFirstSync<{ user_version: number }>('PRAGMA user_version;');
    expect(versionRow?.user_version).toBe(LATEST_SCHEMA_VERSION);

    // Verify tables exist
    const tablesRow = adapter.getFirstSync<{ count: number }>(
      "SELECT count(*) as count FROM sqlite_master WHERE type='table' AND name IN ('games', 'playthroughs', 'owned_copies', 'checklists');"
    );
    expect(tablesRow?.count).toBe(4);
  });

  it('is idempotent when run repeatedly on an already-migrated database', () => {
    const rawDb = new DatabaseSync(':memory:');
    const adapter = createNodeSqliteAdapter(rawDb);

    const firstRun = migrateDatabase(adapter);
    expect(firstRun.toVersion).toBe(LATEST_SCHEMA_VERSION);

    const secondRun = migrateDatabase(adapter);
    expect(secondRun.fromVersion).toBe(LATEST_SCHEMA_VERSION);
    expect(secondRun.toVersion).toBe(LATEST_SCHEMA_VERSION);
  });

  it('preserves existing user records when upgrading from legacy V1 schema', () => {
    const rawDb = new DatabaseSync(':memory:');
    const adapter = createNodeSqliteAdapter(rawDb);

    // 1. Simulate legacy database created with SQL_SCHEMA_V1 (user_version = 0)
    rawDb.exec('PRAGMA foreign_keys = ON;');
    rawDb.exec(SQL_SCHEMA_V1);

    // 2. Insert representative user data
    rawDb.exec(`
      INSERT INTO games (id, title, genres, platforms, source, externalIds, fetchedAt, createdAt, updatedAt)
      VALUES ('game-1', 'Super Mario World', '["Plataforma"]', '["SNES"]', 'manual', '{}', '2026-01-01', '2026-01-01', '2026-01-01');

      INSERT INTO playthroughs (id, gameId, status, priority, currentChapter, nextObjective, totalPlaytimeMinutes, createdAt, updatedAt)
      VALUES ('pt-1', 'game-1', 'playing', 'high', 'Special Zone', 'Tubular', 180, '2026-01-01', '2026-01-01');

      INSERT INTO checklists (id, playthroughId, title, isCompleted, createdAt, updatedAt)
      VALUES ('chk-1', 'pt-1', 'Pegar 96 saídas', 0, '2026-01-01', '2026-01-01');
    `);

    // Verify initial version is 0 before migration
    const beforeVersion = adapter.getFirstSync<{ user_version: number }>('PRAGMA user_version;');
    expect(beforeVersion?.user_version).toBe(0);

    // 3. Run migration runner
    const result = migrateDatabase(adapter);
    expect(result.fromVersion).toBe(1); // Detected legacy V1
    expect(result.toVersion).toBe(LATEST_SCHEMA_VERSION);

    // 4. Verify all user data was strictly preserved
    const game = adapter.getFirstSync<{ title: string; genres: string }>("SELECT * FROM games WHERE id = 'game-1';");
    expect(game?.title).toBe('Super Mario World');
    expect(game?.genres).toBe('["Plataforma"]');

    const playthrough = adapter.getFirstSync<{ currentChapter: string; nextObjective: string }>(
      "SELECT * FROM playthroughs WHERE id = 'pt-1';"
    );
    expect(playthrough?.currentChapter).toBe('Special Zone');
    expect(playthrough?.nextObjective).toBe('Tubular');

    const checklist = adapter.getFirstSync<{ title: string; isCompleted: number }>(
      "SELECT * FROM checklists WHERE id = 'chk-1';"
    );
    expect(checklist?.title).toBe('Pegar 96 saídas');
    expect(checklist?.isCompleted).toBe(0);
  });
});
