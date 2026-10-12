import { SQL_SCHEMA_V1 } from './schema';

export interface DatabaseAdapter {
  execSync: (sql: string) => void;
  getFirstSync: <T = any>(sql: string, ...params: any[]) => T | null;
  withTransactionSync?: (fn: () => void) => void;
}

export interface Migration {
  version: number;
  name: string;
  up: (db: DatabaseAdapter) => void;
}

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: 'initial_schema',
    up: (db: DatabaseAdapter) => {
      db.execSync(SQL_SCHEMA_V1);
    },
  },
  {
    version: 2,
    name: 'indexes_and_optimizations',
    up: (db: DatabaseAdapter) => {
      db.execSync(`
        CREATE INDEX IF NOT EXISTS idx_games_genres ON games(genres);
        CREATE INDEX IF NOT EXISTS idx_games_platforms ON games(platforms);
        CREATE INDEX IF NOT EXISTS idx_copies_platform ON owned_copies(platform);
        CREATE INDEX IF NOT EXISTS idx_checklists_completed ON checklists(isCompleted);
      `);
    },
  },
];

export const LATEST_SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1].version;

/**
 * Executes SQLite migrations incrementally using PRAGMA user_version.
 * Preserves all user data and supports existing databases without data loss.
 */
export function migrateDatabase(db: DatabaseAdapter): { fromVersion: number; toVersion: number } {
  db.execSync('PRAGMA foreign_keys = ON;');

  // Read current schema version
  let currentVersion = 0;
  const versionRow = db.getFirstSync<{ user_version: number }>('PRAGMA user_version;');
  if (versionRow && typeof versionRow.user_version === 'number') {
    currentVersion = versionRow.user_version;
  }

  // Handle legacy databases initialized with V1 before user_version tracking was enabled
  if (currentVersion === 0) {
    const tableExists = db.getFirstSync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='games';"
    );
    if (tableExists) {
      currentVersion = 1;
      db.execSync('PRAGMA user_version = 1;');
    }
  }

  const initialVersion = currentVersion;

  for (const migration of MIGRATIONS) {
    if (migration.version > currentVersion) {
      if (typeof db.withTransactionSync === 'function') {
        db.withTransactionSync(() => {
          migration.up(db);
          db.execSync(`PRAGMA user_version = ${migration.version};`);
        });
      } else {
        db.execSync('BEGIN TRANSACTION;');
        try {
          migration.up(db);
          db.execSync(`PRAGMA user_version = ${migration.version};`);
          db.execSync('COMMIT;');
        } catch (err) {
          db.execSync('ROLLBACK;');
          throw err;
        }
      }
      currentVersion = migration.version;
    }
  }

  return { fromVersion: initialVersion, toVersion: currentVersion };
}
