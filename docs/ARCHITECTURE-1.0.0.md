# Fam Mail 1.0.0 Architecture

**Version:** 1.0.0
**Status:** Production
**Last Updated:** 2026-01-03

## Core Flow

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────┐     ┌──────────────┐
│   IMAP      │────>│   Subject    │────>│    LLM      │────>│ PostGrid │────>│ Notification │
│   Inbox     │     │   Filter     │     │   Parser    │     │   API    │     │    Email     │
└─────────────┘     └──────────────┘     └─────────────┘     └──────────┘     └──────────────┘
       │                   │                     │                   │                  │
       v                   v                     v                   v                  v
   Polling           "Fammail           Extract            Physical          Success/
   Service           Postcard"          Recipient,         Postcard          Failure
                      Message, Image     Message            Mailed           Email
```

1. **IMAP Polling** - Service watches configured inbox(es) for new emails
2. **Subject Filter** - Emails matching "Fammail Postcard" trigger processing pipeline
3. **LLM Parsing** - Email content analyzed to extract recipient, message, and image
4. **PostGrid API** - Parsed data sent to create physical postcard
5. **Notification** - Email confirmation sent to original sender

## Components

### Backend Services

#### IMAPService
**File:** `backend/src/services/imap.ts`

- **Library:** `imap-flow` (modern, promise-based, IDLE support)
- **Purpose:** Poll IMAP inbox for postcard requests
- **Features:**
  - Real-time IDLE mode when supported
  - Fallback to 30-second polling
  - Configurable initial sync window
  - Duplicate email detection via SQLite
  - Attachment validation (requires image)

#### LLMService
**File:** `backend/src/services/llm.ts`

- **Purpose:** Parse email content into structured postcard data
- **Providers:** OpenRouter, Ollama, or custom endpoint
- **Extracts:**
  - Recipient name and address
  - Message content (markdown)
  - Image reference (attachment, URL, or description)
- **Error Handling:**
  - Invalid JSON response → notify sender
  - Missing fields → specific error messages
  - Timeout → single retry then notify

#### PostGridService
**File:** `backend/src/services/postgrid.ts`

- **Purpose:** Send physical postcards via USPS
- **Modes:**
  - **Test:** Free development mode, no actual mail sent
  - **Live:** Real postcards, costs apply
  - **Force Test:** Safety override that always uses test API
- **Features:**
  - Base64 image encoding for attachments
  - Markdown-to-HTML conversion for message
  - Retry logic (3x with exponential backoff)
  - Metadata tracking (email ID, sender, environment)

#### NotificationService
**File:** `backend/src/services/notifications.ts`

- **Purpose:** Email senders about postcard status
- **SMTP:** Configurable server settings
- **Templates:**
  - Test mode: "Created in TEST mode (not actually sent)"
  - Force test: "Created in TEST mode (force test enabled)"
  - Live: "Postcard is on the way! Tracking: [url]"
  - Error: "Couldn't send postcard. Error: [details]"

#### Database
**File:** `backend/src/database.ts`

- **Type:** SQLite
- **Purpose:** Track processed emails and postcard status
- **Schema:**
  ```sql
  CREATE TABLE postcards (
    id TEXT PRIMARY KEY,
    emailMessageId TEXT UNIQUE,
    senderEmail TEXT,
    recipientName TEXT,
    recipientAddress TEXT,
    postgridPostcardId TEXT,
    postgridMode TEXT,
    forcedTestMode BOOLEAN,
    status TEXT,
    errorMessage TEXT,
    createdAt TEXT,
    updatedAt TEXT
  );
  ```

### Configuration

**File:** `backend/src/config.ts`

- **Environment Variables:** 30+ configuration options
- **Validation:** Type-safe runtime validation
- **Categories:**
  - Server (port, environment, logging)
  - IMAP (host, credentials, polling)
  - LLM (provider, model, endpoint)
  - PostGrid (API keys, mode, sender)
  - SMTP (notification server)
  - Database (path)
  - Features (test mode overrides)

**Example:**
```bash
PORT=8484
IMAP_HOST=imap.gmail.com
IMAP_USER=account@gmail.com
IMAP_PASSWORD=app-password
SUBJECT_FILTER=Fammail Postcard
LLM_PROVIDER=openrouter
LLM_MODEL=openai/gpt-4o
POSTGRID_MODE=test
POSTGRID_FORCE_TEST_MODE=false
```

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/health` | GET | Health check, version, service status |
| `/api/test` | GET | Connection test endpoint |
| `/api/postcards` | POST | Manual postcard creation (testing UI) |
| `/api/webhook/email` | POST | Email webhook handler |
| `/api/webhook/health` | GET | Webhook health check |

### Health Check Response
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2026-01-03T12:00:00Z",
  "message": "Fam Mail backend is running",
  "services": {
    "imap": "connected",
    "postgrid": "test (forced)",
    "database": "connected",
    "notifications": "ready"
  }
}
```

## Data Flow

```
Email Arrives
    │
    v
┌─────────────────────────────────────────┐
│ IMAPService.fetchNewEmails()            │
│ - Check subject filter                  │
│ - Check database for duplicates         │
└─────────────────────────────────────────┘
    │
    v
┌─────────────────────────────────────────┐
│ EmailParser.extractContent()            │
│ - Validate image attachment             │
│ - Extract subject, body, attachments    │
└─────────────────────────────────────────┘
    │
    v
┌─────────────────────────────────────────┐
│ LLMService.parseEmail()                │
│ - Send email context to LLM            │
│ - Validate JSON response               │
│ - Extract recipient, message, image    │
└─────────────────────────────────────────┘
    │
    v
┌─────────────────────────────────────────┐
│ PostGridService.sendPostcard()         │
│ - Encode image to base64               │
│ - Convert markdown to HTML             │
│ - Call PostGrid API                    │
│ - Retry on failure (3x)                │
└─────────────────────────────────────────┘
    │
    v
┌─────────────────────────────────────────┐
│ Database.insert()                      │
│ - Store postcard record                │
│ - Track status and metadata            │
└─────────────────────────────────────────┘
    │
    v
┌─────────────────────────────────────────┐
│ NotificationService.send()             │
│ - Email sender with result             │
│ - Include tracking URL (live mode)     │
└─────────────────────────────────────────┘
```

## Deployment Architecture

### Docker Deployment

**Compose Configuration:**
```yaml
services:
  fammail:
    image: ghcr.io/nicklwanowicz/fam-mail:latest
    container_name: fammail
    restart: unless-stopped
    env_file:
      - .env
    volumes:
      - ./data:/data
      - ./config:/config
    ports:
      - "8484:8484"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8484/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### Network Configuration

- **Backend Port:** 8484 (chosen for F=M=4,4)
- **Frontend Dev Port:** 5173 (Vite default)
- **Production:** Frontend served by backend at `/`

### Security

- **CORS:** Enabled for all origins (development)
- **Headers:** CSP, X-Frame-Options, HSTS
- **Environment:** `.env` file never committed
- **Force Test Mode:** Prevents accidental live charges

### File Structure

```
fam-mail/
├── backend/
│   ├── src/
│   │   ├── server.ts           # Entry point, API routes
│   │   ├── config.ts           # Environment validation
│   │   ├── database.ts         # SQLite setup
│   │   ├── routes/
│   │   │   ├── postcards.ts    # Manual creation endpoint
│   │   │   └── webhook.ts      # Webhook handlers
│   │   └── services/
│   │       ├── imap.ts         # Email polling
│   │       ├── llm.ts          # Email parsing
│   │       ├── postgrid.ts     # Postcard API
│   │       ├── notifications.ts # SMTP notifications
│   │       ├── emailParser.ts  # Email content extraction
│   │       └── emailService.ts # Email sending
│   └── test/                   # Unit and integration tests
├── frontend/
│   ├── src/
│   │   ├── components/         # React components
│   │   └── lib/                # API client
│   └── dist/                   # Production build
├── docs/
│   ├── ARCHITECTURE-1.0.0.md   # This document
│   └── plans/                  # Design documents
├── docker-compose.yml
├── Dockerfile
└── .env.example                # Configuration template
```

## Error Handling

| Error Type | Retry | Notification |
|------------|-------|--------------|
| Invalid LLM JSON | No | Email sender with parsing error |
| Missing recipient | No | Email sender what's missing |
| PostGrid timeout | Yes (3x) | Email sender after retries |
| PostGrid 4xx | No | Email sender with error |
| PostGrid 5xx | Yes (3x) | Email sender after retries |
| Missing image | No | "Requires image attachment" |
| Image > 5MB | No | "Image exceeds 5MB limit" |

### Retry Strategy

- **Backoff:** 1s, 5s, 15s (exponential)
- **Max Attempts:** 3 retries
- **Logging:** All retries logged with context

## Testing

### Test Coverage

- **Unit Tests:** Service logic, config validation
- **Integration Tests:** IMAP processing, LLM parsing
- **Test Files:**
  - `imap.test.ts` - Email polling
  - `llm.test.ts` - Email parsing
  - `postgrid.test.ts` - API client
  - `notifications.test.ts` - Email sending

### Test Commands

```bash
pnpm test              # All tests
pnpm test:unit         # Unit tests only
pnpm test:integration  # Integration tests only
pnpm test:coverage     # With coverage report
```

## Monitoring

### Health Check

**Endpoint:** `GET /api/health`

**Returns:**
- Service status
- Version number
- Component states (IMAP, PostGrid, Database, Notifications)
- Timestamp

### Logging

- **Level:** Configurable (debug, info, warn, error)
- **Format:** JSON structured logs
- **Output:** Console (Docker logs)

### Database Queries

```sql
-- View all postcards
SELECT * FROM postcards ORDER BY createdAt DESC;

-- View processing status
SELECT status, COUNT(*) FROM postcards GROUP BY status;

-- Check for errors
SELECT * FROM postcards WHERE errorMessage IS NOT NULL;
```

## Version History

### 1.0.0 (2026-01-03)

**Features:**
- IMAP email polling with IDLE support
- LLM-based email parsing (OpenRouter/Ollama/custom)
- PostGrid API integration (test + live modes)
- Force test mode safety feature
- SQLite database for tracking
- SMTP notification service
- REST API for manual testing
- Docker deployment

**Technology Stack:**
- Runtime: Bun 1.x
- Backend: TypeScript
- Frontend: React + Vite
- Database: SQLite
- Email: imap-flow
- LLM: OpenRouter/Ollama
- Postcards: PostGrid API
