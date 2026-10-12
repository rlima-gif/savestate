import { describe, it, expect } from 'vitest';
import app from '../src/index';

describe('Assistant Route', () => {
  it('POST /api/assistant/chat returns 400 when body is invalid', async () => {
    const res = await app.request('/api/assistant/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invalidField: true }),
    }, {});

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
});
