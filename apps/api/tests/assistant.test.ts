import { describe, it, expect } from 'vitest';
import app from '../src/index';
import { checkRateLimit } from '../src/services/rate-limit';

describe('Assistant Route & Security', () => {
  it('POST /api/assistant/chat returns 400 when body is invalid', async () => {
    const res = await app.request(
      '/api/assistant/chat',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invalidField: true }),
      },
      {}
    );

    expect(res.status).toBe(400);
  });

  it('POST /api/assistant/chat returns 503 when feature is toggled off', async () => {
    const res = await app.request(
      '/api/assistant/chat',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Onde encontro o amuleto?',
          context: {
            gameTitle: 'Hollow Knight',
            spoilerLevel: 'hints_only',
            hintTier: 'small_hint',
          },
        }),
      },
      {
        AI_FEATURE_ENABLED: 'false',
      }
    );

    expect(res.status).toBe(503);
  });

  it('POST /api/assistant/chat rejects oversized messages (> 2000 chars) with 400', async () => {
    const longMessage = 'A'.repeat(2001);
    const res = await app.request(
      '/api/assistant/chat',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: longMessage,
          context: {
            gameTitle: 'Hollow Knight',
            spoilerLevel: 'hints_only',
            hintTier: 'small_hint',
          },
        }),
      },
      {
        AI_FEATURE_ENABLED: 'true',
      }
    );

    expect(res.status).toBe(400);
    const data = (await res.json()) as any;
    expect(data.error).toContain('limite máximo permitido');
  });

  it('POST /api/assistant/chat rejects unsupported image MIME types with 400', async () => {
    const res = await app.request(
      '/api/assistant/chat',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Como resolver este puzzle?',
          imageBase64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          imageMimeType: 'image/gif',
          context: {
            gameTitle: 'Portal 2',
            spoilerLevel: 'hints_only',
            hintTier: 'small_hint',
          },
        }),
      },
      {
        AI_FEATURE_ENABLED: 'true',
      }
    );

    expect(res.status).toBe(400);
    const data = (await res.json()) as any;
    expect(data.error).toContain('Formato de imagem não suportado');
  });

  it('POST /api/assistant/chat rejects oversized image payloads (> 4MB base64) with 413', async () => {
    const hugeImage = 'A'.repeat(6 * 1024 * 1024);
    const res = await app.request(
      '/api/assistant/chat',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Como passar desse chefe?',
          imageBase64: hugeImage,
          imageMimeType: 'image/png',
          context: {
            gameTitle: 'Elden Ring',
            spoilerLevel: 'hints_only',
            hintTier: 'small_hint',
          },
        }),
      },
      {
        AI_FEATURE_ENABLED: 'true',
      }
    );

    expect(res.status).toBe(413);
  });

  it('POST /api/assistant/chat returns fallback response with guide links when no Gemini key is set', async () => {
    const res = await app.request(
      '/api/assistant/chat',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Como passar do primeiro chefe?',
          context: {
            gameTitle: 'Dark Souls',
            currentChapter: 'Undead Asylum',
            spoilerLevel: 'hints_only',
            hintTier: 'small_hint',
          },
        }),
      },
      {
        AI_FEATURE_ENABLED: 'true',
        AI_DAILY_RATE_LIMIT: 30,
      }
    );

    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.isFallback).toBe(true);
    expect(data.answer).toContain('Dark Souls');
    expect(Array.isArray(data.externalSearchLinks)).toBe(true);
    expect(data.externalSearchLinks.length).toBeGreaterThan(0);
    expect(data.rateLimit.remaining).toBeLessThanOrEqual(30);
  });

  it('checkRateLimit fails safely in production when D1 database fails', async () => {
    const failingDb = {
      prepare: () => {
        throw new Error('D1 connection failure');
      },
    } as unknown as D1Database;

    const result = await checkRateLimit(failingDb, '1.2.3.4', 'assistant', 30, 'production');
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('service_unavailable');
  });

  it('checkRateLimit atomic D1 mock handles quota exhaustion correctly', async () => {
    let clientCalls = 0;
    const mockDb = {
      prepare: () => ({
        bind: (...args: any[]) => ({
          first: async () => {
            const feature = args[1];
            if (feature === 'assistant:burst') {
              return { count: 1 };
            }
            if (feature === 'assistant:daily') {
              return { count: 10 };
            }
            // Client daily limit
            clientCalls++;
            if (clientCalls > 1) {
              return null; // Exceeded limit
            }
            return { count: clientCalls };
          },
        }),
      }),
    } as unknown as D1Database;

    const first = await checkRateLimit(mockDb, '1.2.3.4', 'assistant', 1, 'production');
    expect(first.allowed).toBe(true);

    const second = await checkRateLimit(mockDb, '1.2.3.4', 'assistant', 1, 'production');
    expect(second.allowed).toBe(false);
    expect(second.reason).toBe('daily_limit');
  });
});
