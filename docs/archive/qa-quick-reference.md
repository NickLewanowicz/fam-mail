# FamMail QA Quick Reference

> Keep this open during QA testing for quick command reference

## 🚀 Quick Start

```bash
# Start backend
cd backend && bun run dev

# Start frontend (new terminal)
cd frontend && bun run dev

# Check prerequisites
./run-qa-check.sh

# Setup test environment
cd backend && ./scripts/setup-qa-environment.sh
```

## 🔑 Test Authentication

### Generate Test Token
```bash
cd backend
bun run scripts/generate-test-token.ts
```

### Inject Token in Browser
```javascript
// Paste in browser console
localStorage.setItem('auth_token', 'YOUR_TOKEN_HERE');
location.reload();
```

### Use Token in API Calls
```bash
# curl
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8484/api/drafts

# Fetch
fetch('http://localhost:8484/api/drafts', {
  headers: { 'Authorization': 'Bearer YOUR_TOKEN' }
})
```

## 📸 Chrome DevTools Commands

### Navigation
| Action | Command |
|--------|---------|
| Go to URL | `chrome-devtools_navigate_page({ type: "url", url: "..." })` |
| Reload | `chrome-devtools_navigate_page({ type: "reload" })` |
| New tab | `chrome-devtools_new_page({ url: "..." })` |
| List tabs | `chrome-devtools_list_pages()` |

### Screenshots
| Action | Command |
|--------|---------|
| Screenshot page | `chrome-devtools_take_screenshot({ filePath: "path.png" })` |
| Full page | `chrome-devtools_take_screenshot({ filePath: "path.png", fullPage: true })` |
| Element only | `chrome-devtools_take_screenshot({ uid: "element-uid", filePath: "path.png" })` |
| Snapshot | `chrome-devtools_take_snapshot({})` |

### Interaction
| Action | Command |
|--------|---------|
| Click | `chrome-devtools_click({ uid: "button-uid" })` |
| Fill input | `chrome-devtools_fill({ uid: "input-uid", value: "text" })` |
| Fill form | `chrome-devtools_fill_form({ elements: [...] })` |
| Press key | `chrome-devtools_press_key({ key: "Tab" })` |
| Upload file | `chrome-devtools_upload_file({ uid: "file-uid", filePath: "path" })` |

### Network
| Action | Command |
|--------|---------|
| List requests | `chrome-devtools_list_network_requests({ resourceTypes: ["xhr", "fetch"] })` |
| Get request | `chrome-devtools_get_network_request({ reqid: 123 })` |
| Console errors | `chrome-devtools_list_console_messages({ types: ["error"] })` |

### Emulation
| Action | Command |
|--------|---------|
| Offline | `chrome-devtools_emulate({ networkConditions: "Offline" })` |
| Slow 3G | `chrome-devtools_emulate({ networkConditions: "Slow 3G" })` |
| Mobile | `chrome-devtools_emulate({ viewport: { width: 375, height: 667, isMobile: true } })` |
| Dark mode | `chrome-devtools_emulate({ colorScheme: "dark" })` |

## 📋 Test Checklist

### A. Health & Connectivity
- [ ] A1: Backend health check - `GET /api/health`
- [ ] A2: Frontend loads - Navigate to `http://localhost:5173`
- [ ] A3: API test - `GET /api/test`

### B. Authentication
- [ ] B1: Login page displays
- [ ] B2: OIDC login initiates
- [ ] B3: Callback handles token
- [ ] B4: Get current user works
- [ ] B5: Logout clears session
- [ ] B6: Unauthorized blocked

### C. Drafts CRUD
- [ ] C1: List empty drafts
- [ ] C2: Create draft
- [ ] C3: View draft
- [ ] C4: Update draft
- [ ] C5: Delete draft
- [ ] C6: Filter by state
- [ ] C7: Pagination

### D. Postcard Creation
- [ ] D1: Address validation
- [ ] D2: Image validation
- [ ] D3: Complete creation
- [ ] D4: Preview rendering
- [ ] D5: Success display

### E. Scheduling
- [ ] E1: Publish immediately
- [ ] E2: Schedule for future
- [ ] E3: Cancel schedule
- [ ] E4: Invalid past date

### F. Error Handling
- [ ] F1: Network error
- [ ] F2: XSS sanitization
- [ ] F3: Required fields
- [ ] F4: PostGrid API error
- [ ] F5: Expired token
- [ ] F6: Concurrent edit
- [ ] F7: Large file
- [ ] F8: Invalid email

### G. UI/UX
- [ ] G1: Desktop 1920x1080
- [ ] G2: Tablet 768x1024
- [ ] G3: Mobile 375x667
- [ ] G4: Dark mode
- [ ] G5: Keyboard nav
- [ ] G6: Loading states

### H. Security
- [ ] H1: SQL injection
- [ ] H2: CSRF protection
- [ ] H3: Security headers
- [ ] H4: Rate limiting
- [ ] H5: User isolation

## 🔧 Common Fixes

### Backend won't start
```bash
# Check for port conflicts
lsof -i :8484

# Kill existing process
kill -9 <PID>

# Clear database (if corrupted)
rm backend/data/fammail.db
```

### Frontend won't start
```bash
# Check for port conflicts
lsof -i :5173

# Clear node_modules
rm -rf frontend/node_modules frontend/bun.lockb
cd frontend && bun install
```

### OIDC not working
```bash
# Enable auth bypass for testing
echo "BYPASS_AUTH=true" >> backend/.env
echo "TEST_USER_ID=test-user-123" >> backend/.env

# Restart backend
```

### Test assets missing
```bash
cd backend
./scripts/setup-test-assets.sh
```

## 📁 File Locations

| Item | Path |
|------|------|
| QA Plan | `docs/qa-testing-plan.md` |
| Screenshots | `qa-screenshots/` |
| Test Assets | `backend/test-assets/` |
| Database | `backend/data/fammail.db` |
| Backend .env | `backend/.env` |
| Scripts | `backend/scripts/` |

## 🔗 Important URLs

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8484 |
| Health Check | http://localhost:8484/api/health |
| API Test | http://localhost:8484/api/test |
| Drafts API | http://localhost:8484/api/drafts |
| Auth API | http://localhost:8484/api/auth/me |

## 📊 Screenshot Naming

```
qa-screenshots/
├── A-health/A1-health-check.png
├── B-auth/B1-login-page.png
├── C-drafts/C2-create-draft.png
├── D-postcards/D3-success.png
├── E-scheduling/E2-schedule.png
├── F-errors/F1-network-error.png
├── G-uiux/G3-mobile-375.png
└── H-security/H3-security-headers.png
```

## 🐛 Debug Mode

### Enable verbose logging
```bash
# In backend/.env
LOG_LEVEL=debug
DEBUG=true
```

### Check backend logs
```bash
cd backend
bun run dev 2>&1 | tee backend.log
```

### Check frontend console
```javascript
// In browser console
localStorage.setItem('debug', 'true');
```

---

*Last updated: February 2026*
