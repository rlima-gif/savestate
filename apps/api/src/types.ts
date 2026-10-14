export interface Env {
  DB?: D1Database;
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
  TWITCH_CLIENT_ID?: string;
  TWITCH_CLIENT_SECRET?: string;
  AI_DAILY_RATE_LIMIT?: string | number;
  AI_FEATURE_ENABLED?: string;
  ENVIRONMENT?: string;
}
