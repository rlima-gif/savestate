import { describe, it, expect } from 'vitest';
import { SQL_SCHEMA_V1 } from '../src/db/schema';

describe('SQLite Schema V1', () => {
  it('contains all required tables', () => {
    expect(SQL_SCHEMA_V1).toContain('CREATE TABLE IF NOT EXISTS games');
    expect(SQL_SCHEMA_V1).toContain('CREATE TABLE IF NOT EXISTS owned_copies');
    expect(SQL_SCHEMA_V1).toContain('CREATE TABLE IF NOT EXISTS playthroughs');
    expect(SQL_SCHEMA_V1).toContain('CREATE TABLE IF NOT EXISTS sessions');
    expect(SQL_SCHEMA_V1).toContain('CREATE TABLE IF NOT EXISTS checklists');
    expect(SQL_SCHEMA_V1).toContain('CREATE TABLE IF NOT EXISTS devices');
    expect(SQL_SCHEMA_V1).toContain('CREATE TABLE IF NOT EXISTS active_timer');
  });

  it('declares foreign keys and cascading deletes', () => {
    expect(SQL_SCHEMA_V1).toContain('FOREIGN KEY (gameId) REFERENCES games(id) ON DELETE CASCADE');
    expect(SQL_SCHEMA_V1).toContain('FOREIGN KEY (playthroughId) REFERENCES playthroughs(id) ON DELETE CASCADE');
  });
});
