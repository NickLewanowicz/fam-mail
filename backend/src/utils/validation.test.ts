import { describe, it, expect } from 'bun:test'
import {
  validateAddress,
  validateMessage,
  validateSize,
  validateImage,
  type AddressInput,
} from './validation'

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
      const result = validateAddress({ ...validUSAddress, countryCode: 'GB' })
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
      expect(result.errors[0].message).toContain('JPEG or PNG')
    })

    it('rejects GIF content', () => {
      // GIF magic bytes: GIF89a
      const gifBytes = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x00, 0x00])
      const gif = btoa(String.fromCharCode(...gifBytes))
      const result = validateImage(gif)
      expect(result.valid).toBe(false)
      expect(result.errors[0].message).toContain('JPEG or PNG')
    })

    it('rejects WebP content', () => {
      // WebP magic bytes: RIFF....WEBP
      const webpBytes = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x04, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50])
      const webp = btoa(String.fromCharCode(...webpBytes))
      const result = validateImage(webp)
      expect(result.valid).toBe(false)
    })

    it('rejects BMP content', () => {
      // BMP magic bytes: BM
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

  describe('undersized / degenerate images', () => {
    it('rejects image data that is exactly 3 bytes (too short for magic check)', () => {
      const bytes = new Uint8Array([0xff, 0xd8, 0xff])
      const result = validateImage(btoa(String.fromCharCode(...bytes)))
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.message.includes('too short'))).toBe(true)
    })

    it('accepts a minimal valid JPEG with only 4 bytes', () => {
      // Smallest possible JPEG-like header (4 bytes for magic check)
      const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x00])
      const result = validateImage(btoa(String.fromCharCode(...bytes)))
      expect(result.valid).toBe(true)
    })
  })

  describe('oversized file with invalid format (early exit path)', () => {
    it('reports both size and format errors for oversized non-JPEG/PNG', () => {
      // Build a >10MB base64 string that is NOT valid JPEG or PNG
      const size = 10 * 1024 * 1024 + 100
      const header = new Uint8Array([0xDE, 0xAD, 0xBE, 0xEF]) // invalid magic
      let binary = String.fromCharCode(...header)
      binary += '\x00'.repeat(size - header.length)
      const base64 = btoa(binary)
      const result = validateImage(base64)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.message.includes('10 MB'))).toBe(true)
      expect(result.errors.some(e => e.message.includes('JPEG or PNG'))).toBe(true)
    })
  })

  describe('oversized but valid JPEG header (early exit path)', () => {
    it('reports size error but recognizes JPEG format', () => {
      const size = 10 * 1024 * 1024 + 100
      const header = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]) // JPEG header
      let binary = String.fromCharCode(...header)
      binary += '\x00'.repeat(size - header.length)
      const base64 = btoa(binary)
      const result = validateImage(base64)
      expect(result.valid).toBe(false)
      // Should report only the size error (format is valid)
      expect(result.errors.some(e => e.message.includes('10 MB'))).toBe(true)
      expect(result.errors.some(e => e.message.includes('JPEG or PNG'))).toBe(false)
    })
  })

  describe('oversized but valid PNG header (early exit path)', () => {
    it('reports size error but recognizes PNG format', () => {
      const size = 10 * 1024 * 1024 + 100
      const header = new Uint8Array([0x89, 0x50, 0x4e, 0x47]) // PNG header
      let binary = String.fromCharCode(...header)
      binary += '\x00'.repeat(size - header.length)
      const base64 = btoa(binary)
      const result = validateImage(base64)
      expect(result.valid).toBe(false)
      // Should report only the size error (format is valid)
      expect(result.errors.some(e => e.message.includes('10 MB'))).toBe(true)
      expect(result.errors.some(e => e.message.includes('JPEG or PNG'))).toBe(false)
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
      // Encode in chunks to avoid stack overflow
      let binary = ''
      const chunkSize = 8192
      for (let i = 0; i < buffer.length; i += chunkSize) {
        const chunk = buffer.subarray(i, Math.min(i + chunkSize, buffer.length))
        binary += String.fromCharCode(...chunk)
      }
      const base64 = btoa(binary)
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

  describe('TIFF rejected', () => {
    it('rejects TIFF (little-endian) content', () => {
      const tiffBytes = new Uint8Array([0x49, 0x49, 0x2A, 0x00, 0x00, 0x00])
      const tiff = btoa(String.fromCharCode(...tiffBytes))
      const result = validateImage(tiff)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.message.includes('JPEG or PNG'))).toBe(true)
    })

    it('rejects TIFF (big-endian) content', () => {
      const tiffBytes = new Uint8Array([0x4D, 0x4D, 0x00, 0x2A, 0x00, 0x00])
      const tiff = btoa(String.fromCharCode(...tiffBytes))
      const result = validateImage(tiff)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.message.includes('JPEG or PNG'))).toBe(true)
    })
  })

  describe('PDF rejected', () => {
    it('rejects PDF content', () => {
      const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2D]) // %PDF-
      const pdf = btoa(String.fromCharCode(...pdfBytes) + '1.7\n')
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
