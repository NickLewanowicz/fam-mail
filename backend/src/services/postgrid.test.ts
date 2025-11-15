import { describe, it, expect, mock } from 'bun:test'
import { PostGridService } from './postgrid'

describe('PostGridService', () => {
  it('should set test mode when flag is true', () => {
    const testService = new PostGridService('test_sk_PLACEHOLDER', true)
    expect(testService.getTestMode()).toBe(true)

    const liveService = new PostGridService('live_sk_123456', false)
    expect(liveService.getTestMode()).toBe(false)
  })

  it('should default to live mode when flag not provided', () => {
    const service = new PostGridService('sk_123456')
    expect(service.getTestMode()).toBe(false)
  })

  it('should throw error if API key is missing', () => {
    expect(() => new PostGridService('')).toThrow('PostGrid API key is required')
  })

  it('should make API call with correct headers', async () => {
    const mockFetch = mock(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ id: 'pc_123', status: 'ready' }),
      })
    )
    global.fetch = mockFetch as unknown as typeof fetch

    const service = new PostGridService('test_sk_PLACEHOLDER', true)
    await service.createPostcard({
      to: {
        firstName: 'John',
        lastName: 'Doe',
        addressLine1: '123 Main St',
        city: 'Ottawa',
        provinceOrState: 'ON',
        postalOrZip: 'K1A 0B1',
        countryCode: 'CA',
      },
      frontHTML: '<html>Front</html>',
    })

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.postgrid.com/print-mail/v1/postcards',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'x-api-key': 'test_sk_PLACEHOLDER',
        }),
        body: expect.any(URLSearchParams),
      })
    )
  })

  it('should handle API errors', async () => {
    const mockFetch = mock(() =>
      Promise.resolve({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ message: 'Invalid address' }),
      })
    )
    global.fetch = mockFetch as unknown as typeof fetch

    const service = new PostGridService('test_sk_PLACEHOLDER', true)

    try {
      await service.createPostcard({
        to: {} as never,
        frontHTML: '<html>Test</html>',
      })
      expect(true).toBe(false)
    } catch (error: unknown) {
      expect((error as { status: number }).status).toBe(400)
      expect((error as { message: string }).message).toBe('Invalid address')
    }
  })
})
