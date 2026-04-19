# FamMail Chrome DevTools QA Testing Plan

> **Version:** 1.0.0  
> **Last Updated:** February 2026  
> **Author:** QA Team

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites & Setup](#prerequisites--setup)
3. [Mock Authentication Bypass](#mock-authentication-bypass)
4. [Test Assets Setup](#test-assets-setup)
5. [Test Categories](#test-categories)
   - [A. Health & Connectivity](#a-health--connectivity-tests)
   - [B. Authentication Flow](#b-authentication-flow-tests)
   - [C. Draft CRUD Operations](#c-draft-crud-operations)
   - [D. Postcard Creation](#d-postcard-creation-unauthenticated)
   - [E. Scheduling & Publishing](#e-scheduling--publishing)
   - [F. Error Handling](#f-error-handling)
   - [G. UI/UX Verification](#g-uiux-verification)
   - [H. Security Testing](#h-security-testing)
6. [Screenshot Organization](#screenshot-organization)
7. [Test Execution Automation](#test-execution-automation)
8. [Post-Test Reporting](#post-test-reporting)

---

## Overview

This document provides a comprehensive QA testing plan for FamMail using Chrome DevTools protocol commands with screenshot analysis. The plan covers all critical user flows, edge cases, and security testing.

### Application Details

| Component | URL | Port |
|-----------|-----|------|
| Frontend (Dev) | http://localhost:5173 | 5173 |
| Backend API | http://localhost:8484 | 8484 |
| OIDC Provider | Configurable | - |

### Test Summary

| Category | Tests | Priority | Estimated Time |
|----------|-------|----------|----------------|
| A. Health & Connectivity | 3 | High | 5 min |
| B. Authentication Flow | 6 | Critical | 15 min |
| C. Draft CRUD Operations | 7 | High | 20 min |
| D. Postcard Creation | 5 | High | 15 min |
| E. Scheduling & Publishing | 4 | Medium | 10 min |
| F. Error Handling | 8 | High | 20 min |
| G. UI/UX Verification | 6 | Medium | 15 min |
| H. Security Testing | 5 | Critical | 15 min |
| **Total** | **44** | - | **~115 min** |

---

## Prerequisites & Setup

### Environment Requirements

- **Node.js:** v18+ or Bun v1.0+
- **Chrome/Chromium:** Latest version with DevTools Protocol support
- **ImageMagick:** For generating test assets (optional)

### 1. Start Backend Server

```bash
cd backend
bun install
bun run dev
```

Verify: `curl http://localhost:8484/api/health`

### 2. Start Frontend Dev Server

```bash
cd frontend
bun install
bun run dev
```

Verify: Open http://localhost:5173 in browser

### 3. Pre-Test Checklist

- [ ] Backend running on port 8484
- [ ] Frontend running on port 5173
- [ ] Database initialized (`backend/data/fammail.db` exists)
- [ ] OIDC provider accessible (or mock auth enabled)
- [ ] PostGrid API keys configured in `.env`
- [ ] Test assets created (see [Test Assets Setup](#test-assets-setup))
- [ ] Screenshot directory created

### 4. Create Screenshot Directory

```bash
mkdir -p qa-screenshots/{A-health,B-auth,C-drafts,D-postcards,E-scheduling,F-errors,G-uiux,H-security}
```

---

## Mock Authentication Bypass

For testing protected endpoints without OIDC, use one of these methods:

### Method 1: Environment Variable Bypass

Add to `backend/.env`:

```env
# Enable auth bypass for testing
BYPASS_AUTH=true
TEST_USER_ID=test-user-123
TEST_USER_EMAIL=tester@fammail.local
```

Update `backend/src/middleware/auth.ts`:

```typescript
// Add at the top of the authenticate method
if (process.env.BYPASS_AUTH === 'true') {
  const testUser = {
    id: process.env.TEST_USER_ID || 'test-user-123',
    email: process.env.TEST_USER_EMAIL || 'tester@fammail.local',
    emailVerified: true,
    firstName: 'Test',
    lastName: 'User',
    oidcSub: 'test-sub',
    oidcIssuer: 'test-issuer',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return testUser;
}
```

### Method 2: Generate Test JWT Token

```bash
# Create a test token script
cat > backend/scripts/generate-test-token.ts << 'EOF'
import { JWTService } from '../src/services/jwtService';

const jwtService = new JWTService({
  secret: process.env.JWT_SECRET || 'test-secret-key-min-32-characters-long!',
  expiresIn: '24h',
});

const testUser = {
  id: 'test-user-123',
  email: 'tester@fammail.local',
  emailVerified: true,
  firstName: 'Test',
  lastName: 'User',
};

const token = jwtService.generateToken(testUser);
console.log('Test Token:', token);
console.log('\nUse in Authorization header:');
console.log(`Authorization: Bearer ${token}`);
EOF

# Run the script
cd backend && bun run scripts/generate-test-token.ts
```

### Method 3: Seed Test User in Database

```bash
# Create seed script
cat > backend/scripts/seed-test-user.ts << 'EOF'
import { Database } from '../src/database';

const db = new Database(process.env.DATABASE_PATH || './data/fammail.db');

const testUser = {
  id: 'test-user-123',
  oidcSub: 'test-sub-123',
  oidcIssuer: 'test-issuer',
  email: 'tester@fammail.local',
  emailVerified: true,
  firstName: 'Test',
  lastName: 'User',
};

try {
  db.insertUser({
    ...testUser,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  console.log('Test user created:', testUser.email);
} catch (error: any) {
  if (error.message?.includes('UNIQUE')) {
    console.log('Test user already exists');
  } else {
    throw error;
  }
}

db.close();
EOF

# Run seed script
cd backend && bun run scripts/seed-test-user.ts
```

### Method 4: Browser DevTools Token Injection

Once you have a test token, inject it via Chrome DevTools:

```javascript
// Execute in browser console
localStorage.setItem('auth_token', 'YOUR_TEST_TOKEN_HERE');
// Or
sessionStorage.setItem('auth_token', 'YOUR_TEST_TOKEN_HERE');

// Then reload the page
location.reload();
```

---

## Test Assets Setup

### Automated Setup Script

```bash
#!/bin/bash
# backend/scripts/setup-test-assets.sh

TEST_ASSETS_DIR="test-assets"
mkdir -p $TEST_ASSETS_DIR

echo "Setting up test assets..."

# Check for ImageMagick
if command -v convert &> /dev/null; then
    echo "Using ImageMagick to generate test images..."
    
    # Valid test image - 800x600 JPG (~50KB)
    convert -size 800x600 xc:skyblue \
        -pointsize 48 -fill white -gravity center \
        -annotate 0 "FamMail Test Image" \
        "$TEST_ASSETS_DIR/test-image.jpg"
    echo "Created: test-image.jpg (800x600 JPG)"
    
    # Valid test image - PNG
    convert -size 800x600 xc:lightgreen \
        -pointsize 48 -fill darkgreen -gravity center \
        -annotate 0 "PNG Test Image" \
        "$TEST_ASSETS_DIR/test-image.png"
    echo "Created: test-image.png (800x600 PNG)"
    
    # Valid test image - GIF
    convert -size 800x600 xc:lightyellow \
        -pointsize 48 -fill orange -gravity center \
        -annotate 0 "GIF Test Image" \
        "$TEST_ASSETS_DIR/test-image.gif"
    echo "Created: test-image.gif (800x600 GIF)"
    
    # Small test image - 200x150
    convert -size 200x150 xc:pink \
        -pointsize 16 -fill white -gravity center \
        -annotate 0 "Small" \
        "$TEST_ASSETS_DIR/test-image-small.jpg"
    echo "Created: test-image-small.jpg (200x150 JPG)"
    
    # Large image - > 10MB for limit testing
    # Create a 5000x5000 image with lots of color variation
    convert -size 5000x5000 plasma:fractal \
        -quality 100 \
        "$TEST_ASSETS_DIR/large-image.jpg"
    echo "Created: large-image.jpg (>10MB for size limit testing)"
    
else
    echo "ImageMagick not found. Downloading sample images..."
    
    # Download sample images from placeholder services
    curl -L "https://picsum.photos/800/600" -o "$TEST_ASSETS_DIR/test-image.jpg"
    curl -L "https://picsum.photos/800/600" -o "$TEST_ASSETS_DIR/test-image.png"
    curl -L "https://picsum.photos/200/150" -o "$TEST_ASSETS_DIR/test-image-small.jpg"
    
    echo "Note: For large-image.jpg (>10MB), please create manually or install ImageMagick"
    echo "You can also download a large image from: https://testfile.org/image-files/"
fi

# Invalid file type (text file)
echo "This is not an image file. It is plain text for testing invalid file type validation." > "$TEST_ASSETS_DIR/invalid.txt"
echo "Created: invalid.txt (for type validation testing)"

# Invalid file with image extension (fake image)
echo -e "\x89PNG\r\n\x1a\nFAKE_IMAGE_DATA" > "$TEST_ASSETS_DIR/fake-image.png"
echo "Created: fake-image.png (corrupted/fake PNG for validation testing)"

# SVG file (may or may not be supported)
cat > "$TEST_ASSETS_DIR/test-image.svg" << 'SVGEOF'
<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#87CEEB"/>
  <text x="50%" y="50%" font-size="48" fill="white" text-anchor="middle" dominant-baseline="middle">
    SVG Test Image
  </text>
</svg>
SVGEOF
echo "Created: test-image.svg (for SVG support testing)"

# HEIC file placeholder (iOS format - usually not supported)
echo "HEIC files are not supported by most browsers. Create manually if needed." > "$TEST_ASSETS_DIR/test-image.heic.txt"

# List created files
echo ""
echo "=== Test Assets Created ==="
ls -lh $TEST_ASSETS_DIR/
echo ""
echo "Test assets directory: $(pwd)/$TEST_ASSETS_DIR"
```

### Run Setup Script

```bash
cd backend
chmod +x scripts/setup-test-assets.sh
./scripts/setup-test-assets.sh
```

### Manual Test Asset Creation

If you prefer to use your own images:

| File | Purpose | Requirements |
|------|---------|--------------|
| `test-image.jpg` | Valid upload | JPG, 800x600, <1MB |
| `test-image.png` | PNG support | PNG, any size |
| `test-image.gif` | GIF support | GIF, any size |
| `large-image.jpg` | Size limit test | >10MB |
| `invalid.txt` | Type validation | Any text file |

---

## Test Categories

---

## A. Health & Connectivity Tests

### Test A1: Backend Health Check

**Purpose:** Verify backend server is running and responding

**Priority:** High  
**Type:** Smoke Test

**Steps:**

```
1. Navigate to health endpoint
   Command: chrome-devtools_navigate_page
   Parameters: { type: "url", url: "http://localhost:8484/api/health" }

2. Take screenshot
   Command: chrome-devtools_take_screenshot
   Parameters: { filePath: "qa-screenshots/A-health/A1-health-check.png" }

3. Check network requests
   Command: chrome-devtools_list_network_requests
   Parameters: { resourceTypes: ["document"] }

4. Get response details
   Command: chrome-devtools_get_network_request
   Parameters: { reqid: <first_request_id> }
```

**Expected Results:**
- [ ] HTTP 200 response
- [ ] Response body is valid JSON
- [ ] Contains `status: "ok"` or similar
- [ ] Contains `timestamp` field
- [ ] Contains `services` object with database/postgrid status

**Sample Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-02-12T10:30:00.000Z",
  "services": {
    "database": "connected",
    "postgrid": "configured"
  }
}
```

---

### Test A2: Frontend Application Load

**Purpose:** Verify frontend application loads without errors

**Priority:** High  
**Type:** Smoke Test

**Steps:**

```
1. Navigate to frontend
   Command: chrome-devtools_navigate_page
   Parameters: { type: "url", url: "http://localhost:5173" }

2. Wait for page content
   Command: chrome-devtools_wait_for
   Parameters: { text: "FamMail", timeout: 10000 }

3. Take page snapshot
   Command: chrome-devtools_take_snapshot
   Parameters: { filePath: "qa-screenshots/A-health/A2-frontend-snapshot.txt" }

4. Take screenshot
   Command: chrome-devtools_take_screenshot
   Parameters: { filePath: "qa-screenshots/A-health/A2-frontend-load.png", fullPage: true }

5. Check console for errors
   Command: chrome-devtools_list_console_messages
   Parameters: { types: ["error", "warn"] }

6. Check network requests
   Command: chrome-devtools_list_network_requests
   Parameters: { resourceTypes: ["document", "script", "stylesheet", "xhr", "fetch"] }
```

**Expected Results:**
- [ ] Page title contains "FamMail"
- [ ] Header/navigation visible
- [ ] StatusCard component shows backend connection status
- [ ] No JavaScript errors in console
- [ ] All static assets load (no 404s)
- [ ] API call to `/api/health` or `/api/test` successful

**Elements to Verify (from snapshot):**
- Header with logo
- Navigation links (if any)
- Status indicator showing "Connected"
- Main content area with postcard builder or login prompt

---

### Test A3: API Test Endpoint

**Purpose:** Verify simple API connectivity

**Priority:** High  
**Type:** Smoke Test

**Steps:**

```
1. Navigate to test endpoint
   Command: chrome-devtools_navigate_page
   Parameters: { type: "url", url: "http://localhost:8484/api/test" }

2. Take screenshot
   Command: chrome-devtools_take_screenshot
   Parameters: { filePath: "qa-screenshots/A-health/A3-api-test.png" }
```

**Expected Results:**
- [ ] HTTP 200 response
- [ ] Response: `{ "message": "Test successful", "timestamp": "..." }`

---

## B. Authentication Flow Tests

### Test B1: Login Page/Component Display

**Purpose:** Verify login UI renders correctly before authentication

**Priority:** Critical  
**Type:** Functional

**Steps:**

```
1. Clear any existing auth tokens
   Command: chrome-devtools_evaluate_script
   Parameters: { 
     function: "() => { localStorage.clear(); sessionStorage.clear(); return 'cleared'; }" 
   }

2. Navigate to frontend (fresh load)
   Command: chrome-devtools_navigate_page
   Parameters: { type: "url", url: "http://localhost:5173" }

3. Wait for page load
   Command: chrome-devtools_wait_for
   Parameters: { text: "Login", timeout: 10000 }

4. Take snapshot to find element UIDs
   Command: chrome-devtools_take_snapshot
   Parameters: { filePath: "qa-screenshots/B-auth/B1-login-snapshot.txt" }

5. Take screenshot
   Command: chrome-devtools_take_screenshot
   Parameters: { filePath: "qa-screenshots/B-auth/B1-login-page.png", fullPage: true }
```

**Expected Results:**
- [ ] Login button/link visible
- [ ] No user data displayed (not authenticated)
- [ ] App branding visible
- [ ] Clear call-to-action to sign in

---

### Test B2: OIDC Login Initiation

**Purpose:** Verify OIDC login flow starts correctly

**Priority:** Critical  
**Type:** Functional

**Steps:**

```
1. From login page, click login button
   Command: chrome-devtools_click
   Parameters: { uid: "<login-button-uid-from-snapshot>" }

2. Wait for network activity
   Command: chrome-devtools_list_network_requests
   Parameters: { resourceTypes: ["xhr", "fetch"] }

3. Get the login request details
   Command: chrome-devtools_get_network_request
   Parameters: { reqid: <login-request-id> }

4. Take screenshot of redirect/loading state
   Command: chrome-devtools_take_screenshot
   Parameters: { filePath: "qa-screenshots/B-auth/B2-oidc-init.png" }

5. If redirected, take screenshot of OIDC provider page
   Command: chrome-devtools_take_screenshot
   Parameters: { filePath: "qa-screenshots/B-auth/B2-oidc-provider.png" }
```

**Expected Results:**
- [ ] POST request to `/api/auth/login`
- [ ] Response contains `authUrl` with OIDC provider URL
- [ ] `state` parameter generated (PKCE)
- [ ] `code_challenge` parameter present (PKCE)
- [ ] Redirect to OIDC provider occurs

**Network Verification:**
```json
// Expected POST /api/auth/login response
{
  "authUrl": "https://auth.example.com/authorize?client_id=...&redirect_uri=...&state=...&code_challenge=..."
}
```

---

### Test B3: OIDC Callback Handling (Mock)

**Purpose:** Verify callback processes tokens correctly

**Priority:** Critical  
**Type:** Functional

**Using Mock Auth Bypass:**

```
1. Generate test token (see Mock Authentication Bypass section)
   
2. Inject token into browser
   Command: chrome-devtools_evaluate_script
   Parameters: { 
     function: "(token) => { localStorage.setItem('auth_token', token); return 'token set'; }",
     args: [{ value: "<your-test-token>" }]
   }

3. Navigate to app
   Command: chrome-devtools_navigate_page
   Parameters: { type: "url", url: "http://localhost:5173" }

4. Wait for authenticated state
   Command: chrome-devtools_wait_for
   Parameters: { text: "Test User", timeout: 10000 }

5. Take screenshot
   Command: chrome-devtools_take_screenshot
   Parameters: { filePath: "qa-screenshots/B-auth/B3-callback-success.png" }

6. Check network for /api/auth/me call
   Command: chrome-devtools_list_network_requests
   Parameters: { resourceTypes: ["xhr", "fetch"] }
```

**Expected Results:**
- [ ] Token stored in localStorage/sessionStorage
- [ ] GET request to `/api/auth/me` with Bearer token
- [ ] User info displayed in UI
- [ ] Authenticated features accessible (drafts, etc.)

---

### Test B4: Get Current User (Authenticated)

**Purpose:** Verify authenticated user data retrieval

**Priority:** Critical  
**Type:** Functional

**Steps:**

```
1. Ensure authenticated state (use mock auth or complete OIDC)

2. Navigate to app
   Command: chrome-devtools_navigate_page
   Parameters: { type: "url", url: "http://localhost:5173" }

3. Check network requests
   Command: chrome-devtools_list_network_requests
   Parameters: { resourceTypes: ["xhr", "fetch"] }

4. Find and get /api/auth/me request
   Command: chrome-devtools_get_network_request
   Parameters: { reqid: <auth-me-request-id> }

5. Take screenshot showing user info
   Command: chrome-devtools_take_screenshot
   Parameters: { filePath: "qa-screenshots/B-auth/B4-user-info.png" }
```

**Expected Results:**
- [ ] GET `/api/auth/me` returns 200
- [ ] Authorization header: `Bearer <token>`
- [ ] Response contains user object with required fields

**Expected Response:**
```json
{
  "user": {
    "id": "test-user-123",
    "email": "tester@fammail.local",
    "emailVerified": true,
    "firstName": "Test",
    "lastName": "User",
    "avatarUrl": null,
    "createdAt": "2026-02-12T10:00:00.000Z",
    "updatedAt": "2026-02-12T10:00:00.000Z"
  }
}
```

---

### Test B5: Logout

**Purpose:** Verify logout clears session correctly

**Priority:** Critical  
**Type:** Functional

**Steps:**

```
1. Ensure authenticated state

2. Take snapshot to find logout button
   Command: chrome-devtools_take_snapshot
   Parameters: {}

3. Click logout button
   Command: chrome-devtools_click
   Parameters: { uid: "<logout-button-uid>" }

4. Check network requests
   Command: chrome-devtools_list_network_requests
   Parameters: { resourceTypes: ["xhr"] }

5. Wait for unauthenticated state
   Command: chrome-devtools_wait_for
   Parameters: { text: "Login", timeout: 5000 }

6. Take screenshot
   Command: chrome-devtools_take_screenshot
   Parameters: { filePath: "qa-screenshots/B-auth/B5-logout.png" }

7. Verify token removed
   Command: chrome-devtools_evaluate_script
   Parameters: { 
     function: "() => { return localStorage.getItem('auth_token'); }" 
   }
```

**Expected Results:**
- [ ] POST `/api/auth/logout` returns 200
- [ ] Token removed from storage
- [ ] Session invalidated server-side
- [ ] User shown login prompt
- [ ] Protected routes no longer accessible

---

### Test B6: Unauthorized Access Blocked

**Purpose:** Verify protected endpoints reject unauthenticated requests

**Priority:** Critical  
**Type:** Security

**Steps:**

```
1. Clear auth tokens
   Command: chrome-devtools_evaluate_script
   Parameters: { 
     function: "() => { localStorage.clear(); sessionStorage.clear(); return 'cleared'; }" 
   }

2. Try to access protected endpoint directly
   Command: chrome-devtools_navigate_page
   Parameters: { type: "url", url: "http://localhost:8484/api/drafts" }

3. Take screenshot
   Command: chrome-devtools_take_screenshot
   Parameters: { filePath: "qa-screenshots/B-auth/B6-unauthorized.png" }

4. Check response
   Command: chrome-devtools_list_network_requests
   Parameters: { resourceTypes: ["document"] }
```

**Expected Results:**
- [ ] HTTP 401 Unauthorized response
- [ ] Error message: "Unauthorized" or "Missing authentication token"
- [ ] No draft data returned

---

## C. Draft CRUD Operations

### Test C1: List Empty Drafts

**Purpose:** Verify drafts list loads correctly when empty

**Priority:** High  
**Type:** Functional

**Prerequisites:** Authenticated user with no drafts

**Steps:**

```
1. Ensure authenticated state

2. Navigate to drafts section
   Command: chrome-devtools_navigate_page
   Parameters: { type: "url", url: "http://localhost:5173" }

3. Click drafts nav/link
   Command: chrome-devtools_click
   Parameters: { uid: "<drafts-nav-uid>" }

4. Wait for drafts list
   Command: chrome-devtools_wait_for
   Parameters: { text: "Drafts", timeout: 5000 }

5. Check network
   Command: chrome-devtools_list_network_requests
   Parameters: { resourceTypes: ["xhr"] }

6. Take screenshot
   Command: chrome-devtools_take_screenshot
   Parameters: { filePath: "qa-screenshots/C-drafts/C1-empty-drafts.png" }
```

**Expected Results:**
- [ ] GET `/api/drafts` returns 200
- [ ] Response: `{ drafts: [] }`
- [ ] Empty state message displayed
- [ ] "Create Draft" button visible

---

### Test C2: Create Draft

**Purpose:** Verify draft creation with valid data

**Priority:** High  
**Type:** Functional

**Steps:**

```
1. Click create draft button
   Command: chrome-devtools_click
   Parameters: { uid: "<create-draft-uid>" }

2. Take snapshot to get form element UIDs
   Command: chrome-devtools_take_snapshot
   Parameters: { filePath: "qa-screenshots/C-drafts/C2-form-snapshot.txt" }

3. Fill recipient address form
   Command: chrome-devtools_fill_form
   Parameters: {
     elements: [
       { uid: "<firstName-uid>", value: "John" },
       { uid: "<lastName-uid>", value: "Doe" },
       { uid: "<addressLine1-uid>", value: "123 Main Street" },
       { uid: "<addressLine2-uid>", value: "Apt 4B" },
       { uid: "<city-uid>", value: "San Francisco" },
       { uid: "<provinceOrState-uid>", value: "CA" },
       { uid: "<postalOrZip-uid>", value: "94102" },
       { uid: "<countryCode-uid>", value: "US" }
     ]
   }

4. Fill message
   Command: chrome-devtools_fill
   Parameters: { uid: "<message-uid>", value: "Hello from FamMail! This is a test message." }

5. Upload test image
   Command: chrome-devtools_upload_file
   Parameters: { 
     uid: "<image-upload-uid>", 
     filePath: "test-assets/test-image.jpg" 
   }

6. Wait for image preview
   Command: chrome-devtools_wait_for
   Parameters: { text: "Preview", timeout: 5000 }

7. Save draft
   Command: chrome-devtools_click
   Parameters: { uid: "<save-draft-uid>" }

8. Check network
   Command: chrome-devtools_list_network_requests
   Parameters: { resourceTypes: ["xhr"] }

9. Take screenshot
   Command: chrome-devtools_take_screenshot
   Parameters: { filePath: "qa-screenshots/C-drafts/C2-create-draft.png" }
```

**Expected Results:**
- [ ] POST `/api/drafts` returns 201
- [ ] Request body contains all filled fields
- [ ] Response contains created draft with `id`
- [ ] `state: "draft"` in response
- [ ] Draft appears in list

**Expected Request Body:**
```json
{
  "id": "uuid-here",
  "recipientAddress": {
    "firstName": "John",
    "lastName": "Doe",
    "addressLine1": "123 Main Street",
    "addressLine2": "Apt 4B",
    "city": "San Francisco",
    "provinceOrState": "CA",
    "postalOrZip": "94102",
    "countryCode": "US"
  },
  "message": "Hello from FamMail! This is a test message.",
  "imageData": "base64-encoded-image...",
  "state": "draft"
}
```

---

### Test C3: View Draft

**Purpose:** Verify single draft retrieval and display

**Priority:** High  
**Type:** Functional

**Prerequisites:** At least one draft exists

**Steps:**

```
1. Navigate to drafts list

2. Click on existing draft
   Command: chrome-devtools_click
   Parameters: { uid: "<draft-item-uid>" }

3. Wait for draft detail view
   Command: chrome-devtools_wait_for
   Parameters: { text: "John Doe", timeout: 5000 }

4. Check network
   Command: chrome-devtools_list_network_requests
   Parameters: { resourceTypes: ["xhr"] }

5. Get request details
   Command: chrome-devtools_get_network_request
   Parameters: { reqid: <get-draft-request-id> }

6. Take screenshot
   Command: chrome-devtools_take_screenshot
   Parameters: { filePath: "qa-screenshots/C-drafts/C3-view-draft.png" }
```

**Expected Results:**
- [ ] GET `/api/drafts/:id` returns 200
- [ ] All draft fields displayed correctly
- [ ] Image preview shown
- [ ] Message text rendered
- [ ] Address formatted properly

---

### Test C4: Update Draft

**Purpose:** Verify draft modification

**Priority:** High  
**Type:** Functional

**Steps:**

```
1. Open existing draft

2. Click edit button
   Command: chrome-devtools_click
   Parameters: { uid: "<edit-draft-uid>" }

3. Modify message
   Command: chrome-devtools_fill
   Parameters: { uid: "<message-uid>", value: "Updated: Hello from FamMail! Modified message." }

4. Save changes
   Command: chrome-devtools_click
   Parameters: { uid: "<save-draft-uid>" }

5. Check network
   Command: chrome-devtools_list_network_requests
   Parameters: { resourceTypes: ["xhr"] }

6. Take screenshot
   Command: chrome-devtools_take_screenshot
   Parameters: { filePath: "qa-screenshots/C-drafts/C4-update-draft.png" }

7. Verify change persisted
   Command: chrome-devtools_wait_for
   Parameters: { text: "Modified message", timeout: 5000 }
```

**Expected Results:**
- [ ] PUT `/api/drafts/:id` returns 200
- [ ] Response shows updated data
- [ ] `updatedAt` timestamp changed
- [ ] UI reflects changes immediately

---

### Test C5: Delete Draft

**Purpose:** Verify draft deletion

**Priority:** High  
**Type:** Functional

**Steps:**

```
1. Open existing draft

2. Click delete button
   Command: chrome-devtools_click
   Parameters: { uid: "<delete-draft-uid>" }

3. Handle confirmation dialog (if present)
   Command: chrome-devtools_handle_dialog
   Parameters: { action: "accept" }

4. Check network
   Command: chrome-devtools_list_network_requests
   Parameters: { resourceTypes: ["xhr"] }

5. Take screenshot
   Command: chrome-devtools_take_screenshot
   Parameters: { filePath: "qa-screenshots/C-drafts/C5-delete-draft.png" }

6. Verify draft removed from list
   Command: chrome-devtools_wait_for
   Parameters: { text: "Draft deleted", timeout: 5000 }
```

**Expected Results:**
- [ ] DELETE `/api/drafts/:id` returns 200 or 204
- [ ] Draft removed from database
- [ ] Draft no longer appears in list
- [ ] Success message displayed

---

### Test C6: Filter Drafts by State

**Purpose:** Verify draft filtering functionality

**Priority:** High  
**Type:** Functional

**Prerequisites:** Drafts with different states exist

**Steps:**

```
1. Navigate to drafts list

2. Select state filter
   Command: chrome-devtools_fill
   Parameters: { uid: "<state-filter-uid>", value: "draft" }

3. Check network
   Command: chrome-devtools_list_network_requests
   Parameters: { resourceTypes: ["xhr"] }

4. Take screenshot
   Command: chrome-devtools_take_screenshot
   Parameters: { filePath: "qa-screenshots/C-drafts/C6-filter-draft.png" }

5. Change filter to "ready"
   Command: chrome-devtools_fill
   Parameters: { uid: "<state-filter-uid>", value: "ready" }

6. Take screenshot
   Command: chrome-devtools_take_screenshot
   Parameters: { filePath: "qa-screenshots/C-drafts/C6-filter-ready.png" }
```

**Expected Results:**
- [ ] GET `/api/drafts?state=draft` returns only drafts
- [ ] GET `/api/drafts?state=ready` returns only ready items
- [ ] List updates immediately
- [ ] Correct count displayed

---

### Test C7: Draft Pagination (If Implemented)

**Purpose:** Verify pagination works correctly

**Priority:** Medium  
**Type:** Functional

**Prerequisites:** More drafts than page size

**Steps:**

```
1. Navigate to drafts list with many items

2. Take screenshot of first page
   Command: chrome-devtools_take_screenshot
   Parameters: { filePath: "qa-screenshots/C-drafts/C7-page-1.png" }

3. Click next page
   Command: chrome-devtools_click
   Parameters: { uid: "<next-page-uid>" }

4. Check network for pagination params
   Command: chrome-devtools_list_network_requests
   Parameters: { resourceTypes: ["xhr"] }

5. Take screenshot
   Command: chrome-devtools_take_screenshot
   Parameters: { filePath: "qa-screenshots/C-drafts/C7-page-2.png" }
```

**Expected Results:**
- [ ] GET `/api/drafts?page=2` or similar
- [ ] Different drafts on page 2
- [ ] Pagination controls update

---

## D. Postcard Creation (Unauthenticated)

### Test D1: Address Form Validation

**Purpose:** Verify client-side validation of required fields

**Priority:** High  
**Type:** Functional

**Steps:**

```
1. Navigate to main page (not authenticated)
   Command: chrome-devtools_navigate_page
   Parameters: { type: "url", url: "http://localhost:5173" }

2. Click send postcard without filling form
   Command: chrome-devtools_click
   Parameters: { uid: "<send-postcard-uid>" }

3. Take screenshot of validation errors
   Command: chrome-devtools_take_screenshot
   Parameters: { filePath: "qa-screenshots/D-postcards/D1-validation-errors.png" }

4. Check for error messages
   Command: chrome-devtools_take_snapshot
   Parameters: {}
```

**Expected Results:**
- [ ] Form not submitted
- [ ] Error messages for required fields visible
- [ ] Fields highlighted (red border, etc.)
- [ ] No network request made

**Required Fields to Verify:**
- First Name
- Last Name
- Address Line 1
- City
- State/Province
- Postal/Zip Code
- Country Code

---

### Test D2: Image Upload Validation

**Purpose:** Verify image type and size constraints

**Priority:** High  
**Type:** Functional

**Steps:**

```
1. Test invalid file type
   Command: chrome-devtools_upload_file
   Parameters: { 
     uid: "<image-upload-uid>", 
     filePath: "test-assets/invalid.txt" 
   }

2. Take screenshot of error
   Command: chrome-devtools_take_screenshot
   Parameters: { filePath: "qa-screenshots/D-postcards/D2-invalid-type.png" }

3. Test oversized image
   Command: chrome-devtools_upload_file
   Parameters: { 
     uid: "<image-upload-uid>", 
     filePath: "test-assets/large-image.jpg" 
   }

4. Take screenshot of size error
   Command: chrome-devtools_take_screenshot
   Parameters: { filePath: "qa-screenshots/D-postcards/D2-oversized.png" }
```

**Expected Results:**
- Invalid type:
  - [ ] Error message: "Invalid file type. Please upload JPG, PNG, or GIF."
  - [ ] File not uploaded
  
- Oversized:
  - [ ] Error message: "File too large. Maximum size is 10MB."
  - [ ] File not uploaded

---

### Test D3: Complete Postcard Creation

**Purpose:** Verify full postcard creation flow

**Priority:** High  
**Type:** Functional

**Steps:**

```
1. Fill all address fields
   Command: chrome-devtools_fill_form
   Parameters: {
     elements: [
       { uid: "<firstName-uid>", value: "Jane" },
       { uid: "<lastName-uid>", value: "Smith" },
       { uid: "<addressLine1-uid>", value: "456 Oak Avenue" },
       { uid: "<city-uid>", value: "Los Angeles" },
       { uid: "<provinceOrState-uid>", value: "CA" },
       { uid: "<postalOrZip-uid>", value: "90001" },
       { uid: "<countryCode-uid>", value: "US" }
     ]
   }

2. Fill message
   Command: chrome-devtools_fill
   Parameters: { uid: "<message-uid>", value: "Wish you were here! Having a great time in sunny California." }

3. Upload image
   Command: chrome-devtools_upload_file
   Parameters: { 
     uid: "<image-upload-uid>", 
     filePath: "test-assets/test-image.jpg" 
   }

4. Wait for preview to render
   Command: chrome-devtools_wait_for
   Parameters: { text: "Preview", timeout: 5000 }

5. Take screenshot of preview
   Command: chrome-devtools_take_screenshot
   Parameters: { filePath: "qa-screenshots/D-postcards/D3-preview.png" }

6. Click send postcard
   Command: chrome-devtools_click
   Parameters: { uid: "<send-postcard-uid>" }

7. Check network
   Command: chrome-devtools_list_network_requests
   Parameters: { resourceTypes: ["xhr"] }

8. Wait for success
   Command: chrome-devtools_wait_for
   Parameters: { text: "success", timeout: 15000 }

9. Take screenshot of success state
   Command: chrome-devtools_take_screenshot
   Parameters: { filePath: "qa-screenshots/D-postcards/D3-success.png" }
```

**Expected Results:**
- [ ] POST `/api/postcards` returns 200
- [ ] Request contains all required fields
- [ ] Response includes PostGrid data
- [ ] Success message displayed
- [ ] PostGrid ID shown
- [ ] Expected delivery date shown

**Expected Response:**
```json
{
  "success": true,
  "postcard": {
    "id": "postcard_xxx",
    "status": "submitted",
    "expectedDeliveryDate": "2026-02-19",
    "trackingNumber": null
  }
}
```

---

### Test D4: Postcard Preview Rendering

**Purpose:** Verify preview component displays correctly

**Priority:** Medium  
**Type:** Visual

**Steps:**

```
1. Fill form and upload image (as in D3)

2. Take screenshot of front preview
   Command: chrome-devtools_take_screenshot
   Parameters: { 
     uid: "<postcard-preview-uid>",
     filePath: "qa-screenshots/D-postcards/D4-preview-front.png" 
   }

3. If interactive, flip to back
   Command: chrome-devtools_click
   Parameters: { uid: "<flip-postcard-uid>" }

4. Take screenshot of back preview
   Command: chrome-devtools_take_screenshot
   Parameters: { 
     uid: "<postcard-preview-uid>",
     filePath: "qa-screenshots/D-postcards/D4-preview-back.png" 
   }
```

**Expected Results:**
- [ ] Front shows uploaded image
- [ ] Back shows message text
- [ ] Address formatted correctly
- [ ] Preview matches postcard size proportions
- [ ] No visual artifacts

---

### Test D5: Postcard Response Display

**Purpose:** Verify success response is properly displayed

**Priority:** High  
**Type:** Functional

**Steps:**

```
1. Complete postcard creation (as in D3)

2. Take screenshot of success view
   Command: chrome-devtools_take_screenshot
   Parameters: { filePath: "qa-screenshots/D-postcards/D5-success-full.png" }

3. Verify all elements present
   Command: chrome-devtools_take_snapshot
   Parameters: {}
```

**Expected Results:**
- [ ] Success message/icon visible
- [ ] PostGrid ID displayed
- [ ] Status shown (processing/submitted)
- [ ] Expected delivery date visible
- [ ] Option to create another postcard

---

## E. Scheduling & Publishing

### Test E1: Publish Draft Immediately

**Purpose:** Verify immediate publishing workflow

**Priority:** Medium  
**Type:** Functional

**Steps:**

```
1. Create and save a draft

2. Open the draft

3. Click publish button
   Command: chrome-devtools_click
   Parameters: { uid: "<publish-draft-uid>" }

4. Check network
   Command: chrome-devtools_list_network_requests
   Parameters: { resourceTypes: ["xhr"] }

5. Take screenshot
   Command: chrome-devtools_take_screenshot
   Parameters: { filePath: "qa-screenshots/E-scheduling/E1-publish.png" }
```

**Expected Results:**
- [ ] POST `/api/drafts/:id/publish` returns 200
- [ ] Draft state changes to "ready"
- [ ] Success message displayed
- [ ] Draft moves to "Ready" list

---

### Test E2: Schedule Draft for Future

**Purpose:** Verify scheduling functionality

**Priority:** Medium  
**Type:** Functional

**Steps:**

```
1. Open existing draft

2. Click schedule button
   Command: chrome-devtools_click
   Parameters: { uid: "<schedule-draft-uid>" }

3. Set future date (tomorrow)
   Command: chrome-devtools_fill
   Parameters: { 
     uid: "<scheduledFor-uid>", 
     value: new Date(Date.now() + 86400000).toISOString().split('T')[0]
   }

4. Confirm schedule
   Command: chrome-devtools_click
   Parameters: { uid: "<confirm-schedule-uid>" }

5. Check network
   Command: chrome-devtools_list_network_requests
   Parameters: { resourceTypes: ["xhr"] }

6. Take screenshot
   Command: chrome-devtools_take_screenshot
   Parameters: { filePath: "qa-screenshots/E-scheduling/E2-schedule.png" }
```

**Expected Results:**
- [ ] POST `/api/drafts/:id/schedule` returns 200
- [ ] `scheduledFor` date in response
- [ ] Draft shows scheduled indicator
- [ ] Scheduled date displayed

---

### Test E3: Cancel Scheduled Draft

**Purpose:** Verify schedule cancellation

**Priority:** Medium  
**Type:** Functional

**Steps:**

```
1. Open scheduled draft

2. Click cancel schedule
   Command: chrome-devtools_click
   Parameters: { uid: "<cancel-schedule-uid>" }

3. Confirm cancellation
   Command: chrome-devtools_handle_dialog
   Parameters: { action: "accept" }

4. Check network
   Command: chrome-devtools_list_network_requests
   Parameters: { resourceTypes: ["xhr"] }

5. Take screenshot
   Command: chrome-devtools_take_screenshot
   Parameters: { filePath: "qa-screenshots/E-scheduling/E3-cancel.png" }
```

**Expected Results:**
- [ ] POST `/api/drafts/:id/cancel-schedule` returns 200
- [ ] `scheduledFor` cleared
- [ ] State returns to "draft"
- [ ] Scheduled indicator removed

---

### Test E4: Invalid Schedule Date (Past)

**Purpose:** Verify past date rejection

**Priority:** Medium  
**Type:** Functional

**Steps:**

```
1. Open draft and click schedule

2. Enter past date
   Command: chrome-devtools_fill
   Parameters: { 
     uid: "<scheduledFor-uid>", 
     value: "2020-01-01"
   }

3. Try to confirm
   Command: chrome-devtools_click
   Parameters: { uid: "<confirm-schedule-uid>" }

4. Take screenshot
   Command: chrome-devtools_take_screenshot
   Parameters: { filePath: "qa-screenshots/E-scheduling/E4-invalid-date.png" }

5. Check for error
   Command: chrome-devtools_list_console_messages
   Parameters: { types: ["error"] }
```

**Expected Results:**
- [ ] Error message: "Cannot schedule for a past date"
- [ ] Request not sent (client validation)
- [ ] OR HTTP 400 with error message

---

## F. Error Handling

### Test F1: Network Error Handling

**Purpose:** Verify graceful degradation on network failure

**Priority:** High  
**Type:** Error Handling

**Steps:**

```
1. Fill postcard form

2. Enable offline mode
   Command: chrome-devtools_emulate
   Parameters: { networkConditions: "Offline" }

3. Try to send postcard
   Command: chrome-devtools_click
   Parameters: { uid: "<send-postcard-uid>" }

4. Wait for error state
   Command: chrome-devtools_wait_for
   Parameters: { text: "error", timeout: 5000 }

5. Take screenshot
   Command: chrome-devtools_take_screenshot
   Parameters: { filePath: "qa-screenshots/F-errors/F1-network-error.png" }

6. Restore network
   Command: chrome-devtools_emulate
   Parameters: { networkConditions: "No emulation" }

7. Verify retry option available
   Command: chrome-devtools_take_snapshot
   Parameters: {}
```

**Expected Results:**
- [ ] User-friendly error message
- [ ] No application crash
- [ ] No blank/white screen
- [ ] Retry button available
- [ ] Data preserved for retry

---

### Test F2: XSS Input Sanitization

**Purpose:** Verify XSS protection in message field

**Priority:** Critical  
**Type:** Security

**Steps:**

```
1. Fill address fields

2. Enter XSS payload in message
   Command: chrome-devtools_fill
   Parameters: { 
     uid: "<message-uid>", 
     value: "<script>alert('xss')</script>Hello <img src=x onerror=alert('xss')>" 
   }

3. Save draft or send postcard

4. Take screenshot
   Command: chrome-devtools_take_screenshot
   Parameters: { filePath: "qa-screenshots/F-errors/F2-xss-test.png" }

5. Check console for alerts
   Command: chrome-devtools_list_console_messages
   Parameters: { types: ["error"] }

6. View the saved/rendered message
   Command: chrome-devtools_wait_for
   Parameters: { text: "Hello", timeout: 5000 }
```

**Expected Results:**
- [ ] No JavaScript executed
- [ ] No alert popup
- [ ] Script tags removed or escaped
- [ ] Plain text "Hello" visible
- [ ] `onerror` handlers neutralized

---

### Test F3: Missing Required Fields

**Purpose:** Verify required field validation

**Priority:** High  
**Type:** Validation

**Steps:**

```
1. Clear all form fields

2. Click send postcard
   Command: chrome-devtools_click
   Parameters: { uid: "<send-postcard-uid>" }

3. Take screenshot
   Command: chrome-devtools_take_screenshot
   Parameters: { filePath: "qa-screenshots/F-errors/F3-required-fields.png" }

4. Count validation errors
   Command: chrome-devtools_evaluate_script
   Parameters: { 
     function: "() => { return document.querySelectorAll('.error-message').length; }" 
   }
```

**Expected Results:**
- [ ] Validation error for each missing required field
- [ ] Form not submitted
- [ ] Focus moved to first error field
- [ ] Clear error messages

---

### Test F4: PostGrid API Failure

**Purpose:** Verify handling of PostGrid service errors

**Priority:** High  
**Type:** Error Handling

**Steps:**

```
1. Fill form with valid data

2. (Optionally) Configure invalid PostGrid API key for testing

3. Send postcard
   Command: chrome-devtools_click
   Parameters: { uid: "<send-postcard-uid>" }

4. Check network response
   Command: chrome-devtools_list_network_requests
   Parameters: { resourceTypes: ["xhr"] }

5. Take screenshot
   Command: chrome-devtools_take_screenshot
   Parameters: { filePath: "qa-screenshots/F-errors/F4-postgrid-error.png" }
```

**Expected Results:**
- [ ] Error message displayed
- [ ] No application crash
- [ ] User can retry
- [ ] Error logged server-side

---

### Test F5: Expired JWT Token

**Purpose:** Verify token expiration handling

**Priority:** Critical  
**Type:** Authentication

**Steps:**

```
1. Set an expired token
   Command: chrome-devtools_evaluate_script
   Parameters: { 
     function: "() => { localStorage.setItem('auth_token', 'expired.token.here'); return 'set'; }" 
   }

2. Try to access protected resource
   Command: chrome-devtools_navigate_page
   Parameters: { type: "url", url: "http://localhost:5173" }

3. Wait for redirect or error
   Command: chrome-devtools_wait_for
   Parameters: { text: "Login", timeout: 5000 }

4. Check network
   Command: chrome-devtools_list_network_requests
   Parameters: { resourceTypes: ["xhr"] }

5. Take screenshot
   Command: chrome-devtools_take_screenshot
   Parameters: { filePath: "qa-screenshots/F-errors/F5-expired-token.png" }
```

**Expected Results:**
- [ ] HTTP 401 response
- [ ] User redirected to login
- [ ] Clear message about session expiration
- [ ] Token cleared from storage

---

### Test F6: Concurrent Edit Conflict

**Purpose:** Verify handling of simultaneous edits

**Priority:** Medium  
**Type:** Concurrency

**Steps:**

```
1. Open same draft in two browser tabs
   Command: chrome-devtools_new_page
   Parameters: { url: "http://localhost:5173/drafts/<draft-id>" }

2. In tab 1: Edit and save
   (Edit and save operations)

3. In tab 2: Edit and save
   (Edit and save operations)

4. Check for conflict message
   Command: chrome-devtools_take_screenshot
   Parameters: { filePath: "qa-screenshots/F-errors/F6-concurrent-edit.png" }
```

**Expected Results:**
- [ ] Last write wins OR conflict warning shown
- [ ] No data corruption
- [ ] User notified of conflict

---

### Test F7: Large File Upload

**Purpose:** Verify file size limit enforcement

**Priority:** High  
**Type:** Validation

**Steps:**

```
1. Navigate to postcard creator

2. Upload oversized file
   Command: chrome-devtools_upload_file
   Parameters: { 
     uid: "<image-upload-uid>", 
     filePath: "test-assets/large-image.jpg" 
   }

3. Take screenshot
   Command: chrome-devtools_take_screenshot
   Parameters: { filePath: "qa-screenshots/F-errors/F7-large-file.png" }
```

**Expected Results:**
- [ ] Error message: "File too large. Maximum size is 10MB"
- [ ] Upload rejected immediately
- [ ] No server upload attempted

---

### Test F8: Invalid Email Format

**Purpose:** Verify email format validation

**Priority:** Medium  
**Type:** Validation

**Steps:**

```
1. If email field exists, enter invalid email
   Command: chrome-devtools_fill
   Parameters: { uid: "<email-uid>", value: "invalid-email" }

2. Submit form
   Command: chrome-devtools_click
   Parameters: { uid: "<submit-uid>" }

3. Take screenshot
   Command: chrome-devtools_take_screenshot
   Parameters: { filePath: "qa-screenshots/F-errors/F8-invalid-email.png" }
```

**Expected Results:**
- [ ] Validation error: "Please enter a valid email address"
- [ ] Form not submitted

---

## G. UI/UX Verification

### Test G1: Responsive Design - Desktop (1920x1080)

**Purpose:** Verify desktop layout

**Priority:** Medium  
**Type:** Visual

**Steps:**

```
1. Set viewport to desktop size
   Command: chrome-devtools_resize_page
   Parameters: { width: 1920, height: 1080 }

2. Navigate to app
   Command: chrome-devtools_navigate_page
   Parameters: { type: "url", url: "http://localhost:5173" }

3. Take full page screenshot
   Command: chrome-devtools_take_screenshot
   Parameters: { filePath: "qa-screenshots/G-uiux/G1-desktop-1920.png", fullPage: true }
```

**Expected Results:**
- [ ] Layout uses full width appropriately
- [ ] No horizontal scrollbar
- [ ] All elements visible and aligned
- [ ] Text readable

---

### Test G2: Responsive Design - Tablet (768x1024)

**Purpose:** Verify tablet layout

**Priority:** Medium  
**Type:** Visual

**Steps:**

```
1. Set viewport to tablet size
   Command: chrome-devtools_resize_page
   Parameters: { width: 768, height: 1024 }

2. Reload page
   Command: chrome-devtools_navigate_page
   Parameters: { type: "reload" }

3. Take screenshot
   Command: chrome-devtools_take_screenshot
   Parameters: { filePath: "qa-screenshots/G-uiux/G2-tablet-768.png", fullPage: true }
```

**Expected Results:**
- [ ] Layout adapts to tablet width
- [ ] Navigation accessible (hamburger menu?)
- [ ] All functionality available
- [ ] No element overlap

---

### Test G3: Responsive Design - Mobile (375x667)

**Purpose:** Verify mobile layout

**Priority:** Medium  
**Type:** Visual

**Steps:**

```
1. Set viewport to mobile size with touch emulation
   Command: chrome-devtools_emulate
   Parameters: { 
     viewport: { width: 375, height: 667, isMobile: true, hasTouch: true },
     userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15"
   }

2. Reload page
   Command: chrome-devtools_navigate_page
   Parameters: { type: "reload" }

3. Take screenshot
   Command: chrome-devtools_take_screenshot
   Parameters: { filePath: "qa-screenshots/G-uiux/G3-mobile-375.png", fullPage: true }

4. Test touch interactions
   Command: chrome-devtools_click
   Parameters: { uid: "<hamburger-menu-uid>" }
```

**Expected Results:**
- [ ] Mobile-optimized layout
- [ ] Touch-friendly button sizes
- [ ] Hamburger menu for navigation
- [ ] No horizontal scroll
- [ ] Form fields appropriately sized

---

### Test G4: Dark Mode (If Supported)

**Purpose:** Verify dark mode styling

**Priority:** Low  
**Type:** Visual

**Steps:**

```
1. Enable dark mode emulation
   Command: chrome-devtools_emulate
   Parameters: { colorScheme: "dark" }

2. Reload page
   Command: chrome-devtools_navigate_page
   Parameters: { type: "reload" }

3. Take screenshot
   Command: chrome-devtools_take_screenshot
   Parameters: { filePath: "qa-screenshots/G-uiux/G4-dark-mode.png", fullPage: true }

4. Reset to light mode
   Command: chrome-devtools_emulate
   Parameters: { colorScheme: "light" }
```

**Expected Results:**
- [ ] Dark color scheme applied
- [ ] Text readable (sufficient contrast)
- [ ] All UI elements visible
- [ ] No hardcoded light colors

---

### Test G5: Accessibility - Keyboard Navigation

**Purpose:** Verify keyboard accessibility

**Priority:** High  
**Type:** Accessibility

**Steps:**

```
1. Navigate to app
   Command: chrome-devtools_navigate_page
   Parameters: { type: "url", url: "http://localhost:5173" }

2. Tab through interactive elements
   Command: chrome-devtools_press_key
   Parameters: { key: "Tab" }
   (Repeat 10 times, taking screenshots)

3. Take screenshot showing focus indicator
   Command: chrome-devtools_take_screenshot
   Parameters: { filePath: "qa-screenshots/G-uiux/G5-focus-indicator.png" }

4. Test Enter key activation
   Command: chrome-devtools_press_key
   Parameters: { key: "Enter" }
```

**Expected Results:**
- [ ] Focus visible on all interactive elements
- [ ] Logical tab order
- [ ] No keyboard traps
- [ ] Enter key activates focused element
- [ ] Escape closes modals/dropdowns

---

### Test G6: Loading States

**Purpose:** Verify loading indicators

**Priority:** Medium  
**Type:** UX

**Steps:**

```
1. Enable slow network
   Command: chrome-devtools_emulate
   Parameters: { networkConditions: "Slow 3G" }

2. Navigate to app
   Command: chrome-devtools_navigate_page
   Parameters: { type: "url", url: "http://localhost:5173" }

3. Take screenshot during loading
   Command: chrome-devtools_take_screenshot
   Parameters: { filePath: "qa-screenshots/G-uiux/G6-loading-state.png" }

4. Submit form and capture loading
   Command: chrome-devtools_click
   Parameters: { uid: "<send-postcard-uid>" }

5. Take screenshot of button loading state
   Command: chrome-devtools_take_screenshot
   Parameters: { filePath: "qa-screenshots/G-uiux/G6-button-loading.png" }

6. Restore network
   Command: chrome-devtools_emulate
   Parameters: { networkConditions: "No emulation" }
```

**Expected Results:**
- [ ] Loading spinner/skeleton visible
- [ ] Button shows loading state (disabled, spinner)
- [ ] No layout shift during load
- [ ] Progress indication for uploads

---

## H. Security Testing

### Test H1: SQL Injection Attempt

**Purpose:** Verify SQL injection protection

**Priority:** Critical  
**Type:** Security

**Steps:**

```
1. Fill form with SQL injection payload
   Command: chrome-devtools_fill
   Parameters: { 
     uid: "<message-uid>", 
     value: "'; DROP TABLE drafts; --" 
   }

2. Save draft
   Command: chrome-devtools_click
   Parameters: { uid: "<save-draft-uid>" }

3. Check response
   Command: chrome-devtools_list_network_requests
   Parameters: { resourceTypes: ["xhr"] }

4. Take screenshot
   Command: chrome-devtools_take_screenshot
   Parameters: { filePath: "qa-screenshots/H-security/H1-sql-injection.png" }

5. Verify database still works
   Command: chrome-devtools_navigate_page
   Parameters: { type: "url", url: "http://localhost:8484/api/health" }
```

**Expected Results:**
- [ ] Data saved as plain text (not executed)
- [ ] No database error
- [ ] Drafts table still exists
- [ ] Message contains literal SQL string

---

### Test H2: CSRF Protection

**Purpose:** Verify CSRF token validation

**Priority:** High  
**Type:** Security

**Steps:**

```
1. Check network requests for CSRF tokens
   Command: chrome-devtools_list_network_requests
   Parameters: { resourceTypes: ["xhr"] }

2. Get request headers
   Command: chrome-devtools_get_network_request
   Parameters: { reqid: <post-request-id> }

3. Try request without CSRF token (if applicable)
   Command: chrome-devtools_evaluate_script
   Parameters: { 
     function: "() => { return fetch('/api/drafts', { method: 'POST', body: '{}' }).then(r => r.status); }" 
   }
```

**Expected Results:**
- [ ] CSRF token in request headers OR body
- [ ] Requests without token rejected (403)
- [ ] Token changes per session

---

### Test H3: Security Headers

**Purpose:** Verify security headers are present

**Priority:** High  
**Type:** Security

**Steps:**

```
1. Navigate to backend endpoint
   Command: chrome-devtools_navigate_page
   Parameters: { type: "url", url: "http://localhost:8484/api/health" }

2. Get response headers
   Command: chrome-devtools_list_network_requests
   Parameters: { resourceTypes: ["document"] }

3. Get request details
   Command: chrome-devtools_get_network_request
   Parameters: { reqid: <request-id> }
```

**Expected Headers:**
- [ ] `X-Content-Type-Options: nosniff`
- [ ] `X-Frame-Options: DENY` or `SAMEORIGIN`
- [ ] `X-XSS-Protection: 1; mode=block`
- [ ] `Content-Security-Policy: ...`
- [ ] `Strict-Transport-Security: max-age=...` (if HTTPS)
- [ ] `Referrer-Policy: strict-origin-when-cross-origin`

---

### Test H4: Rate Limiting

**Purpose:** Verify rate limiting (if implemented)

**Priority:** Medium  
**Type:** Security

**Steps:**

```
1. Send multiple rapid requests
   Command: chrome-devtools_evaluate_script
   Parameters: { 
     function: "() => { let results = []; for(let i=0; i<100; i++) { results.push(fetch('/api/health').then(r => r.status)); } return Promise.all(results); }" 
   }

2. Check for rate limit response
   (Look for 429 status codes)
```

**Expected Results:**
- [ ] HTTP 429 Too Many Requests after limit
- [ ] Retry-After header present
- [ ] Rate limit message returned

---

### Test H5: Authorization - Access Other User's Data

**Purpose:** Verify user data isolation

**Priority:** Critical  
**Type:** Security

**Steps:**

```
1. As User A, create a draft and note the ID

2. Create/switch to User B session

3. Try to access User A's draft
   Command: chrome-devtools_navigate_page
   Parameters: { type: "url", url: "http://localhost:8484/api/drafts/<user-a-draft-id>" }

4. Check response
   Command: chrome-devtools_take_screenshot
   Parameters: { filePath: "qa-screenshots/H-security/H5-authz-check.png" }
```

**Expected Results:**
- [ ] HTTP 403 Forbidden OR 404 Not Found
- [ ] No data returned for other user's draft
- [ ] Access logged for audit

---

## Screenshot Organization

### Directory Structure

```
qa-screenshots/
├── A-health/
│   ├── A1-health-check.png
│   ├── A2-frontend-load.png
│   └── A3-api-test.png
├── B-auth/
│   ├── B1-login-page.png
│   ├── B2-oidc-init.png
│   ├── B3-callback-success.png
│   ├── B4-user-info.png
│   ├── B5-logout.png
│   └── B6-unauthorized.png
├── C-drafts/
│   ├── C1-empty-drafts.png
│   ├── C2-create-draft.png
│   ├── C3-view-draft.png
│   ├── C4-update-draft.png
│   ├── C5-delete-draft.png
│   ├── C6-filter-draft.png
│   └── C7-page-1.png
├── D-postcards/
│   ├── D1-validation-errors.png
│   ├── D2-invalid-type.png
│   ├── D2-oversized.png
│   ├── D3-preview.png
│   ├── D3-success.png
│   ├── D4-preview-front.png
│   ├── D4-preview-back.png
│   └── D5-success-full.png
├── E-scheduling/
│   ├── E1-publish.png
│   ├── E2-schedule.png
│   ├── E3-cancel.png
│   └── E4-invalid-date.png
├── F-errors/
│   ├── F1-network-error.png
│   ├── F2-xss-test.png
│   ├── F3-required-fields.png
│   ├── F4-postgrid-error.png
│   ├── F5-expired-token.png
│   ├── F6-concurrent-edit.png
│   ├── F7-large-file.png
│   └── F8-invalid-email.png
├── G-uiux/
│   ├── G1-desktop-1920.png
│   ├── G2-tablet-768.png
│   ├── G3-mobile-375.png
│   ├── G4-dark-mode.png
│   ├── G5-focus-indicator.png
│   ├── G6-loading-state.png
│   └── G6-button-loading.png
└── H-security/
    ├── H1-sql-injection.png
    ├── H2-csrf.png
    ├── H3-security-headers.png
    ├── H4-rate-limit.png
    └── H5-authz-check.png
```

### Create Directory Structure

```bash
mkdir -p qa-screenshots/{A-health,B-auth,C-drafts,D-postcards,E-scheduling,F-errors,G-uiux,H-security}
```

---

## Test Execution Automation

### Quick Test Script

```bash
#!/bin/bash
# run-qa-tests.sh
# Quick script to verify test prerequisites

set -e

echo "=== FamMail QA Test Prerequisites Check ==="
echo ""

# Check backend
echo "Checking backend..."
if curl -s http://localhost:8484/api/health > /dev/null 2>&1; then
    echo "✅ Backend running on port 8484"
else
    echo "❌ Backend not running. Start with: cd backend && bun run dev"
    exit 1
fi

# Check frontend
echo "Checking frontend..."
if curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo "✅ Frontend running on port 5173"
else
    echo "❌ Frontend not running. Start with: cd frontend && bun run dev"
    exit 1
fi

# Check test assets
echo "Checking test assets..."
if [ -f "backend/test-assets/test-image.jpg" ]; then
    echo "✅ Test assets exist"
else
    echo "⚠️  Test assets not found. Run: cd backend && ./scripts/setup-test-assets.sh"
fi

# Check screenshot directory
echo "Checking screenshot directory..."
if [ -d "qa-screenshots" ]; then
    echo "✅ Screenshot directory exists"
else
    echo "Creating screenshot directory..."
    mkdir -p qa-screenshots/{A-health,B-auth,C-drafts,D-postcards,E-scheduling,F-errors,G-uiux,H-security}
    echo "✅ Screenshot directory created"
fi

echo ""
echo "=== All prerequisites met! ==="
echo ""
echo "Ready to run QA tests manually or with automation."
echo "See docs/qa-testing-plan.md for detailed test cases."
```

---

## Post-Test Reporting

### Report Template

```markdown
# FamMail QA Test Report

**Date:** YYYY-MM-DD  
**Tester:** [Name]  
**Environment:** Development  
**Browser:** Chrome [Version]  
**Backend Commit:** [Git SHA]  
**Frontend Commit:** [Git SHA]  

## Executive Summary

| Metric | Value |
|--------|-------|
| Total Tests | 44 |
| Passed | X |
| Failed | Y |
| Skipped | Z |
| Pass Rate | XX% |

## Test Results by Category

| Category | Passed | Failed | Skipped |
|----------|--------|--------|---------|
| A. Health & Connectivity | X/3 | | |
| B. Authentication | X/6 | | |
| C. Draft CRUD | X/7 | | |
| D. Postcard Creation | X/5 | | |
| E. Scheduling | X/4 | | |
| F. Error Handling | X/8 | | |
| G. UI/UX | X/6 | | |
| H. Security | X/5 | | |

## Critical Issues

| ID | Test | Issue | Severity | Status |
|----|------|-------|----------|--------|
| B2 | OIDC Login | [Description] | Critical | Open |
| ... | ... | ... | ... | ... |

## High Priority Issues

| ID | Test | Issue | Severity | Status |
|----|------|-------|----------|--------|
| ... | ... | ... | ... | ... |

## Screenshots

All screenshots available in: `/qa-screenshots/`

### Key Screenshots

- **Authentication Flow:** `B-auth/`
- **Draft Management:** `C-drafts/`
- **Postcard Creation:** `D-postcards/`
- **Error States:** `F-errors/`

## Recommendations

1. [Recommendation 1]
2. [Recommendation 2]
3. [Recommendation 3]

## Next Steps

- [ ] Address critical issues
- [ ] Re-test failed cases
- [ ] Update test plan based on findings

## Appendix

### Environment Details

```
Backend:
  - Node/Bun: [version]
  - Database: SQLite at [path]
  - PostGrid Mode: test/live

Frontend:
  - React: [version]
  - Vite: [version]

OIDC:
  - Provider: [Authentik/Google]
  - Status: [Connected/Issues]
```

### Test Execution Log

```
[Paste relevant console logs or test output]
```
```

---

## Appendix A: Chrome DevTools Command Reference

### Navigation Commands

| Command | Purpose |
|---------|---------|
| `chrome-devtools_navigate_page` | Navigate to URL or reload |
| `chrome-devtools_new_page` | Open new browser tab |
| `chrome-devtools_list_pages` | List all open pages |
| `chrome-devtools_select_page` | Switch to specific page |
| `chrome-devtools_close_page` | Close a page |

### Interaction Commands

| Command | Purpose |
|---------|---------|
| `chrome-devtools_click` | Click element |
| `chrome-devtools_fill` | Fill form field |
| `chrome-devtools_fill_form` | Fill multiple fields |
| `chrome-devtools_press_key` | Press keyboard key |
| `chrome-devtools_hover` | Hover over element |
| `chrome-devtools_upload_file` | Upload file |
| `chrome-devtools_handle_dialog` | Accept/dismiss dialogs |

### Inspection Commands

| Command | Purpose |
|---------|---------|
| `chrome-devtools_take_snapshot` | Get accessibility tree |
| `chrome-devtools_take_screenshot` | Capture screenshot |
| `chrome-devtools_evaluate_script` | Run JavaScript |
| `chrome-devtools_wait_for` | Wait for text/element |

### Network Commands

| Command | Purpose |
|---------|---------|
| `chrome-devtools_list_network_requests` | List all requests |
| `chrome-devtools_get_network_request` | Get request details |
| `chrome-devtools_list_console_messages` | List console logs |
| `chrome-devtools_get_console_message` | Get specific message |

### Emulation Commands

| Command | Purpose |
|---------|---------|
| `chrome-devtools_emulate` | Emulate device/network |
| `chrome-devtools_resize_page` | Resize viewport |

---

## Appendix B: Common Element UIDs

After taking a snapshot, look for these common element types:

| Element Type | Common UID Patterns |
|--------------|---------------------|
| Login Button | `login`, `sign-in`, `auth-button` |
| Logout Button | `logout`, `sign-out` |
| Navigation | `nav-`, `menu-`, `link-` |
| Form Inputs | `input-`, `field-`, `[fieldname]` |
| Buttons | `button-`, `btn-`, `submit-`, `save-`, `delete-` |
| Lists | `list-`, `item-`, `draft-` |
| Modals | `modal-`, `dialog-`, `popup-` |

---

## Appendix C: Troubleshooting

### Common Issues

**Frontend not loading:**
```bash
# Check if port 5173 is in use
lsof -i :5173
# Kill existing process
kill -9 <PID>
# Restart frontend
cd frontend && bun run dev
```

**Backend errors:**
```bash
# Check backend logs
cd backend
bun run dev

# Check database exists
ls -la data/fammail.db

# Reinitialize database
rm data/fammail.db
bun run dev  # Schema auto-creates
```

**OIDC not working:**
- Verify OIDC_ISSUER_URL is correct
- Check redirect URI matches in OIDC provider
- Use mock auth bypass for testing

**Test assets missing:**
```bash
cd backend
./scripts/setup-test-assets.sh
```

---

*End of QA Testing Plan*
