import { z } from 'zod';

export const PlaythroughStatusSchema = z.enum([
  'backlog',
  'playing',
  'paused',
  'beaten',
  'completed',
  'abandoned',
]);

export const OwnershipTypeSchema = z.enum([
  'physical',
  'digital',
  'subscription',
  'borrowed',
  'other',
]);

export const PriorityLevelSchema = z.enum(['low', 'medium', 'high']);

export const CanonicalGameSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  alternativeTitles: z.array(z.string()).optional(),
  description: z.string().optional(),
  coverUrl: z.string().url().optional().or(z.literal('')),
  genres: z.array(z.string()).default([]),
  platforms: z.array(z.string()).default([]),
  releaseDate: z.string().optional(),
  developer: z.string().optional(),
  publisher: z.string().optional(),
  relationshipType: z
    .enum(['original', 'remake', 'remaster', 'dlc', 'bundle'])
    .optional(),
  parentGameId: z.string().optional(),
  externalIds: z
    .object({
      rawg: z.number().optional(),
      igdb: z.number().optional(),
      steam: z.number().optional(),
      retroachievements: z.number().optional(),
    })
    .default({}),
  source: z.enum(['rawg', 'igdb', 'manual', 'steam', 'retroachievements']),
  estimatedDurationHours: z
    .object({
      mainStory: z.number().optional(),
      mainExtra: z.number().optional(),
      completionist: z.number().optional(),
    })
    .optional(),
  fetchedAt: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const OwnedCopySchema = z.object({
  id: z.string().min(1),
  gameId: z.string().min(1),
  platform: z.string().min(1),
  edition: z.string().optional(),
  store: z.string().optional(),
  ownershipType: OwnershipTypeSchema,
  deviceId: z.string().optional(),
  physicalCondition: z
    .enum(['lacrado', 'otimo', 'bom', 'marcas_uso', 'danificado'])
    .optional(),
  shelfLocation: z.string().optional(),
  loanRecipient: z.string().optional(),
  loanDate: z.string().optional(),
  returnDate: z.string().optional(),
  purchasePrice: z.number().optional(),
  purchaseCurrency: z.string().optional(),
  acquiredAt: z.string().optional(),
  expiresAt: z.string().optional(),
  notes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const PlaythroughSchema = z.object({
  id: z.string().min(1),
  gameId: z.string().min(1),
  ownedCopyId: z.string().optional(),
  status: PlaythroughStatusSchema,
  priority: PriorityLevelSchema.default('medium'),
  rating: z.number().min(1).max(10).optional(),
  difficulty: z.string().optional(),
  currentChapter: z.string().optional(),
  nextObjective: z.string().optional(),
  noteToFutureSelf: z.string().optional(),
  notes: z.string().optional(),
  startDate: z.string().optional(),
  finishDate: z.string().optional(),
  lastPlayedAt: z.string().optional(),
  isReplay: z.boolean().default(false),
  totalPlaytimeMinutes: z.number().min(0).default(0),
  targetAchievementsPinned: z.array(z.string()).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const SessionSchema = z.object({
  id: z.string().min(1),
  playthroughId: z.string().min(1),
  startTime: z.string(),
  endTime: z.string().optional(),
  durationMinutes: z.number().min(0),
  progressNote: z.string().optional(),
  screenshots: z.array(z.string()).optional(),
  createdAt: z.string(),
});
