import { describe, it, expect, vi, beforeEach } from 'vitest'
import { submitPostcard } from './api'
import type { Address } from '../types/address'

describe('submitPostcard', () => {
  const mockAddress: Address = {
    firstName: 'John',
    lastName: 'Doe',
    addressLine1: '123 Main St',
    city: 'Ottawa',
    provinceOrState: 'ON',
    postalOrZip: 'K1A 0B1',
    countryCode: 'CA',
  }

  const mockFile = new File(['test content'], 'test.jpg', { type: 'image/jpeg' })

  beforeEach(() => {
    global.fetch = vi.fn()
    
    const mockFileReader = {
      result: null as string | ArrayBuffer | null,
      onload: null as ((event: ProgressEvent<FileReader>) => void) | null,
      onerror: null as ((event: ProgressEvent<FileReader>) => void) | null,
      readAsDataURL: function() {
        setTimeout(() => {
          if (this.onload) {
            this.result = 'data:image/jpeg;base64,test'
            this.onload({ target: this } as ProgressEvent<FileReader>)
          }
        }, 0)
      },
    }
    
    global.FileReader = vi.fn().mockImplementation(() => mockFileReader) as unknown as typeof FileReader
  })

  it('should convert image to base64 and send to API', async () => {
    const mockResponse = {
      success: true,
      postcard: {
        id: 'pc_123',
        status: 'ready',
        to: mockAddress,
      },
      testMode: true,
    }

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response)

    const result = await submitPostcard(mockAddress, mockFile)

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/postcards',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: expect.stringContaining('"to":'),
      })
    )

    expect(result).toEqual(mockResponse)
  })

  it('should include frontHTML with base64 image', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    } as Response)

    await submitPostcard(mockAddress, mockFile)

    const callArgs = vi.mocked(global.fetch).mock.calls[0]
    const body = JSON.parse(callArgs[1]?.body as string)

    expect(body.frontHTML).toContain('<!DOCTYPE html>')
    expect(body.frontHTML).toContain('<img src="data:image/jpeg;base64,test"')
    expect(body.size).toBe('4x6')
  })

  it('should throw error on API failure', async () => {
    const errorMessage = 'Invalid address format'
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: errorMessage }),
    } as Response)

    await expect(submitPostcard(mockAddress, mockFile)).rejects.toThrow(errorMessage)
  })

  it('should throw generic error if no error message provided', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    } as Response)

    await expect(submitPostcard(mockAddress, mockFile)).rejects.toThrow('Failed to submit postcard')
  })

  it('should include all address fields in submission', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    } as Response)

    await submitPostcard(mockAddress, mockFile)

    const callArgs = vi.mocked(global.fetch).mock.calls[0]
    const body = JSON.parse(callArgs[1]?.body as string)

    expect(body.to).toEqual(mockAddress)
  })
})
