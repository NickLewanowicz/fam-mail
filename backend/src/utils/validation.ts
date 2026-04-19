/**
 * Validation utilities for postcard creation.
 *
 * Invalid postcards sent to PostGrid cost real money and deliver bad experiences.
 * Every field is validated before the API call is made.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AddressInput {
  firstName: string
  lastName: string
  addressLine1: string
  addressLine2?: string
  city: string
  provinceOrState: string
  postalOrZip: string
  countryCode: string
}

export interface ValidationError {
  field: string
  message: string
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Non-empty string that is not just whitespace. */
function isPresent(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

// ---------------------------------------------------------------------------
// Regex patterns
// ---------------------------------------------------------------------------

/** US ZIP: 12345 or 12345-6789 */
const US_ZIP_RE = /^\d{5}(-\d{4})?$/

/** Canadian postal code: A1A 1A1 (space optional) */
const CA_POSTAL_RE = /^[A-Za-z]\d[A-Za-z][\s-]?\d[A-Za-z]\d$/

/** 2-letter province/state code */
const STATE_CODE_RE = /^[A-Za-z]{2}$/

/** 2-letter ISO country code — only US and CA supported for now */
const COUNTRY_CODE_RE = /^(US|CA)$/i

// ---------------------------------------------------------------------------
// Validators
// ---------------------------------------------------------------------------

/**
 * Validate an address for PostGrid.
 *
 * Returns a `ValidationResult` with every error found so callers can report
 * all issues at once instead of one-at-a-time.
 */
export function validateAddress(address: Partial<AddressInput>, prefix = 'to'): ValidationResult {
  const errors: ValidationError[] = []

  // --- Required presence checks ---
  const required: Array<[keyof AddressInput, string]> = [
    ['firstName', 'First name is required'],
    ['lastName', 'Last name is required'],
    ['addressLine1', 'Address line 1 is required'],
    ['city', 'City is required'],
    ['provinceOrState', 'State/province is required'],
    ['postalOrZip', 'Postal/ZIP code is required'],
    ['countryCode', 'Country code is required'],
  ]

  for (const [field, message] of required) {
    if (!isPresent(address[field])) {
      errors.push({ field: `${prefix}.${field}`, message })
    }
  }

  // Short-circuit: if required fields are missing, skip format checks.
  if (errors.length > 0) {
    return { valid: false, errors }
  }

  // --- Format checks ---

  // State/province must be a 2-letter code
  if (!STATE_CODE_RE.test(address.provinceOrState!)) {
    errors.push({
      field: `${prefix}.provinceOrState`,
      message: 'State/province must be a 2-letter code (e.g. "CA", "ON")',
    })
  }

  // Country code must be US or CA
  if (!COUNTRY_CODE_RE.test(address.countryCode!)) {
    errors.push({
      field: `${prefix}.countryCode`,
      message: 'Country code must be "US" or "CA"',
    })
  }

  // Postal code format depends on country
  const country = address.countryCode!.toUpperCase()
  if (country === 'US' && !US_ZIP_RE.test(address.postalOrZip!)) {
    errors.push({
      field: `${prefix}.postalOrZip`,
      message: 'US ZIP code must be 5 digits or 5+4 format (e.g. "12345" or "12345-6789")',
    })
  }

  if (country === 'CA' && !CA_POSTAL_RE.test(address.postalOrZip!)) {
    errors.push({
      field: `${prefix}.postalOrZip`,
      message: 'Canadian postal code must be format "A1A 1A1"',
    })
  }

  // Address line 1 max length
  if (address.addressLine1!.length > 200) {
    errors.push({
      field: `${prefix}.addressLine1`,
      message: 'Address line 1 must be 200 characters or fewer',
    })
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Validate message content (the markdown/HTML back-of-postcard text).
 */
export function validateMessage(message: string): ValidationResult {
  const errors: ValidationError[] = []

  if (typeof message !== 'string') {
    errors.push({ field: 'message', message: 'Message must be a string' })
    return { valid: false, errors }
  }

  // Max practical length for readability on a postcard
  if (message.length > 5000) {
    errors.push({
      field: 'message',
      message: 'Message must be 5000 characters or fewer',
    })
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Validate a postcard size string.
 */
export function validateSize(size: string): ValidationResult {
  const errors: ValidationError[] = []
  const validSizes = ['6x4', '9x6', '11x6']

  if (!validSizes.includes(size)) {
    errors.push({
      field: 'size',
      message: `Size must be one of: ${validSizes.join(', ')}`,
    })
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Validate a base64-encoded image for the postcard front.
 *
 * Checks:
 * - Format (JPEG/PNG only)
 * - File size (≤ 10 MB)
 * - Not corrupt (magic bytes)
 */
export function validateImage(base64Data: string): ValidationResult {
  const errors: ValidationError[] = []

  if (typeof base64Data !== 'string' || base64Data.length === 0) {
    errors.push({ field: 'image', message: 'Image data is required' })
    return { valid: false, errors }
  }

  // Early file size check using base64 length (avoid decoding huge payloads).
  // Base64 encodes 3 bytes as 4 chars; padding chars ('=') don't add data.
  // Subtract padding chars to avoid overestimating the decoded byte count.
  // This avoids the cost of atob() on multi-megabyte strings.
  const MAX_SIZE = 10 * 1024 * 1024
  const paddingChars = base64Data.endsWith('==') ? 2 : base64Data.endsWith('=') ? 1 : 0
  const estimatedBytes = Math.floor(((base64Data.length - paddingChars) * 3) / 4)
  if (estimatedBytes > MAX_SIZE) {
    errors.push({ field: 'image', message: 'Image must be 10 MB or smaller' })
    // Still need to check format, but we can do it cheaply by only decoding
    // the first few bytes.
    let headerBytes: Uint8Array
    try {
      // Decode only enough for magic-byte check (4 bytes = 8 base64 chars)
      const rawHeader = atob(base64Data.slice(0, 8))
      headerBytes = new Uint8Array(rawHeader.length)
      for (let i = 0; i < rawHeader.length; i++) {
        headerBytes[i] = rawHeader.charCodeAt(i)
      }
    } catch {
      errors.push({ field: 'image', message: 'Image must be valid base64' })
      return { valid: false, errors }
    }
    if (headerBytes.length >= 4) {
      const isJPEG = headerBytes[0] === 0xff && headerBytes[1] === 0xd8 && headerBytes[2] === 0xff
      const isPNG = headerBytes[0] === 0x89
        && headerBytes[1] === 0x50  // P
        && headerBytes[2] === 0x4e  // N
        && headerBytes[3] === 0x47  // G
      if (!isJPEG && !isPNG) {
        errors.push({ field: 'image', message: 'Image must be JPEG or PNG format' })
      }
    }
    return { valid: false, errors }
  }

  // Decode base64 to check magic bytes
  let buffer: Uint8Array
  try {
    const raw = atob(base64Data)
    buffer = new Uint8Array(raw.length)
    for (let i = 0; i < raw.length; i++) {
      buffer[i] = raw.charCodeAt(i)
    }
  } catch {
    errors.push({ field: 'image', message: 'Image must be valid base64' })
    return { valid: false, errors }
  }

  // File size check (10 MB) — re-check with decoded length for accuracy
  if (buffer.length > MAX_SIZE) {
    errors.push({ field: 'image', message: 'Image must be 10 MB or smaller' })
  }

  // Magic bytes check
  if (buffer.length < 4) {
    errors.push({ field: 'image', message: 'Image data is too short to be valid' })
    return { valid: errors.length === 0, errors }
  }

  const isJPEG = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
  const isPNG = buffer[0] === 0x89
    && buffer[1] === 0x50  // P
    && buffer[2] === 0x4e  // N
    && buffer[3] === 0x47  // G

  if (!isJPEG && !isPNG) {
    errors.push({ field: 'image', message: 'Image must be JPEG or PNG format' })
  }

  return { valid: errors.length === 0, errors }
}
