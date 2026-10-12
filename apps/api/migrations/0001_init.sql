-- D1 Initial Schema for SaveState API

-- Table for per-client IP abuse protection and daily rate limits
CREATE TABLE IF NOT EXISTS rate_limits (
  client_id TEXT NOT NULL,
  feature TEXT NOT NULL, -- e.g. 'assistant', 'catalog'
  date_window TEXT NOT NULL, -- 'YYYY-MM-DD'
  count INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  PRIMARY KEY (client_id, feature, date_window)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits (date_window);

-- Table for caching catalog search results to minimize external API costs and rate limits
CREATE TABLE IF NOT EXISTS catalog_cache (
  cache_key TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  query TEXT NOT NULL,
  response_json TEXT NOT NULL,
  expires_at INTEGER NOT NULL, -- Unix timestamp in seconds
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE INDEX IF NOT EXISTS idx_catalog_cache_expires ON catalog_cache (expires_at);

-- Table for optional cloud sync state metadata
CREATE TABLE IF NOT EXISTS sync_checkpoints (
  user_id TEXT PRIMARY KEY,
  last_sync_timestamp TEXT NOT NULL,
  client_version TEXT,
  record_count INTEGER DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);
