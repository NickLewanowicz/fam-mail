import type { PostGridPostcardRequest, PostGridPostcardResponse, PostGridError } from '../types/postgrid'

export class PostGridService {
  private apiKey: string
  private baseUrl: string
  private isTestMode: boolean

  constructor(apiKey?: string, testMode = false) {
    if (!apiKey) {
      throw new Error('PostGrid API key is required')
    }
    this.apiKey = apiKey
    this.baseUrl = 'https://api.postgrid.com/v1'
    this.isTestMode = testMode
  }

  async createPostcard(request: PostGridPostcardRequest): Promise<PostGridPostcardResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/postcards`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
        },
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as { message?: string; error?: { type: string; message: string } }
        throw {
          status: response.status,
          message: errorData.message || 'Failed to create postcard',
          error: errorData.error,
        } as PostGridError
      }

      const data = await response.json()
      return data as PostGridPostcardResponse
    } catch (error) {
      if ((error as PostGridError).status) {
        throw error
      }
      throw {
        status: 500,
        message: 'Network error connecting to PostGrid',
        error: { type: 'network_error', message: String(error) },
      } as PostGridError
    }
  }

  getTestMode(): boolean {
    return this.isTestMode
  }
}

let _postgridService: PostGridService | null = null

try {
  const isTestMode = process.env.TEST_MODE === 'true'
  const apiKey = isTestMode
    ? process.env.POSTGRID_TEST_KEY
    : process.env.POSTGRID_PROD_KEY

  if (apiKey) {
    _postgridService = new PostGridService(apiKey, isTestMode)
  }
} catch {
  // Service will be null if no API key is provided (e.g., during tests)
}

export const postgridService = _postgridService as PostGridService
