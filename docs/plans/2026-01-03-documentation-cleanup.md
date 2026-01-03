# Documentation Consolidation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Consolidate and clean up all project documentation, removing duplicates, correcting inaccuracies, and ensuring accuracy and succinctness.

**Architecture:** Single README.md as the primary entry point, with focused supplementary docs. Remove redundant files and update all content to reflect 1.0.0 implementation.

**Tech Stack:** Markdown files, existing docs/plans structure

---

## Issues Identified

### Critical Problems

1. **Massive Duplication**: Same deployment info in 3 files (`DEPLOYMENT.md`, `docs/DEPLOYMENT.md`, `SETUP.md`)
2. **Outdated Content**: All docs reference old features (TEST_MODE, old env vars, old port 3000/3001)
3. **Stale Files**: `PROJECT_STRUCTURE.md` and `SETUP.md` reference unimplemented features
4. **Root vs Docs Confusion**: `CONTRIBUTING.md` exists in both root and `docs/`

### Content Issues

- **Port wrong everywhere**: Docs say port 3000/3001, but 1.0.0 uses port **8484**
- **Env vars outdated**: References to `TEST_MODE`, `POSTGRID_TEST_KEY` vs new config schema
- **Missing 1.0.0 features**: No mention of IMAP polling, LLM parsing, email notifications
- **Project structure docs** don't reflect new services (imap.ts, llm.ts, notifications.ts, database/)

### Files to Delete

| File | Reason |
|------|--------|
| `PROJECT_STRUCTURE.md` | Outdated, redundant with README |
| `SETUP.md` | Content duplicated elsewhere, outdated |
| `DEPLOYMENT.md` (root) | Duplicated in `docs/DEPLOYMENT.md` |
| `CONTRIBUTING.md` (root) | Duplicated in `docs/CONTRIBUTING.md` |
| `docs/ARCHITECTURE.md` | Outdated, 1.0.0 architecture different |
| `docs/plans/2026-01-03-fammail-1.0.0-implementation.md` | Implementation complete, can archive |

### Files to Update

| File | Changes Needed |
|------|----------------|
| `README.md` | Update for 1.0.0 features, correct ports, env vars |
| `docs/DEPLOYMENT.md` | Already good, minor updates for new env vars |
| `docs/CONTRIBUTING.md` | Keep, already concise |

### Files to Create

| File | Purpose |
|------|---------|
| `docs/ARCHITECTURE-1.0.0.md` | New architecture doc reflecting email-to-postcard service |

---

## Task 0: Remove Test Token from Git History (CRITICAL SECURITY)

**Files:**
- Remove from history: `~/.claude_sessions/031/security_audit_report.md`
- Modify: `.gitignore`

**Step 1: Install BFG Repo-Cleaner**

```bash
brew install bfg-repo-cleaner
# or download from https://rtyley.github.io/bfg-repo-cleaner/
```

**Step 2: Backup current repo**

```bash
cd ..
cp -r fam-mail fam-mail-backup
cd fam-mail
```

**Step 3: Remove the file from git history**

```bash
# Remove the specific file from all commits
bfg --delete-files ~/.claude_sessions/031/security_audit_report.md

# Clean up refs
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

**Step 4: Verify file is gone**

```bash
git log --all --oneline -- "~/.claude_sessions/"
# Should return nothing
```

**Step 5: Update .gitignore to block future commits**

```bash
# Add to .gitignore
echo -e "\n# Block home directory pattern\n~/" >> .gitignore
```

**Step 6: Force push to remote**

```bash
git push origin main --force
```

**Step 7: Verify GitHub**

Visit https://github.com/NickLewanowicz/fam-mail/blob/main/~/.claude_sessions/031/security_audit_report.md
- Should return 404

**Step 8: Rotate the exposed test token**

- Log into PostGrid and revoke the test key
- Generate a new test key
- Update your local .env

**Step 9: Commit .gitignore update**

```bash
git add .gitignore
git commit -m "security: block home directory pattern in .gitignore"
git push
```

---

## Task 1: Update README.md for 1.0.0

**Files:**
- Modify: `README.md:1-145`

**Step 1: Update description to reflect email-to-postcard service**

Current: "A simple, lightweight wrapper around the PostGrid API"
New: "Email-to-postcard conversion service. Monitor an inbox, send physical postcards via USPS."

**Step 2: Update Features list**

Add:
- IMAP email polling
- LLM-powered email parsing
- Configurable subject filtering
- Email notifications

**Step 3: Correct ports**

- Change all "3000/3001" references to "8484"

**Step 4: Update Environment Variables section**

Reference new .env.example file with 30+ variables

**Step 5: Update Quick Start**

```bash
cp .env.example .env
# Edit .env with your configuration
docker compose up -d
```

**Step 6: Commit**

```bash
git add README.md
git commit -m "docs: update README for 1.0.0 email-to-postcard service"
```

---

## Task 2: Delete Redundant Files

**Files:**
- Delete: `PROJECT_STRUCTURE.md`
- Delete: `SETUP.md`
- Delete: `DEPLOYMENT.md` (root)
- Delete: `CONTRIBUTING.md` (root)
- Delete: `docs/ARCHITECTURE.md`

**Step 1: Delete root-level duplicates**

```bash
rm PROJECT_STRUCTURE.md SETUP.md DEPLOYMENT.md CONTRIBUTING.md docs/ARCHITECTURE.md
```

**Step 2: Update README links**

Remove references to deleted files in README.md

**Step 3: Verify .gitignore doesn't need updates**

**Step 4: Commit**

```bash
git add .
git commit -m "docs: remove redundant and outdated documentation files"
```

---

## Task 3: Update docs/DEPLOYMENT.md for New Env Vars

**Files:**
- Modify: `docs/DEPLOYMENT.md:1-48`

**Step 1: Update environment variables reference**

Change from simple 3-var setup to reference `.env.example` with full config

**Step 2: Update Unraid section**

- Port: 8484 (not 3000)
- Environment variables: Reference .env.example

**Step 3: Update health check port**

```bash
curl http://localhost:8484/api/health
```

**Step 4: Commit**

```bash
git add docs/DEPLOYMENT.md
git commit -m "docs: update deployment guide for 1.0.0 configuration"
```

---

## Task 4: Create New Architecture Document

**Files:**
- Create: `docs/ARCHITECTURE-1.0.0.md`

**Step 1: Write architecture overview**

```markdown
# Fam Mail 1.0.0 Architecture

## Core Flow

1. IMAP polling watches inbox
2. Subject filter triggers processing ("Fammail Postcard")
3. LLM parses email (recipient, message, image)
4. PostGrid API sends physical postcard
5. Email notification confirms status

## Components

### Backend Services
- `IMAPService` - Email polling with imap-flow
- `LLMService` - Email parsing (OpenRouter/Ollama/custom)
- `PostGridService` - Postcard API client with force-test mode
- `NotificationService` - Email success/failure notifications
- `Database` - SQLite tracking processed emails

### Configuration
- Single `.env` file with 30+ variables
- Type-safe config validation
- Test/live mode switching
```

**Step 2: Document API endpoints**

```markdown
## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/health` | GET | Health check |
| `/api/postcards` | POST | Manual postcard creation |
| `/api/webhook/postgrid` | POST | PostGrid status updates |
```

**Step 3: Document data flow**

**Step 4: Document deployment architecture**

**Step 5: Commit**

```bash
git add docs/ARCHITECTURE-1.0.0.md
git commit -m "docs: add 1.0.0 architecture documentation"
```

---

## Task 5: Archive Implementation Plan

**Files:**
- Move: `docs/plans/2026-01-03-fammail-1.0.0-implementation.md` → `docs/plans/archive/`

**Step 1: Create archive directory**

```bash
mkdir -p docs/plans/archive
```

**Step 2: Move completed implementation plan**

```bash
mv docs/plans/2026-01-03-fammail-1.0.0-implementation.md docs/plans/archive/
```

**Step 3: Commit**

```bash
git add docs/plans/
git commit -m "docs: archive completed 1.0.0 implementation plan"
```

---

## Task 6: Update .gitignore

**Files:**
- Modify: `.gitignore`

**Step 1: Add archive directory if needed**

Archive directory should be tracked (not ignored)

**Step 2: Verify no changes needed**

**Step 3: Commit if modified**

---

## Verification

After completing all tasks:

1. **Documentation coverage**: All 1.0.0 features documented
2. **No duplication**: Each piece of info exists in one place only
3. **Accuracy**: All ports, env vars, features match code
4. **Succinctness**: Removed verbose/outdated content
5. **Link integrity**: All cross-references work

## Files After Cleanup

```
fam-mail/
├── README.md                    # Main entry point (updated)
├── LICENSE
├── docs/
│   ├── CONTRIBUTING.md          # Contributing guidelines (kept)
│   ├── DEPLOYMENT.md            # Deployment guide (updated)
│   ├── ARCHITECTURE-1.0.0.md    # New architecture doc
│   └── plans/
│       ├── 2026-01-03-fammail-1.0.0-design.md
│       └── archive/
│           └── 2026-01-03-fammail-1.0.0-implementation.md
```
