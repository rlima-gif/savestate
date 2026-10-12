import { describe, it, expect } from 'vitest';
import { CanonicalGameSchema, PlaythroughSchema, SessionSchema } from '../src/schemas/game';
import { AssistantChatRequestSchema } from '../src/schemas/assistant';

describe('Zod Validation Schemas', () => {
  it('validates a valid canonical game schema', () => {
    const valid = {
      id: 'game-123',
      title: 'Elden Ring',
      genres: ['Action RPG', 'Souls-like'],
      platforms: ['PC', 'PS5', 'Xbox Series X'],
      source: 'rawg',
      externalIds: { rawg: 58175 },
      fetchedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const parsed = CanonicalGameSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });

  it('rejects invalid playthrough status', () => {
    const invalid = {
      id: 'pt-1',
      gameId: 'game-123',
      status: 'playing_non_existent',
      priority: 'high',
      isReplay: false,
      totalPlaytimeMinutes: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const parsed = PlaythroughSchema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });

  it('validates assistant request payload', () => {
    const request = {
      message: 'Como derroto o chefe Margit?',
      context: {
        gameTitle: 'Elden Ring',
        platform: 'PC',
        spoilerLevel: 'hints_only',
        hintTier: 'small_hint',
      },
    };

    const parsed = AssistantChatRequestSchema.safeParse(request);
    expect(parsed.success).toBe(true);
  });
});
