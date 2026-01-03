import type { PostGridPostcardRequest, PostGridPostcardResponse, PostGridError } from '../types/postgrid'

export interface PostGridConfig {
  mode: "test" | "live";
  testApiKey: string;
  liveApiKey: string;
  forceTestMode: boolean;
  webhookSecret: string;
  size: "4x6" | "6x9";
  senderId: string;
}

export class PostGridService {
  private config: PostGridConfig
  private apiKey: string
  private baseUrl: string
  private isTestMode: boolean

  constructor(configOrApiKey?: PostGridConfig | string, testMode = false) {
    this.baseUrl = 'https://api.postgrid.com/print-mail/v1'

    // Support both old and new constructor patterns
    if (typeof configOrApiKey === 'string' || configOrApiKey === undefined) {
      // Legacy constructor: PostGridService(apiKey, testMode)
      if (!configOrApiKey) {
        throw new Error('PostGrid API key is required')
      }
      this.apiKey = configOrApiKey
      this.isTestMode = testMode
      // Create a minimal config for compatibility
      this.config = {
        mode: testMode ? 'test' : 'live',
        testApiKey: configOrApiKey,
        liveApiKey: configOrApiKey,
        forceTestMode: false,
        webhookSecret: '',
        size: '4x6',
        senderId: '',
      }
    } else {
      // New constructor: PostGridService(config)
      this.config = configOrApiKey
      this.isTestMode = configOrApiKey.mode === 'test' || configOrApiKey.forceTestMode
      this.apiKey = this.getActiveKey()
    }
  }

  getActiveKey(): string {
    if (this.config.forceTestMode || this.config.mode === "test") {
      return this.config.testApiKey;
    }
    return this.config.liveApiKey;
  }

  getEffectiveMode(): "test" | "live" {
    if (this.config.forceTestMode) {
      console.warn("FORCE TEST MODE ENABLED - Using test API regardless of POSTGRID_MODE");
      return "test";
    }
    return this.config.mode;
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
    ? process.env.POSTGRID_TEST_KEY
    : process.env.POSTGRID_PROD_KEY

  if (apiKey) {
    _postgridService = new PostGridService(apiKey, isTestMode)
  }
} catch {
  // Service will be null if no API key is provided (e.g., during tests)
}

export const postgridService = _postgridService as PostGridService
