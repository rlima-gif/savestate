-- A single shared counter keeps all Worker isolates below IGDB's app-wide
-- request ceiling. The row is reset atomically when the one-second window moves.
CREATE TABLE IF NOT EXISTS catalog_rate_limit (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  window_start INTEGER NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0
);
