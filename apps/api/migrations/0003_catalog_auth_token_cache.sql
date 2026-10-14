-- Cache Twitch app-access tokens between Worker isolates. This table is only
-- accessed by the Worker; never expose it through API routes or logs.
CREATE TABLE IF NOT EXISTS catalog_auth_tokens (
  client_id TEXT PRIMARY KEY,
  access_token TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);
