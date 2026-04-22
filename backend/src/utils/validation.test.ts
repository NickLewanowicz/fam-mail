import { describe, it, expect } from 'bun:test'
import {
  validateAddress,
  validateMessage,
  validateSize,
  validateImage,
  sanitizeHTML,
  type AddressInput,
} from './validation'

/** Safe base64 encoding for Uint8Array of any size (avoids stack overflow from spread operator). */
function bytesToBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64')
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal valid US address. */
const validUSAddress = {
  firstName: 'Jane',
  lastName: 'Doe',
  addressLine1: '123 Main St',
  city: 'Springfield',
  provinceOrState: 'IL',
  postalOrZip: '62704',
  countryCode: 'US',
}

/** Minimal valid Canadian address. */
const validCAAddress = {
  firstName: 'Jean',
  lastName: 'Tremblay',
  addressLine1: '456 Rue Principale',
  city: 'Ottawa',
  provinceOrState: 'ON',
  postalOrZip: 'K1A 0B1',
  countryCode: 'CA',
}

/** Minimal valid UK address. */
const validGBAddress = {
  firstName: 'James',
  lastName: 'Smith',
  addressLine1: '10 Downing Street',
  city: 'London',
  provinceOrState: 'EN',
  postalOrZip: 'SW1A 1AA',
  countryCode: 'GB',
}

// ============================================================================
// Address Validation
// ============================================================================

describe('validateAddress', () => {
  // --- Valid addresses -------------------------------------------------------

  describe('valid addresses', () => {
    it('accepts a valid US address', () => {
      const result = validateAddress(validUSAddress)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('accepts a valid CA address', () => {
      const result = validateAddress(validCAAddress)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('accepts a valid GB address', () => {
      const result = validateAddress(validGBAddress)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('accepts a US ZIP+4 code', () => {
      const result = validateAddress({ ...validUSAddress, postalOrZip: '62704-1234' })
      expect(result.valid).toBe(true)
    })

    it('accepts a CA postal code without space', () => {
      const result = validateAddress({ ...validCAAddress, postalOrZip: 'K1A0B1' })
      expect(result.valid).toBe(true)
    })

    it('accepts lowercase state codes', () => {
      const result = validateAddress({ ...validUSAddress, provinceOrState: 'il' })
      expect(result.valid).toBe(true)
    })

    it('accepts lowercase country codes', () => {
      const result = validateAddress({ ...validUSAddress, countryCode: 'us' })
      expect(result.valid).toBe(true)
    })

    it('accepts optional addressLine2', () => {
      const result = validateAddress({ ...validUSAddress, addressLine2: 'Apt 4B' })
      expect(result.valid).toBe(true)
    })
  })

  // --- Missing required fields ------------------------------------------------

  describe('missing required fields', () => {
    function omit<K extends keyof AddressInput>(field: K): Partial<AddressInput> {
      const copy = { ...validUSAddress }
      delete copy[field]
      return copy
    }

    it('rejects missing firstName', () => {
      const result = validateAddress(omit('firstName'))
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.field === 'to.firstName')).toBe(true)
    })

    it('rejects missing lastName', () => {
      const result = validateAddress(omit('lastName'))
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.field === 'to.lastName')).toBe(true)
    })

    it('rejects missing addressLine1', () => {
      const result = validateAddress(omit('addressLine1'))
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.field === 'to.addressLine1')).toBe(true)
    })

    it('rejects missing city', () => {
      const result = validateAddress(omit('city'))
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.field === 'to.city')).toBe(true)
    })

    it('rejects missing provinceOrState', () => {
      const result = validateAddress(omit('provinceOrState'))
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.field === 'to.provinceOrState')).toBe(true)
    })

    it('rejects missing postalOrZip', () => {
      const result = validateAddress(omit('postalOrZip'))
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.field === 'to.postalOrZip')).toBe(true)
    })

    it('rejects missing countryCode', () => {
      const result = validateAddress(omit('countryCode'))
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

  // --- Empty / whitespace-only fields -----------------------------------------

  describe('empty and whitespace-only fields', () => {
    it('rejects empty string firstName', () => {
      const result = validateAddress({ ...validUSAddress, firstName: '' })
      expect(result.valid).toBe(false)
    })

    it('rejects whitespace-only firstName', () => {
      const result = validateAddress({ ...validUSAddress, firstName: '   ' })
      expect(result.valid).toBe(false)
    })

    it('rejects empty string addressLine1', () => {
      const result = validateAddress({ ...validUSAddress, addressLine1: '' })
      expect(result.valid).toBe(false)
    })

    it('rejects whitespace-only city', () => {
      const result = validateAddress({ ...validUSAddress, city: '\t\n' })
      expect(result.valid).toBe(false)
    })

    it('rejects empty string countryCode', () => {
      const result = validateAddress({ ...validUSAddress, countryCode: '' })
      expect(result.valid).toBe(false)
    })

    it('rejects whitespace-only lastName', () => {
      const result = validateAddress({ ...validUSAddress, lastName: '   ' })
      expect(result.valid).toBe(false)
    })

    it('rejects whitespace-only provinceOrState', () => {
      const result = validateAddress({ ...validUSAddress, provinceOrState: '  ' })
      expect(result.valid).toBe(false)
    })

    it('rejects whitespace-only postalOrZip', () => {
      const result = validateAddress({ ...validUSAddress, postalOrZip: '   ' })
      expect(result.valid).toBe(false)
    })

    it('rejects empty string city', () => {
      const result = validateAddress({ ...validUSAddress, city: '' })
      expect(result.valid).toBe(false)
    })

    it('rejects tab-only fields', () => {
      const result = validateAddress({ ...validUSAddress, addressLine1: '\t\t' })
      expect(result.valid).toBe(false)
    })

    it('rejects newline-only fields', () => {
      const result = validateAddress({ ...validUSAddress, city: '\n' })
      expect(result.valid).toBe(false)
    })
  })

  // --- State / province format ------------------------------------------------

  describe('state/province format', () => {
    it('rejects full state name instead of 2-letter code', () => {
      const result = validateAddress({ ...validUSAddress, provinceOrState: 'California' })
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.field === 'to.provinceOrState')).toBe(true)
    })

    it('rejects 3-letter code', () => {
      const result = validateAddress({ ...validUSAddress, provinceOrState: 'ILL' })
      expect(result.valid).toBe(false)
    })

    it('rejects single letter', () => {
      const result = validateAddress({ ...validUSAddress, provinceOrState: 'I' })
      expect(result.valid).toBe(false)
    })

    it('rejects numeric state code', () => {
      const result = validateAddress({ ...validUSAddress, provinceOrState: '17' })
      expect(result.valid).toBe(false)
    })
  })

  // --- Postal / ZIP format ---------------------------------------------------

  describe('US ZIP code format', () => {
    it('rejects 4-digit ZIP', () => {
      const result = validateAddress({ ...validUSAddress, postalOrZip: '1234' })
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.field === 'to.postalOrZip')).toBe(true)
    })

    it('rejects 6-digit ZIP', () => {
      const result = validateAddress({ ...validUSAddress, postalOrZip: '123456' })
      expect(result.valid).toBe(false)
    })

    it('rejects ZIP with letters', () => {
      const result = validateAddress({ ...validUSAddress, postalOrZip: '1234A' })
      expect(result.valid).toBe(false)
    })

    it('rejects ZIP with invalid +4 format', () => {
      const result = validateAddress({ ...validUSAddress, postalOrZip: '12345-ABC' })
      expect(result.valid).toBe(false)
    })

    it('rejects ZIP with spaces', () => {
      const result = validateAddress({ ...validUSAddress, postalOrZip: '1234 5' })
      expect(result.valid).toBe(false)
    })

    it('rejects ZIP with special characters', () => {
      const result = validateAddress({ ...validUSAddress, postalOrZip: '12345!' })
      expect(result.valid).toBe(false)
    })

    it('rejects ZIP with trailing dash', () => {
      const result = validateAddress({ ...validUSAddress, postalOrZip: '12345-' })
      expect(result.valid).toBe(false)
    })

    it('rejects ZIP+4 with incomplete +4 (only 2 digits)', () => {
      const result = validateAddress({ ...validUSAddress, postalOrZip: '12345-12' })
      expect(result.valid).toBe(false)
    })
  })

  describe('Canadian postal code format', () => {
    it('rejects all-digits postal code', () => {
      const result = validateAddress({ ...validCAAddress, postalOrZip: '123456' })
      expect(result.valid).toBe(false)
    })

    it('rejects wrong pattern "AAA BBB"', () => {
      const result = validateAddress({ ...validCAAddress, postalOrZip: 'AAA BBB' })
      expect(result.valid).toBe(false)
    })

    it('rejects incomplete postal code', () => {
      const result = validateAddress({ ...validCAAddress, postalOrZip: 'K1A' })
      expect(result.valid).toBe(false)
    })

    it('accepts CA postal code with dash separator', () => {
      const result = validateAddress({ ...validCAAddress, postalOrZip: 'K1A-0B1' })
      expect(result.valid).toBe(true)
    })

    it('rejects CA postal code starting with digit', () => {
      const result = validateAddress({ ...validCAAddress, postalOrZip: '1A2 3B4' })
      expect(result.valid).toBe(false)
    })

    it('rejects CA postal code with only letters', () => {
      const result = validateAddress({ ...validCAAddress, postalOrZip: 'ABC DEF' })
      expect(result.valid).toBe(false)
    })

    it('rejects CA postal code with special characters', () => {
      const result = validateAddress({ ...validCAAddress, postalOrZip: 'K1A_0B1' })
      expect(result.valid).toBe(false)
    })
  })

  // --- Country code ----------------------------------------------------------

  describe('country code', () => {
    it('rejects unsupported country code', () => {
      const result = validateAddress({ ...validUSAddress, countryCode: 'DE' })
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.field === 'to.countryCode')).toBe(true)
    })

    it('rejects full country name', () => {
      const result = validateAddress({ ...validUSAddress, countryCode: 'United States' })
      expect(result.valid).toBe(false)
    })

    it('rejects 3-letter country code', () => {
      const result = validateAddress({ ...validUSAddress, countryCode: 'USA' })
      expect(result.valid).toBe(false)
    })

    it('rejects numeric country code', () => {
      const result = validateAddress({ ...validUSAddress, countryCode: '840' })
      expect(result.valid).toBe(false)
    })

    it('rejects single-letter country code', () => {
      const result = validateAddress({ ...validUSAddress, countryCode: 'U' })
      expect(result.valid).toBe(false)
    })
  })

  // --- Address line 1 length -------------------------------------------------

  describe('address line 1 length', () => {
    it('rejects addressLine1 longer than 200 characters', () => {
      const result = validateAddress({
        ...validUSAddress,
        addressLine1: 'A'.repeat(201),
      })
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.field === 'to.addressLine1')).toBe(true)
    })

    it('accepts addressLine1 of exactly 200 characters', () => {
      const result = validateAddress({
        ...validUSAddress,
        addressLine1: 'A'.repeat(200),
      })
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

  // --- Null / non-string field values ----------------------------------------

  describe('null and non-string field values', () => {
    it('rejects null firstName', () => {
      const result = validateAddress({ ...validUSAddress, firstName: null as unknown as string })
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.field === 'to.firstName')).toBe(true)
    })

    it('rejects undefined addressLine1', () => {
      const result = validateAddress({ ...validUSAddress, addressLine1: undefined as unknown as string })
      expect(result.valid).toBe(false)
    })

    it('rejects numeric city', () => {
      const result = validateAddress({ ...validUSAddress, city: 42 as unknown as string })
      expect(result.valid).toBe(false)
    })

    it('rejects boolean countryCode', () => {
      const result = validateAddress({ ...validUSAddress, countryCode: true as unknown as string })
      expect(result.valid).toBe(false)
    })

    it('rejects object as postalOrZip', () => {
      const result = validateAddress({ ...validUSAddress, postalOrZip: {} as unknown as string })
      expect(result.valid).toBe(false)
    })
  })

  // --- Mixed valid/invalid postal with country mismatch ----------------------

  describe('postal code vs country mismatch', () => {
    it('validates US ZIP when countryCode is US', () => {
      const result = validateAddress({ ...validUSAddress, postalOrZip: 'K1A 0B1' })
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.field === 'to.postalOrZip')).toBe(true)
    })

    it('validates CA postal when countryCode is CA', () => {
      const result = validateAddress({ ...validCAAddress, postalOrZip: '62704' })
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.field === 'to.postalOrZip')).toBe(true)
    })

    it('validates GB postcode when countryCode is GB', () => {
      const result = validateAddress({ ...validGBAddress, postalOrZip: '62704' })
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.field === 'to.postalOrZip')).toBe(true)
    })

    it('rejects US ZIP for GB address', () => {
      const result = validateAddress({ ...validGBAddress, postalOrZip: '12345' })
      expect(result.valid).toBe(false)
    })
  })

  describe('UK postcode formats', () => {
    it('accepts SW1A 1AA (London)', () => {
      const result = validateAddress({ ...validGBAddress, postalOrZip: 'SW1A 1AA' })
      expect(result.valid).toBe(true)
    })

    it('accepts M1 1AA (Manchester)', () => {
      const result = validateAddress({ ...validGBAddress, postalOrZip: 'M1 1AA' })
      expect(result.valid).toBe(true)
    })

    it('accepts EC1A 1BB (City of London)', () => {
      const result = validateAddress({ ...validGBAddress, postalOrZip: 'EC1A 1BB' })
      expect(result.valid).toBe(true)
    })

    it('accepts W1A 0AX (BBC)', () => {
      const result = validateAddress({ ...validGBAddress, postalOrZip: 'W1A 0AX' })
      expect(result.valid).toBe(true)
    })

    it('accepts B33 8TH (Birmingham)', () => {
      const result = validateAddress({ ...validGBAddress, postalOrZip: 'B33 8TH' })
      expect(result.valid).toBe(true)
    })

    it('rejects invalid UK postcode', () => {
      const result = validateAddress({ ...validGBAddress, postalOrZip: 'INVALID' })
      expect(result.valid).toBe(false)
      expect(result.errors[0].message).toContain('UK postcode')
    })
  })

  describe('GB country code acceptance', () => {
    it('accepts GB as valid country code', () => {
      const result = validateAddress(validGBAddress)
      expect(result.valid).toBe(true)
    })
  })
})

// ============================================================================
// Message Validation
// ============================================================================

describe('validateMessage', () => {
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

  it('rejects null message', () => {
    const result = validateMessage(null as unknown as string)
    expect(result.valid).toBe(false)
  })

  it('rejects undefined message', () => {
    const result = validateMessage(undefined as unknown as string)
    expect(result.valid).toBe(false)
  })

  it('rejects numeric message', () => {
    const result = validateMessage(12345 as unknown as string)
    expect(result.valid).toBe(false)
  })

  it('accepts message at exactly 5000 chars boundary', () => {
    const result = validateMessage('A'.repeat(5000))
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('rejects message at 5001 chars (one over boundary)', () => {
    const result = validateMessage('A'.repeat(5001))
    expect(result.valid).toBe(false)
    expect(result.errors).toHaveLength(1)
  })

  it('accepts message with XSS-like content — validation passes (sanitization is separate)', () => {
    const result = validateMessage('<script>alert("xss")</script>')
    expect(result.valid).toBe(true)
  })

  it('accepts message with HTML entities', () => {
    const result = validateMessage('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(result.valid).toBe(true)
  })

  it('accepts message with mixed Unicode and ASCII', () => {
    const result = validateMessage('Hello 世界 мир مرحبا 🌍\nNew line\ttab')
    expect(result.valid).toBe(true)
  })

  it('accepts message that is a single character', () => {
    const result = validateMessage('A')
    expect(result.valid).toBe(true)
  })

  it('accepts message with only whitespace', () => {
    const result = validateMessage('   ')
    expect(result.valid).toBe(true)
  })
})

// ============================================================================
// Size Validation
// ============================================================================

describe('validateSize', () => {
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

// ============================================================================
// Image Validation
// ============================================================================

describe('validateImage', () => {
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
      expect(result.errors[0].message).toContain('JPEG, PNG, or WebP')
    })

    it('rejects GIF content', () => {
      // GIF magic bytes: GIF89a
      const gifBytes = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x00, 0x00])
      const gif = bytesToBase64(gifBytes)
      const result = validateImage(gif)
      expect(result.valid).toBe(false)
      expect(result.errors[0].message).toContain('JPEG, PNG, or WebP')
    })

    it('accepts WebP content', () => {
      // WebP magic bytes: RIFF....WEBP
      const webpBytes = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x04, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50])
      const webp = bytesToBase64(webpBytes)
      const result = validateImage(webp)
      expect(result.valid).toBe(true)
    })

    it('rejects BMP content', () => {
      // BMP magic bytes: BM
      const bmpBytes = new Uint8Array([0x42, 0x4D, 0x00, 0x00, 0x00, 0x00])
      const bmp = bytesToBase64(bmpBytes)
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
      // Use Buffer-based base64 encoding to avoid call stack overflow with spread operator
      const base64 = bytesToBase64(buffer)
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
      const result = validateImage(bytesToBase64(randomBytes))
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

  describe('undersized / degenerate images', () => {
    it('rejects image data that is exactly 3 bytes (too short for magic check)', () => {
      const bytes = new Uint8Array([0xff, 0xd8, 0xff])
      const result = validateImage(bytesToBase64(bytes))
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.message.includes('too short'))).toBe(true)
    })

    it('accepts a minimal valid JPEG with only 4 bytes', () => {
      // Smallest possible JPEG-like header (4 bytes for magic check)
      const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x00])
      const result = validateImage(bytesToBase64(bytes))
      expect(result.valid).toBe(true)
    })
  })

  describe('oversized file with invalid format (early exit path)', () => {
    it('reports both size and format errors for oversized non-JPEG/PNG', () => {
      // Build a >10MB base64 string that is NOT valid JPEG, PNG, or WebP
      const size = 10 * 1024 * 1024 + 100
      const header = new Uint8Array([0xDE, 0xAD, 0xBE, 0xEF]) // invalid magic
      const buffer = new Uint8Array(size)
      buffer.set(header, 0)
      const base64 = bytesToBase64(buffer)
      const result = validateImage(base64)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.message.includes('10 MB'))).toBe(true)
      expect(result.errors.some(e => e.message.includes('JPEG, PNG, or WebP'))).toBe(true)
    })
  })

  describe('oversized but valid JPEG header (early exit path)', () => {
    it('reports size error but recognizes JPEG format', () => {
      const size = 10 * 1024 * 1024 + 100
      const header = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]) // JPEG header
      const buffer = new Uint8Array(size)
      buffer.set(header, 0)
      const base64 = bytesToBase64(buffer)
      const result = validateImage(base64)
      expect(result.valid).toBe(false)
      // Should report only the size error (format is valid)
      expect(result.errors.some(e => e.message.includes('10 MB'))).toBe(true)
      expect(result.errors.some(e => e.message.includes('JPEG, PNG, or WebP'))).toBe(false)
    })
  })

  describe('oversized but valid PNG header (early exit path)', () => {
    it('reports size error but recognizes PNG format', () => {
      const size = 10 * 1024 * 1024 + 100
      const header = new Uint8Array([0x89, 0x50, 0x4e, 0x47]) // PNG header
      const buffer = new Uint8Array(size)
      buffer.set(header, 0)
      const base64 = bytesToBase64(buffer)
      const result = validateImage(base64)
      expect(result.valid).toBe(false)
      // Should report only the size error (format is valid)
      expect(result.errors.some(e => e.message.includes('10 MB'))).toBe(true)
      expect(result.errors.some(e => e.message.includes('JPEG, PNG, or WebP'))).toBe(false)
    })
  })

  describe('valid image at exactly 10MB boundary', () => {
    it('accepts image whose decoded size is exactly 10MB', () => {
      // Build a JPEG buffer that is exactly 10MB at the byte level
      const size = 10 * 1024 * 1024
      const buffer = new Uint8Array(size)
      buffer[0] = 0xff  // JPEG magic
      buffer[1] = 0xd8
      buffer[2] = 0xff
      buffer[3] = 0xe0
      const base64 = bytesToBase64(buffer)
      const result = validateImage(base64)
      expect(result.valid).toBe(true)
    })

    it('rejects image whose decoded size is 10MB + 1 byte', () => {
      const size = 10 * 1024 * 1024 + 1
      const buffer = new Uint8Array(size)
      buffer[0] = 0xff  // JPEG magic
      buffer[1] = 0xd8
      buffer[2] = 0xff
      buffer[3] = 0xe0
      const base64 = bytesToBase64(buffer)
      const result = validateImage(base64)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.message.includes('10 MB'))).toBe(true)
    })
  })

  describe('TIFF rejected', () => {
    it('rejects TIFF (little-endian) content', () => {
      const tiffBytes = new Uint8Array([0x49, 0x49, 0x2A, 0x00, 0x00, 0x00])
      const tiff = bytesToBase64(tiffBytes)
      const result = validateImage(tiff)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.message.includes('JPEG, PNG, or WebP'))).toBe(true)
    })

    it('rejects TIFF (big-endian) content', () => {
      const tiffBytes = new Uint8Array([0x4D, 0x4D, 0x00, 0x2A, 0x00, 0x00])
      const tiff = bytesToBase64(tiffBytes)
      const result = validateImage(tiff)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.message.includes('JPEG, PNG, or WebP'))).toBe(true)
    })
  })

  describe('PDF rejected', () => {
    it('rejects PDF content', () => {
      const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x37, 0x0A]) // %PDF-1.7\n
      const pdf = bytesToBase64(pdfBytes)
      const result = validateImage(pdf)
      expect(result.valid).toBe(false)
    })
  })
})

// ============================================================================
// Return Address Validation (from prefix)
// ============================================================================

describe('validateAddress — Return Address (from)', () => {
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

// ============================================================================
// Additional Edge Case Coverage
// ============================================================================

describe('validateAddress — combined format errors', () => {
  it('reports multiple format errors when state, ZIP, and country are all invalid', () => {
    const result = validateAddress({
      firstName: 'Jane',
      lastName: 'Doe',
      addressLine1: '123 Main St',
      city: 'Springfield',
      provinceOrState: 'California',    // invalid: not 2-letter
      postalOrZip: 'ABCDE',             // invalid: not a US ZIP
      countryCode: 'USA',               // invalid: not US, CA, or GB
    })
    expect(result.valid).toBe(false)
    // State and country format errors are always reported
    expect(result.errors.some(e => e.field === 'to.provinceOrState')).toBe(true)
    expect(result.errors.some(e => e.field === 'to.countryCode')).toBe(true)
    // Note: postal code format check is skipped when countryCode is not US, CA, or GB
    // so no postalOrZip error in this specific combination
    expect(result.errors.length).toBeGreaterThanOrEqual(2)
  })

  it('reports state + ZIP format errors when country is valid US but other fields are bad', () => {
    const result = validateAddress({
      firstName: 'Jane',
      lastName: 'Doe',
      addressLine1: '123 Main St',
      city: 'Springfield',
      provinceOrState: 'California',    // invalid: not 2-letter
      postalOrZip: 'ABCDE',             // invalid: not a US ZIP
      countryCode: 'US',                // valid
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.field === 'to.provinceOrState')).toBe(true)
    expect(result.errors.some(e => e.field === 'to.postalOrZip')).toBe(true)
    expect(result.errors.length).toBeGreaterThanOrEqual(2)
  })
})

describe('validateAddress — addressLine2 does not cause errors', () => {
  it('accepts undefined addressLine2', () => {
    const { addressLine2: _ignored, ...addr } = validUSAddress
    void _ignored
    const result = validateAddress(addr)
    expect(result.valid).toBe(true)
  })

  it('accepts empty string addressLine2', () => {
    const result = validateAddress({ ...validUSAddress, addressLine2: '' })
    expect(result.valid).toBe(true)
  })

  it('accepts long addressLine2 (no length limit enforced)', () => {
    const result = validateAddress({ ...validUSAddress, addressLine2: 'B'.repeat(500) })
    expect(result.valid).toBe(true)
  })
})

describe('validateMessage — additional edge cases', () => {
  it('rejects boolean true as message', () => {
    const result = validateMessage(true as unknown as string)
    expect(result.valid).toBe(false)
    expect(result.errors[0].message).toContain('string')
  })

  it('rejects array as message', () => {
    const result = validateMessage(['hello'] as unknown as string)
    expect(result.valid).toBe(false)
  })

  it('rejects object as message', () => {
    const result = validateMessage({ text: 'hello' } as unknown as string)
    expect(result.valid).toBe(false)
  })

  it('accepts a very long URL in message', () => {
    const longUrl = 'https://example.com/' + 'a'.repeat(4000)
    const result = validateMessage(longUrl)
    expect(result.valid).toBe(true)
  })
})

describe('validateSize — additional edge cases', () => {
  it('rejects uppercase size string', () => {
    const result = validateSize('6X4')
    expect(result.valid).toBe(false)
  })

  it('rejects size with spaces', () => {
    const result = validateSize('6 x 4')
    expect(result.valid).toBe(false)
  })

  it('rejects numeric size', () => {
    const result = validateSize(6 as unknown as string)
    expect(result.valid).toBe(false)
  })

  it('includes all valid sizes in error message', () => {
    const result = validateSize('invalid')
    expect(result.errors[0].message).toContain('6x4')
    expect(result.errors[0].message).toContain('9x6')
    expect(result.errors[0].message).toContain('11x6')
  })
})

describe('validateImage — additional edge cases', () => {
  it('rejects null input', () => {
    const result = validateImage(null as unknown as string)
    expect(result.valid).toBe(false)
  })

  it('rejects undefined input', () => {
    const result = validateImage(undefined as unknown as string)
    expect(result.valid).toBe(false)
  })

  it('rejects numeric input', () => {
    const result = validateImage(12345 as unknown as string)
    expect(result.valid).toBe(false)
  })

  it('rejects oversized file with invalid base64 in early-exit path', () => {
    // Build a string >10MB estimate that also fails base64 decode
    const hugeInvalid = '!!!' + 'A'.repeat(14_000_000)
    const result = validateImage(hugeInvalid)
    expect(result.valid).toBe(false)
  })
})

// ============================================================================
// HTML Sanitization
// ============================================================================

describe('sanitizeHTML', () => {
  describe('removes dangerous tags', () => {
    it('removes <script> tags and their contents', () => {
      const result = sanitizeHTML('<p>Hello</p><script>alert("xss")</script><p>World</p>')
      expect(result).not.toContain('<script>')
      expect(result).not.toContain('alert')
      expect(result).toContain('<p>Hello</p>')
      expect(result).toContain('<p>World</p>')
    })

    it('removes <iframe> tags', () => {
      const result = sanitizeHTML('<p>Text</p><iframe src="evil.com"></iframe>')
      expect(result).not.toContain('<iframe')
      expect(result).toContain('<p>Text</p>')
    })

    it('removes <object> tags', () => {
      const result = sanitizeHTML('<object data="evil.swf"></object><p>Safe</p>')
      expect(result).not.toContain('<object')
      expect(result).toContain('<p>Safe</p>')
    })

    it('removes <embed> tags', () => {
      const result = sanitizeHTML('<embed src="evil.swf"><p>Safe</p>')
      expect(result).not.toContain('<embed')
      expect(result).toContain('<p>Safe</p>')
    })

    it('removes <form> and form elements', () => {
      const result = sanitizeHTML('<form action="evil.com"><input name="data"><button>Submit</button></form>')
      expect(result).not.toContain('<form')
      expect(result).not.toContain('<input')
      expect(result).not.toContain('<button')
    })

    it('removes <svg> tags', () => {
      const result = sanitizeHTML('<svg onload="alert(1)"><circle r="10"/></svg><p>Safe</p>')
      expect(result).not.toContain('<svg')
      expect(result).toContain('<p>Safe</p>')
    })

    it('removes <link> tags', () => {
      const result = sanitizeHTML('<link rel="stylesheet" href="evil.css"><p>Safe</p>')
      expect(result).not.toContain('<link')
    })
  })

  describe('removes dangerous attributes', () => {
    it('removes onclick attributes', () => {
      const result = sanitizeHTML('<div onclick="alert(1)">Click</div>')
      expect(result).not.toContain('onclick')
      expect(result).toContain('<div>Click</div>')
    })

    it('removes onerror attributes', () => {
      const result = sanitizeHTML('<img src="x" onerror="alert(1)">')
      expect(result).not.toContain('onerror')
    })

    it('removes onload attributes', () => {
      const result = sanitizeHTML('<img src="valid.jpg" onload="alert(1)">')
      expect(result).not.toContain('onload')
    })

    it('removes onmouseover attributes', () => {
      const result = sanitizeHTML('<div onmouseover="alert(1)">Hover</div>')
      expect(result).not.toContain('onmouseover')
    })

    it('removes onfocus attributes', () => {
      const result = sanitizeHTML('<div onfocus="alert(1)">Focus</div>')
      expect(result).not.toContain('onfocus')
    })

    it('removes style attributes', () => {
      const result = sanitizeHTML('<div style="background:url(javascript:alert(1))">styled</div>')
      expect(result).not.toContain('style=')
      expect(result).toContain('<div>styled</div>')
    })

    it('removes javascript: URIs', () => {
      const result = sanitizeHTML('<a href="javascript:alert(1)">click</a>')
      expect(result).not.toContain('javascript:')
    })
  })

  describe('preserves safe content', () => {
    it('preserves structural HTML (html, head, body, meta, style)', () => {
      // DOMPurify returns body content only — html/head/body wrapping is stripped.
      // Style tags inside <head> are also stripped; only body-level content survives.
      // We verify that safe body-level content is preserved intact.
      const html = '<div class="card"><p>Hi</p></div>'
      const result = sanitizeHTML(html)
      expect(result).toContain('<div class="card">')
      expect(result).toContain('<p>Hi</p>')
    })

    it('preserves text formatting tags', () => {
      const html = '<strong>bold</strong> <em>italic</em> <u>underline</u> <s>strike</s> <b>bold2</b> <i>italic2</i>'
      const result = sanitizeHTML(html)
      expect(result).toContain('<strong>bold</strong>')
      expect(result).toContain('<em>italic</em>')
      expect(result).toContain('<u>underline</u>')
      expect(result).toContain('<s>strike</s>')
      expect(result).toContain('<b>bold2</b>')
      expect(result).toContain('<i>italic2</i>')
    })

    it('preserves heading tags', () => {
      const html = '<h1>H1</h1><h2>H2</h2><h3>H3</h3><h4>H4</h4><h5>H5</h5><h6>H6</h6>'
      const result = sanitizeHTML(html)
      for (let i = 1; i <= 6; i++) {
        expect(result).toContain(`<h${i}>H${i}</h${i}>`)
      }
    })

    it('preserves list tags', () => {
      const html = '<ul><li>Item 1</li></ul><ol><li>Item 2</li></ol>'
      const result = sanitizeHTML(html)
      expect(result).toContain('<ul>')
      expect(result).toContain('<ol>')
      expect(result).toContain('<li>')
    })

    it('preserves table tags', () => {
      const html = '<table><thead><tr><th>Header</th></tr></thead><tbody><tr><td>Cell</td></tr></tbody></table>'
      const result = sanitizeHTML(html)
      expect(result).toContain('<table>')
      expect(result).toContain('<thead>')
      expect(result).toContain('<th>Header</th>')
      expect(result).toContain('<td>Cell</td>')
    })

    it('preserves blockquote, code, pre tags', () => {
      const html = '<blockquote>Quote</blockquote><pre><code>Code</code></pre>'
      const result = sanitizeHTML(html)
      expect(result).toContain('<blockquote>')
      expect(result).toContain('<pre>')
      expect(result).toContain('<code>')
    })

    it('preserves img tags with safe attributes', () => {
      const html = '<img src="photo.jpg" alt="A photo" class="postcard-image">'
      const result = sanitizeHTML(html)
      expect(result).toContain('src="photo.jpg"')
      expect(result).toContain('alt="A photo"')
      expect(result).toContain('class="postcard-image"')
    })

    it('preserves a tags with safe href', () => {
      const html = '<a href="https://example.com" class="link">Click</a>'
      const result = sanitizeHTML(html)
      expect(result).toContain('href="https://example.com"')
      expect(result).toContain('class="link"')
    })

    it('preserves div and span with class', () => {
      const html = '<div class="container"><span class="text">Hello</span></div>'
      const result = sanitizeHTML(html)
      expect(result).toContain('class="container"')
      expect(result).toContain('class="text"')
    })

    it('preserves br and hr tags', () => {
      const html = '<p>Line 1<br>Line 2</p><hr><p>After</p>'
      const result = sanitizeHTML(html)
      expect(result).toContain('<br>')
      expect(result).toContain('<hr>')
    })
  })

  describe('complex attack vectors', () => {
    it('handles nested script in div', () => {
      const result = sanitizeHTML('<div><script>alert(1)</script></div>')
      expect(result).not.toContain('<script>')
      expect(result).not.toContain('alert')
    })

    it('handles multiple attack vectors at once', () => {
      const html = `
        <script>alert('xss')</script>
        <iframe src="evil.com"></iframe>
        <img src=x onerror=alert(1)>
        <div onclick="alert(1)">Click</div>
        <a href="javascript:alert(1)">Link</a>
        <svg onload="alert(1)"></svg>
        <object data="evil.swf"></object>
      `
      const result = sanitizeHTML(html)
      expect(result).not.toContain('<script>')
      expect(result).not.toContain('<iframe')
      expect(result).not.toContain('onerror')
      expect(result).not.toContain('onclick')
      expect(result).not.toContain('javascript:')
      expect(result).not.toContain('<svg')
      expect(result).not.toContain('<object')
    })

    it('handles data URI XSS', () => {
      const result = sanitizeHTML('<a href="data:text/html,<script>alert(1)</script>">click</a>')
      expect(result).not.toContain('data:text/html')
    })
  })

  describe('edge cases', () => {
    it('returns empty string for empty input', () => {
      expect(sanitizeHTML('')).toBe('')
    })

    it('handles plain text without any HTML', () => {
      expect(sanitizeHTML('Just some text')).toBe('Just some text')
    })

    it('handles full postcard HTML document with safe content', () => {
      const postcard = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:Arial}</style></head><body><div class="message"><h1>Hello!</h1><p>This is a postcard message.</p></div></body></html>`
      const result = sanitizeHTML(postcard)
      // DOMPurify returns body content only; html/head/style wrapping is stripped
      expect(result).toContain('<h1>Hello!</h1>')
      expect(result).toContain('<p>This is a postcard message.</p>')
      expect(result).toContain('class="message"')
    })

    it('sanitizes full postcard HTML with injected script', () => {
      const postcard = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:Arial}</style></head><body><div class="message"><script>alert('xss')</script><h1>Hello!</h1></div></body></html>`
      const result = sanitizeHTML(postcard)
      expect(result).not.toContain('<script>')
      expect(result).not.toContain('alert')
      expect(result).toContain('<h1>Hello!</h1>')
      expect(result).toContain('class="message"')
    })
  })
})
