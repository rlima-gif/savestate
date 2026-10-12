export interface RateLimitResult {
  allowed: boolean;
  current: number;
  limit: number;
  resetAt: string;
}

const memoryStore = new Map<string, { count: number; date: string }>();

export async function checkRateLimit(
  db: D1Database | undefined,
  clientId: string,
  feature: string,
  limit = 30
): Promise<RateLimitResult> {
  const today = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  const resetAt = tomorrow.toISOString();

  // If D1 is connected, use persistent SQL table
  if (db) {
    try {
      const existing = await db
        .prepare('SELECT count FROM rate_limits WHERE client_id = ? AND feature = ? AND date_window = ?')
        .bind(clientId, feature, today)
        .first<{ count: number }>();

      const currentCount = existing ? existing.count : 0;

      if (currentCount >= limit) {
        return {
          allowed: false,
          current: currentCount,
          limit,
          resetAt,
        };
      }

      await db
        .prepare(
          `INSERT INTO rate_limits (client_id, feature, date_window, count, updated_at)
           VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP)
           ON CONFLICT(client_id, feature, date_window)
           DO UPDATE SET count = count + 1, updated_at = CURRENT_TIMESTAMP`
        )
        .bind(clientId, feature, today)
        .run();

      return {
        allowed: true,
        current: currentCount + 1,
        limit,
        resetAt,
      };
    } catch (e) {
      console.error('Rate limit D1 error, falling back to memory:', e);
    }
  }

  // Fallback in-memory rate limiting
  const key = `${clientId}:${feature}:${today}`;
  const entry = memoryStore.get(key) || { count: 0, date: today };

  if (entry.count >= limit) {
    return {
      allowed: false,
      current: entry.count,
      limit,
      resetAt,
    };
  }

  entry.count += 1;
  memoryStore.set(key, entry);

  return {
    allowed: true,
    current: entry.count,
    limit,
    resetAt,
  };
}
