/**
 * Re-export from the centralized headers middleware.
 *
 * This module exists for backward compatibility — routes that currently
 * import from `../utils/response` will continue to work without changes.
 *
 * @see backend/src/middleware/headers.ts — the single source of truth
 * @see GitHub issue #34
 */

export { jsonResponse, createCorsResponse } from '../middleware/headers'
