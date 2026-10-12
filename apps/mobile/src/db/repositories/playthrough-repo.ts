import { Playthrough, PlaythroughStatus } from '@savestate/shared';
import { getDatabase } from '../client';

export const PlaythroughRepository = {
  getAll(): Playthrough[] {
    const db = getDatabase();
    const rows = db.getAllSync<any>('SELECT * FROM playthroughs ORDER BY updatedAt DESC');
    return rows.map(mapRowToPlaythrough);
  },

  getByGameId(gameId: string): Playthrough[] {
    const db = getDatabase();
    const rows = db.getAllSync<any>('SELECT * FROM playthroughs WHERE gameId = ? ORDER BY updatedAt DESC', [gameId]);
    return rows.map(mapRowToPlaythrough);
  },

  getById(id: string): Playthrough | null {
    const db = getDatabase();
    const row = db.getFirstSync<any>('SELECT * FROM playthroughs WHERE id = ?', [id]);
    return row ? mapRowToPlaythrough(row) : null;
  },

  getContinuePlaying(): Playthrough[] {
    const db = getDatabase();
    const rows = db.getAllSync<any>(
      "SELECT * FROM playthroughs WHERE status IN ('playing', 'paused') ORDER BY COALESCE(lastPlayedAt, updatedAt) DESC LIMIT 10"
    );
    return rows.map(mapRowToPlaythrough);
  },

  getByStatus(status: PlaythroughStatus): Playthrough[] {
    const db = getDatabase();
    const rows = db.getAllSync<any>('SELECT * FROM playthroughs WHERE status = ? ORDER BY updatedAt DESC', [status]);
    return rows.map(mapRowToPlaythrough);
  },

  upsert(pt: Playthrough): void {
    const db = getDatabase();
    db.runSync(
      `INSERT INTO playthroughs (
        id, gameId, ownedCopyId, status, priority, rating, difficulty,
        currentChapter, nextObjective, noteToFutureSelf, notes, startDate,
        finishDate, lastPlayedAt, isReplay, totalPlaytimeMinutes,
        targetAchievementsPinned, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        ownedCopyId = excluded.ownedCopyId,
        status = excluded.status,
        priority = excluded.priority,
        rating = excluded.rating,
        difficulty = excluded.difficulty,
        currentChapter = excluded.currentChapter,
        nextObjective = excluded.nextObjective,
        noteToFutureSelf = excluded.noteToFutureSelf,
        notes = excluded.notes,
        startDate = excluded.startDate,
        finishDate = excluded.finishDate,
        lastPlayedAt = excluded.lastPlayedAt,
        isReplay = excluded.isReplay,
        totalPlaytimeMinutes = excluded.totalPlaytimeMinutes,
        targetAchievementsPinned = excluded.targetAchievementsPinned,
        updatedAt = excluded.updatedAt`,
      [
        pt.id,
        pt.gameId,
        pt.ownedCopyId || null,
        pt.status,
        pt.priority,
        pt.rating ?? null,
        pt.difficulty || null,
        pt.currentChapter || null,
        pt.nextObjective || null,
        pt.noteToFutureSelf || null,
        pt.notes || null,
        pt.startDate || null,
        pt.finishDate || null,
        pt.lastPlayedAt || null,
        pt.isReplay ? 1 : 0,
        pt.totalPlaytimeMinutes,
        JSON.stringify(pt.targetAchievementsPinned || []),
        pt.createdAt,
        pt.updatedAt,
      ]
    );
  },

  delete(id: string): void {
    const db = getDatabase();
    db.runSync('DELETE FROM playthroughs WHERE id = ?', [id]);
  },
};

function mapRowToPlaythrough(row: any): Playthrough {
  return {
    id: row.id,
    gameId: row.gameId,
    ownedCopyId: row.ownedCopyId || undefined,
    status: row.status,
    priority: row.priority,
    rating: row.rating ?? undefined,
    difficulty: row.difficulty || undefined,
    currentChapter: row.currentChapter || undefined,
    nextObjective: row.nextObjective || undefined,
    noteToFutureSelf: row.noteToFutureSelf || undefined,
    notes: row.notes || undefined,
    startDate: row.startDate || undefined,
    finishDate: row.finishDate || undefined,
    lastPlayedAt: row.lastPlayedAt || undefined,
    isReplay: Boolean(row.isReplay),
    totalPlaytimeMinutes: row.totalPlaytimeMinutes || 0,
    targetAchievementsPinned: safeJsonParse(row.targetAchievementsPinned, []),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function safeJsonParse<T>(str: any, fallback: T): T {
  if (!str) return fallback;
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}
