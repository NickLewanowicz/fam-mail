/**
 * Parse an error response body and throw an Error with the server's message
 * (or the fallback). Shared by every API client module.
 */
export async function throwApiError(
  response: Response,
  fallback: string
): Promise<never> {
  const body = await response.json().catch(() => ({}) as { error?: string })
  const error = new Error(
    (body as { error?: string }).error || `${fallback} (${response.status})`
  )
  throw error
}
