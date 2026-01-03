CREATE TABLE IF NOT EXISTS postcards (
  id TEXT PRIMARY KEY,
  emailMessageId TEXT UNIQUE NOT NULL,
  senderEmail TEXT NOT NULL,
  recipientName TEXT NOT NULL,
  recipientAddress TEXT NOT NULL,
  postgridPostcardId TEXT,
  postgridMode TEXT NOT NULL CHECK(postgridMode IN ('test', 'live')),
  forcedTestMode BOOLEAN NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK(status IN ('processing', 'sent', 'delivered', 'failed', 'returned')),
  errorMessage TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_postcards_emailMessageId ON postcards(emailMessageId);
CREATE INDEX IF NOT EXISTS idx_postcards_status ON postcards(status);
CREATE INDEX IF NOT EXISTS idx_postcards_createdAt ON postcards(createdAt);

CREATE TABLE IF NOT EXISTS email_processing (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  emailMessageId TEXT UNIQUE NOT NULL,
  subject TEXT NOT NULL,
  senderEmail TEXT NOT NULL,
  hasImage BOOLEAN NOT NULL DEFAULT 0,
  processedAt TEXT NOT NULL DEFAULT (datetime('now')),
  status TEXT NOT NULL CHECK(status IN ('pending', 'processing', 'completed', 'failed')),
  errorMessage TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_email_processing_emailMessageId ON email_processing(emailMessageId);
CREATE INDEX IF NOT EXISTS idx_email_processing_status ON email_processing(status);
