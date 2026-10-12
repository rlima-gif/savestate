import { CanonicalGame, OwnedCopy } from '@savestate/shared';
import { getDatabase } from '../client';

export const GameRepository = {
  getAll(): CanonicalGame[] {
    const db = getDatabase();
    const rows = db.getAllSync<any>('SELECT * FROM games ORDER BY title ASC');
    return rows.map(mapRowToGame);
  },

  getById(id: string): CanonicalGame | null {
    const db = getDatabase();
    const row = db.getFirstSync<any>('SELECT * FROM games WHERE id = ?', [id]);
    return row ? mapRowToGame(row) : null;
  },

  upsert(game: CanonicalGame): void {
    const db = getDatabase();
    db.runSync(
      `INSERT INTO games (
        id, title, alternativeTitles, description, coverUrl, genres, platforms,
        releaseDate, developer, publisher, relationshipType, parentGameId,
        externalIds, source, estimatedDurationHours, fetchedAt, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        alternativeTitles = excluded.alternativeTitles,
        description = excluded.description,
        coverUrl = excluded.coverUrl,
        genres = excluded.genres,
        platforms = excluded.platforms,
        releaseDate = excluded.releaseDate,
        developer = excluded.developer,
        publisher = excluded.publisher,
        relationshipType = excluded.relationshipType,
        parentGameId = excluded.parentGameId,
        externalIds = excluded.externalIds,
        source = excluded.source,
        estimatedDurationHours = excluded.estimatedDurationHours,
        updatedAt = excluded.updatedAt`,
      [
        game.id,
        game.title,
        JSON.stringify(game.alternativeTitles || []),
        game.description || null,
        game.coverUrl || null,
        JSON.stringify(game.genres || []),
        JSON.stringify(game.platforms || []),
        game.releaseDate || null,
        game.developer || null,
        game.publisher || null,
        game.relationshipType || null,
        game.parentGameId || null,
        JSON.stringify(game.externalIds || {}),
        game.source,
        JSON.stringify(game.estimatedDurationHours || {}),
        game.fetchedAt,
        game.createdAt,
        game.updatedAt,
      ]
    );
  },

  delete(id: string): void {
    const db = getDatabase();
    db.runSync('DELETE FROM games WHERE id = ?', [id]);
  },

  // Owned copies associated with game
  getCopiesForGame(gameId: string): OwnedCopy[] {
    const db = getDatabase();
    const rows = db.getAllSync<any>('SELECT * FROM owned_copies WHERE gameId = ?', [gameId]);
    return rows.map(mapRowToCopy);
  },

  upsertCopy(copy: OwnedCopy): void {
    const db = getDatabase();
    db.runSync(
      `INSERT INTO owned_copies (
        id, gameId, platform, edition, store, ownershipType, deviceId,
        physicalCondition, shelfLocation, loanRecipient, loanDate, returnDate,
        purchasePrice, purchaseCurrency, acquiredAt, expiresAt, notes, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        platform = excluded.platform,
        edition = excluded.edition,
        store = excluded.store,
        ownershipType = excluded.ownershipType,
        deviceId = excluded.deviceId,
        physicalCondition = excluded.physicalCondition,
        shelfLocation = excluded.shelfLocation,
        loanRecipient = excluded.loanRecipient,
        loanDate = excluded.loanDate,
        returnDate = excluded.returnDate,
        purchasePrice = excluded.purchasePrice,
        purchaseCurrency = excluded.purchaseCurrency,
        acquiredAt = excluded.acquiredAt,
        expiresAt = excluded.expiresAt,
        notes = excluded.notes,
        updatedAt = excluded.updatedAt`,
      [
        copy.id,
        copy.gameId,
        copy.platform,
        copy.edition || null,
        copy.store || null,
        copy.ownershipType,
        copy.deviceId || null,
        copy.physicalCondition || null,
        copy.shelfLocation || null,
        copy.loanRecipient || null,
        copy.loanDate || null,
        copy.returnDate || null,
        copy.purchasePrice || null,
        copy.purchaseCurrency || null,
        copy.acquiredAt || null,
        copy.expiresAt || null,
        copy.notes || null,
        copy.createdAt,
        copy.updatedAt,
      ]
    );
  },
};

function mapRowToGame(row: any): CanonicalGame {
  return {
    id: row.id,
    title: row.title,
    alternativeTitles: safeJsonParse(row.alternativeTitles, []),
    description: row.description || undefined,
    coverUrl: row.coverUrl || undefined,
    genres: safeJsonParse(row.genres, []),
    platforms: safeJsonParse(row.platforms, []),
    releaseDate: row.releaseDate || undefined,
    developer: row.developer || undefined,
    publisher: row.publisher || undefined,
    relationshipType: row.relationshipType || undefined,
    parentGameId: row.parentGameId || undefined,
    externalIds: safeJsonParse(row.externalIds, {}),
    source: row.source,
    estimatedDurationHours: safeJsonParse(row.estimatedDurationHours, undefined),
    fetchedAt: row.fetchedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapRowToCopy(row: any): OwnedCopy {
  return {
    id: row.id,
    gameId: row.gameId,
    platform: row.platform,
    edition: row.edition || undefined,
    store: row.store || undefined,
    ownershipType: row.ownershipType,
    deviceId: row.deviceId || undefined,
    physicalCondition: row.physicalCondition || undefined,
    shelfLocation: row.shelfLocation || undefined,
    loanRecipient: row.loanRecipient || undefined,
    loanDate: row.loanDate || undefined,
    returnDate: row.returnDate || undefined,
    purchasePrice: row.purchasePrice ?? undefined,
    purchaseCurrency: row.purchaseCurrency || undefined,
    acquiredAt: row.acquiredAt || undefined,
    expiresAt: row.expiresAt || undefined,
    notes: row.notes || undefined,
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
