/**
 * Shared domain types used across the backend.
 *
 * This barrel file re-exports types from domain-specific modules so that
 * import paths stay clean (e.g. `from '../types'`).
 */

// Address — mirrors PostGridAddress from ./postgrid.ts but used as the
// canonical "address" type in Draft, route handlers, and database mappings.
// A type alias (not an interface) so it stays assignable to the database
// layer's `Record<string, unknown>` payload shapes (interfaces do not get
// implicit index signatures; aliases do).
export type Address = {
  firstName: string
  lastName: string
  addressLine1: string
  addressLine2?: string
  city: string
  provinceOrState: string
  postalOrZip: string
  countryCode: string
}

// Re-export PostGrid types for convenience
export type { PostGridAddress, PostGridPostcardRequest, PostGridPostcardResponse, PostGridError } from './postgrid'
