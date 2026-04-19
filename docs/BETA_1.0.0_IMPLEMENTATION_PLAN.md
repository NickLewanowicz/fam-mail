# Fam Mail Beta 1.0.0 Implementation Plan

## Project Overview

Fam Mail is being pivoted from an automated email-to-postcard service to a **user-facing web application** with:
- OpenID Connect authentication (Google OAuth)
- User-managed postcard drafts
- PostGrid integration for sending physical postcards
- Scheduling capabilities

---

## Current Status (Uncommitted Work)

### ✅ Completed
- Authentication system (OIDC + JWT)
- Database schema (users, sessions, drafts tables)
- Drafts CRUD API endpoints
- All syntax/type errors fixed

### 📝 In Progress
- Frontend types (draft.ts, postcard.ts exist but UI not built)
- PostGrid integration (drafts can be published but not sent)

---

## Phase 1: Backend Completion (Beta 1.0.0)

### 1.1 PostGrid Integration for Drafts
**Status:** Draft routes have publish endpoint but PostGrid call is TODO

**Tasks:**
- [ ] Add `PostGridService.sendPostcard()` call in `DraftRoutes.publish()`
- [ ] Create postcard record in `postcards` table when published
- [ ] Handle PostGrid errors and update draft state
- [ ] Add webhook support for postcard status updates

**Files to modify:**
- `backend/src/routes/drafts.ts` - wire PostGrid in publish()
- `backend/src/services/postgrid.ts` - ensure sendPostcard() exists

**Endpoints:**
- `POST /api/drafts/:id/publish` - send to PostGrid

### 1.2 Scheduled Postcard Worker
**Status:** Drafts have `scheduledFor` field but no worker to process

**Tasks:**
- [ ] Create `ScheduledPostcardWorker` service
- [ ] Poll for ready drafts with `scheduledFor <= now`
- [ ] Call PostGrid for scheduled drafts
- [ ] Update draft state to 'sent' after successful delivery
- [ ] Handle failures and retry logic

**Files to create:**
- `backend/src/services/scheduledWorker.ts` - scheduled postcard processor

**Integration:**
- Start worker in `backend/src/server.ts` on server boot
- Use `setInterval` to check every minute

### 1.3 API Documentation & Validation
**Tasks:**
- [ ] Add input validation middleware
- [ ] Add error handling for all endpoints
- [ ] Document API endpoints (OpenAPI/Swagger)

---

## Phase 2: Frontend Implementation (Beta 1.0.0)

### 2.1 Project Setup & Dependencies
**Tasks:**
- [ ] Install required dependencies (already have Vite + React + TypeScript)
- [ ] Set up router (react-router-dom)
- [ ] Set up state management (Zustand or Context API)
- [ ] Configure Tailwind CSS or other styling

**Dependencies to add:**
- `react-router-dom` - client-side routing
- `zustand` - state management (or use Context API)
- `date-fns` - date formatting for schedules
- `axios` or `fetch` - API calls

### 2.2 Authentication Flow
**Components:**
- `LoginButton` - initiates OIDC flow
- `AuthCallback` - handles OAuth callback
- `AuthProvider` - wraps app with auth context
- `ProtectedRoute` - HOC for authenticated routes

**Pages:**
- `/auth/login` - login page
- `/auth/callback` - OAuth callback handler (redirect from backend)
- `/` - dashboard (authenticated)

**Tasks:**
- [ ] Implement login with `POST /api/auth/login`
- [ ] Handle OAuth redirect to `/api/auth/callback`
- [ ] Store JWT token in localStorage/httpOnly cookie
- [ ] Use `GET /api/auth/me` to get current user
- [ ] Implement logout with `POST /api/auth/logout`

### 2.3 Drafts UI
**Components:**
- `DraftList` - list user's drafts (filter by state)
- `DraftCard` - single draft preview card
- `DraftEditor` - create/edit draft form
- `DraftPreview` - preview postcard before sending
- `SchedulePicker` - date/time picker for scheduling

**Pages:**
- `/drafts` - list all drafts
- `/drafts/new` - create new draft
- `/drafts/:id` - view/edit draft
- `/drafts/:id/schedule` - schedule draft

**Draft Form Fields:**
- Recipient address (street, city, state, zip, country)
- Sender address (optional)
- Message
- Image upload (base64 or file upload)
- Postcard size (4x6, 6x9, 11x6)

**Tasks:**
- [ ] Implement list drafts with `GET /api/drafts`
- [ ] Implement create draft with `POST /api/drafts`
- [ ] Implement update draft with `PUT /api/drafts/:id`
- [ ] Implement delete draft with `DELETE /api/drafts/:id`
- [ ] Implement preview of postcard (front/back)
- [ ] Implement schedule with `POST /api/drafts/:id/schedule`
- [ ] Implement publish with `POST /api/drafts/:id/publish`

### 2.4 Postcard History
**Components:**
- `PostcardList` - list sent postcards
- `PostcardDetail` - view postcard status

**Pages:**
- `/history` - list all sent postcards
- `/history/:id` - view postcard details

**API Endpoints needed:**
- `GET /api/postcards` - list user's postcards (needs to be added)
- `GET /api/postcards/:id` - get postcard details (needs to be added)

**Tasks:**
- [ ] Add backend route for listing user's postcards
- [ ] Display postcard status (processing, sent, delivered, failed)
- [ ] Show PostGrid tracking info

### 2.5 Error Handling & Loading States
**Tasks:**
- [ ] Global error boundary
- [ ] Loading spinners for async operations
- [ ] Toast notifications for success/error messages
- [ ] Form validation errors

### 2.6 Responsive Design
**Tasks:**
- [ ] Mobile-friendly layout
- [ ] Tablet support
- [ ] Desktop optimization

---

## Phase 3: Testing (Beta 1.0.0)

### 3.1 Backend Tests
**Tasks:**
- [ ] Unit tests for DraftRoutes
- [ ] Unit tests for AuthMiddleware
- [ ] Integration tests for auth flow
- [ ] Integration tests for draft CRUD
- [ ] Mock PostGrid API for testing

**Files:**
- `backend/src/routes/drafts.test.ts`
- `backend/src/middleware/auth.test.ts`
- `backend/tests/integration/auth-flow.test.ts`
- `backend/tests/integration/draft-flow.test.ts`

### 3.2 Frontend Tests
**Tasks:**
- [ ] Component tests (Vitest + React Testing Library)
- [ ] E2E tests (Playwright)

**Files:**
- `frontend/src/components/__tests__/`
- `frontend/e2e/`

### 3.3 Manual Testing
**Tasks:**
- [ ] Test OAuth flow with Google
- [ ] Test draft creation, editing, deletion
- [ ] Test postcard sending (test mode)
- [ ] Test scheduling
- [ ] Test error scenarios

---

## Phase 4: Deployment (Beta 1.0.0)

### 4.1 Environment Configuration
**Tasks:**
- [ ] Set up production Google OAuth client
- [ ] Configure PostGrid live API keys
- [ ] Set up production database path
- [ ] Configure environment variables

### 4.2 Docker Deployment
**Tasks:**
- [ ] Update Dockerfile for new dependencies
- [ ] Update docker-compose.yml for OIDC env vars
- [ ] Test production build
- [ ] Deploy to server

### 4.3 Database Migration
**Tasks:**
- [ ] Handle existing data (if any)
- [ ] Apply schema migrations
- [ ] Backup existing database

---

## Phase 5: Beta 2.0.0 - Original Features

### 5.1 Re-enable IMAP Polling
**Status:** Currently commented out in `.env.example`

**Tasks:**
- [ ] Re-enable IMAP configuration in `.env.example`
- [ ] Add user-specific IMAP credentials to `users` table
- [ ] Allow users to configure their own email accounts
- [ ] Link IMAP emails to user accounts

**New Database Table:**
```sql
CREATE TABLE IF NOT EXISTS user_imap_accounts (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  host TEXT NOT NULL,
  port INTEGER NOT NULL,
  username TEXT NOT NULL,
  password_encrypted TEXT NOT NULL,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);
```

### 5.2 Re-enable LLM Email Parsing
**Status:** Currently commented out in `.env.example`

**Tasks:**
- [ ] Re-enable LLM configuration in `.env.example`
- [ ] Allow users to send emails to create drafts
- [ ] Parse emails with LLM and create drafts automatically

**Workflow:**
1. User sends email to their configured email account
2. IMAP service detects email with subject filter
3. LLM parses email content (recipient, message, images)
4. Create draft from parsed content
5. User can review and publish draft

### 5.3 Webhook Improvements
**Tasks:**
- [ ] PostGrid webhook for delivery status updates
- [ ] Email notifications for postcard delivery
- [ ] In-app notifications

---

## Phase 6: Future Enhancements

### 6.1 Features
- [ ] Bulk postcard sending
- [ ] Postcard templates
- [ ] Address book
- [ ] Postcard design customization
- [ ] Multi-language support
- [ ] Analytics dashboard

### 6.2 Infrastructure
- [ ] Redis for session storage (production)
- [ ] Background job queue (BullMQ or similar)
- [ ] Rate limiting
- [ ] Monitoring & logging (Prometheus/Grafana)

---

## Summary of API Endpoints

### Authentication
- `POST /api/auth/login` - Get OAuth authorization URL
- `GET /api/auth/callback` - Handle OAuth callback
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout

### Drafts
- `GET /api/drafts` - List drafts (query: state)
- `POST /api/drafts` - Create draft
- `GET /api/drafts/:id` - Get draft
- `PUT /api/drafts/:id` - Update draft
- `DELETE /api/drafts/:id` - Delete draft
- `POST /api/drafts/:id/publish` - Publish draft (send to PostGrid)
- `POST /api/drafts/:id/schedule` - Schedule draft
- `POST /api/drafts/:id/cancel-schedule` - Cancel schedule

### Postcards (needs to be added)
- `GET /api/postcards` - List user's postcards
- `GET /api/postcards/:id` - Get postcard details

### Webhooks
- `POST /api/webhook/email` - PostGrid webhook (for delivery updates)
- `GET /api/webhook/health` - Webhook health check

### Health
- `GET /api/health` - Health check
- `GET /api/test` - Test endpoint

---

## Database Schema Summary

### Tables
1. **users** - User accounts (OIDC)
2. **sessions** - JWT sessions
3. **drafts** - Postcard drafts
4. **postcards** - Sent postcards (with userId, draftId, scheduledFor)
5. **email_processing** - Email processing status (for Beta 2.0)
6. **user_imap_accounts** - User email accounts (for Beta 2.0)

---

## Priority Order

1. **High Priority** - Phase 1.1 (PostGrid integration)
2. **High Priority** - Phase 2.1-2.3 (Frontend auth + drafts)
3. **Medium Priority** - Phase 2.4 (Postcard history)
4. **Medium Priority** - Phase 3 (Testing)
5. **Medium Priority** - Phase 4 (Deployment)
6. **Low Priority** - Phase 1.2 (Scheduled worker - can be manual initially)
7. **Low Priority** - Phase 5 (Beta 2.0 features)
8. **Future** - Phase 6 (Enhancements)

---

## Next Steps

1. ✅ Commit current backend work (auth + drafts)
2. ⏳ Implement PostGrid integration in DraftRoutes.publish()
3. ⏳ Start frontend implementation (setup + auth)
4. ⏳ Build drafts UI components
5. ⏳ Test end-to-end flow
6. ⏳ Deploy to staging
