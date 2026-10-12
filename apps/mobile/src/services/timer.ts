import { getDatabase } from '../db/client';
import { SessionRepository } from '../db/repositories/session-repo';

export interface ActiveTimerState {
  playthroughId: string;
  startedAtTimestamp: number;
  accumulatedSeconds: number;
  isRunning: boolean;
  totalElapsedSeconds: number;
  isSuspiciousDuration: boolean; // Flag if > 12 hours
}

const MAX_REASONABLE_SESSION_HOURS = 12;

export function getActiveTimer(): ActiveTimerState | null {
  const db = getDatabase();
  const row = db.getFirstSync<any>('SELECT * FROM active_timer WHERE id = 1');
  if (!row) return null;

  const now = Date.now();
  const currentRunningSeconds = row.isRunning
    ? Math.max(0, Math.floor((now - row.startedAtTimestamp) / 1000))
    : 0;

  const totalElapsedSeconds = row.accumulatedSeconds + currentRunningSeconds;
  const isSuspiciousDuration = totalElapsedSeconds > MAX_REASONABLE_SESSION_HOURS * 3600;

  return {
    playthroughId: row.playthroughId,
    startedAtTimestamp: row.startedAtTimestamp,
    accumulatedSeconds: row.accumulatedSeconds,
    isRunning: Boolean(row.isRunning),
    totalElapsedSeconds,
    isSuspiciousDuration,
  };
}

export function startTimer(playthroughId: string): ActiveTimerState {
  const db = getDatabase();
  const now = Date.now();

  const existing = getActiveTimer();
  if (existing && existing.playthroughId === playthroughId) {
    if (!existing.isRunning) {
      db.runSync(
        'UPDATE active_timer SET isRunning = 1, startedAtTimestamp = ? WHERE id = 1',
        [now]
      );
    }
    return getActiveTimer()!;
  }

  // Clear previous timer and start new
  db.runSync(
    `INSERT INTO active_timer (id, playthroughId, startedAtTimestamp, accumulatedSeconds, isRunning)
     VALUES (1, ?, ?, 0, 1)
     ON CONFLICT(id) DO UPDATE SET
       playthroughId = excluded.playthroughId,
       startedAtTimestamp = excluded.startedAtTimestamp,
       accumulatedSeconds = 0,
       isRunning = 1`,
    [playthroughId, now]
  );

  return getActiveTimer()!;
}

export function pauseTimer(): ActiveTimerState | null {
  const db = getDatabase();
  const current = getActiveTimer();
  if (!current || !current.isRunning) return current;

  db.runSync(
    'UPDATE active_timer SET isRunning = 0, accumulatedSeconds = ? WHERE id = 1',
    [current.totalElapsedSeconds]
  );

  return getActiveTimer();
}

export function stopAndSaveTimer(progressNote?: string): number {
  const current = getActiveTimer();
  if (!current) return 0;

  const durationMinutes = Math.max(1, Math.round(current.totalElapsedSeconds / 60));

  SessionRepository.create({
    id: `session-${Date.now()}`,
    playthroughId: current.playthroughId,
    startTime: new Date(current.startedAtTimestamp).toISOString(),
    endTime: new Date().toISOString(),
    durationMinutes,
    progressNote: progressNote || 'Sessão cronometrada',
    createdAt: new Date().toISOString(),
  });

  clearTimer();
  return durationMinutes;
}

export function clearTimer(): void {
  const db = getDatabase();
  db.runSync('DELETE FROM active_timer WHERE id = 1');
}

export function formatSecondsToTimerString(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => String(n).padStart(2, '0');
  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}
