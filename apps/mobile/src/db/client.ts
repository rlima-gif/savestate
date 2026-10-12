import * as SQLite from 'expo-sqlite';
import { SQL_SCHEMA_V1 } from './schema';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export function getDatabase(): SQLite.SQLiteDatabase {
  if (!dbInstance) {
    dbInstance = SQLite.openDatabaseSync('savestate.db');
    initDatabase(dbInstance);
  }
  return dbInstance;
}

export function initDatabase(db: SQLite.SQLiteDatabase) {
  // Execute schema creation statements
  db.execSync('PRAGMA foreign_keys = ON;');
  db.execSync(SQL_SCHEMA_V1);
}
