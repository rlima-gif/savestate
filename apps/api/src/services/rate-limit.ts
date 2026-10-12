export interface RateLimitResult {
  allowed: boolean;
  current: number;
  limit: number;
  resetAt: string;
  reason?: 'daily_limit' | 'burst_limit' | 'global_budget' | 'service_unavailable';
}

const memoryStore = new Map<string, { count: number; expiresAt: number }>();

/**
 * Checks rate limits with atomic concurrency safety via Cloudflare D1.
 * Enforces:
 * 1. Per-client daily limit
 * 2. Per-client short-window burst limit (e.g. max 5 req/min)
 * 3. Global daily budget (e.g. max 1,000 req/day across all users)
 */
export async function checkRateLimit(
  db: D1Database | undefined,
  clientId: string,
  feature: string,
  dailyLimit = 30,
  environment = 'development'
): Promise<RateLimitResult> {
  const now = new Date();
  const today = now.toISOString().slice(0, 10); // 'YYYY-MM-DD'
  const currentMinute = `${today}T${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}`;

  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  const resetAt = tomorrow.toISOString();

  const BURST_LIMIT_PER_MINUTE = 5;
  const GLOBAL_DAILY_BUDGET = 1000;

  // Persistent SQL via Cloudflare D1 (Atomic increment with RETURNING)
  if (db) {
    try {
      // 1. Check Burst Limit (per minute)
      const burstResult = await db
        .prepare(
          `INSERT INTO rate_limits (client_id, feature, date_window, count, updated_at)
           VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP)
           ON CONFLICT(client_id, feature, date_window)
           DO UPDATE SET count = count + 1, updated_at = CURRENT_TIMESTAMP
           WHERE count < ?
           RETURNING count`
        )
        .bind(clientId, `${feature}:burst`, currentMinute, BURST_LIMIT_PER_MINUTE)
        .first<{ count: number }>();

      if (!burstResult) {
        return {
          allowed: false,
          current: BURST_LIMIT_PER_MINUTE,
          limit: BURST_LIMIT_PER_MINUTE,
          resetAt: new Date(Date.now() + 60000).toISOString(),
          reason: 'burst_limit',
        };
      }

      // 2. Check Global Daily Budget
      const globalResult = await db
        .prepare(
          `INSERT INTO rate_limits (client_id, feature, date_window, count, updated_at)
           VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP)
           ON CONFLICT(client_id, feature, date_window)
           DO UPDATE SET count = count + 1, updated_at = CURRENT_TIMESTAMP
           WHERE count < ?
           RETURNING count`
        )
        .bind('__global__', `${feature}:daily`, today, GLOBAL_DAILY_BUDGET)
        .first<{ count: number }>();

      if (!globalResult) {
        return {
          allowed: false,
          current: GLOBAL_DAILY_BUDGET,
          limit: GLOBAL_DAILY_BUDGET,
          resetAt,
          reason: 'global_budget',
        };
      }

      // 3. Check Per-Client Daily Limit
      const clientResult = await db
        .prepare(
          `INSERT INTO rate_limits (client_id, feature, date_window, count, updated_at)
           VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP)
           ON CONFLICT(client_id, feature, date_window)
           DO UPDATE SET count = count + 1, updated_at = CURRENT_TIMESTAMP
           WHERE count < ?
           RETURNING count`
        )
        .bind(clientId, feature, today, dailyLimit)
        .first<{ count: number }>();

      if (!clientResult) {
        return {
          allowed: false,
          current: dailyLimit,
          limit: dailyLimit,
          resetAt,
          reason: 'daily_limit',
        };
      }

      return {
        allowed: true,
        current: clientResult.count,
        limit: dailyLimit,
        resetAt,
      };
    } catch (err) {
      // In production or staging, fail safe: do NOT silently bypass limits via per-isolate memory
      if (environment !== 'development' && environment !== 'test') {
        return {
          allowed: false,
          current: dailyLimit,
          limit: dailyLimit,
          resetAt,
          reason: 'service_unavailable',
        };
      }
    }
  }

  // Fallback in-memory rate limiting (Only for local development/test when DB is not configured)
  const clientKey = `${clientId}:${feature}:${today}`;
  const nowMs = Date.now();
  const entry = memoryStore.get(clientKey);

  const currentCount = entry && entry.expiresAt > nowMs ? entry.count : 0;

  if (currentCount >= dailyLimit) {
    return {
      allowed: false,
      current: currentCount,
      limit: dailyLimit,
      resetAt,
      reason: 'daily_limit',
    };
  }

  const nextCount = currentCount + 1;
  memoryStore.set(clientKey, {
    count: nextCount,
    expiresAt: tomorrow.getTime(),
  });

  return {
    allowed: true,
    current: nextCount,
    limit: dailyLimit,
    resetAt,
  };
}
