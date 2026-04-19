/**
 * Centralised API base URL configuration.
 *
 * - In development the Vite dev-server proxies `/api` to the backend, so
 *   relative paths like `/api/postcards` work out of the box.
 * - In production (or any non-Vite context) we fall back to `VITE_API_URL`
 *   from the build-time environment, defaulting to `http://localhost:8484`.
 */
export const API_BASE_URL: string = import.meta.env.VITE_API_URL ?? ''
