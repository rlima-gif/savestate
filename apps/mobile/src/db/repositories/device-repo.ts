import { DeviceRecord } from '@savestate/shared';
import { getDatabase } from '../client';

export const DeviceRepository = {
  getAll(): DeviceRecord[] {
    const db = getDatabase();
    const rows = db.getAllSync<any>('SELECT * FROM devices ORDER BY name ASC');
    return rows.map(mapRowToDevice);
  },

  getById(id: string): DeviceRecord | null {
    const db = getDatabase();
    const row = db.getFirstSync<any>('SELECT * FROM devices WHERE id = ?', [id]);
    return row ? mapRowToDevice(row) : null;
  },

  upsert(device: DeviceRecord): void {
    const db = getDatabase();
    db.runSync(
      `INSERT INTO devices (
        id, name, kind, graphicsPreset, resolution, fpsTarget,
        controllerMapping, emulatorVersion, modsOrPatches, saveLocationNotes, notes, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        kind = excluded.kind,
        graphicsPreset = excluded.graphicsPreset,
        resolution = excluded.resolution,
        fpsTarget = excluded.fpsTarget,
        controllerMapping = excluded.controllerMapping,
        emulatorVersion = excluded.emulatorVersion,
        modsOrPatches = excluded.modsOrPatches,
        saveLocationNotes = excluded.saveLocationNotes,
        notes = excluded.notes,
        updatedAt = excluded.updatedAt`,
      [
        device.id,
        device.name,
        device.kind,
        device.graphicsPreset || null,
        device.resolution || null,
        device.fpsTarget ?? null,
        device.controllerMapping || null,
        device.emulatorVersion || null,
        device.modsOrPatches || null,
        device.saveLocationNotes || null,
        device.notes || null,
        device.createdAt,
        device.updatedAt,
      ]
    );
  },

  delete(id: string): void {
    const db = getDatabase();
    db.runSync('DELETE FROM devices WHERE id = ?', [id]);
  },
};

function mapRowToDevice(row: any): DeviceRecord {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    graphicsPreset: row.graphicsPreset || undefined,
    resolution: row.resolution || undefined,
    fpsTarget: row.fpsTarget ?? undefined,
    controllerMapping: row.controllerMapping || undefined,
    emulatorVersion: row.emulatorVersion || undefined,
    modsOrPatches: row.modsOrPatches || undefined,
    saveLocationNotes: row.saveLocationNotes || undefined,
    notes: row.notes || undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
