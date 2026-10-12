export const SQL_SCHEMA_V1 = `
-- Canonical Games
CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  alternativeTitles TEXT, -- JSON array
  description TEXT,
  coverUrl TEXT,
  genres TEXT NOT NULL DEFAULT '[]', -- JSON array
  platforms TEXT NOT NULL DEFAULT '[]', -- JSON array
  releaseDate TEXT,
  developer TEXT,
  publisher TEXT,
  relationshipType TEXT,
  parentGameId TEXT,
  externalIds TEXT NOT NULL DEFAULT '{}', -- JSON object
  source TEXT NOT NULL DEFAULT 'manual',
  estimatedDurationHours TEXT, -- JSON object
  fetchedAt TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_games_title ON games(title);

-- Owned Copies
CREATE TABLE IF NOT EXISTS owned_copies (
  id TEXT PRIMARY KEY,
  gameId TEXT NOT NULL,
  platform TEXT NOT NULL,
  edition TEXT,
  store TEXT,
  ownershipType TEXT NOT NULL DEFAULT 'digital',
  deviceId TEXT,
  physicalCondition TEXT,
  shelfLocation TEXT,
  loanRecipient TEXT,
  loanDate TEXT,
  returnDate TEXT,
  purchasePrice REAL,
  purchaseCurrency TEXT,
  acquiredAt TEXT,
  expiresAt TEXT,
  notes TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  FOREIGN KEY (gameId) REFERENCES games(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_copies_gameId ON owned_copies(gameId);

-- Playthroughs
CREATE TABLE IF NOT EXISTS playthroughs (
  id TEXT PRIMARY KEY,
  gameId TEXT NOT NULL,
  ownedCopyId TEXT,
  status TEXT NOT NULL DEFAULT 'backlog',
  priority TEXT NOT NULL DEFAULT 'medium',
  rating REAL,
  difficulty TEXT,
  currentChapter TEXT,
  nextObjective TEXT,
  noteToFutureSelf TEXT,
  notes TEXT,
  startDate TEXT,
  finishDate TEXT,
  lastPlayedAt TEXT,
  isReplay INTEGER NOT NULL DEFAULT 0,
  totalPlaytimeMinutes INTEGER NOT NULL DEFAULT 0,
  targetAchievementsPinned TEXT, -- JSON array
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  FOREIGN KEY (gameId) REFERENCES games(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_playthroughs_status ON playthroughs(status);
CREATE INDEX IF NOT EXISTS idx_playthroughs_lastPlayed ON playthroughs(lastPlayedAt);

-- Sessions
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  playthroughId TEXT NOT NULL,
  startTime TEXT NOT NULL,
  endTime TEXT,
  durationMinutes INTEGER NOT NULL DEFAULT 0,
  progressNote TEXT,
  screenshots TEXT, -- JSON array
  createdAt TEXT NOT NULL,
  FOREIGN KEY (playthroughId) REFERENCES playthroughs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_playthrough ON sessions(playthroughId);

-- Personal Checklists
CREATE TABLE IF NOT EXISTS checklists (
  id TEXT PRIMARY KEY,
  playthroughId TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'goal',
  isCompleted INTEGER NOT NULL DEFAULT 0,
  isMissable INTEGER NOT NULL DEFAULT 0,
  pointOfNoReturn TEXT,
  isSpoiler INTEGER NOT NULL DEFAULT 0,
  source TEXT,
  verificationDate TEXT,
  orderIndex INTEGER NOT NULL DEFAULT 0,
  completedAt TEXT,
  notes TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  FOREIGN KEY (playthroughId) REFERENCES playthroughs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_checklists_pt ON checklists(playthroughId);

-- Device & Personal Config Records
CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'pc',
  graphicsPreset TEXT,
  resolution TEXT,
  fpsTarget INTEGER,
  controllerMapping TEXT,
  emulatorVersion TEXT,
  modsOrPatches TEXT,
  saveLocationNotes TEXT,
  notes TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

-- Next-Game Queue
CREATE TABLE IF NOT EXISTS next_game_queue (
  id TEXT PRIMARY KEY,
  gameId TEXT NOT NULL UNIQUE,
  priorityOrder INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  createdAt TEXT NOT NULL,
  FOREIGN KEY (gameId) REFERENCES games(id) ON DELETE CASCADE
);

-- Active Persistent Timer State
CREATE TABLE IF NOT EXISTS active_timer (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  playthroughId TEXT NOT NULL,
  startedAtTimestamp INTEGER NOT NULL,
  accumulatedSeconds INTEGER NOT NULL DEFAULT 0,
  isRunning INTEGER NOT NULL DEFAULT 1
);
`;
