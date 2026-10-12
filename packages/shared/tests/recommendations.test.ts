import { describe, it, expect } from 'vitest';
import { calculateRecommendations, RecommendationCandidate } from '../src/recommendations/engine';
import { CanonicalGame, Playthrough, OwnedCopy } from '../src/types/game';

describe('calculateRecommendations', () => {
  const mockGame1: CanonicalGame = {
    id: 'game-chrono-trigger',
    title: 'Chrono Trigger',
    genres: ['RPG', 'JRPG'],
    platforms: ['SNES', 'Steam'],
    source: 'manual',
    fetchedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    externalIds: {},
    estimatedDurationHours: { mainStory: 25 },
  };

  const mockGame2: CanonicalGame = {
    id: 'game-celeste',
    title: 'Celeste',
    genres: ['Platformer', 'Indie'],
    platforms: ['Nintendo Switch', 'PC'],
    source: 'manual',
    fetchedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    externalIds: {},
    estimatedDurationHours: { mainStory: 8 },
  };

  it('ranks high-priority playing games higher than paused or unstarted games', () => {
    const candidate1: RecommendationCandidate = {
      game: mockGame1,
      playthrough: {
        id: 'pt-1',
        gameId: mockGame1.id,
        status: 'playing',
        priority: 'high',
        isReplay: false,
        totalPlaytimeMinutes: 120,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };

    const candidate2: RecommendationCandidate = {
      game: mockGame2,
      playthrough: {
        id: 'pt-2',
        gameId: mockGame2.id,
        status: 'backlog',
        priority: 'low',
        isReplay: false,
        totalPlaytimeMinutes: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };

    const results = calculateRecommendations([candidate1, candidate2]);
    expect(results.length).toBe(2);
    expect(results[0].game.id).toBe('game-chrono-trigger');
    expect(results[0].reasons.some((r) => r.includes('Em andamento'))).toBe(true);
    expect(results[0].reasons.some((r) => r.includes('alta prioridade'))).toBe(true);
  });

  it('boosts games nearing subscription expiration', () => {
    const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(); // 5 days left

    const candidate: RecommendationCandidate = {
      game: mockGame2,
      ownedCopy: {
        id: 'copy-1',
        gameId: mockGame2.id,
        platform: 'PC',
        ownershipType: 'subscription',
        expiresAt: futureDate,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };

    const results = calculateRecommendations([candidate]);
    expect(results[0].reasons.some((r) => r.includes('expira em'))).toBe(true);
  });

  it('considers session suitability preferences', () => {
    const candidate1: RecommendationCandidate = { game: mockGame1 }; // 25h
    const candidate2: RecommendationCandidate = { game: mockGame2 }; // 8h

    const quickResults = calculateRecommendations([candidate1, candidate2], {
      sessionSuitability: 'quick_burst',
    });
    expect(quickResults[0].game.id).toBe('game-celeste');

    const deepResults = calculateRecommendations([candidate1, candidate2], {
      sessionSuitability: 'deep_dive',
    });
    expect(deepResults[0].game.id).toBe('game-chrono-trigger');
  });
});
