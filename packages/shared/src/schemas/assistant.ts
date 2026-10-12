import { z } from 'zod';

export const SpoilerLevelSchema = z.enum(['none', 'hints_only', 'full']);
export const HintTierSchema = z.enum(['small_hint', 'detailed_hint', 'full_solution']);

export const AssistantTopicSchema = z.enum([
  'item_or_equipment',
  'progression',
  'navigation',
  'puzzle_or_boss',
  'build_or_mechanic',
  'achievement',
  'technical_troubleshooting',
]);

export const AssistantContextSchema = z.object({
  gameTitle: z.string().min(1),
  platform: z.string().optional(),
  edition: z.string().optional(),
  currentChapter: z.string().optional(),
  currentObjective: z.string().optional(),
  userNotes: z.string().optional(),
  spoilerLevel: SpoilerLevelSchema.default('hints_only'),
  hintTier: HintTierSchema.default('small_hint'),
  topic: AssistantTopicSchema.optional(),
  technicalDetails: z
    .object({
      device: z.string().optional(),
      os: z.string().optional(),
      runtimeVersion: z.string().optional(),
      errorMessage: z.string().optional(),
      attemptedFixes: z.string().optional(),
    })
    .optional(),
});

export const AssistantChatRequestSchema = z.object({
  message: z.string().min(1),
  context: AssistantContextSchema,
  imageBase64: z.string().optional(),
  imageMimeType: z.string().optional(),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      })
    )
    .optional(),
});
