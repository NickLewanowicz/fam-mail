import { describe, it, expect } from 'bun:test'
import {
  validatePostcardRequest,
  validateAndSanitizeMessage,
  validateAddress,
} from './postcard'
import { validateImage, validateMessage, validateSize } from '../utils/validation'
import type { PostGridAddress } from '../types/postgrid'

// ---------------------------------------------------------------------------
// Shared test data
// ---------------------------------------------------------------------------

/** A valid US recipient address used as a base for tests. */
const validUSAddress: PostGridAddress = {
  firstName: 'Jane',
  lastName: 'Doe',
  addressLine1: '123 Main St',
  city: 'Springfield',
  provinceOrState: 'IL',
  postalOrZip: '62701',
  countryCode: 'US',
}

/** A valid Canadian recipient address used as a base for tests. */
const validCAAddress: PostGridAddress = {
  firstName: 'John',
  lastName: 'Smith',
  addressLine1: '456 King St',
  city: 'Ottawa',
  provinceOrState: 'ON',
  postalOrZip: 'K1A 0B1',
  countryCode: 'CA',
}

/** A minimal valid request body (US). */
function validRequestBody(overrides: Record<string, unknown> = {}) {
  return {
    to: { ...validUSAddress },
    frontHTML: '<html><body>Front</body></html>',
    ...overrides,
  }
}

// ===========================================================================
// 1. Address Validation (re-exported from utils/validation via postcard.ts)
// ===========================================================================

describe('validateAddress (from postcard module)', () => {
  // --- Passing cases ---------------------------------------------------------

  describe('valid addresses', () => {
    it('should pass for a valid US address', () => {
      const result = validateAddress(validUSAddress)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should pass for a valid CA address', () => {
      const result = validateAddress(validCAAddress)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should pass for a valid US address with ZIP+4', () => {
      const result = validateAddress({ ...validUSAddress, postalOrZip: '62701-1234' })
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should pass for a valid CA address without space in postal code', () => {
      const result = validateAddress({ ...validCAAddress, postalOrZip: 'K1A0B1' })
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should pass with optional addressLine2', () => {
      const result = validateAddress({ ...validUSAddress, addressLine2: 'Apt 4B' })
      expect(result.valid).toBe(true)
    })
  })

  // --- Missing required fields — each must produce an error ------------------

  describe('missing required fields', () => {
    it('should fail when firstName is missing', () => {
      const result = validateAddress({ ...validUSAddress, firstName: undefined as unknown as string })
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.message.includes('First name'))).toBe(true)
    })

    it('should fail when lastName is missing', () => {
      const result = validateAddress({ ...validUSAddress, lastName: undefined as unknown as string })
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.message.includes('Last name'))).toBe(true)
    })

    it('should fail when provinceOrState is missing', () => {
      const result = validateAddress({ ...validUSAddress, provinceOrState: undefined as unknown as string })
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.message.includes('State/province'))).toBe(true)
    })

    it('should fail when postalOrZip is missing', () => {
      const result = validateAddress({ ...validUSAddress, postalOrZip: undefined as unknown as string })
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.message.includes('Postal/ZIP'))).toBe(true)
    })

    it('should fail when countryCode is missing', () => {
      const result = validateAddress({ ...validUSAddress, countryCode: undefined as unknown as string })
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.message.includes('Country code'))).toBe(true)
    })

    it('should fail when lastName is missing', () => {
      const result = validateAddress({ ...validUSAddress, lastName: undefined as unknown as string })
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.field === 'to.lastName')).toBe(true)
    })

    it('should fail when addressLine1 is missing', () => {
      const result = validateAddress({ ...validUSAddress, addressLine1: undefined as unknown as string })
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.field === 'to.addressLine1')).toBe(true)
    })

    it('should fail when city is missing', () => {
      const result = validateAddress({ ...validUSAddress, city: undefined as unknown as string })
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.field === 'to.city')).toBe(true)
    })

    it('should fail when provinceOrState is missing', () => {
      const result = validateAddress({ ...validUSAddress, provinceOrState: undefined as unknown as string })
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.field === 'to.provinceOrState')).toBe(true)
    })

    it('should fail when postalOrZip is missing', () => {
      const result = validateAddress({ ...validUSAddress, postalOrZip: undefined as unknown as string })
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.field === 'to.postalOrZip')).toBe(true)
    })

    it('should fail when countryCode is missing', () => {
      const result = validateAddress({ ...validUSAddress, countryCode: undefined as unknown as string })
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.field === 'to.countryCode')).toBe(true)
    })

    it('reports multiple missing fields at once', () => {
      const result = validateAddress({})
      expect(result.valid).toBe(false)
      // All 7 required fields should be flagged
      expect(result.errors.length).toBeGreaterThanOrEqual(7)
    })
  })

  // --- Empty string fields ---------------------------------------------------

  describe('empty string fields', () => {
    it('should fail when firstName is empty string', () => {
      const result = validateAddress({ ...validUSAddress, firstName: '' })
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.field === 'to.firstName')).toBe(true)
    })

    it('should fail when lastName is empty string', () => {
      const result = validateAddress({ ...validUSAddress, lastName: '' })
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.field === 'to.lastName')).toBe(true)
    })

    it('should fail when addressLine1 is empty string', () => {
      const result = validateAddress({ ...validUSAddress, addressLine1: '' })
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.field === 'to.addressLine1')).toBe(true)
    })

    it('should fail when city is empty string', () => {
      const result = validateAddress({ ...validUSAddress, city: '' })
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.field === 'to.city')).toBe(true)
    })

    it('should fail when provinceOrState is empty string', () => {
      const result = validateAddress({ ...validUSAddress, provinceOrState: '' })
      expect(result.valid).toBe(false)
    })

    it('should fail when postalOrZip is empty string', () => {
      const result = validateAddress({ ...validUSAddress, postalOrZip: '' })
      expect(result.valid).toBe(false)
    })

    it('should fail when countryCode is empty string', () => {
      const result = validateAddress({ ...validUSAddress, countryCode: '' })
      expect(result.valid).toBe(false)
    })
  })

  // --- Whitespace-only fields ------------------------------------------------

  describe('whitespace-only fields', () => {
    it('should fail when firstName is whitespace-only', () => {
      const result = validateAddress({ ...validUSAddress, firstName: '  \t ' })
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.message.includes('First name'))).toBe(true)
    })

    it('should fail when addressLine1 is whitespace-only', () => {
      const result = validateAddress({ ...validUSAddress, addressLine1: '   ' })
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.field === 'to.addressLine1')).toBe(true)
    })

    it('should fail when city is whitespace-only', () => {
      const result = validateAddress({ ...validUSAddress, city: ' \n ' })
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.field === 'to.city')).toBe(true)
    })

    it('should fail when postalOrZip is whitespace-only', () => {
      const result = validateAddress({ ...validUSAddress, postalOrZip: '\t \n' })
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.message.includes('Postal/ZIP'))).toBe(true)
    })

    it('should fail when lastName is whitespace-only', () => {
      const result = validateAddress({ ...validUSAddress, lastName: '   ' })
      expect(result.valid).toBe(false)
    })

    it('should fail when provinceOrState is whitespace-only', () => {
      const result = validateAddress({ ...validUSAddress, provinceOrState: '  ' })
      expect(result.valid).toBe(false)
    })

    it('should fail when countryCode is whitespace-only', () => {
      const result = validateAddress({ ...validUSAddress, countryCode: '  ' })
      expect(result.valid).toBe(false)
    })
  })

  // --- Invalid state code format ---------------------------------------------

  describe('invalid state code format', () => {
    it('should fail when state code is a full name instead of 2-letter code', () => {
      const result = validateAddress({ ...validUSAddress, provinceOrState: 'California' })
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.message.includes('2-letter code'))).toBe(true)
    })

    it('should fail when state code is 3 characters', () => {
      const result = validateAddress({ ...validUSAddress, provinceOrState: 'ILL' })
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.message.includes('2-letter code'))).toBe(true)
    })

    it('should fail when state code is 1 character', () => {
      const result = validateAddress({ ...validUSAddress, provinceOrState: 'I' })
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.message.includes('2-letter code'))).toBe(true)
    })

    it('should fail when state code contains numbers', () => {
      const result = validateAddress({ ...validUSAddress, provinceOrState: 'I1' })
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.message.includes('2-letter code'))).toBe(true)
    })

    it('should fail when state code is 3 characters', () => {
      const result = validateAddress({ ...validUSAddress, provinceOrState: 'ILL' })
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.field === 'to.provinceOrState')).toBe(true)
    })

    it('should fail when state code is 1 character', () => {
      const result = validateAddress({ ...validUSAddress, provinceOrState: 'I' })
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.field === 'to.provinceOrState')).toBe(true)
    })

    it('should fail when state code contains numbers', () => {
      const result = validateAddress({ ...validUSAddress, provinceOrState: 'I1' })
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.field === 'to.provinceOrState')).toBe(true)
    })
  })

  // --- Invalid postal code formats -------------------------------------------

  describe('US ZIP code format', () => {
    it('should fail for invalid US ZIP code format (too short)', () => {
      const result = validateAddress({ ...validUSAddress, postalOrZip: '1234' })
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.message.includes('US ZIP'))).toBe(true)
    })

    it('should fail for invalid US ZIP code format (too long)', () => {
      const result = validateAddress({ ...validUSAddress, postalOrZip: '123456' })
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.message.includes('US ZIP'))).toBe(true)
    })

    it('should fail for invalid US ZIP code format (letters)', () => {
      const result = validateAddress({ ...validUSAddress, postalOrZip: 'ABCDE' })
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.message.includes('US ZIP'))).toBe(true)
    })

    it('should fail for invalid US ZIP code format (bad dash extension)', () => {
      const result = validateAddress({ ...validUSAddress, postalOrZip: '62701-12' })
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.message.includes('US ZIP'))).toBe(true)
    })

    it('should fail for invalid US ZIP code format (too long)', () => {
      const result = validateAddress({ ...validUSAddress, postalOrZip: '123456' })
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.field === 'to.postalOrZip' && e.message.includes('US ZIP'))).toBe(true)
    })

    it('should fail for invalid US ZIP code format (letters)', () => {
      const result = validateAddress({ ...validUSAddress, postalOrZip: 'ABCDE' })
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.field === 'to.postalOrZip' && e.message.includes('US ZIP'))).toBe(true)
    })

    it('should fail for invalid US ZIP code format (bad dash extension)', () => {
      const result = validateAddress({ ...validUSAddress, postalOrZip: '62701-12' })
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.field === 'to.postalOrZip' && e.message.includes('US ZIP'))).toBe(true)
    })
  })

  describe('Canadian postal code format', () => {
    it('should fail for invalid Canadian postal code format', () => {
      const result = validateAddress({ ...validCAAddress, postalOrZip: 'AAA BBB' })
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.message.includes('Canadian postal code'))).toBe(true)
    })

    it('should fail for Canadian postal code with all digits', () => {
      const result = validateAddress({ ...validCAAddress, postalOrZip: '123 456' })
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.message.includes('Canadian postal code'))).toBe(true)
    })

    it('should fail for Canadian postal code with all digits', () => {
      const result = validateAddress({ ...validCAAddress, postalOrZip: '123 456' })
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.field === 'to.postalOrZip' && e.message.includes('Canadian postal'))).toBe(true)
    })

    it('should fail for empty Canadian postal code', () => {
      const result = validateAddress({ ...validCAAddress, postalOrZip: '' })
      expect(result.valid).toBe(false)
      // Empty string is caught by required field check first
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })

  // --- Invalid country code --------------------------------------------------

  describe('country code', () => {
    it('should fail for 3-letter country code', () => {
      const result = validateAddress({ ...validUSAddress, countryCode: 'USA' })
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.message.includes('Country code'))).toBe(true)
    })

    it('should fail for 1-letter country code', () => {
      const result = validateAddress({ ...validUSAddress, countryCode: 'U' })
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.message.includes('Country code'))).toBe(true)
    })

    it('should fail for numeric country code', () => {
      const result = validateAddress({ ...validUSAddress, countryCode: '12' })
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.message.includes('Country code'))).toBe(true)
    })

    it('should fail for 1-letter country code', () => {
      const result = validateAddress({ ...validUSAddress, countryCode: 'U' })
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.field === 'to.countryCode')).toBe(true)
    })

    it('should fail for numeric country code', () => {
      const result = validateAddress({ ...validUSAddress, countryCode: '12' })
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.field === 'to.countryCode')).toBe(true)
    })

    it('should fail for unsupported country code (GB)', () => {
      const result = validateAddress({ ...validUSAddress, countryCode: 'GB' })
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.field === 'to.countryCode')).toBe(true)
    })

    it('should fail for full country name', () => {
      const result = validateAddress({ ...validUSAddress, countryCode: 'United States' })
      expect(result.valid).toBe(false)
    })
  })

  // --- Address line too long -------------------------------------------------

  describe('address line length', () => {
    it('should fail when addressLine1 exceeds 200 characters', () => {
      const longAddress = 'A'.repeat(201)
      const result = validateAddress({ ...validUSAddress, addressLine1: longAddress })
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.message.includes('200 characters'))).toBe(true)
    })

    it('should pass when addressLine1 is exactly 200 characters', () => {
      const address200 = 'A'.repeat(200)
      const result = validateAddress({ ...validUSAddress, addressLine1: address200 })
      expect(result.valid).toBe(true)
    })
  })

  // --- Prefix ----------------------------------------------------------------

  describe('custom prefix', () => {
    it('uses "from" prefix when specified', () => {
      const result = validateAddress({}, 'from')
      expect(result.errors.some(e => e.field.startsWith('from.'))).toBe(true)
    })
  })
})

// ===========================================================================
// 2. Full Postcard Request Validation (validation/postcard.ts)
// ===========================================================================

describe('validatePostcardRequest', () => {
  // --- Passing cases ---------------------------------------------------------

  it('should pass with valid address and frontHTML', () => {
    const result = validatePostcardRequest(validRequestBody())
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should pass with valid address and backHTML only', () => {
    const result = validatePostcardRequest(validRequestBody({
      frontHTML: undefined,
      backHTML: '<html><body>Back</body></html>',
    }))
    expect(result.valid).toBe(true)
  })

  it('should pass with valid address and message only', () => {
    const result = validatePostcardRequest(validRequestBody({
      frontHTML: undefined,
      message: 'Hello world',
    }))
    expect(result.valid).toBe(true)
  })

  it('should pass with valid CA address', () => {
    const result = validatePostcardRequest(validRequestBody({
      to: { ...validCAAddress },
    }))
    expect(result.valid).toBe(true)
  })

  // --- Missing address -------------------------------------------------------

  it('should fail when "to" is missing', () => {
    const result = validatePostcardRequest({
      frontHTML: '<html>test</html>',
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.field === 'to')).toBe(true)
  })

  it('should fail when "to" is null', () => {
    const result = validatePostcardRequest({
      to: null as unknown as PostGridAddress,
      frontHTML: '<html>test</html>',
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.field === 'to')).toBe(true)
  })

  // --- Missing content -------------------------------------------------------

  it('should fail when no content is provided (no frontHTML, backHTML, or message)', () => {
    const result = validatePostcardRequest({
      to: { ...validUSAddress },
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.field === 'content' && e.message.includes('frontHTML, backHTML, or message'))).toBe(true)
  })

  it('should fail when all content fields are empty strings', () => {
    const result = validatePostcardRequest({
      to: { ...validUSAddress },
      frontHTML: '',
      backHTML: '',
      message: '',
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.field === 'content')).toBe(true)
  })

  // --- Invalid size ----------------------------------------------------------

  it('should fail for invalid size', () => {
    const result = validatePostcardRequest(validRequestBody({ size: '4x6' }))
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.field === 'size')).toBe(true)
  })

  it('should pass for valid size 6x4', () => {
    const result = validatePostcardRequest(validRequestBody({ size: '6x4' }))
    expect(result.valid).toBe(true)
  })

  it('should pass for valid size 9x6', () => {
    const result = validatePostcardRequest(validRequestBody({ size: '9x6' }))
    expect(result.valid).toBe(true)
  })

  it('should pass for valid size 11x6', () => {
    const result = validatePostcardRequest(validRequestBody({ size: '11x6' }))
    expect(result.valid).toBe(true)
  })

  // --- Message length (postcard.ts uses 500 char limit) ----------------------

  it('should fail for message exceeding 500 characters', () => {
    const longMessage = 'A'.repeat(501)
    const result = validatePostcardRequest(validRequestBody({
      frontHTML: undefined,
      message: longMessage,
    }))
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.field === 'message' && e.message.includes('500 characters'))).toBe(true)
  })

  it('should pass for message exactly 500 characters', () => {
    const message500 = 'A'.repeat(500)
    const result = validatePostcardRequest(validRequestBody({
      frontHTML: undefined,
      message: message500,
    }))
    expect(result.valid).toBe(true)
  })

  // --- Combined errors -------------------------------------------------------

  it('should return multiple errors for multiple invalid fields', () => {
    const result = validatePostcardRequest({
      to: {
        firstName: '',
        lastName: 'Doe',
        addressLine1: '123 Main St',
        city: '',
        provinceOrState: 'California',
        postalOrZip: '1234',
        countryCode: 'USA',
      },
    })
    expect(result.valid).toBe(false)
    // Should have errors for: firstName, city, state format, ZIP format, country code format, content
    expect(result.errors.length).toBeGreaterThanOrEqual(3)
  })
})

// ===========================================================================
// 3. Message Validation / Sanitization (validation/postcard.ts)
// ===========================================================================

describe('validateAndSanitizeMessage', () => {
  it('should return the message unchanged for plain text', () => {
    const { sanitized, warnings } = validateAndSanitizeMessage('Hello world')
    expect(sanitized).toBe('Hello world')
    expect(warnings).toHaveLength(0)
  })

  it('should return the message unchanged for valid markdown', () => {
    const { sanitized, warnings } = validateAndSanitizeMessage('**Hello** _world_')
    expect(sanitized).toBe('**Hello** _world_')
    expect(warnings).toHaveLength(0)
  })

  it('should warn when message exceeds 500 characters', () => {
    const longMessage = 'A'.repeat(501)
    const { warnings } = validateAndSanitizeMessage(longMessage)
    expect(warnings.some(w => w.includes('500'))).toBe(true)
  })

  it('should not warn for messages at exactly 500 characters', () => {
    const message500 = 'A'.repeat(500)
    const { warnings } = validateAndSanitizeMessage(message500)
    expect(warnings.some(w => w.includes('500'))).toBe(false)
  })

  // --- XSS detection ---------------------------------------------------------

  describe('XSS detection', () => {
    it('should warn about script tags', () => {
      const { warnings } = validateAndSanitizeMessage('<script>alert("xss")</script>')
      expect(warnings.some(w => w.includes('script tags'))).toBe(true)
    })

    it('should warn about script tags (case-insensitive)', () => {
      const { warnings } = validateAndSanitizeMessage('<SCRIPT>alert("xss")</SCRIPT>')
      expect(warnings.some(w => w.includes('script tags'))).toBe(true)
    })

    it('should warn about iframe tags', () => {
      const { warnings } = validateAndSanitizeMessage('<iframe src="evil.com"></iframe>')
      expect(warnings.some(w => w.includes('iframe tags'))).toBe(true)
    })

    it('should warn about event handler attributes (onclick)', () => {
      const { warnings } = validateAndSanitizeMessage('<div onclick="alert(1)">Click me</div>')
      expect(warnings.some(w => w.includes('event handler'))).toBe(true)
    })

    it('should warn about event handler attributes (onerror)', () => {
      const { warnings } = validateAndSanitizeMessage('<img onerror="alert(1)" src="x">')
      expect(warnings.some(w => w.includes('event handler'))).toBe(true)
    })

    it('should warn about event handler attributes (onload)', () => {
      const { warnings } = validateAndSanitizeMessage('<body onload="alert(1)">')
      expect(warnings.some(w => w.includes('event handler'))).toBe(true)
    })
  })

  // --- Special characters ----------------------------------------------------

  describe('special characters', () => {
    it('should handle special characters gracefully', () => {
      const special = 'Héllo wörld — "quotes" & <brackets>'
      const { sanitized } = validateAndSanitizeMessage(special)
      expect(sanitized).toBe(special)
    })

    it('should handle emoji in messages', () => {
      const emoji = 'Hello 👋 World 🌍'
      const { sanitized } = validateAndSanitizeMessage(emoji)
      expect(sanitized).toBe(emoji)
    })

    it('should handle unicode characters', () => {
      const unicode = '你好世界 こんにちは 안녕하세요'
      const { sanitized } = validateAndSanitizeMessage(unicode)
      expect(sanitized).toBe(unicode)
    })
  })

  // --- Empty message ---------------------------------------------------------

  describe('empty message', () => {
    it('should handle empty message without warnings', () => {
      const { sanitized, warnings } = validateAndSanitizeMessage('')
      expect(sanitized).toBe('')
      expect(warnings).toHaveLength(0)
    })
  })
})

// ===========================================================================
// 4. Image Validation (utils/validation.ts — validateImage)
// ===========================================================================

describe('validateImage (via postcard module)', () => {
  // Minimal 1x1 white JPEG (smallest valid JPEG)
  const minimalJPEG = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AKwA//9k='

  // Minimal 1x1 white PNG
  const minimalPNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='

  describe('valid images', () => {
    it('accepts a valid JPEG', () => {
      const result = validateImage(minimalJPEG)
      expect(result.valid).toBe(true)
    })

    it('accepts a valid PNG', () => {
      const result = validateImage(minimalPNG)
      expect(result.valid).toBe(true)
    })
  })

  describe('invalid formats', () => {
    it('rejects SVG content', () => {
      const svg = btoa('<svg xmlns="http://www.w3.org/2000/svg"><rect width="1" height="1"/></svg>')
      const result = validateImage(svg)
      expect(result.valid).toBe(false)
      expect(result.errors[0].message).toContain('JPEG or PNG')
    })

    it('rejects GIF content', () => {
      const gifBytes = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x00, 0x00])
      const gif = btoa(String.fromCharCode(...gifBytes))
      const result = validateImage(gif)
      expect(result.valid).toBe(false)
      expect(result.errors[0].message).toContain('JPEG or PNG')
    })

    it('rejects WebP content', () => {
      const webpBytes = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x04, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50])
      const webp = btoa(String.fromCharCode(...webpBytes))
      const result = validateImage(webp)
      expect(result.valid).toBe(false)
    })

    it('rejects BMP content', () => {
      const bmpBytes = new Uint8Array([0x42, 0x4D, 0x00, 0x00, 0x00, 0x00])
      const bmp = btoa(String.fromCharCode(...bmpBytes))
      const result = validateImage(bmp)
      expect(result.valid).toBe(false)
    })
  })

  describe('oversized file', () => {
    it('rejects files over 10MB', () => {
      // Create a buffer that claims to be JPEG but is > 10MB
      const buffer = new Uint8Array(10 * 1024 * 1024 + 1)
      buffer[0] = 0xff // JPEG magic
      buffer[1] = 0xd8
      buffer[2] = 0xff
      // Use chunked base64 encoding to avoid call stack overflow with spread operator
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
  })

  describe('corrupt / truncated file', () => {
    it('rejects data that is too short to identify', () => {
      const result = validateImage(btoa('ab'))
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.message.includes('too short'))).toBe(true)
    })

    it('rejects random bytes that look like neither JPEG nor PNG', () => {
      const randomBytes = new Uint8Array([0xDE, 0xAD, 0xBE, 0xEF, 0x12, 0x34])
      const result = validateImage(btoa(String.fromCharCode(...randomBytes)))
      expect(result.valid).toBe(false)
    })

    it('rejects non-base64 string', () => {
      const result = validateImage('not-valid-base64!!!')
      // atob will fail or produce garbage
      // Our implementation catches decode errors
      expect(result.valid).toBe(false)
    })
  })

  describe('empty / missing input', () => {
    it('rejects empty string', () => {
      const result = validateImage('')
      expect(result.valid).toBe(false)
    })
  })
})

// ===========================================================================
// 5. utils/validation.ts — validateMessage
// ===========================================================================

describe('validateMessage (utils)', () => {
  it('accepts a short message', () => {
    const result = validateMessage('Hello, world!')
    expect(result.valid).toBe(true)
  })

  it('accepts an empty message', () => {
    const result = validateMessage('')
    expect(result.valid).toBe(true)
  })

  it('accepts special characters', () => {
    const result = validateMessage('Héllo wörld! 日本語テスト émojis 🎉')
    expect(result.valid).toBe(true)
  })

  it('accepts markdown content', () => {
    const result = validateMessage('**bold** _italic_ [link](https://example.com)')
    expect(result.valid).toBe(true)
  })

  it('accepts message at exactly 5000 characters', () => {
    const result = validateMessage('A'.repeat(5000))
    expect(result.valid).toBe(true)
  })

  it('rejects message exceeding 5000 characters', () => {
    const result = validateMessage('A'.repeat(5001))
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.field === 'message')).toBe(true)
  })

  it('rejects non-string message', () => {
    const result = validateMessage(42 as unknown as string)
    expect(result.valid).toBe(false)
    expect(result.errors[0].message).toContain('string')
  })
})

// ===========================================================================
// 6. utils/validation.ts — validateSize
// ===========================================================================

describe('validateSize (utils)', () => {
  it('accepts 6x4', () => {
    expect(validateSize('6x4').valid).toBe(true)
  })

  it('accepts 9x6', () => {
    expect(validateSize('9x6').valid).toBe(true)
  })

  it('accepts 11x6', () => {
    expect(validateSize('11x6').valid).toBe(true)
  })

  it('rejects 4x6 (old format)', () => {
    const result = validateSize('4x6')
    expect(result.valid).toBe(false)
  })

  it('rejects arbitrary string', () => {
    const result = validateSize('huge')
    expect(result.valid).toBe(false)
  })

  it('rejects empty string', () => {
    const result = validateSize('')
    expect(result.valid).toBe(false)
  })
})

// ===========================================================================
// 7. Return Address Validation (from prefix)
// ===========================================================================

describe('validateAddress — Return Address (from prefix)', () => {
  it('validates a valid return address with "from" prefix', () => {
    const result = validateAddress(validUSAddress, 'from')
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('rejects missing return address fields with "from" prefix', () => {
    const result = validateAddress({}, 'from')
    expect(result.valid).toBe(false)
    expect(result.errors.every(e => e.field.startsWith('from.'))).toBe(true)
    expect(result.errors.length).toBeGreaterThanOrEqual(7)
  })

  it('rejects invalid return address ZIP code with "from" prefix', () => {
    const result = validateAddress({ ...validUSAddress, postalOrZip: 'BAD' }, 'from')
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.field === 'from.postalOrZip')).toBe(true)
  })

  it('rejects invalid return address country code with "from" prefix', () => {
    const result = validateAddress({ ...validUSAddress, countryCode: 'XX' }, 'from')
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.field === 'from.countryCode')).toBe(true)
  })

  it('rejects empty-string return address fields with "from" prefix', () => {
    const emptyFrom = {
      firstName: '',
      lastName: '',
      addressLine1: '',
      city: '',
      provinceOrState: '',
      postalOrZip: '',
      countryCode: '',
    }
    const result = validateAddress(emptyFrom, 'from')
    expect(result.valid).toBe(false)
    expect(result.errors.every(e => e.field.startsWith('from.'))).toBe(true)
  })

  it('rejects whitespace-only return address fields with "from" prefix', () => {
    const wsFrom = {
      firstName: '  ',
      lastName: '\t',
      addressLine1: '\n',
      city: '  ',
      provinceOrState: ' ',
      postalOrZip: ' ',
      countryCode: ' ',
    }
    const result = validateAddress(wsFrom, 'from')
    expect(result.valid).toBe(false)
  })
})

// ===========================================================================
// 8. Additional Gap Coverage
// ===========================================================================

describe('validatePostcardRequest — additional edge cases', () => {
  it('defaults to 6x4 size when no size is provided', () => {
    const result = validatePostcardRequest({
      to: { ...validUSAddress },
      frontHTML: '<html>test</html>',
      // size omitted
    })
    expect(result.valid).toBe(true)
  })

  it('rejects when all content fields are whitespace-only', () => {
    const result = validatePostcardRequest({
      to: { ...validUSAddress },
      frontHTML: '   ',
      backHTML: '\t\n',
      message: '  ',
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.field === 'content')).toBe(true)
  })

  it('collects errors from both address and content validation', () => {
    const result = validatePostcardRequest({
      to: { firstName: '' },
      // no content
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.field.startsWith('to.'))).toBe(true)
    expect(result.errors.some(e => e.field === 'content')).toBe(true)
  })

  it('passes with valid address and all three content fields', () => {
    const result = validatePostcardRequest({
      to: { ...validUSAddress },
      frontHTML: '<html>front</html>',
      backHTML: '<html>back</html>',
      message: 'Hello!',
    })
    expect(result.valid).toBe(true)
  })
})

describe('validateAndSanitizeMessage — additional edge cases', () => {
  it('handles null input by returning warning', () => {
    const { sanitized, warnings } = validateAndSanitizeMessage(null as unknown as string)
    expect(sanitized).toBe('')
    expect(warnings.some(w => w.includes('string'))).toBe(true)
  })

  it('handles undefined input by returning warning', () => {
    const { sanitized, warnings } = validateAndSanitizeMessage(undefined as unknown as string)
    expect(sanitized).toBe('')
    expect(warnings.some(w => w.includes('string'))).toBe(true)
  })

  it('handles numeric input by returning warning', () => {
    const { sanitized, warnings } = validateAndSanitizeMessage(42 as unknown as string)
    expect(sanitized).toBe('')
    expect(warnings.some(w => w.includes('string'))).toBe(true)
  })

  it('warns about multiple XSS patterns in the same message', () => {
    const xssPayload = '<script>alert(1)</script><iframe src="evil.com"></iframe><div onclick="evil()">'
    const { warnings } = validateAndSanitizeMessage(xssPayload)
    expect(warnings.some(w => w.includes('script tags'))).toBe(true)
    expect(warnings.some(w => w.includes('iframe tags'))).toBe(true)
    expect(warnings.some(w => w.includes('event handler'))).toBe(true)
  })

  it('returns message unchanged (sanitization happens in route handler)', () => {
    const xssMessage = '<script>alert("xss")</script>'
    const { sanitized } = validateAndSanitizeMessage(xssMessage)
    expect(sanitized).toBe(xssMessage)
  })

  it('warns about long message with exact character count', () => {
    const longMsg = 'A'.repeat(600)
    const { warnings } = validateAndSanitizeMessage(longMsg)
    expect(warnings.some(w => w.includes('600') && w.includes('500'))).toBe(true)
  })

  it('does not warn for message at exactly 500 characters', () => {
    const msg = 'A'.repeat(500)
    const { warnings } = validateAndSanitizeMessage(msg)
    expect(warnings.some(w => w.includes('500-character'))).toBe(false)
  })
})
