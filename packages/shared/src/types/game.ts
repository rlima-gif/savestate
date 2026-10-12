export type PlaythroughStatus =
  | 'backlog'    // Backlog
  | 'playing'    // Jogando
  | 'paused'     // Pausado
  | 'beaten'     // Zerado (Campanha principal)
  | 'completed'  // 100% (Mestre / Platina)
  | 'abandoned'; // Abandonado

export type OwnershipType =
  | 'physical'
  | 'digital'
  | 'subscription'
  | 'borrowed'
  | 'other';

export type PriorityLevel = 'low' | 'medium' | 'high';

export interface CanonicalGame {
  id: string;
  title: string;
  alternativeTitles?: string[];
  description?: string;
  coverUrl?: string;
  genres: string[];
  platforms: string[];
  releaseDate?: string;
  developer?: string;
  publisher?: string;
  relationshipType?: 'original' | 'remake' | 'remaster' | 'dlc' | 'bundle';
  parentGameId?: string;
  externalIds: {
    rawg?: number;
    igdb?: number;
    steam?: number;
    retroachievements?: number;
  };
  source: 'rawg' | 'igdb' | 'manual' | 'steam' | 'retroachievements';
  estimatedDurationHours?: {
    mainStory?: number;
    mainExtra?: number;
    completionist?: number;
  };
  fetchedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface OwnedCopy {
  id: string;
  gameId: string;
  platform: string;
  edition?: string;
  store?: string;
  ownershipType: OwnershipType;
  deviceId?: string;
  physicalCondition?: 'lacrado' | 'otimo' | 'bom' | 'marcas_uso' | 'danificado';
  shelfLocation?: string;
  loanRecipient?: string;
  loanDate?: string;
  returnDate?: string;
  purchasePrice?: number;
  purchaseCurrency?: string;
  acquiredAt?: string;
  expiresAt?: string; // For subscriptions, trials, rentals
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Playthrough {
  id: string;
  gameId: string;
  ownedCopyId?: string;
  status: PlaythroughStatus;
  priority: PriorityLevel;
  rating?: number; // 1 to 10
  difficulty?: string;
  currentChapter?: string;
  nextObjective?: string;
  noteToFutureSelf?: string;
  notes?: string;
  startDate?: string;
  finishDate?: string;
  lastPlayedAt?: string;
  isReplay: boolean;
  totalPlaytimeMinutes: number;
  targetAchievementsPinned?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  id: string;
  playthroughId: string;
  startTime: string;
  endTime?: string;
  durationMinutes: number;
  progressNote?: string;
  screenshots?: string[];
  createdAt: string;
}
