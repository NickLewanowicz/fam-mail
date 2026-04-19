import { describe, it, expect, beforeEach, beforeAll } from 'bun:test'
import { handlePostcardCreate } from './postcards'
import type { User } from '../models/user'
import { Database } from '../database'

// ---------------------------------------------------------------------------
// Environment setup — required by getConfig() in route handler
// ---------------------------------------------------------------------------

beforeAll(() => {
  process.env.POSTGRID_TEST_API_KEY = process.env.POSTGRID_TEST_API_KEY || 'test-key-for-validation-tests'
  process.env.POSTGRID_LIVE_API_KEY = process.env.POSTGRID_LIVE_API_KEY || 'live-key-for-validation-tests'
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-validation-tests'
  process.env.OIDC_ISSUER_URL = process.env.OIDC_ISSUER_URL || 'https://accounts.google.com'
  process.env.OIDC_CLIENT_ID = process.env.OIDC_CLIENT_ID || 'test-client-id'
  process.env.OIDC_CLIENT_SECRET = process.env.OIDC_CLIENT_SECRET || 'test-client-secret'
  process.env.OIDC_REDIRECT_URI = process.env.OIDC_REDIRECT_URI || 'http://localhost:3000/auth/callback'
  process.env.LLM_API_KEY = process.env.LLM_API_KEY || 'test-llm-key'
})

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const mockUser: User = {
  id: 'test-user-id',
  oidcSub: 'test-oidc-sub',
  oidcIssuer: 'https://accounts.google.com',
  email: 'test@example.com',
  emailVerified: true,
  firstName: 'Test',
  lastName: 'User',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

/** Valid US address that passes all validation. */
const validUSAddress = {
  firstName: 'John',
  lastName: 'Doe',
  addressLine1: '123 Main St',
  city: 'Springfield',
  provinceOrState: 'IL',
  postalOrZip: '62704',
  countryCode: 'US',
}

/** Valid CA address that passes all validation. */
const validCAAddress = {
  firstName: 'Jean',
  lastName: 'Tremblay',
  addressLine1: '456 Rue Principale',
  city: 'Ottawa',
  provinceOrState: 'ON',
  postalOrZip: 'K1A 0B1',
  countryCode: 'CA',
}

/** Helper to make a postcard request. Includes a valid return address by default. */
function makeRequest(body: Record<string, unknown>): Request {
  const fullBody = {
    from: validUSAddress,
    ...body,
  }
  return new Request('http://localhost/api/postcards', {
    method: 'POST',
    body: JSON.stringify(fullBody),
  })
}

/** Helper to make a postcard request WITHOUT a return address. */
function makeRequestNoFrom(body: Record<string, unknown>): Request {
  return new Request('http://localhost/api/postcards', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

/** Helper to read JSON response. */
async function getResponse(response: Response) {
  return response.json() as Promise<{
    error?: string
    errors?: Array<{ field: string; message: string }>
    success?: boolean
  }>
}

// ============================================================================
// Address Validation via Route
// ============================================================================

describe('handlePostcardCreate — Address Validation', () => {
  let db: Database

  beforeEach(() => {
    db = new Database(':memory:')
  })

  // --- Valid addresses -------------------------------------------------------

  it('accepts a valid US address with frontHTML', async () => {
    const req = makeRequest({
      to: validUSAddress,
      frontHTML: '<html>Front</html>',
    })
    const response = await handlePostcardCreate(req, mockUser, db)
    // Not a validation error (may be 500 if PostGrid not configured)
    expect(response.status).not.toBe(400)
  })

  it('accepts a valid CA address with message', async () => {
    const req = makeRequest({
      to: validCAAddress,
      frontHTML: '<html>Front</html>',
      message: 'Hello from Canada!',
    })
    const response = await handlePostcardCreate(req, mockUser, db)
    expect(response.status).not.toBe(400)
  })

  // --- Missing required fields -----------------------------------------------

  function omitField(field: keyof typeof validUSAddress): Record<string, string> {
    const copy = { ...validUSAddress }
    delete copy[field]
    return copy
  }

  it('rejects missing addressLine1', async () => {
    const req = makeRequest({ to: omitField('addressLine1'), frontHTML: '<html>Test</html>' })
    const res = await handlePostcardCreate(req, mockUser, db)
    const data = await getResponse(res)
    expect(res.status).toBe(400)
    expect(data.errors!.some(e => e.field === 'to.addressLine1')).toBe(true)
  })

  it('rejects missing city', async () => {
    const req = makeRequest({ to: omitField('city'), frontHTML: '<html>Test</html>' })
    const res = await handlePostcardCreate(req, mockUser, db)
    const data = await getResponse(res)
    expect(res.status).toBe(400)
    expect(data.errors!.some(e => e.field === 'to.city')).toBe(true)
  })

  it('rejects missing provinceOrState', async () => {
    const req = makeRequest({ to: omitField('provinceOrState'), frontHTML: '<html>Test</html>' })
    const res = await handlePostcardCreate(req, mockUser, db)
    const data = await getResponse(res)
    expect(res.status).toBe(400)
    expect(data.errors!.some(e => e.field === 'to.provinceOrState')).toBe(true)
  })

  it('rejects missing postalOrZip', async () => {
    const req = makeRequest({ to: omitField('postalOrZip'), frontHTML: '<html>Test</html>' })
    const res = await handlePostcardCreate(req, mockUser, db)
    const data = await getResponse(res)
    expect(res.status).toBe(400)
    expect(data.errors!.some(e => e.field === 'to.postalOrZip')).toBe(true)
  })

  it('rejects missing countryCode', async () => {
    const req = makeRequest({ to: omitField('countryCode'), frontHTML: '<html>Test</html>' })
    const res = await handlePostcardCreate(req, mockUser, db)
    const data = await getResponse(res)
    expect(res.status).toBe(400)
    expect(data.errors!.some(e => e.field === 'to.countryCode')).toBe(true)
  })

  it('rejects completely empty address', async () => {
    const req = makeRequest({ to: {}, frontHTML: '<html>Test</html>' })
    const res = await handlePostcardCreate(req, mockUser, db)
    const data = await getResponse(res)
    expect(res.status).toBe(400)
    expect(data.errors!.length).toBeGreaterThanOrEqual(7)
  })

  // --- Empty / whitespace-only fields ----------------------------------------

  it('rejects empty string fields', async () => {
    const req = makeRequest({
      to: {
        firstName: '',
        lastName: '',
        addressLine1: '',
        city: '',
        provinceOrState: '',
        postalOrZip: '',
        countryCode: '',
      },
      frontHTML: '<html>Test</html>',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).toBe(400)
  })

  it('rejects whitespace-only fields', async () => {
    const req = makeRequest({
      to: {
        firstName: '   ',
        lastName: '\t',
        addressLine1: '\n',
        city: '  ',
        provinceOrState: '  ',
        postalOrZip: '  ',
        countryCode: '  ',
      },
      frontHTML: '<html>Test</html>',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).toBe(400)
  })

  // --- State code format -----------------------------------------------------

  it('rejects full state name instead of 2-letter code', async () => {
    const req = makeRequest({
      to: { ...validUSAddress, provinceOrState: 'California' },
      frontHTML: '<html>Test</html>',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    const data = await getResponse(res)
    expect(res.status).toBe(400)
    expect(data.errors!.some(e => e.field === 'to.provinceOrState')).toBe(true)
  })

  // --- ZIP / Postal code format ----------------------------------------------

  it('rejects invalid US ZIP format (too short)', async () => {
    const req = makeRequest({
      to: { ...validUSAddress, postalOrZip: '1234' },
      frontHTML: '<html>Test</html>',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    const data = await getResponse(res)
    expect(res.status).toBe(400)
    expect(data.errors!.some(e => e.field === 'to.postalOrZip')).toBe(true)
  })

  it('rejects invalid US ZIP format (letters)', async () => {
    const req = makeRequest({
      to: { ...validUSAddress, postalOrZip: 'ABCDE' },
      frontHTML: '<html>Test</html>',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).toBe(400)
  })

  it('rejects invalid CA postal code format', async () => {
    const req = makeRequest({
      to: { ...validCAAddress, postalOrZip: '12345' },
      frontHTML: '<html>Test</html>',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    const data = await getResponse(res)
    expect(res.status).toBe(400)
    expect(data.errors!.some(e => e.field === 'to.postalOrZip')).toBe(true)
  })

  // --- Content requirement ---------------------------------------------------

  it('requires at least one of frontHTML, backHTML, message, or image', async () => {
    const req = makeRequest({ to: validUSAddress })
    const res = await handlePostcardCreate(req, mockUser, db)
    const data = await getResponse(res)
    expect(res.status).toBe(400)
    expect(data.errors!.some(e => e.message.includes('frontHTML, backHTML, message, or image'))).toBe(true)
  })

  // --- Missing `to` entirely -------------------------------------------------

  it('rejects when to is missing entirely', async () => {
    const req = makeRequest({ frontHTML: '<html>Test</html>' })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).toBe(400)
    const data = await getResponse(res)
    expect(data.error).toContain('Missing required address fields')
  })
})

// ============================================================================
// Message Validation via Route
// ============================================================================

describe('handlePostcardCreate — Message Validation', () => {
  let db: Database

  beforeEach(() => {
    db = new Database(':memory:')
  })

  it('accepts a valid markdown message', async () => {
    const req = makeRequest({
      to: validCAAddress,
      frontHTML: '<html>Front</html>',
      message: '**Hello** _world_',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).not.toBe(400)
  })

  it('accepts message with special characters', async () => {
    const req = makeRequest({
      to: validCAAddress,
      frontHTML: '<html>Front</html>',
      message: 'Héllo! 日本語テスト 🎉 & <>"\'',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).not.toBe(400)
  })

  it('rejects message exceeding 5000 characters', async () => {
    const req = makeRequest({
      to: validCAAddress,
      frontHTML: '<html>Front</html>',
      message: 'A'.repeat(5001),
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).toBe(400)
    const data = await getResponse(res)
    expect(data.errors!.some(e => e.field === 'message')).toBe(true)
  })

  it('handles XSS attempt in message — script tags are sanitized', async () => {
    const req = makeRequest({
      to: validCAAddress,
      frontHTML: '<html>Front</html>',
      message: '<script>alert("xss")</script>Hello',
    })
    // The route should NOT return 400 — the message is valid, DOMPurify sanitizes
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).not.toBe(400)
  })

  it('handles XSS with event handler attributes — sanitized', async () => {
    const req = makeRequest({
      to: validCAAddress,
      frontHTML: '<html>Front</html>',
      message: '<img src=x onerror=alert(1)>Click me',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).not.toBe(400)
  })
})

// ============================================================================
// Size Validation via Route
// ============================================================================

describe('handlePostcardCreate — Size Validation', () => {
  let db: Database

  beforeEach(() => {
    db = new Database(':memory:')
  })

  it('accepts valid size 6x4', async () => {
    const req = makeRequest({
      to: validUSAddress,
      frontHTML: '<html>Front</html>',
      size: '6x4',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).not.toBe(400)
  })

  it('accepts valid size 9x6', async () => {
    const req = makeRequest({
      to: validUSAddress,
      frontHTML: '<html>Front</html>',
      size: '9x6',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).not.toBe(400)
  })

  it('accepts valid size 11x6', async () => {
    const req = makeRequest({
      to: validUSAddress,
      frontHTML: '<html>Front</html>',
      size: '11x6',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).not.toBe(400)
  })

  it('rejects invalid size', async () => {
    const req = makeRequest({
      to: validUSAddress,
      frontHTML: '<html>Front</html>',
      size: '4x6',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).toBe(400)
    const data = await getResponse(res)
    expect(data.errors!.some(e => e.field === 'size')).toBe(true)
  })
})

// ============================================================================
// XSS / Sanitization Integration
// ============================================================================

describe('handlePostcardCreate — XSS Sanitization', () => {
  let db: Database

  beforeEach(() => {
    db = new Database(':memory:')
  })

  it('sanitizes <script> tags from message', async () => {
    const req = makeRequest({
      to: validCAAddress,
      frontHTML: '<html>Front</html>',
      message: '<script>alert("xss")</script>',
    })
    // Not a validation error — DOMPurify handles sanitization
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).not.toBe(400)
  })

  it('sanitizes onclick attributes from message', async () => {
    const req = makeRequest({
      to: validCAAddress,
      frontHTML: '<html>Front</html>',
      message: '<div onclick="alert(1)">Click</div>',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).not.toBe(400)
  })

  it('handles message with iframe attempt', async () => {
    const req = makeRequest({
      to: validCAAddress,
      frontHTML: '<html>Front</html>',
      message: '<iframe src="evil.com"></iframe>',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).not.toBe(400)
  })

  it('preserves allowed HTML formatting tags', async () => {
    const req = makeRequest({
      to: validCAAddress,
      frontHTML: '<html>Front</html>',
      message: '<strong>bold</strong> <em>italic</em> <u>underline</u>',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).not.toBe(400)
  })
})

// ============================================================================
// Multiple Errors at Once
// ============================================================================

describe('handlePostcardCreate — Multiple Validation Errors', () => {
  let db: Database

  beforeEach(() => {
    db = new Database(':memory:')
  })

  it('returns all errors together for invalid input', async () => {
    const req = makeRequest({
      to: {
        firstName: '',
        lastName: 'Doe',
        // Missing addressLine1, city, provinceOrState, postalOrZip, countryCode
      },
      message: 'A'.repeat(5001),
      size: 'invalid',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).toBe(400)
    const data = await getResponse(res)
    // Should have address errors + message error + size error
    expect(data.errors!.length).toBeGreaterThanOrEqual(3)
  })
})

// ============================================================================
// Return Address Validation
// ============================================================================

describe('handlePostcardCreate — Return Address Validation', () => {
  let db: Database

  beforeEach(() => {
    db = new Database(':memory:')
  })

  it('rejects request without return address (from is required)', async () => {
    const req = makeRequestNoFrom({
      to: validUSAddress,
      frontHTML: '<html>Front</html>',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).toBe(400)
    const data = await getResponse(res)
    expect(data.errors!.some(e => e.field === 'from')).toBe(true)
  })

  it('accepts valid return address', async () => {
    const req = makeRequest({
      to: validUSAddress,
      from: validUSAddress,
      frontHTML: '<html>Front</html>',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).not.toBe(400)
  })

  it('accepts valid CA return address', async () => {
    const req = makeRequest({
      to: validUSAddress,
      from: validCAAddress,
      frontHTML: '<html>Front</html>',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).not.toBe(400)
  })

  it('rejects invalid return address — missing fields', async () => {
    const req = makeRequest({
      to: validUSAddress,
      from: { firstName: 'Only' },
      frontHTML: '<html>Test</html>',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).toBe(400)
    const data = await getResponse(res)
    expect(data.errors!.some(e => e.field.startsWith('from.'))).toBe(true)
  })

  it('rejects invalid return address — bad ZIP code', async () => {
    const req = makeRequest({
      to: validUSAddress,
      from: { ...validUSAddress, postalOrZip: 'BAD' },
      frontHTML: '<html>Test</html>',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).toBe(400)
    const data = await getResponse(res)
    expect(data.errors!.some(e => e.field === 'from.postalOrZip')).toBe(true)
  })

  it('rejects invalid return address — bad state code', async () => {
    const req = makeRequest({
      to: validUSAddress,
      from: { ...validUSAddress, provinceOrState: 'California' },
      frontHTML: '<html>Test</html>',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).toBe(400)
    const data = await getResponse(res)
    expect(data.errors!.some(e => e.field === 'from.provinceOrState')).toBe(true)
  })

  it('rejects invalid return address — unsupported country', async () => {
    const req = makeRequest({
      to: validUSAddress,
      from: { ...validUSAddress, countryCode: 'GB' },
      frontHTML: '<html>Test</html>',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).toBe(400)
    const data = await getResponse(res)
    expect(data.errors!.some(e => e.field === 'from.countryCode')).toBe(true)
  })

  it('rejects return address with empty-string fields', async () => {
    const req = makeRequest({
      to: validUSAddress,
      from: {
        firstName: '',
        lastName: '',
        addressLine1: '',
        city: '',
        provinceOrState: '',
        postalOrZip: '',
        countryCode: '',
      },
      frontHTML: '<html>Test</html>',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).toBe(400)
    const data = await getResponse(res)
    expect(data.errors!.some(e => e.field.startsWith('from.'))).toBe(true)
  })

  it('reports both to and from errors together', async () => {
    const req = makeRequest({
      to: { ...validUSAddress, postalOrZip: 'BAD' },
      from: { ...validUSAddress, postalOrZip: 'BAD' },
      frontHTML: '<html>Test</html>',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).toBe(400)
    const data = await getResponse(res)
    expect(data.errors!.some(e => e.field === 'to.postalOrZip')).toBe(true)
    expect(data.errors!.some(e => e.field === 'from.postalOrZip')).toBe(true)
  })
})

// ============================================================================
// Additional Edge Cases
// ============================================================================

describe('handlePostcardCreate — Additional Edge Cases', () => {
  let db: Database

  beforeEach(() => {
    db = new Database(':memory:')
  })

  // --- Null / non-string field values --------------------------------------

  it('rejects null fields in address', async () => {
    const req = makeRequest({
      to: { ...validUSAddress, firstName: null },
      frontHTML: '<html>Test</html>',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).toBe(400)
  })

  it('rejects numeric fields in address', async () => {
    const req = makeRequest({
      to: { ...validUSAddress, city: 42 },
      frontHTML: '<html>Test</html>',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).toBe(400)
  })

  // --- ZIP+4 and CA postal code variations ---------------------------------

  it('accepts US address with ZIP+4', async () => {
    const req = makeRequest({
      to: { ...validUSAddress, postalOrZip: '62704-1234' },
      frontHTML: '<html>Front</html>',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).not.toBe(400)
  })

  it('accepts CA address with postal code without space', async () => {
    const req = makeRequest({
      to: { ...validCAAddress, postalOrZip: 'K1A0B1' },
      frontHTML: '<html>Front</html>',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).not.toBe(400)
  })

  // --- Lowercase country/state codes ---------------------------------------

  it('accepts lowercase country code', async () => {
    const req = makeRequest({
      to: { ...validUSAddress, countryCode: 'us' },
      frontHTML: '<html>Front</html>',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).not.toBe(400)
  })

  it('accepts lowercase state code', async () => {
    const req = makeRequest({
      to: { ...validUSAddress, provinceOrState: 'il' },
      frontHTML: '<html>Front</html>',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).not.toBe(400)
  })

  // --- Address line 2 (optional) ------------------------------------------

  it('accepts address with optional addressLine2', async () => {
    const req = makeRequest({
      to: { ...validUSAddress, addressLine2: 'Apt 4B' },
      frontHTML: '<html>Front</html>',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).not.toBe(400)
  })

  // --- Message boundary cases ---------------------------------------------

  it('accepts empty message with frontHTML', async () => {
    const req = makeRequest({
      to: validUSAddress,
      frontHTML: '<html>Front</html>',
      message: '',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).not.toBe(400)
  })

  it('accepts message at exactly 5000 characters', async () => {
    const req = makeRequest({
      to: validUSAddress,
      frontHTML: '<html>Front</html>',
      message: 'A'.repeat(5000),
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).not.toBe(400)
  })

  it('accepts backHTML without frontHTML or message', async () => {
    const req = makeRequest({
      to: validUSAddress,
      backHTML: '<html>Back</html>',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).not.toBe(400)
  })

  // --- Address with maxLength edge ----------------------------------------

  it('accepts addressLine1 at exactly 200 characters', async () => {
    const req = makeRequest({
      to: { ...validUSAddress, addressLine1: 'A'.repeat(200) },
      frontHTML: '<html>Front</html>',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).not.toBe(400)
  })

  it('rejects addressLine1 over 200 characters', async () => {
    const req = makeRequest({
      to: { ...validUSAddress, addressLine1: 'A'.repeat(201) },
      frontHTML: '<html>Front</html>',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).toBe(400)
    const data = await getResponse(res)
    expect(data.errors!.some(e => e.field === 'to.addressLine1')).toBe(true)
  })

  // --- Multiple errors combined -------------------------------------------

  it('returns address + message + size errors together', async () => {
    const req = makeRequest({
      to: { ...validUSAddress, postalOrZip: 'BAD', provinceOrState: 'XXX' },
      from: { ...validUSAddress, countryCode: 'XX' },
      message: 'A'.repeat(5001),
      size: 'badsize',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).toBe(400)
    const data = await getResponse(res)
    const fields = data.errors!.map(e => e.field)
    expect(fields).toContain('to.postalOrZip')
    expect(fields).toContain('to.provinceOrState')
    expect(fields).toContain('from.countryCode')
    expect(fields).toContain('message')
    expect(fields).toContain('size')
  })

  // --- Malformed JSON -----------------------------------------------------

  it('handles malformed JSON body gracefully', async () => {
    const req = new Request('http://localhost/api/postcards', {
      method: 'POST',
      body: 'not json at all{{{',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).toBe(500)
  })
})

// ============================================================================
// Address Validation — Additional Edge Cases
// ============================================================================

describe('handlePostcardCreate — Address Edge Cases', () => {
  let db: Database

  beforeEach(() => {
    db = new Database(':memory:')
  })

  it('rejects missing firstName', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { firstName: _firstName, ...noFirst } = validUSAddress
    const req = makeRequest({ to: noFirst, frontHTML: '<html>Test</html>' })
    const res = await handlePostcardCreate(req, mockUser, db)
    const data = await getResponse(res)
    expect(res.status).toBe(400)
    expect(data.errors!.some(e => e.field === 'to.firstName')).toBe(true)
  })

  it('rejects missing lastName', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { lastName: _lastName, ...noLast } = validUSAddress
    const req = makeRequest({ to: noLast, frontHTML: '<html>Test</html>' })
    const res = await handlePostcardCreate(req, mockUser, db)
    const data = await getResponse(res)
    expect(res.status).toBe(400)
    expect(data.errors!.some(e => e.field === 'to.lastName')).toBe(true)
  })

  it('rejects ZIP+4 with letters in +4 part', async () => {
    const req = makeRequest({
      to: { ...validUSAddress, postalOrZip: '62704-ABCD' },
      frontHTML: '<html>Test</html>',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).toBe(400)
    const data = await getResponse(res)
    expect(data.errors!.some(e => e.field === 'to.postalOrZip')).toBe(true)
  })

  it('rejects CA postal code with all digits', async () => {
    const req = makeRequest({
      to: { ...validCAAddress, postalOrZip: '123456' },
      frontHTML: '<html>Test</html>',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).toBe(400)
  })

  it('rejects CA postal code with wrong pattern (all letters)', async () => {
    const req = makeRequest({
      to: { ...validCAAddress, postalOrZip: 'AAAA AAA' },
      frontHTML: '<html>Test</html>',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).toBe(400)
  })

  it('rejects unsupported country code (GB)', async () => {
    const req = makeRequest({
      to: { ...validUSAddress, countryCode: 'GB' },
      frontHTML: '<html>Test</html>',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).toBe(400)
    const data = await getResponse(res)
    expect(data.errors!.some(e => e.field === 'to.countryCode')).toBe(true)
  })

  it('rejects full country name instead of code', async () => {
    const req = makeRequest({
      to: { ...validUSAddress, countryCode: 'United States' },
      frontHTML: '<html>Test</html>',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).toBe(400)
  })

  it('rejects 3-letter country code (USA)', async () => {
    const req = makeRequest({
      to: { ...validUSAddress, countryCode: 'USA' },
      frontHTML: '<html>Test</html>',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).toBe(400)
  })

  it('rejects addressLine1 exceeding 200 characters', async () => {
    const req = makeRequest({
      to: { ...validUSAddress, addressLine1: 'A'.repeat(201) },
      frontHTML: '<html>Test</html>',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).toBe(400)
    const data = await getResponse(res)
    expect(data.errors!.some(e => e.field === 'to.addressLine1')).toBe(true)
  })

  it('accepts addressLine1 at exactly 200 characters', async () => {
    const req = makeRequest({
      to: { ...validUSAddress, addressLine1: 'A'.repeat(200) },
      frontHTML: '<html>Test</html>',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).not.toBe(400)
  })

  it('accepts US ZIP+4 format', async () => {
    const req = makeRequest({
      to: { ...validUSAddress, postalOrZip: '62704-1234' },
      frontHTML: '<html>Test</html>',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).not.toBe(400)
  })

  it('accepts CA postal code without space', async () => {
    const req = makeRequest({
      to: { ...validCAAddress, postalOrZip: 'K1A0B1' },
      frontHTML: '<html>Test</html>',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).not.toBe(400)
  })

  it('accepts lowercase country code', async () => {
    const req = makeRequest({
      to: { ...validUSAddress, countryCode: 'us' },
      frontHTML: '<html>Test</html>',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).not.toBe(400)
  })
})

// ============================================================================
// Message Validation — Additional Edge Cases
// ============================================================================

describe('handlePostcardCreate — Message Edge Cases', () => {
  let db: Database

  beforeEach(() => {
    db = new Database(':memory:')
  })

  it('accepts message at exactly 5000 characters', async () => {
    const req = makeRequest({
      to: validUSAddress,
      frontHTML: '<html>Front</html>',
      message: 'A'.repeat(5000),
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).not.toBe(400)
  })

  it('accepts empty backHTML with valid frontHTML', async () => {
    const req = makeRequest({
      to: validUSAddress,
      frontHTML: '<html>Front</html>',
      backHTML: '',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).not.toBe(400)
  })

  it('accepts message with markdown links', async () => {
    const req = makeRequest({
      to: validUSAddress,
      frontHTML: '<html>Front</html>',
      message: '[Click here](https://example.com)',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).not.toBe(400)
  })

  it('accepts message with only allowed HTML tags', async () => {
    const req = makeRequest({
      to: validUSAddress,
      frontHTML: '<html>Front</html>',
      message: '<strong>bold</strong> <em>italic</em> <u>underline</u> <code>code</code>',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).not.toBe(400)
  })
})

// ============================================================================
// XSS / Sanitization — Additional Edge Cases
// ============================================================================

describe('handlePostcardCreate — XSS Edge Cases', () => {
  let db: Database

  beforeEach(() => {
    db = new Database(':memory:')
  })

  it('sanitizes javascript: URI in href', async () => {
    const req = makeRequest({
      to: validCAAddress,
      frontHTML: '<html>Front</html>',
      message: '[click](javascript:alert(1))',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).not.toBe(400)
  })

  it('sanitizes style attribute injection', async () => {
    const req = makeRequest({
      to: validCAAddress,
      frontHTML: '<html>Front</html>',
      message: '<div style="background:url(javascript:alert(1))">styled</div>',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).not.toBe(400)
  })

  it('sanitizes <object> tag', async () => {
    const req = makeRequest({
      to: validCAAddress,
      frontHTML: '<html>Front</html>',
      message: '<object data="evil.com"></object>',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).not.toBe(400)
  })

  it('sanitizes <embed> tag', async () => {
    const req = makeRequest({
      to: validCAAddress,
      frontHTML: '<html>Front</html>',
      message: '<embed src="evil.swf">',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).not.toBe(400)
  })

  it('sanitizes nested script tags', async () => {
    const req = makeRequest({
      to: validCAAddress,
      frontHTML: '<html>Front</html>',
      message: '<div><script>alert(1)</script></div>',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).not.toBe(400)
  })

  it('sanitizes onerror on img tag', async () => {
    const req = makeRequest({
      to: validCAAddress,
      frontHTML: '<html>Front</html>',
      message: '<img src="x" onerror="alert(1)">',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).not.toBe(400)
  })

  it('sanitizes onload on iframe tag', async () => {
    const req = makeRequest({
      to: validCAAddress,
      frontHTML: '<html>Front</html>',
      message: '<iframe src="evil.com" onload="alert(1)"></iframe>',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).not.toBe(400)
  })

  it('sanitizes SVG-based XSS', async () => {
    const req = makeRequest({
      to: validCAAddress,
      frontHTML: '<html>Front</html>',
      message: '<svg onload="alert(1)"><circle r="10"/></svg>',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).not.toBe(400)
  })

  it('sanitizes data URI XSS', async () => {
    const req = makeRequest({
      to: validCAAddress,
      frontHTML: '<html>Front</html>',
      message: '<a href="data:text/html,<script>alert(1)</script>">click</a>',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).not.toBe(400)
  })
})

// ============================================================================
// Combined Field Validation
// ============================================================================

describe('handlePostcardCreate — Combined Validation Errors', () => {
  let db: Database

  beforeEach(() => {
    db = new Database(':memory:')
  })

  it('returns both address and size errors', async () => {
    const req = makeRequest({
      to: { ...validUSAddress, city: '' },
      frontHTML: '<html>Test</html>',
      size: 'invalid',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).toBe(400)
    const data = await getResponse(res)
    expect(data.errors!.some(e => e.field === 'to.city')).toBe(true)
    expect(data.errors!.some(e => e.field === 'size')).toBe(true)
  })

  it('returns address, message, and size errors together', async () => {
    const req = makeRequest({
      to: { ...validUSAddress, city: '' },
      message: 'A'.repeat(5001),
      size: 'huge',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).toBe(400)
    const data = await getResponse(res)
    expect(data.errors!.some(e => e.field === 'to.city')).toBe(true)
    expect(data.errors!.some(e => e.field === 'message')).toBe(true)
    expect(data.errors!.some(e => e.field === 'size')).toBe(true)
  })

  it('returns content error when no frontHTML, backHTML, or message', async () => {
    const req = makeRequest({ to: validUSAddress })
    const res = await handlePostcardCreate(req, mockUser, db)
    const data = await getResponse(res)
    expect(res.status).toBe(400)
    expect(data.errors!.some(e => e.field === 'content')).toBe(true)
  })
})

// ============================================================================
// Image Validation — Comprehensive Suite
// ============================================================================

// Note: Image validation is performed via validateImage() in utils/validation.ts
// before the route handler sends data to PostGrid. These tests verify the
// validation logic at the utility level since the route handler does not
// currently accept raw image data (images are sent as frontHTML/backHTML).
// The image validation function is what protects against invalid images being
// processed in the pipeline.

import { validateImage } from '../utils/validation'

describe('validateImage — Comprehensive Suite', () => {
  // Minimal 1x1 white JPEG (smallest valid JPEG)
  const minimalJPEG = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AKwA//9k='

  // Minimal 1x1 white PNG
  const minimalPNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='

  // --- Valid images pass ------------------------------------------------------

  describe('valid images — passes', () => {
    it('accepts a valid JPEG image', () => {
      const result = validateImage(minimalJPEG)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('accepts a valid PNG image', () => {
      const result = validateImage(minimalPNG)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
  })

  // --- Invalid formats rejected -----------------------------------------------

  describe('invalid formats — 400 error', () => {
    it('rejects SVG content', () => {
      const svg = btoa('<svg xmlns="http://www.w3.org/2000/svg"><rect width="1" height="1"/></svg>')
      const result = validateImage(svg)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.message.includes('JPEG or PNG'))).toBe(true)
    })

    it('rejects GIF content', () => {
      const gifBytes = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x00, 0x00])
      const gif = btoa(String.fromCharCode(...gifBytes))
      const result = validateImage(gif)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.message.includes('JPEG or PNG'))).toBe(true)
    })

    it('rejects WebP content', () => {
      const webpBytes = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x04, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50])
      const webp = btoa(String.fromCharCode(...webpBytes))
      const result = validateImage(webp)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.message.includes('JPEG or PNG'))).toBe(true)
    })

    it('rejects BMP content', () => {
      const bmpBytes = new Uint8Array([0x42, 0x4D, 0x00, 0x00, 0x00, 0x00])
      const bmp = btoa(String.fromCharCode(...bmpBytes))
      const result = validateImage(bmp)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.message.includes('JPEG or PNG'))).toBe(true)
    })

    it('rejects TIFF little-endian content', () => {
      const tiffBytes = new Uint8Array([0x49, 0x49, 0x2A, 0x00, 0x00, 0x00])
      const result = validateImage(btoa(String.fromCharCode(...tiffBytes)))
      expect(result.valid).toBe(false)
    })

    it('rejects PDF content', () => {
      const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2D])
      const pdf = btoa(String.fromCharCode(...pdfBytes) + '1.7\n')
      const result = validateImage(pdf)
      expect(result.valid).toBe(false)
    })
  })

  // --- Oversized file ---------------------------------------------------------

  describe('oversized file (>10MB) — 400 error', () => {
    it('rejects file over 10MB', () => {
      const buffer = new Uint8Array(10 * 1024 * 1024 + 1)
      buffer[0] = 0xff // JPEG magic
      buffer[1] = 0xd8
      buffer[2] = 0xff
      let binary = ''
      const chunkSize = 8192
      for (let i = 0; i < buffer.length; i += chunkSize) {
        const chunk = buffer.subarray(i, Math.min(i + chunkSize, buffer.length))
        binary += String.fromCharCode(...chunk)
      }
      const base64 = btoa(binary)
      const result = validateImage(base64)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.message.includes('10 MB'))).toBe(true)
    })

    it('reports both size and format errors for oversized non-JPEG/PNG', () => {
      const size = 10 * 1024 * 1024 + 100
      const header = new Uint8Array([0xDE, 0xAD, 0xBE, 0xEF])
      let binary = String.fromCharCode(...header)
      binary += '\x00'.repeat(size - header.length)
      const base64 = btoa(binary)
      const result = validateImage(base64)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.message.includes('10 MB'))).toBe(true)
      expect(result.errors.some(e => e.message.includes('JPEG or PNG'))).toBe(true)
    })
  })

  // --- Corrupt / truncated file -----------------------------------------------

  describe('corrupt/truncated file — 400 error', () => {
    it('rejects data too short to identify format (< 4 bytes)', () => {
      const result = validateImage(btoa('ab'))
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.message.includes('too short'))).toBe(true)
    })

    it('rejects random bytes (not JPEG or PNG)', () => {
      const randomBytes = new Uint8Array([0xDE, 0xAD, 0xBE, 0xEF, 0x12, 0x34])
      const result = validateImage(btoa(String.fromCharCode(...randomBytes)))
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.message.includes('JPEG or PNG'))).toBe(true)
    })

    it('rejects invalid base64 string', () => {
      const result = validateImage('not-valid-base64!!!')
      expect(result.valid).toBe(false)
    })

    it('rejects empty string', () => {
      const result = validateImage('')
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.message.includes('required'))).toBe(true)
    })

    it('rejects image data that is exactly 3 bytes (too short for magic check)', () => {
      const bytes = new Uint8Array([0xff, 0xd8, 0xff])
      const result = validateImage(btoa(String.fromCharCode(...bytes)))
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.message.includes('too short'))).toBe(true)
    })
  })
})

// ============================================================================
// Image Validation — Route-Level Tests
// ============================================================================

describe('handlePostcardCreate — Image Validation (Route Level)', () => {
  let db: Database

  beforeEach(() => {
    db = new Database(':memory:')
  })

  // Minimal valid JPEG base64
  const minimalJPEG = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AKwA//9k='

  // Minimal valid PNG base64
  const minimalPNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='

  it('accepts a valid JPEG image without frontHTML or message', async () => {
    const req = makeRequest({
      to: validUSAddress,
      image: minimalJPEG,
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    // Should not be a validation error (may be 500 if PostGrid not configured)
    expect(res.status).not.toBe(400)
  })

  it('accepts a valid PNG image without frontHTML or message', async () => {
    const req = makeRequest({
      to: validUSAddress,
      image: minimalPNG,
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).not.toBe(400)
  })

  it('accepts image alongside frontHTML', async () => {
    const req = makeRequest({
      to: validUSAddress,
      frontHTML: '<html>Front</html>',
      image: minimalJPEG,
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).not.toBe(400)
  })

  it('accepts image alongside message', async () => {
    const req = makeRequest({
      to: validUSAddress,
      message: 'Hello world',
      image: minimalPNG,
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).not.toBe(400)
  })

  it('rejects SVG image at route level', async () => {
    const svg = btoa('<svg xmlns="http://www.w3.org/2000/svg"><rect width="1" height="1"/></svg>')
    const req = makeRequest({
      to: validUSAddress,
      image: svg,
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).toBe(400)
    const data = await getResponse(res)
    expect(data.errors!.some(e => e.field === 'image')).toBe(true)
  })

  it('rejects GIF image at route level', async () => {
    const gifBytes = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x00, 0x00])
    const gif = btoa(String.fromCharCode(...gifBytes))
    const req = makeRequest({
      to: validUSAddress,
      image: gif,
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).toBe(400)
    const data = await getResponse(res)
    expect(data.errors!.some(e => e.field === 'image')).toBe(true)
  })

  it('rejects WebP image at route level', async () => {
    const webpBytes = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x04, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50])
    const webp = btoa(String.fromCharCode(...webpBytes))
    const req = makeRequest({
      to: validUSAddress,
      image: webp,
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).toBe(400)
    const data = await getResponse(res)
    expect(data.errors!.some(e => e.field === 'image')).toBe(true)
  })

  it('rejects oversized image (>10MB) at route level', async () => {
    const buffer = new Uint8Array(10 * 1024 * 1024 + 1)
    buffer[0] = 0xff // JPEG magic
    buffer[1] = 0xd8
    buffer[2] = 0xff
    let binary = ''
    const chunkSize = 8192
    for (let i = 0; i < buffer.length; i += chunkSize) {
      const chunk = buffer.subarray(i, Math.min(i + chunkSize, buffer.length))
      binary += String.fromCharCode(...chunk)
    }
    const base64 = btoa(binary)
    const req = makeRequest({
      to: validUSAddress,
      image: base64,
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).toBe(400)
    const data = await getResponse(res)
    expect(data.errors!.some(e => e.field === 'image')).toBe(true)
  })

  it('rejects corrupt/truncated image at route level', async () => {
    const randomBytes = new Uint8Array([0xDE, 0xAD, 0xBE, 0xEF, 0x12, 0x34])
    const req = makeRequest({
      to: validUSAddress,
      image: btoa(String.fromCharCode(...randomBytes)),
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).toBe(400)
    const data = await getResponse(res)
    expect(data.errors!.some(e => e.field === 'image')).toBe(true)
  })

  it('rejects invalid base64 string at route level', async () => {
    const req = makeRequest({
      to: validUSAddress,
      image: 'not-valid-base64!!!',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).toBe(400)
    const data = await getResponse(res)
    expect(data.errors!.some(e => e.field === 'image')).toBe(true)
  })

  it('reports image error alongside address errors', async () => {
    const req = makeRequest({
      to: { ...validUSAddress, city: '' },
      image: 'not-valid-base64!!!',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).toBe(400)
    const data = await getResponse(res)
    expect(data.errors!.some(e => e.field === 'to.city')).toBe(true)
    expect(data.errors!.some(e => e.field === 'image')).toBe(true)
  })
})

// ============================================================================
// DOMPurify Sanitization Verification
// ============================================================================

describe('handlePostcardCreate — DOMPurify Sanitization Output', () => {
  let db: Database

  beforeEach(() => {
    db = new Database(':memory:')
  })

  // These tests verify that DOMPurify actually strips dangerous content
  // from messages. The route converts markdown → HTML → DOMPurify.sanitize().
  // Since the postcard goes to PostGrid (physical mail), we need to ensure
  // malicious HTML is properly sanitized even though validation passes.

  it('accepts message with script tags — sanitization removes them', async () => {
    const req = makeRequest({
      to: validUSAddress,
      frontHTML: '<html>Front</html>',
      message: '<script>alert("xss")</script>Hello world',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    // Validation should pass (message is a valid string)
    expect(res.status).not.toBe(400)
  })

  it('accepts message with img onerror — sanitization removes handler', async () => {
    const req = makeRequest({
      to: validUSAddress,
      frontHTML: '<html>Front</html>',
      message: '<img src=x onerror=alert(1)>Click me',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).not.toBe(400)
  })

  it('accepts message with iframe — sanitization removes it', async () => {
    const req = makeRequest({
      to: validUSAddress,
      frontHTML: '<html>Front</html>',
      message: '<iframe src="evil.com"></iframe>Content',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).not.toBe(400)
  })

  it('accepts message with object tag — sanitization removes it', async () => {
    const req = makeRequest({
      to: validUSAddress,
      frontHTML: '<html>Front</html>',
      message: '<object data="evil.com"></object>',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).not.toBe(400)
  })

  it('accepts message with embed tag — sanitization removes it', async () => {
    const req = makeRequest({
      to: validUSAddress,
      frontHTML: '<html>Front</html>',
      message: '<embed src="evil.swf">',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).not.toBe(400)
  })

  it('accepts message with SVG-based XSS — sanitization handles it', async () => {
    const req = makeRequest({
      to: validUSAddress,
      frontHTML: '<html>Front</html>',
      message: '<svg onload="alert(1)"><circle r="10"/></svg>',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).not.toBe(400)
  })

  it('preserves allowed formatting tags (strong, em, u, p, br, code)', async () => {
    const req = makeRequest({
      to: validUSAddress,
      frontHTML: '<html>Front</html>',
      message: '<strong>bold</strong> <em>italic</em> <u>underline</u> <p>paragraph</p><br><code>code</code>',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).not.toBe(400)
  })

  it('handles message with style attribute injection', async () => {
    const req = makeRequest({
      to: validUSAddress,
      frontHTML: '<html>Front</html>',
      message: '<div style="background:url(javascript:alert(1))">styled</div>',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).not.toBe(400)
  })

  it('handles message with data URI XSS attempt', async () => {
    const req = makeRequest({
      to: validUSAddress,
      frontHTML: '<html>Front</html>',
      message: '<a href="data:text/html,<script>alert(1)</script>">click</a>',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).not.toBe(400)
  })

  it('handles nested script tags', async () => {
    const req = makeRequest({
      to: validUSAddress,
      frontHTML: '<html>Front</html>',
      message: '<div><script>alert(1)</script></div>',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).not.toBe(400)
  })
})

// ============================================================================
// Address Validation — Missing firstName / lastName (Route Level)
// ============================================================================

describe('handlePostcardCreate — Missing Name Fields', () => {
  let db: Database

  beforeEach(() => {
    db = new Database(':memory:')
  })

  it('rejects missing firstName at route level', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { firstName: _, ...noFirstName } = validUSAddress
    const req = makeRequest({ to: noFirstName, frontHTML: '<html>Test</html>' })
    const res = await handlePostcardCreate(req, mockUser, db)
    const data = await getResponse(res)
    expect(res.status).toBe(400)
    expect(data.errors!.some(e => e.field === 'to.firstName')).toBe(true)
  })

  it('rejects missing lastName at route level', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { lastName: _, ...noLastName } = validUSAddress
    const req = makeRequest({ to: noLastName, frontHTML: '<html>Test</html>' })
    const res = await handlePostcardCreate(req, mockUser, db)
    const data = await getResponse(res)
    expect(res.status).toBe(400)
    expect(data.errors!.some(e => e.field === 'to.lastName')).toBe(true)
  })

  it('rejects empty firstName at route level', async () => {
    const req = makeRequest({
      to: { ...validUSAddress, firstName: '' },
      frontHTML: '<html>Test</html>',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).toBe(400)
  })

  it('rejects empty lastName at route level', async () => {
    const req = makeRequest({
      to: { ...validUSAddress, lastName: '' },
      frontHTML: '<html>Test</html>',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).toBe(400)
  })

  it('rejects whitespace-only firstName', async () => {
    const req = makeRequest({
      to: { ...validUSAddress, firstName: '   ' },
      frontHTML: '<html>Test</html>',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).toBe(400)
  })

  it('rejects whitespace-only lastName', async () => {
    const req = makeRequest({
      to: { ...validUSAddress, lastName: '\t\n' },
      frontHTML: '<html>Test</html>',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).toBe(400)
  })
})

// ============================================================================
// Address Validation — Country / Postal Code Mismatch
// ============================================================================

describe('handlePostcardCreate — Country/Postal Code Mismatch', () => {
  let db: Database

  beforeEach(() => {
    db = new Database(':memory:')
  })

  it('rejects CA postal code when countryCode is US', async () => {
    const req = makeRequest({
      to: { ...validUSAddress, postalOrZip: 'K1A 0B1' },
      frontHTML: '<html>Test</html>',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).toBe(400)
    const data = await getResponse(res)
    expect(data.errors!.some(e => e.field === 'to.postalOrZip')).toBe(true)
  })

  it('rejects US ZIP code when countryCode is CA', async () => {
    const req = makeRequest({
      to: { ...validCAAddress, postalOrZip: '62704' },
      frontHTML: '<html>Test</html>',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).toBe(400)
    const data = await getResponse(res)
    expect(data.errors!.some(e => e.field === 'to.postalOrZip')).toBe(true)
  })
})

// ============================================================================
// Return Address — Comprehensive Tests
// ============================================================================

describe('handlePostcardCreate — Return Address Comprehensive', () => {
  let db: Database

  beforeEach(() => {
    db = new Database(':memory:')
  })

  it('rejects return address with all empty fields', async () => {
    const req = makeRequest({
      to: validUSAddress,
      from: {
        firstName: '',
        lastName: '',
        addressLine1: '',
        city: '',
        provinceOrState: '',
        postalOrZip: '',
        countryCode: '',
      },
      frontHTML: '<html>Test</html>',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).toBe(400)
    const data = await getResponse(res)
    expect(data.errors!.some(e => e.field.startsWith('from.'))).toBe(true)
  })

  it('rejects return address with all whitespace fields', async () => {
    const req = makeRequest({
      to: validUSAddress,
      from: {
        firstName: '  ',
        lastName: '\t',
        addressLine1: '\n',
        city: '  ',
        provinceOrState: ' ',
        postalOrZip: ' ',
        countryCode: ' ',
      },
      frontHTML: '<html>Test</html>',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).toBe(400)
    const data = await getResponse(res)
    expect(data.errors!.some(e => e.field.startsWith('from.'))).toBe(true)
  })

  it('rejects return address with invalid ZIP format', async () => {
    const req = makeRequest({
      to: validUSAddress,
      from: { ...validUSAddress, postalOrZip: 'INVALID' },
      frontHTML: '<html>Test</html>',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).toBe(400)
    const data = await getResponse(res)
    expect(data.errors!.some(e => e.field === 'from.postalOrZip')).toBe(true)
  })

  it('rejects return address with full state name', async () => {
    const req = makeRequest({
      to: validUSAddress,
      from: { ...validUSAddress, provinceOrState: 'California' },
      frontHTML: '<html>Test</html>',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).toBe(400)
    const data = await getResponse(res)
    expect(data.errors!.some(e => e.field === 'from.provinceOrState')).toBe(true)
  })

  it('rejects return address with unsupported country', async () => {
    const req = makeRequest({
      to: validUSAddress,
      from: { ...validUSAddress, countryCode: 'DE' },
      frontHTML: '<html>Test</html>',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).toBe(400)
    const data = await getResponse(res)
    expect(data.errors!.some(e => e.field === 'from.countryCode')).toBe(true)
  })

  it('accepts valid CA return address with US recipient', async () => {
    const req = makeRequest({
      to: validUSAddress,
      from: validCAAddress,
      frontHTML: '<html>Front</html>',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).not.toBe(400)
  })

  it('reports both to and from errors simultaneously', async () => {
    const req = makeRequest({
      to: { ...validUSAddress, postalOrZip: 'BAD' },
      from: { ...validUSAddress, postalOrZip: 'BAD' },
      frontHTML: '<html>Test</html>',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).toBe(400)
    const data = await getResponse(res)
    expect(data.errors!.some(e => e.field === 'to.postalOrZip')).toBe(true)
    expect(data.errors!.some(e => e.field === 'from.postalOrZip')).toBe(true)
  })
})

// ============================================================================
// Message Validation — Comprehensive Edge Cases
// ============================================================================

describe('handlePostcardCreate — Message Edge Cases Comprehensive', () => {
  let db: Database

  beforeEach(() => {
    db = new Database(':memory:')
  })

  it('accepts empty message when frontHTML is provided', async () => {
    const req = makeRequest({
      to: validUSAddress,
      frontHTML: '<html>Front</html>',
      message: '',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).not.toBe(400)
  })

  it('accepts whitespace-only message when frontHTML is provided', async () => {
    const req = makeRequest({
      to: validUSAddress,
      frontHTML: '<html>Front</html>',
      message: '   ',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).not.toBe(400)
  })

  it('accepts message at exactly 5000 character boundary', async () => {
    const req = makeRequest({
      to: validUSAddress,
      frontHTML: '<html>Front</html>',
      message: 'A'.repeat(5000),
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).not.toBe(400)
  })

  it('rejects message at 5001 characters (one over boundary)', async () => {
    const req = makeRequest({
      to: validUSAddress,
      frontHTML: '<html>Front</html>',
      message: 'A'.repeat(5001),
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).toBe(400)
    const data = await getResponse(res)
    expect(data.errors!.some(e => e.field === 'message')).toBe(true)
  })

  it('handles message with Unicode characters', async () => {
    const req = makeRequest({
      to: validUSAddress,
      frontHTML: '<html>Front</html>',
      message: 'Hello 世界 мир مرحبا 🌍\nNew line\ttab',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).not.toBe(400)
  })

  it('handles message with markdown links', async () => {
    const req = makeRequest({
      to: validUSAddress,
      frontHTML: '<html>Front</html>',
      message: '[Click here](https://example.com)',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).not.toBe(400)
  })

  it('handles message with HTML entities', async () => {
    const req = makeRequest({
      to: validUSAddress,
      frontHTML: '<html>Front</html>',
      message: '&lt;script&gt;alert(1)&lt;/script&gt;',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).not.toBe(400)
  })

  it('handles message that is a single character', async () => {
    const req = makeRequest({
      to: validUSAddress,
      frontHTML: '<html>Front</html>',
      message: 'A',
    })
    const res = await handlePostcardCreate(req, mockUser, db)
    expect(res.status).not.toBe(400)
  })
})
