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
    this.baseUrl = 'https://api.postgrid.com/print-mail/v1'
    this.isTestMode = testMode
  }

  async createPostcard(request: PostGridPostcardRequest): Promise<PostGridPostcardResponse> {
    try {
      const formData = new URLSearchParams()
      
      formData.append('to[firstName]', request.to.firstName)
      formData.append('to[lastName]', request.to.lastName)
      formData.append('to[addressLine1]', request.to.addressLine1)
      if (request.to.addressLine2) {
        formData.append('to[addressLine2]', request.to.addressLine2)
      }
      formData.append('to[city]', request.to.city)
      formData.append('to[provinceOrState]', request.to.provinceOrState)
      formData.append('to[postalOrZip]', request.to.postalOrZip)
      formData.append('to[countryCode]', request.to.countryCode)
      
      if (request.frontHTML) {
        formData.append('frontHTML', request.frontHTML)
      }
      formData.append('backHTML', request.backHTML || 'Thank you!')
      formData.append('size', request.size || '6x4')

      const response = await fetch(`${this.baseUrl}/postcards`, {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
        },
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as { message?: string; error?: { type: string; message: string } }
        console.error('PostGrid API Error:', {
          status: response.status,
          statusText: response.statusText,
          errorData,
        })
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
    ? process.env.TEST_POSTGRID_KEY
    : process.env.REAL_POSTGRID_KEY

  if (apiKey) {
    _postgridService = new PostGridService(apiKey, isTestMode)
  }
} catch {
  // Service will be null if no API key is provided (e.g., during tests)
}

export const postgridService = _postgridService as PostGridService
