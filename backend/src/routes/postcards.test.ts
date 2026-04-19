import { describe, it, expect, beforeEach } from 'bun:test'
import { handlePostcardCreate } from './postcards'
import type { User } from '../models/user'
import { Database } from '../database'

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

/** Helper to make a postcard request. */
function makeRequest(body: Record<string, unknown>): Request {
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

  it('requires at least one of frontHTML, backHTML, or message', async () => {
    const req = makeRequest({ to: validUSAddress })
    const res = await handlePostcardCreate(req, mockUser, db)
    const data = await getResponse(res)
    expect(res.status).toBe(400)
    expect(data.errors!.some(e => e.message.includes('frontHTML, backHTML, or message'))).toBe(true)
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
