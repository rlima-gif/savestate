import { ChecklistItem } from '@savestate/shared';
import { getDatabase } from '../client';

export const ChecklistRepository = {
  getByPlaythroughId(playthroughId: string): ChecklistItem[] {
    const db = getDatabase();
    const rows = db.getAllSync<any>(
      'SELECT * FROM checklists WHERE playthroughId = ? ORDER BY orderIndex ASC, createdAt ASC',
      [playthroughId]
    );
    return rows.map(mapRowToChecklist);
  },

  getAll(): ChecklistItem[] {
    const db = getDatabase();
    const rows = db.getAllSync<any>('SELECT * FROM checklists ORDER BY orderIndex ASC, createdAt ASC');
    return rows.map(mapRowToChecklist);
  },

  upsert(item: ChecklistItem): void {
    const db = getDatabase();
    db.runSync(
      `INSERT INTO checklists (
        id, playthroughId, title, description, category, isCompleted, isMissable,
        pointOfNoReturn, isSpoiler, source, verificationDate, orderIndex,
        completedAt, notes, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        description = excluded.description,
        category = excluded.category,
        isCompleted = excluded.isCompleted,
        isMissable = excluded.isMissable,
        pointOfNoReturn = excluded.pointOfNoReturn,
        isSpoiler = excluded.isSpoiler,
        source = excluded.source,
        verificationDate = excluded.verificationDate,
        orderIndex = excluded.orderIndex,
        completedAt = excluded.completedAt,
        notes = excluded.notes,
        updatedAt = excluded.updatedAt`,
      [
        item.id,
        item.playthroughId,
        item.title,
        item.description || null,
        item.category,
        item.isCompleted ? 1 : 0,
        item.isMissable ? 1 : 0,
        item.pointOfNoReturn || null,
        item.isSpoiler ? 1 : 0,
        item.source || null,
        item.verificationDate || null,
        item.orderIndex,
        item.completedAt || null,
        item.notes || null,
        item.createdAt,
        item.updatedAt,
      ]
    );
  },

  toggleComplete(id: string, isCompleted: boolean): void {
    const db = getDatabase();
    const now = isCompleted ? new Date().toISOString() : null;
    db.runSync('UPDATE checklists SET isCompleted = ?, completedAt = ?, updatedAt = ? WHERE id = ?', [
      isCompleted ? 1 : 0,
      now,
      new Date().toISOString(),
      id,
    ]);
  },

  delete(id: string): void {
    const db = getDatabase();
    db.runSync('DELETE FROM checklists WHERE id = ?', [id]);
  },
};

function mapRowToChecklist(row: any): ChecklistItem {
  return {
    id: row.id,
    playthroughId: row.playthroughId,
    title: row.title,
    description: row.description || undefined,
    category: row.category,
    isCompleted: Boolean(row.isCompleted),
    isMissable: Boolean(row.isMissable),
    pointOfNoReturn: row.pointOfNoReturn || undefined,
    isSpoiler: Boolean(row.isSpoiler),
    source: row.source || undefined,
    verificationDate: row.verificationDate || undefined,
    orderIndex: row.orderIndex || 0,
    completedAt: row.completedAt || undefined,
    notes: row.notes || undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
