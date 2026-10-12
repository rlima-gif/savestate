import { CanonicalGame, OwnedCopy, Playthrough, Session } from '../types/game';
import { ChecklistItem } from '../types/checklist';
import { DeviceRecord } from '../types/device';

export interface SaveStateBackupData {
  version: number;
  exportedAt: string;
  appVersion: string;
  includesAttachments: boolean;
  games: CanonicalGame[];
  ownedCopies: OwnedCopy[];
  playthroughs: Playthrough[];
  sessions: Session[];
  checklists: ChecklistItem[];
  devices: DeviceRecord[];
}

export function exportToJson(data: Omit<SaveStateBackupData, 'version' | 'exportedAt' | 'appVersion'>, appVersion = '0.1.0'): string {
  const fullBackup: SaveStateBackupData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    appVersion,
    ...data,
  };
  return JSON.stringify(fullBackup, null, 2);
}

export function parseJsonBackup(jsonString: string): { success: true; data: SaveStateBackupData } | { success: false; error: string } {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed || typeof parsed !== 'object') {
      return { success: false, error: 'Arquivo JSON inválido ou vazio.' };
    }
    if (!Array.isArray(parsed.games) || !Array.isArray(parsed.playthroughs)) {
      return { success: false, error: 'Estrutura de dados incompatível (campos games/playthroughs ausentes).' };
    }
    return {
      success: true,
      data: {
        version: parsed.version || 1,
        exportedAt: parsed.exportedAt || new Date().toISOString(),
        appVersion: parsed.appVersion || '0.1.0',
        includesAttachments: Boolean(parsed.includesAttachments),
        games: parsed.games || [],
        ownedCopies: parsed.ownedCopies || [],
        playthroughs: parsed.playthroughs || [],
        sessions: parsed.sessions || [],
        checklists: parsed.checklists || [],
        devices: parsed.devices || [],
      },
    };
  } catch (err: any) {
    return { success: false, error: `Falha ao interpretar JSON: ${err.message}` };
  }
}

export function exportGamesToCsv(games: CanonicalGame[], playthroughs: Playthrough[]): string {
  const header = [
    'ID',
    'Titulo',
    'Generos',
    'Plataformas',
    'Status',
    'Prioridade',
    'Nota',
    'TempoJogadoMinutos',
    'CapituloAtual',
    'ProximoObjetivo',
    'UltimaVezJogado',
  ].join(';');

  const ptMap = new Map(playthroughs.map((p) => [p.gameId, p]));

  const rows = games.map((game) => {
    const pt = ptMap.get(game.id);
    const escape = (val: any) => `"${String(val ?? '').replace(/"/g, '""')}"`;

    return [
      escape(game.id),
      escape(game.title),
      escape(game.genres.join(', ')),
      escape(game.platforms.join(', ')),
      escape(pt?.status ?? 'backlog'),
      escape(pt?.priority ?? 'medium'),
      escape(pt?.rating ?? ''),
      escape(pt?.totalPlaytimeMinutes ?? 0),
      escape(pt?.currentChapter ?? ''),
      escape(pt?.nextObjective ?? ''),
      escape(pt?.lastPlayedAt ?? ''),
    ].join(';');
  });

  return '\uFEFF' + [header, ...rows].join('\n'); // UTF-8 BOM for Excel
}
