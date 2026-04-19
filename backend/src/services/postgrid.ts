import type { PostGridPostcardRequest, PostGridPostcardResponse, PostGridError } from '../types/postgrid'
import { logger } from '../utils/logger'

export interface PostGridConfig {
  mode: "test" | "live";
  testApiKey: string;
  liveApiKey: string;
  forceTestMode: boolean;
  webhookSecret: string;
  size: "6x4" | "9x6";
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
        size: '6x4',
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
      logger.warn("FORCE TEST MODE ENABLED - Using test API regardless of POSTGRID_MODE");
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
        logger.error('PostGrid API Error', {
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

/**
 * Register a configured PostGridService instance (called by server.ts at startup).
 */
export function setPostgridService(service: PostGridService): void {
  _postgridService = service
}

/**
 * Get the registered PostGridService instance.
 * Returns null if not configured (e.g., missing env vars during tests).
 */
export function getPostgridService(): PostGridService | null {
  return _postgridService
}

// Auto-initialize from environment variables (used when running outside of server.ts)
// Uses canonical names matching config/index.ts: POSTGRID_TEST_API_KEY / POSTGRID_LIVE_API_KEY
try {
  const testApiKey = process.env.POSTGRID_TEST_API_KEY
  const liveApiKey = process.env.POSTGRID_LIVE_API_KEY

  if (testApiKey || liveApiKey) {
    const mode = (process.env.POSTGRID_MODE || 'test') as 'test' | 'live'
    _postgridService = new PostGridService({
      mode,
      testApiKey: testApiKey || '',
      liveApiKey: liveApiKey || '',
      forceTestMode: (process.env.POSTGRID_FORCE_TEST_MODE || 'false') === 'true',
      webhookSecret: process.env.POSTGRID_WEBHOOK_SECRET || '',
      size: (process.env.POSTCARD_SIZE as '6x4' | '9x6') || '6x4',
      senderId: process.env.POSTCARD_SENDER_ID || '',
    })
  }
} catch {
  // Service will be null if no API key is provided (e.g., during tests)
}
