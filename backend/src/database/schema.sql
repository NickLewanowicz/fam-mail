CREATE TABLE IF NOT EXISTS postcards (
  id TEXT PRIMARY KEY,
  email_message_id TEXT UNIQUE NOT NULL,
  sender_email TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  recipient_address TEXT NOT NULL,
  postgrid_postcard_id TEXT,
  postgrid_mode TEXT NOT NULL CHECK(postgrid_mode IN ('test', 'live')),
  forced_test_mode BOOLEAN NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK(status IN ('processing', 'sent', 'delivered', 'failed', 'returned')),
  error_message TEXT,
  user_id TEXT,
  draft_id TEXT,
  scheduled_for TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_postcards_email_message_id ON postcards(email_message_id);
CREATE INDEX IF NOT EXISTS idx_postcards_status ON postcards(status);
CREATE INDEX IF NOT EXISTS idx_postcards_created_at ON postcards(created_at);

CREATE TABLE IF NOT EXISTS email_processing (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email_message_id TEXT UNIQUE NOT NULL,
  subject TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  has_image BOOLEAN NOT NULL DEFAULT 0,
  processed_at TEXT NOT NULL DEFAULT (datetime('now')),
  status TEXT NOT NULL CHECK(status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_email_processing_email_message_id ON email_processing(email_message_id);
CREATE INDEX IF NOT EXISTS idx_email_processing_status ON email_processing(status);

-- ============================================================================
-- Users Table (New for Beta 1.0.0)
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  oidc_sub TEXT UNIQUE NOT NULL,
  oidc_issuer TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  email_verified BOOLEAN NOT NULL DEFAULT 0,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_oidc_sub ON users(oidc_sub);
CREATE INDEX IF NOT EXISTS idx_users_oidc_issuer ON users(oidc_issuer);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ============================================================================
-- Sessions Table (New for Beta 1.0.0)
-- ============================================================================

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  refresh_token TEXT UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- ============================================================================
-- Drafts Table (New for Beta 1.0.0)
-- ============================================================================

CREATE TABLE IF NOT EXISTS drafts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  recipient_address TEXT NOT NULL,
  sender_address TEXT,
  message TEXT,
  front_html TEXT,
  back_html TEXT,
  image_data TEXT,
  image_metadata TEXT,
  state TEXT NOT NULL DEFAULT 'draft' CHECK(state IN ('draft', 'ready')),
  scheduled_for TEXT,
  size TEXT DEFAULT '6x4' CHECK(size IN ('6x4', '9x6', '11x6')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_drafts_user_id ON drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_drafts_state ON drafts(state);
CREATE INDEX IF NOT EXISTS idx_drafts_scheduled_for ON drafts(scheduled_for);

-- ============================================================================
-- Postcards Table Migration (Beta 1.0.0)
-- ============================================================================
-- The userId, draftId, and scheduledFor columns are now included in the 
-- postcards table definition above. No migration needed for fresh installs.
-- 
-- If upgrading from an older version, run these manually:
-- ALTER TABLE postcards ADD COLUMN userId TEXT;
-- ALTER TABLE postcards ADD COLUMN draftId TEXT;
-- ALTER TABLE postcards ADD COLUMN scheduledFor TEXT;

-- Indexes for the new columns (safe to run multiple times)
CREATE INDEX IF NOT EXISTS idx_postcards_user_id ON postcards(user_id);
CREATE INDEX IF NOT EXISTS idx_postcards_draft_id ON postcards(draft_id);
CREATE INDEX IF NOT EXISTS idx_postcards_scheduled_for ON postcards(scheduled_for);
