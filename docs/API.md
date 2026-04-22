# API Reference

This document describes all HTTP endpoints in the Fam Mail backend, including request/response schemas, authentication requirements, and error codes.

## Base URL

- Production: `https://your-domain.com`
- Development: `http://localhost:8484`

## Authentication

### Bearer Token (JWT)

Most authenticated endpoints require a Bearer token in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

### Token Lifecycle

1. **Access Token**: Short-lived JWT used for authenticated requests
2. **Refresh Token**: Long-lived token used to obtain new access tokens
3. **Session**: Stored in database, expires after 7 days

### Authentication Flows

#### Development Mode

In development mode (`DEV_MODE=true`), use the dev-login endpoint:

```bash
POST /api/auth/dev-login
```

Returns both tokens and user info immediately. No OIDC provider required.

#### Production Mode

1. Start OIDC flow:
   ```bash
   POST /api/auth/login
   ```
   Returns an `authUrl` to redirect the user to the OIDC provider.

2. User completes authentication at the provider and is redirected to:
   ```
   GET /api/auth/callback?code=...&state=...
   ```

3. Callback redirects to frontend with tokens:
   ```
   /auth/callback?token=...&refreshToken=...
   ```

4. Use the access token for authenticated requests.

#### Token Refresh

When an access token expires, use the refresh token:

```bash
POST /api/auth/refresh
{
  "refreshToken": "<refresh_token>"
}
```

Returns a new access and refresh token pair (refresh token rotation).

### Error Codes

| Code | Description |
|------|-------------|
| 401 | Unauthorized — missing, invalid, or expired token |
| 403 | Forbidden — user lacks permission for this action |

---

## Endpoints

### Authentication Endpoints

#### POST /api/auth/dev-login

**Description**: Development-only endpoint that creates/returns a dev user token without OIDC.

**Authentication**: None (only available in dev mode)

**Rate Limiting**: 10 requests per minute per IP

**Request Body**: None

**Response** (200 OK):

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "oidcSub": "dev-user",
    "oidcIssuer": "dev-mode",
    "email": "dev@fammail.local",
    "emailVerified": true,
    "firstName": "Dev",
    "lastName": "User",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Response** (400 Bad Request):

```json
{
  "error": "OIDC callback not available in dev mode"
}
```

---

#### POST /api/auth/login

**Description**: Starts the OIDC authentication flow by generating an authorization URL.

**Authentication**: None

**Rate Limiting**: 10 requests per minute per IP

**Request Body**: None

**Response** (200 OK):

```json
{
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?client_id=...&redirect_uri=...",
  "state": "550e8400-e29b-41d4-a716-446655440000"
}
```

In dev mode, returns tokens directly:

```json
{
  "devMode": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { /* User object */ }
}
```

---

#### GET /api/auth/callback

**Description**: OIDC callback endpoint that exchanges the authorization code for tokens.

**Authentication**: None

**Rate Limiting**: 10 requests per minute per IP

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| code | string | Yes | Authorization code from OIDC provider |
| state | string | Yes | State parameter for CSRF protection |

**Response**: 302 redirect to frontend with tokens:

```
/auth/callback?token=<access_token>&refreshToken=<refresh_token>
```

**Error Responses**:

400 Bad Request:
```json
{
  "error": "Missing code or state"
}
```

```json
{
  "error": "Invalid or expired state"
}
```

500 Internal Server Error:
```json
{
  "error": "Authentication failed"
}
```

---

#### GET /api/auth/me

**Description**: Returns information about the currently authenticated user.

**Authentication**: Bearer token required

**Request Headers**:

```
Authorization: Bearer <access_token>
```

**Response** (200 OK):

```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "oidcSub": "1234567890",
    "oidcIssuer": "https://accounts.google.com",
    "email": "user@example.com",
    "emailVerified": true,
    "firstName": "John",
    "lastName": "Doe",
    "avatarUrl": "https://lh3.googleusercontent.com/...",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Responses**:

401 Unauthorized:
```json
{
  "error": "Invalid or expired token"
}
```

---

#### POST /api/auth/logout

**Description**: Invalidates the current session by deleting the access token from the database.

**Authentication**: Bearer token required

**Request Headers**:

```
Authorization: Bearer <access_token>
```

**Response** (200 OK):

```json
{
  "message": "Logged out successfully"
}
```

---

#### POST /api/auth/refresh

**Description**: Refreshes an access token using a refresh token. Implements refresh token rotation for security.

**Authentication**: None

**Rate Limiting**: 10 requests per minute per IP

**Request Body**:

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response** (200 OK):

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses**:

400 Bad Request:
```json
{
  "error": "Missing refresh token"
}
```

```json
{
  "error": "Invalid request body"
}
```

401 Unauthorized:
```json
{
  "error": "Invalid or expired refresh token"
}
```

```json
{
  "error": "Refresh token not found"
}
```

```json
{
  "error": "User not found"
}
```

```json
{
  "error": "Token mismatch"
}
```

---

### Drafts Endpoints

All drafts endpoints require Bearer authentication and are scoped to the authenticated user's drafts.

#### GET /api/drafts

**Description**: Lists all drafts for the authenticated user, optionally filtered by state.

**Authentication**: Bearer token required

**Request Headers**:

```
Authorization: Bearer <access_token>
```

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| state | string | No | Filter by state: `draft` or `ready` |

**Response** (200 OK):

```json
{
  "drafts": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "userId": "user-id-here",
      "recipientAddress": {
        "firstName": "Jane",
        "lastName": "Smith",
        "addressLine1": "123 Main St",
        "addressLine2": "Apt 4B",
        "city": "San Francisco",
        "provinceOrState": "CA",
        "postalOrZip": "94102",
        "countryCode": "US"
      },
      "senderAddress": {
        "firstName": "John",
        "lastName": "Doe",
        "addressLine1": "456 Oak Ave",
        "city": "Los Angeles",
        "provinceOrState": "CA",
        "postalOrZip": "90001",
        "countryCode": "US"
      },
      "message": "Hello from San Francisco!",
      "frontHTML": "<html>...</html>",
      "backHTML": "<html>...</html>",
      "imageData": "data:image/jpeg;base64,...",
      "imageMetadata": {
        "width": 1800,
        "height": 1200,
        "format": "jpeg",
        "quality": 90,
        "sizeBytes": 245678
      },
      "state": "draft",
      "scheduledFor": null,
      "size": "6x4",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T01:00:00.000Z"
    }
  ]
}
```

---

#### POST /api/drafts

**Description**: Creates a new draft postcard.

**Authentication**: Bearer token required

**Rate Limiting**: 30 requests per minute per IP

**Request Headers**:

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body**:

```json
{
  "recipientAddress": {
    "firstName": "Jane",
    "lastName": "Smith",
    "addressLine1": "123 Main St",
    "addressLine2": "Apt 4B",
    "city": "San Francisco",
    "provinceOrState": "CA",
    "postalOrZip": "94102",
    "countryCode": "US"
  },
  "senderAddress": {
    "firstName": "John",
    "lastName": "Doe",
    "addressLine1": "456 Oak Ave",
    "city": "Los Angeles",
    "provinceOrState": "CA",
    "postalOrZip": "90001",
    "countryCode": "US"
  },
  "message": "Hello from San Francisco!",
  "frontHTML": "<html>...</html>",
  "backHTML": "<html>...</html>",
  "imageData": "data:image/jpeg;base64,...",
  "imageMetadata": {
    "width": 1800,
    "height": 1200,
    "format": "jpeg",
    "quality": 90,
    "sizeBytes": 245678
  },
  "size": "6x4"
}
```

**Field Descriptions**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| recipientAddress | Address | Yes | Recipient's mailing address |
| senderAddress | Address | No | Return address (optional, may use default) |
| message | string | No | Markdown message for the postcard |
| frontHTML | string | No | HTML content for the front side |
| backHTML | string | No | HTML content for the back side |
| imageData | string | No | Base64-encoded image data |
| imageMetadata | ImageMetadata | No | Image dimensions and metadata |
| size | string | No | Postcard size: `6x4` (default), `9x6`, or `11x6` |

**Response** (201 Created):

```json
{
  "draft": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "userId": "user-id-here",
    "recipientAddress": { /* Address object */ },
    "senderAddress": { /* Address object or undefined */ },
    "message": "Sanitized message text",
    "frontHTML": "<html>...</html>",
    "backHTML": "<html>...</html>",
    "imageData": "data:image/jpeg;base64,...",
    "imageMetadata": { /* ImageMetadata object */ },
    "state": "draft",
    "scheduledFor": null,
    "size": "6x4",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Responses**:

400 Bad Request:
```json
{
  "error": "recipientAddress is required"
}
```

---

#### GET /api/drafts/:id

**Description**: Retrieves a specific draft by ID.

**Authentication**: Bearer token required

**Request Headers**:

```
Authorization: Bearer <access_token>
```

**URL Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Draft UUID |

**Response** (200 OK):

```json
{
  "draft": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "userId": "user-id-here",
    "recipientAddress": { /* Address object */ },
    "senderAddress": { /* Address object or undefined */ },
    "message": "Sanitized message text",
    "frontHTML": "<html>...</html>",
    "backHTML": "<html>...</html>",
    "imageData": "data:image/jpeg;base64,...",
    "imageMetadata": { /* ImageMetadata object */ },
    "state": "draft",
    "scheduledFor": null,
    "size": "6x4",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Responses**:

400 Bad Request:
```json
{
  "error": "Draft ID is required"
}
```

404 Not Found:
```json
{
  "error": "Draft not found"
}
```

403 Forbidden:
```json
{
  "error": "Forbidden"
}
```

---

#### PUT /api/drafts/:id

**Description**: Updates an existing draft. Only fields provided in the request body are updated.

**Authentication**: Bearer token required

**Rate Limiting**: 30 requests per minute per IP

**Request Headers**:

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**URL Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Draft UUID |

**Request Body** (all fields optional):

```json
{
  "recipientAddress": { /* Address object */ },
  "senderAddress": { /* Address object */ },
  "message": "Updated message",
  "frontHTML": "<html>Updated front</html>",
  "backHTML": "<html>Updated back</html>",
  "imageData": "data:image/jpeg;base64,...",
  "imageMetadata": { /* ImageMetadata object */ },
  "state": "draft",
  "scheduledFor": "2024-12-25T10:00:00.000Z",
  "size": "9x6"
}
```

**Response** (200 OK):

```json
{
  "draft": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "userId": "user-id-here",
    "recipientAddress": { /* Updated Address object */ },
    "senderAddress": { /* Updated Address object or undefined */ },
    "message": "Sanitized updated message",
    "frontHTML": "<html>Updated front</html>",
    "backHTML": "<html>Updated back</html>",
    "imageData": "data:image/jpeg;base64,...",
    "imageMetadata": { /* Updated ImageMetadata object */ },
    "state": "draft",
    "scheduledFor": "2024-12-25T10:00:00.000Z",
    "size": "9x6",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T02:00:00.000Z"
  }
}
```

**Error Responses**:

400 Bad Request:
```json
{
  "error": "Draft ID is required"
}
```

404 Not Found:
```json
{
  "error": "Draft not found"
}
```

403 Forbidden:
```json
{
  "error": "Forbidden"
}
```

---

#### DELETE /api/drafts/:id

**Description**: Deletes a draft permanently.

**Authentication**: Bearer token required

**Rate Limiting**: 30 requests per minute per IP

**Request Headers**:

```
Authorization: Bearer <access_token>
```

**URL Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Draft UUID |

**Response** (200 OK):

```json
{
  "message": "Draft deleted"
}
```

**Error Responses**:

400 Bad Request:
```json
{
  "error": "Draft ID is required"
}
```

404 Not Found:
```json
{
  "error": "Draft not found"
}
```

403 Forbidden:
```json
{
  "error": "Forbidden"
}
```

---

#### POST /api/drafts/:id/publish

**Description**: Publishes a draft by sending it to PostGrid for printing and mailing.

**Authentication**: Bearer token required

**Rate Limiting**: 30 requests per minute per IP

**Request Headers**:

```
Authorization: Bearer <access_token>
```

**URL Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Draft UUID |

**Request Body**: None

**Validation Requirements**:

Before publishing, the following validations are performed:

1. **Recipient Address**: All required fields present, valid postal code for country
2. **Sender Address** (if provided): Same validation as recipient
3. **Content**: At least one of `frontHTML`, `backHTML`, or `message` must be present
4. **Message** (if present): Length limits, sanitized HTML
5. **Size**: Must be valid PostGrid size (`6x4`, `9x6`, or `11x6`)

**Response** (200 OK):

```json
{
  "success": true,
  "message": "Postcard sent successfully",
  "postcard": {
    "id": "pc_abc123xyz",
    "status": "submitted",
    "testMode": false
  }
}
```

**Error Responses**:

400 Bad Request — Validation failed:
```json
{
  "error": "Validation failed",
  "errors": [
    {
      "field": "to.postalOrZip",
      "message": "Invalid US ZIP code format"
    },
    {
      "field": "content",
      "message": "At least one of frontHTML, backHTML, or message is required"
    }
  ]
}
```

```json
{
  "error": "Draft is not in draft state"
}
```

403 Forbidden:
```json
{
  "error": "Forbidden"
}
```

404 Not Found:
```json
{
  "error": "Draft not found"
}
```

500 Internal Server Error:
```json
{
  "success": false,
  "error": "PostGrid service not configured. Please set POSTGRID_TEST_API_KEY or POSTGRID_LIVE_API_KEY environment variable."
}
```

PostGrid Error (various status codes):
```json
{
  "success": false,
  "error": "Insufficient credits",
  "details": {
    "type": "InsufficientCreditsError",
    "message": "Your account has insufficient credits to complete this request"
  }
}
```

---

#### POST /api/drafts/:id/schedule

**Description**: Schedules a draft to be sent at a future date.

**Authentication**: Bearer token required

**Rate Limiting**: 30 requests per minute per IP

**Request Headers**:

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**URL Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Draft UUID |

**Request Body**:

```json
{
  "scheduledFor": "2024-12-25T10:00:00.000Z"
}
```

**Field Descriptions**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| scheduledFor | string | Yes | ISO 8601 timestamp in the future |

**Response** (200 OK):

```json
{
  "message": "Draft scheduled for 2024-12-25T10:00:00.000Z"
}
```

**Error Responses**:

400 Bad Request:
```json
{
  "error": "Draft ID is required"
}
```

```json
{
  "error": "scheduledFor is required"
}
```

```json
{
  "error": "scheduledFor must be in future"
}
```

404 Not Found:
```json
{
  "error": "Draft not found"
}
```

403 Forbidden:
```json
{
  "error": "Forbidden"
}
```

---

#### POST /api/drafts/:id/cancel-schedule

**Description**: Cancels a scheduled draft, reverting it to draft state.

**Authentication**: Bearer token required

**Rate Limiting**: 30 requests per minute per IP

**Request Headers**:

```
Authorization: Bearer <access_token>
```

**URL Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Draft UUID |

**Request Body**: None

**Response** (200 OK):

```json
{
  "message": "Schedule cancelled"
}
```

**Error Responses**:

400 Bad Request:
```json
{
  "error": "Draft ID is required"
}
```

```json
{
  "error": "Draft is not scheduled"
}
```

404 Not Found:
```json
{
  "error": "Draft not found"
}
```

403 Forbidden:
```json
{
  "error": "Forbidden"
}
```

---

### Postcards Endpoints

#### POST /api/postcards

**Description**: Creates and sends a postcard directly without using drafts. This is the direct-to-PostGrid endpoint.

**Authentication**: Bearer token required

**Rate Limiting**: 5 requests per minute per IP (limited due to cost)

**Request Headers**:

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body**:

```json
{
  "to": {
    "firstName": "Jane",
    "lastName": "Smith",
    "addressLine1": "123 Main St",
    "addressLine2": "Apt 4B",
    "city": "San Francisco",
    "provinceOrState": "CA",
    "postalOrZip": "94102",
    "countryCode": "US"
  },
  "from": {
    "firstName": "John",
    "lastName": "Doe",
    "addressLine1": "456 Oak Ave",
    "city": "Los Angeles",
    "provinceOrState": "CA",
    "postalOrZip": "90001",
    "countryCode": "US"
  },
  "frontHTML": "<html>...</html>",
  "backHTML": "<html>...</html>",
  "message": "Hello from San Francisco!",
  "image": "data:image/jpeg;base64,...",
  "size": "6x4"
}
```

**Field Descriptions**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| to | Address | Yes | Recipient's mailing address |
| from | Address | Yes | Return address (required for physical mail) |
| frontHTML | string | No | HTML content for the front side |
| backHTML | string | No | HTML content for the back side |
| message | string | No | Markdown message (converted to HTML for back) |
| image | string | No | Base64-encoded image |
| size | string | No | Postcard size: `6x4` (default), `9x6`, or `11x6` |

**Note**: At least one of `frontHTML`, `backHTML`, `message`, or `image` is required.

**Response** (200 OK):

```json
{
  "success": true,
  "postcard": {
    "id": "pc_abc123xyz",
    "object": "postcard",
    "live": false,
    "to": { /* Address object */ },
    "from": { /* Address object */ },
    "size": "6x4",
    "status": "submitted",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "testMode": false
}
```

**Error Responses**:

400 Bad Request — Validation failed:
```json
{
  "error": "Validation failed",
  "errors": [
    {
      "field": "to.postalOrZip",
      "message": "Invalid US ZIP code format"
    },
    {
      "field": "from",
      "message": "Return address (from) is required"
    }
  ]
}
```

```json
{
  "error": "Missing required address fields"
}
```

401 Unauthorized:
```json
{
  "error": "Invalid or expired token"
}
```

429 Too Many Requests:
```json
{
  "error": "Too many requests",
  "retryAfter": 30000
}
```

500 Internal Server Error:
```json
{
  "success": false,
  "error": "PostGrid service not configured. Please set POSTGRID_TEST_API_KEY or POSTGRID_LIVE_API_KEY environment variable."
}
```

PostGrid Error (various status codes):
```json
{
  "success": false,
  "error": "Address validation failed",
  "details": {
    "type": "ValidationError",
    "message": "Invalid postal code for US"
  }
}
```

---

### PostGrid Endpoints

#### GET /api/postgrid/status

**Description**: Returns the current status and configuration of the PostGrid service.

**Authentication**: Bearer token required

**Request Headers**:

```
Authorization: Bearer <access_token>
```

**Response** (200 OK):

```json
{
  "mode": "test",
  "testMode": true,
  "forceTestMode": false,
  "mockMode": false,
  "apiKeyConfigured": true
}
```

**Field Descriptions**:

| Field | Type | Description |
|-------|------|-------------|
| mode | string | Current mode: `"test"` or `"live"` |
| testMode | boolean | Whether test mode is active |
| forceTestMode | boolean | Whether test mode is forced by config |
| mockMode | boolean | Whether mock mode is active (no API calls) |
| apiKeyConfigured | boolean | Whether an API key is configured |

**Error Responses**:

401 Unauthorized:
```json
{
  "error": "Invalid or expired token"
}
```

---

#### POST /api/postgrid/mode

**Description**: Toggles PostGrid between test and live mode. Only available to admin users.

**Authentication**: Bearer token required (admin only)

**Request Headers**:

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body**:

```json
{
  "mode": "test"
}
```

**Field Descriptions**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| mode | string | Yes | Target mode: `"test"` or `"live"` |

**Response** (200 OK):

```json
{
  "mode": "test",
  "testMode": true,
  "forceTestMode": false,
  "mockMode": false,
  "apiKeyConfigured": true
}
```

**Error Responses**:

400 Bad Request:
```json
{
  "error": "Invalid JSON body"
}
```

```json
{
  "error": "mode must be \"test\" or \"live\""
}
```

```json
{
  "error": "Cannot switch to live mode: no live API key configured"
}
```

401 Unauthorized:
```json
{
  "error": "Invalid or expired token"
}
```

403 Forbidden:
```json
{
  "error": "Forbidden: admin access required"
}
```

---

### Webhook Endpoints

#### POST /api/webhook/email

**Description**: Inbound email webhook endpoint for email-to-postcard processing. Supports SendGrid, Mailgun, and generic webhook formats.

**Authentication**: API Key (webhook secret) in header

**Rate Limiting**: 20 requests per minute per IP

**Request Headers**:

```
X-Webhook-Secret: <webhook_secret>
```

or

```
Authorization: Bearer <webhook_secret>
```

**Content Types Supported**:

- `application/json` — SendGrid or generic format
- `multipart/form-data` — Mailgun format
- `application/x-www-form-urlencoded` — Mailgun format

**SendGrid Format Request Body** (array of events):

```json
[
  {
    "event": "delivered",
    "email": "sender@example.com",
    "subject": "Create postcard",
    "text": "Hello! Please send a postcard to...",
    "html": "<p>Hello! Please send a postcard to...</p>",
    "content": {
      "text": "Plain text content",
      "html": "<p>HTML content</p>"
    },
    "attachments": []
  }
]
```

**Mailgun Format Request Body** (form-data):

```
from: sender@example.com
to: recipient@example.com
subject: Create postcard
body-plain: Plain text message
body-html: <p>HTML message</p>
```

**Generic Format Request Body**:

```json
{
  "from": "sender@example.com",
  "to": ["recipient@example.com"],
  "subject": "Create postcard",
  "text": "Plain text message",
  "html": "<p>HTML message</p>",
  "attachments": []
}
```

**Response** (200 OK):

```json
{
  "success": true,
  "message": "Email successfully processed and postcard created",
  "postcard": {
    "id": "pc_abc123xyz",
    "status": "submitted",
    "to": { /* Address object */ },
    "from": { /* Address object */ }
  }
}
```

**Error Responses**:

401 Unauthorized:
```json
{
  "success": false,
  "error": "Invalid webhook secret"
}
```

400 Bad Request:
```json
{
  "success": false,
  "error": "Unable to parse email data from webhook"
}
```

```json
{
  "success": false,
  "error": "Invalid email data",
  "details": [
    "Missing required field: from",
    "Missing required field: to"
  ]
}
```

500 Internal Server Error:
```json
{
  "success": false,
  "error": "Internal server error processing webhook"
}
```

---

#### GET /api/webhook/health

**Description**: Health check endpoint for the webhook service.

**Authentication**: None

**Response** (200 OK):

```json
{
  "status": "healthy",
  "service": "email-webhook",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

### System Endpoints

#### GET /api/health

**Description**: Liveness and health check endpoint for the entire API service.

**Authentication**: None

**Response** (200 OK):

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "dependencies": {
    "database": {
      "status": "up",
      "latency_ms": 2
    },
    "postgrid": {
      "status": "up",
      "mode": "test",
      "apiKeyConfigured": true
    }
  }
}
```

**Status Values**:

- `"healthy"`: All dependencies are up
- `"degraded"`: One or more dependencies are down but the service is still partially functional

---

#### GET /api/test

**Description**: Debug endpoint available only in development mode.

**Authentication**: None

**Environment**: Development only (`NODE_ENV !== "production"`)

**Response** (200 OK):

```json
{
  "message": "Hello from Fam Mail backend!",
  "connected": true
}
```

---

## Data Types

### Address

```typescript
interface Address {
  firstName: string
  lastName: string
  addressLine1: string
  addressLine2?: string
  city: string
  provinceOrState: string
  postalOrZip: string
  countryCode: string
}
```

**Validation Rules**:

- `firstName`, `lastName`: Required, max 100 characters
- `addressLine1`: Required, max 200 characters
- `addressLine2`: Optional, max 200 characters
- `city`: Required, max 100 characters
- `provinceOrState`: Required, must be valid 2-letter code for US/CA
- `postalOrZip`: Required, must match country format (5-digit ZIP for US, A1A 1A1 for CA)
- `countryCode`: Required, 2-letter ISO 3166-1 alpha-2 code

---

### User

```typescript
interface User {
  id: string
  oidcSub: string
  oidcIssuer: string
  email: string
  emailVerified: boolean
  firstName?: string
  lastName?: string
  avatarUrl?: string
  createdAt: string
  updatedAt: string
}
```

---

### Draft

```typescript
interface Draft {
  id: string
  userId: string
  recipientAddress: Address
  senderAddress?: Address
  message?: string
  frontHTML?: string
  backHTML?: string
  imageData?: string
  imageMetadata?: ImageMetadata
  state: 'draft' | 'ready'
  scheduledFor?: string
  size: '6x4' | '9x6' | '11x6'
  createdAt: string
  updatedAt: string
}
```

---

### ImageMetadata

```typescript
interface ImageMetadata {
  width: number
  height: number
  format: string
  quality: number
  sizeBytes: number
}
```

---

### PostGridPostcardResponse

```typescript
interface PostGridPostcardResponse {
  id: string
  object: 'postcard'
  live: boolean
  to: Address
  from: Address
  url?: string
  frontTemplate?: string
  backTemplate?: string
  mergeVariables?: Record<string, unknown>
  size: string
  mailedDate?: string
  expectedDeliveryDate?: string
  status: 'ready' | 'rendered' | 'submitted' | 'processed' | 'delivered' | 'failed'
  carrier?: string
  trackingNumber?: string
  createdAt: string
  updatedAt: string
}
```

---

## Common Error Responses

### 400 Bad Request

```json
{
  "error": "Error message describing the issue"
}
```

Or with validation details:

```json
{
  "error": "Validation failed",
  "errors": [
    {
      "field": "fieldName",
      "message": "Specific error message"
    }
  ]
}
```

### 401 Unauthorized

```json
{
  "error": "Invalid or expired token"
}
```

```json
{
  "error": "Authentication required"
}
```

### 403 Forbidden

```json
{
  "error": "Forbidden"
}
```

```json
{
  "error": "Forbidden: admin access required"
}
```

### 404 Not Found

```json
{
  "error": "Not Found"
}
```

```json
{
  "error": "Draft not found"
}
```

### 429 Too Many Requests

```json
{
  "error": "Too many requests",
  "retryAfter": 30000
}
```

The `retryAfter` field contains the number of milliseconds to wait before retrying.

### 500 Internal Server Error

```json
{
  "error": "Internal server error"
}
```

---

## Rate Limiting

| Endpoint Type | Limit | Per | Description |
|--------------|-------|-----|-------------|
| Auth endpoints | 10 | minute | Login, refresh, callback |
| Drafts (read) | Unlimited | — | GET /api/drafts, GET /api/drafts/:id |
| Drafts (write) | 30 | minute | POST, PUT, DELETE, publish, schedule |
| Postcards | 5 | minute | Limited due to real costs |
| Webhooks | 20 | minute | Email webhook processing |

When rate limited, the response includes:

```json
{
  "error": "Too many requests",
  "retryAfter": 30000
}
```

---

## Security Headers

All responses include the following security headers:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Content-Security-Policy: default-src 'self'`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains` (HTTPS only)

---

## CORS

CORS is enabled for cross-origin requests. The following headers are included:

- `Access-Control-Allow-Origin: *` (configured via `CORS_ORIGIN` env var)
- `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type, Authorization, X-Webhook-Secret`

For preflight requests (OPTIONS), a 204 No Content response is returned.
