export type SpoilerLevel = 'none' | 'hints_only' | 'full';

export type HintTier = 'small_hint' | 'detailed_hint' | 'full_solution';

export type AssistantTopic =
  | 'item_or_equipment'
  | 'progression'
  | 'navigation'
  | 'puzzle_or_boss'
  | 'build_or_mechanic'
  | 'achievement'
  | 'technical_troubleshooting';

export interface AssistantContext {
  gameTitle: string;
  platform?: string;
  edition?: string;
  currentChapter?: string;
  currentObjective?: string;
  userNotes?: string;
  spoilerLevel: SpoilerLevel;
  hintTier: HintTier;
  topic?: AssistantTopic;
  technicalDetails?: {
    device?: string;
    os?: string;
    runtimeVersion?: string;
    errorMessage?: string;
    attemptedFixes?: string;
  };
}

export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  imageBase64?: string;
  imageMimeType?: string;
  hintTier?: HintTier;
  isFallback?: boolean;
  externalSearchLinks?: Array<{
    title: string;
    url: string;
    source: 'steam_guide' | 'gamefaqs' | 'youtube' | 'wiki';
  }>;
  createdAt: string;
}

export interface AssistantChatRequest {
  message: string;
  context: AssistantContext;
  imageBase64?: string;
  imageMimeType?: string;
  history?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}

export interface AssistantChatResponse {
  answer: string;
  hintTier: HintTier;
  topicDetected?: AssistantTopic;
  isAmbiguousImage?: boolean;
  suggestedFollowUp?: string;
  externalSearchLinks: Array<{
    title: string;
    url: string;
    source: 'steam_guide' | 'gamefaqs' | 'youtube' | 'wiki';
  }>;
  quotaExhausted?: boolean;
}
