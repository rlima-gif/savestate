import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { exportToJson, parseJsonBackup, exportGamesToCsv, SaveStateBackupData } from '@savestate/shared';
import { GameRepository } from '../db/repositories/game-repo';
import { PlaythroughRepository } from '../db/repositories/playthrough-repo';
import { SessionRepository } from '../db/repositories/session-repo';
import { ChecklistRepository } from '../db/repositories/checklist-repo';
import { DeviceRepository } from '../db/repositories/device-repo';

export const BackupService = {
  createFullBackupJson(): string {
    const games = GameRepository.getAll();
    const ownedCopies = games.flatMap((g) => GameRepository.getCopiesForGame(g.id));
    const playthroughs = PlaythroughRepository.getAll();
    const sessions = SessionRepository.getAll();
    const checklists = ChecklistRepository.getAll();
    const devices = DeviceRepository.getAll();

    return exportToJson({
      includesAttachments: false, // Core text/metadata backup
      games,
      ownedCopies,
      playthroughs,
      sessions,
      checklists,
      devices,
    });
  },

  createCsvExport(): string {
    const games = GameRepository.getAll();
    const playthroughs = PlaythroughRepository.getAll();
    return exportGamesToCsv(games, playthroughs);
  },

  async shareBackupFile(filename: string, content: string, mimeType: string): Promise<void> {
    const filePath = `${FileSystem.cacheDirectory}${filename}`;
    await FileSystem.writeAsStringAsync(filePath, content, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(filePath, {
        mimeType,
        dialogTitle: 'Exportar Backup do SaveState',
        UTI: mimeType === 'application/json' ? 'public.json' : 'public.comma-separated-values-text',
      });
    }
  },

  restoreFromJson(jsonString: string): { success: boolean; message: string; count?: number } {
    const parsed = parseJsonBackup(jsonString);
    if (!parsed.success) {
      return { success: false, message: parsed.error };
    }

    const data: SaveStateBackupData = parsed.data;

    try {
      // Restore games
      for (const game of data.games) {
        GameRepository.upsert(game);
      }

      // Restore owned copies
      for (const copy of data.ownedCopies) {
        GameRepository.upsertCopy(copy);
      }

      // Restore playthroughs
      for (const pt of data.playthroughs) {
        PlaythroughRepository.upsert(pt);
      }

      // Restore sessions
      for (const sess of data.sessions) {
        SessionRepository.create(sess);
      }

      // Restore checklists
      for (const item of data.checklists) {
        ChecklistRepository.upsert(item);
      }

      // Restore devices
      for (const dev of data.devices) {
        DeviceRepository.upsert(dev);
      }

      return {
        success: true,
        message: `Restauração concluída com sucesso! (${data.games.length} jogos restaurados).`,
        count: data.games.length,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Falha ao importar dados no banco: ${err.message}`,
      };
    }
  },
};
