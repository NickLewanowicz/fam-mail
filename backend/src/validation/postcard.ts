/**
 * High-level postcard request validation.
 *
 * Combines address, message, and size validation into a single check for the
 * full postcard creation request body.
 */

import {
  validateAddress as utilsValidateAddress,
  validateSize,
} from '../utils/validation'
import type { ValidationResult, ValidationError } from '../utils/validation'

// Re-export for convenience
export { validateAddress } from '../utils/validation'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PostcardRequestBody {
  to?: Record<string, unknown>
  frontHTML?: string
  backHTML?: string
  message?: string
  size?: string
}

export interface MessageSanitizationResult {
  sanitized: string
  warnings: string[]
}

// ---------------------------------------------------------------------------
// validatePostcardRequest
// ---------------------------------------------------------------------------

/**
 * Validate a full postcard creation request body.
 *
 * Returns every error found so the caller can report all issues at once.
 */
export function validatePostcardRequest(body: PostcardRequestBody): ValidationResult & { errors: ValidationError[] } {
  const errors: ValidationError[] = []

  // --- Address ---
  if (!body.to || body.to === null) {
    errors.push({ field: 'to', message: 'Recipient address (to) is required' })
  } else {
    const addressResult = utilsValidateAddress(body.to as Parameters<typeof utilsValidateAddress>[0], 'to')
    if (!addressResult.valid) {
      errors.push(...addressResult.errors)
    }
  }

  // --- Content ---
  const hasContent = (typeof body.frontHTML === 'string' && body.frontHTML.trim().length > 0)
    || (typeof body.backHTML === 'string' && body.backHTML.trim().length > 0)
    || (typeof body.message === 'string' && body.message.trim().length > 0)

  if (!hasContent) {
    errors.push({ field: 'content', message: 'At least one of frontHTML, backHTML, or message is required' })
  }

  // --- Message length ---
  if (typeof body.message === 'string' && body.message.length > 500) {
    errors.push({ field: 'message', message: 'Message must be 500 characters or fewer' })
  }

  // --- Size ---
  const size = body.size || '6x4'
  const sizeResult = validateSize(size)
  if (!sizeResult.valid) {
    errors.push(...sizeResult.errors)
  }

  return { valid: errors.length === 0, errors }
}

// ---------------------------------------------------------------------------
// validateAndSanitizeMessage
// ---------------------------------------------------------------------------

/**
 * Validate and sanitize a postcard message.
 *
 * Returns the sanitized message and a list of warnings for potentially
 * problematic content (e.g. script tags, event handlers).
 */
export function validateAndSanitizeMessage(message: string): MessageSanitizationResult {
  const warnings: string[] = []

  if (typeof message !== 'string') {
    return { sanitized: '', warnings: ['Message must be a string'] }
  }

  if (message.length === 0) {
    return { sanitized: '', warnings: [] }
  }

  // Warn about long messages
  if (message.length > 500) {
    warnings.push(`Message is ${message.length} characters, exceeding the 500-character guideline`)
  }

  // Detect potentially dangerous HTML patterns
  const dangerousPatterns = [
    { pattern: /<script\b/i, name: 'script tags' },
    { pattern: /<iframe\b/i, name: 'iframe tags' },
    { pattern: /\bon\w+\s*=/i, name: 'event handler attributes (onclick, onerror, onload, etc.)' },
  ]

  for (const { pattern, name } of dangerousPatterns) {
    if (pattern.test(message)) {
      warnings.push(`Message contains ${name} which will be sanitized`)
    }
  }

  // The message itself is returned unchanged; sanitization happens in the
  // route handler via DOMPurify. We just flag warnings here.
  return { sanitized: message, warnings }
}
