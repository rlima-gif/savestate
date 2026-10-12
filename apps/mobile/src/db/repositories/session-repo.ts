import { Session } from '@savestate/shared';
import { getDatabase } from '../client';

export const SessionRepository = {
  getByPlaythroughId(playthroughId: string): Session[] {
    const db = getDatabase();
    const rows = db.getAllSync<any>('SELECT * FROM sessions WHERE playthroughId = ? ORDER BY startTime DESC', [
      playthroughId,
    ]);
    return rows.map(mapRowToSession);
  },

  getAll(): Session[] {
    const db = getDatabase();
    const rows = db.getAllSync<any>('SELECT * FROM sessions ORDER BY startTime DESC');
    return rows.map(mapRowToSession);
  },

  create(session: Session): void {
    const db = getDatabase();
    db.runSync(
      `INSERT INTO sessions (
        id, playthroughId, startTime, endTime, durationMinutes, progressNote, screenshots, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        session.id,
        session.playthroughId,
        session.startTime,
        session.endTime || null,
        session.durationMinutes,
        session.progressNote || null,
        JSON.stringify(session.screenshots || []),
        session.createdAt,
      ]
    );

    // Update playthrough total time and last played date
    db.runSync(
      `UPDATE playthroughs
       SET totalPlaytimeMinutes = totalPlaytimeMinutes + ?,
           lastPlayedAt = ?,
           updatedAt = ?
       WHERE id = ?`,
      [session.durationMinutes, session.startTime, session.createdAt, session.playthroughId]
    );
  },

  delete(id: string): void {
    const db = getDatabase();
    db.runSync('DELETE FROM sessions WHERE id = ?', [id]);
  },
};

function mapRowToSession(row: any): Session {
  return {
    id: row.id,
    playthroughId: row.playthroughId,
    startTime: row.startTime,
    endTime: row.endTime || undefined,
    durationMinutes: row.durationMinutes || 0,
    progressNote: row.progressNote || undefined,
    screenshots: safeJsonParse(row.screenshots, []),
    createdAt: row.createdAt,
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
