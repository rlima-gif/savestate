import { CanonicalGame, OwnedCopy, Playthrough } from '../types/game';

export interface RecommendationPreferences {
  availableMinutes?: number;
  preferredGenres?: string[];
  preferredPlatforms?: string[];
  sessionSuitability?: 'quick_burst' | 'medium_session' | 'deep_dive'; // e.g. <30min, 30-90min, >90min
  excludeGameIds?: string[];
}

export interface RecommendationCandidate {
  game: CanonicalGame;
  playthrough?: Playthrough;
  ownedCopy?: OwnedCopy;
  queueOrder?: number;
}

export interface RecommendationResult {
  game: CanonicalGame;
  playthrough?: Playthrough;
  ownedCopy?: OwnedCopy;
  score: number;
  reasons: string[];
}

export function calculateRecommendations(
  candidates: RecommendationCandidate[],
  preferences: RecommendationPreferences = {},
  limit = 5
): RecommendationResult[] {
  const scored: RecommendationResult[] = [];

  for (const candidate of candidates) {
    if (preferences.excludeGameIds?.includes(candidate.game.id)) {
      continue;
    }

    let score = 50; // Base score
    const reasons: string[] = [];

    // 1. Status factor: Prioritize unstarted backlog or active playing over abandoned
    if (candidate.playthrough) {
      if (candidate.playthrough.status === 'playing') {
        score += 25;
        reasons.push('Em andamento: continue de onde parou');
      } else if (candidate.playthrough.status === 'backlog') {
        score += 15;
        reasons.push('No backlog pronto para começar');
      } else if (candidate.playthrough.status === 'paused') {
        score += 5;
        reasons.push('Pausado recentemente');
      } else if (
        candidate.playthrough.status === 'beaten' ||
        candidate.playthrough.status === 'completed' ||
        candidate.playthrough.status === 'abandoned'
      ) {
        // Skip completed or abandoned unless explicit
        continue;
      }

      // Priority weighting
      if (candidate.playthrough.priority === 'high') {
        score += 20;
        reasons.push('Definido como alta prioridade por você');
      } else if (candidate.playthrough.priority === 'low') {
        score -= 10;
      }
    } else {
      score += 10;
      reasons.push('Jogo na biblioteca sem campanha iniciada');
    }

    // 2. Ownership: Permanent ownership vs expiring subscription
    if (candidate.ownedCopy) {
      if (candidate.ownedCopy.expiresAt) {
        const expires = new Date(candidate.ownedCopy.expiresAt).getTime();
        const now = Date.now();
        const daysLeft = (expires - now) / (1000 * 60 * 60 * 24);
        if (daysLeft > 0 && daysLeft <= 14) {
          score += 35;
          reasons.push(`Acesso temporário: expira em ${Math.ceil(daysLeft)} dias!`);
        }
      }
    }

    // 3. Queue position
    if (candidate.queueOrder !== undefined && candidate.queueOrder > 0) {
      const queueBonus = Math.max(0, 30 - candidate.queueOrder * 5);
      score += queueBonus;
      reasons.push(`Posição #${candidate.queueOrder} na sua fila de próximos jogos`);
    }

    // 4. Genre preference match
    if (preferences.preferredGenres && preferences.preferredGenres.length > 0) {
      const match = candidate.game.genres.some((g) =>
        preferences.preferredGenres!.some((pg) =>
          g.toLowerCase().includes(pg.toLowerCase())
        )
      );
      if (match) {
        score += 15;
        reasons.push('Combina com os gêneros que você quer jogar agora');
      }
    }

    // 5. Session suitability & duration estimates
    const duration = candidate.game.estimatedDurationHours?.mainStory;
    if (preferences.sessionSuitability) {
      if (preferences.sessionSuitability === 'quick_burst') {
        if (duration && duration <= 8) {
          score += 15;
          reasons.push(`Campanha enxuta (~${duration}h), ótima para sessões rápidas`);
        }
      } else if (preferences.sessionSuitability === 'deep_dive') {
        if (duration && duration >= 25) {
          score += 15;
          reasons.push(`Experiência profunda e imersiva (~${duration}h de história)`);
        }
      }
    }

    // Ensure reasons are not empty
    if (reasons.length === 0) {
      reasons.push('Sugerido pela sua biblioteca');
    }

    scored.push({
      game: candidate.game,
      playthrough: candidate.playthrough,
      ownedCopy: candidate.ownedCopy,
      score,
      reasons,
    });
  }

  // Sort descending by score
  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, limit);
}
