import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  listDrafts,
  getDraft,
  createDraft,
  updateDraft,
  deleteDraft,
  publishDraft,
  DraftApiError,
} from './draftApi'
import type { Address } from '../types/address'

describe('draftApi', () => {
  const mockAddress: Address = {
    firstName: 'John',
    lastName: 'Doe',
    addressLine1: '123 Main St',
    city: 'Ottawa',
    provinceOrState: 'ON',
    postalOrZip: 'K1A 0B1',
    countryCode: 'CA',
  }

  beforeEach(() => {
    global.fetch = vi.fn()
  })

  describe('listDrafts', () => {
    it('should fetch all drafts without filter', async () => {
      const mockResponse = {
        drafts: [
          { id: '1', recipientAddress: mockAddress, state: 'draft', createdAt: '2025-01-01', updatedAt: '2025-01-01' },
        ],
      }
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      const result = await listDrafts()
      expect(global.fetch).toHaveBeenCalledWith('/api/drafts', expect.objectContaining({ method: 'GET' }))
      expect(result.drafts).toHaveLength(1)
    })

    it('should fetch drafts with state filter', async () => {
      const mockResponse = { drafts: [] }
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      await listDrafts('ready')
      expect(global.fetch).toHaveBeenCalledWith('/api/drafts?state=ready', expect.any(Object))
    })

    it('should throw DraftApiError on failure', async () => {
      const errorResponse = {
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' }),
      } as Response

      vi.mocked(global.fetch).mockResolvedValueOnce(errorResponse)
      vi.mocked(global.fetch).mockResolvedValueOnce(errorResponse)

      await expect(listDrafts()).rejects.toThrow('Unauthorized')
      await expect(listDrafts()).rejects.toBeInstanceOf(DraftApiError)
    })
  })

  describe('getDraft', () => {
    it('should fetch a single draft by id', async () => {
      const mockDraft = { id: 'draft-1', recipientAddress: mockAddress, state: 'draft' }
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ draft: mockDraft }),
      } as Response)

      const result = await getDraft('draft-1')
      expect(global.fetch).toHaveBeenCalledWith('/api/drafts/draft-1', expect.objectContaining({ method: 'GET' }))
      expect(result.draft.id).toBe('draft-1')
    })

    it('should throw on not found', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Draft not found' }),
      } as Response)

      await expect(getDraft('nonexistent')).rejects.toThrow('Draft not found')
    })
  })

  describe('createDraft', () => {
    it('should create a new draft', async () => {
      const newDraft = { id: 'new-1', recipientAddress: mockAddress, state: 'draft', message: 'Hello' }
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ draft: newDraft }),
      } as Response)

      const result = await createDraft({ recipientAddress: mockAddress, message: 'Hello' })
      expect(global.fetch).toHaveBeenCalledWith('/api/drafts', expect.objectContaining({ method: 'POST' }))
      expect(result.draft.id).toBe('new-1')
    })

    it('should send correct body when creating', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ draft: { id: '1' } }),
      } as Response)

      await createDraft({
        recipientAddress: mockAddress,
        message: 'Test message',
        size: '4x6',
        imageData: 'data:image/jpeg;base64,test',
      })

      const callArgs = vi.mocked(global.fetch).mock.calls[0]
      const body = JSON.parse(callArgs[1]?.body as string)
      expect(body.recipientAddress).toEqual(mockAddress)
      expect(body.message).toBe('Test message')
      expect(body.size).toBe('4x6')
      expect(body.imageData).toBe('data:image/jpeg;base64,test')
    })

    it('should throw when recipientAddress is missing (server validation)', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'recipientAddress is required' }),
      } as Response)

      await expect(createDraft({ recipientAddress: mockAddress })).rejects.toThrow('recipientAddress is required')
    })
  })

  describe('updateDraft', () => {
    it('should update an existing draft', async () => {
      const updatedDraft = { id: '1', recipientAddress: mockAddress, message: 'Updated' }
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ draft: updatedDraft }),
      } as Response)

      const result = await updateDraft('1', { message: 'Updated' })
      expect(global.fetch).toHaveBeenCalledWith('/api/drafts/1', expect.objectContaining({ method: 'PUT' }))
      expect(result.draft.message).toBe('Updated')
    })

    it('should throw on forbidden update', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ error: 'Forbidden' }),
      } as Response)

      await expect(updateDraft('1', { message: 'hack' })).rejects.toThrow('Forbidden')
    })
  })

  describe('deleteDraft', () => {
    it('should delete a draft', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Draft deleted' }),
      } as Response)

      const result = await deleteDraft('1')
      expect(global.fetch).toHaveBeenCalledWith('/api/drafts/1', expect.objectContaining({ method: 'DELETE' }))
      expect(result.message).toBe('Draft deleted')
    })

    it('should throw on delete of nonexistent draft', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Draft not found' }),
      } as Response)

      await expect(deleteDraft('nonexistent')).rejects.toThrow('Draft not found')
    })
  })

  describe('publishDraft', () => {
    it('should publish a draft', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'Draft marked as ready' }),
      } as Response)

      const result = await publishDraft('1')
      expect(global.fetch).toHaveBeenCalledWith('/api/drafts/1/publish', expect.objectContaining({ method: 'POST' }))
      expect(result.success).toBe(true)
    })

    it('should throw when draft is not in draft state', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Draft is not in draft state' }),
      } as Response)

      await expect(publishDraft('1')).rejects.toThrow('Draft is not in draft state')
    })
  })

  describe('DraftApiError', () => {
    it('should have correct name and status', () => {
      const error = new DraftApiError('test error', 400)
      expect(error.name).toBe('DraftApiError')
      expect(error.status).toBe(400)
      expect(error.message).toBe('test error')
      expect(error).toBeInstanceOf(Error)
    })
  })

  describe('error handling', () => {
    it('should handle non-JSON error responses', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => { throw new Error('Not JSON') },
      } as Response)

      await expect(listDrafts()).rejects.toThrow('Request failed')
    })

    it('should handle missing error message', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({}),
      } as Response)

      await expect(listDrafts()).rejects.toThrow('Request failed with status 500')
    })
  })
})
