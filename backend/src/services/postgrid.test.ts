import { describe, it, expect, mock, afterEach } from 'bun:test'
import { PostGridService, setPostgridService, getPostgridService } from './postgrid'

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

  describe("PostGridService - Force Test Mode", () => {
    it("should use test key when forceTestMode is true", () => {
      const service = new PostGridService({
        testApiKey: "test_key",
        liveApiKey: "live_key",
        mode: "live",
        forceTestMode: true,
        webhookSecret: "secret",
        size: "6x4",
        senderId: "sender_123",
      })

      expect(service.getActiveKey()).toBe("test_key")
    })

    it("should use live key when forceTestMode is false and mode is live", () => {
      const service = new PostGridService({
        testApiKey: "test_key",
        liveApiKey: "live_key",
        mode: "live",
        forceTestMode: false,
        webhookSecret: "secret",
        size: "6x4",
        senderId: "sender_123",
      })

      expect(service.getActiveKey()).toBe("live_key")
    })
  })

  // ============================================================================
  // PostGrid Initialization — Env Var Naming (#17)
  // ============================================================================

  describe("PostGridService - Config-based initialization (#17)", () => {
    it("should select test key in test mode", () => {
      const service = new PostGridService({
        testApiKey: "pg_test_abc",
        liveApiKey: "pg_live_xyz",
        mode: "test",
        forceTestMode: false,
        webhookSecret: "",
        size: "6x4",
        senderId: "",
      })

      expect(service.getActiveKey()).toBe("pg_test_abc")
      expect(service.getTestMode()).toBe(true)
    })

    it("should select live key in live mode", () => {
      const service = new PostGridService({
        testApiKey: "pg_test_abc",
        liveApiKey: "pg_live_xyz",
        mode: "live",
        forceTestMode: false,
        webhookSecret: "",
        size: "6x4",
        senderId: "",
      })

      expect(service.getActiveKey()).toBe("pg_live_xyz")
      expect(service.getTestMode()).toBe(false)
    })

    it("should force test mode even when mode is live", () => {
      const service = new PostGridService({
        testApiKey: "pg_test_abc",
        liveApiKey: "pg_live_xyz",
        mode: "live",
        forceTestMode: true,
        webhookSecret: "",
        size: "6x4",
        senderId: "",
      })

      expect(service.getActiveKey()).toBe("pg_test_abc")
      expect(service.getTestMode()).toBe(true)
    })
  })

  describe("PostGridService - Singleton registration (#17)", () => {
    afterEach(() => {
      // Clean up singleton after each test
      setPostgridService(null as never)
    })

    it("should register and retrieve a PostGridService instance", () => {
      const service = new PostGridService({
        testApiKey: "pg_test_abc",
        liveApiKey: "pg_live_xyz",
        mode: "test",
        forceTestMode: false,
        webhookSecret: "",
        size: "6x4",
        senderId: "",
      })

      setPostgridService(service)
      expect(getPostgridService()).toBe(service)
    })

    it("should return null when no service is registered", () => {
      setPostgridService(null as never)
      expect(getPostgridService()).toBeNull()
    })

    it("should return registered service with correct active key", () => {
      const service = new PostGridService({
        testApiKey: "pg_test_registered",
        liveApiKey: "pg_live_registered",
        mode: "test",
        forceTestMode: false,
        webhookSecret: "",
        size: "6x4",
        senderId: "",
      })

      setPostgridService(service)
      const retrieved = getPostgridService()
      expect(retrieved).not.toBeNull()
      expect(retrieved!.getActiveKey()).toBe("pg_test_registered")
    })
  })

  // ============================================================================
  // Config env var naming consistency (#17)
  // Verifies that PostGridService works with the config object shape produced
  // by getConfig(), which reads POSTGRID_TEST_API_KEY / POSTGRID_LIVE_API_KEY.
  // We construct the config object directly to avoid env var pollution from
  // other test files (drafts.test.ts, auth.test.ts set IMAP_HOST without cleanup).
  // ============================================================================
  describe("PostGridService - Config env var consistency (#17)", () => {
    it("should initialize with config-shaped object using canonical testApiKey field", () => {
      // Simulates what server.ts does: const service = new PostGridService(config.postgrid)
      // where config.postgrid comes from getConfig() reading POSTGRID_TEST_API_KEY
      const service = new PostGridService({
        mode: "test",
        testApiKey: "pg_test_canonical",
        liveApiKey: "pg_live_canonical",
        forceTestMode: false,
        webhookSecret: "",
        size: "6x4",
        senderId: "",
      })

      expect(service.getActiveKey()).toBe("pg_test_canonical")
      expect(service.getTestMode()).toBe(true)
    })

    it("should initialize with config-shaped object using canonical liveApiKey field", () => {
      const service = new PostGridService({
        mode: "live",
        testApiKey: "pg_test_canonical",
        liveApiKey: "pg_live_canonical",
        forceTestMode: false,
        webhookSecret: "",
        size: "6x4",
        senderId: "",
      })

      expect(service.getActiveKey()).toBe("pg_live_canonical")
      expect(service.getTestMode()).toBe(false)
    })

    it("should pass full config.postgrid object to PostGridService exactly as-is", () => {
      // Mirrors: new PostGridService(config.postgrid) in server.ts
      const configPostgrid = {
        mode: "test" as const,
        testApiKey: "pg_test_abc",
        liveApiKey: "pg_live_xyz",
        forceTestMode: true,
        webhookSecret: "wh_secret",
        size: "9x6" as const,
        senderId: "sender_42",
      }

      const service = new PostGridService(configPostgrid)

      // forceTestMode overrides mode
      expect(service.getActiveKey()).toBe("pg_test_abc")
      expect(service.getTestMode()).toBe(true)
    })
  })
})
