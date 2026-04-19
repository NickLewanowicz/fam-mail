import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useImageEditor } from './useImageEditor'

// Mock imageProcessing functions
vi.mock('../utils/imageProcessing', () => ({
  validateImageFile: vi.fn(),
  processImage: vi.fn(),
  transformImage: vi.fn(),
  generateThumbnail: vi.fn(),
  generateSafeZoneOverlay: vi.fn(() => 'data:image/svg+xml;base64,safezone'),
  checkImageQuality: vi.fn(),
  POSTCARD_DIMENSIONS: { width: 1800, height: 1200, aspectRatio: 3 / 2 },
}))

import {
  validateImageFile,
  processImage,
  generateThumbnail,
  checkImageQuality,
} from '../utils/imageProcessing'

const mockValidateImageFile = validateImageFile as vi.Mock
const mockProcessImage = processImage as vi.Mock
const mockGenerateThumbnail = generateThumbnail as vi.Mock
const mockCheckImageQuality = checkImageQuality as vi.Mock

describe('useImageEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockValidateImageFile.mockReturnValue({ isValid: true })
    mockProcessImage.mockResolvedValue({
      dataUrl: 'data:image/jpeg;base64,test',
      dimensions: { width: 1800, height: 1200 },
      fileSize: 500000,
    })
    mockGenerateThumbnail.mockResolvedValue('data:image/jpeg;base64,thumb')
    mockCheckImageQuality.mockReturnValue({
      warnings: [],
      recommendations: [],
    })
  })

  it('initializes with null image state', () => {
    const { result } = renderHook(() => useImageEditor())

    expect(result.current.originalImage).toBeNull()
    expect(result.current.processedImage).toBeNull()
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('initializes with default transform', () => {
    const { result } = renderHook(() => useImageEditor())

    expect(result.current.transform).toEqual({
      scale: 1,
      rotation: 0,
      offsetX: 0,
      offsetY: 0,
    })
  })

  describe('loadImage', () => {
    it('rejects invalid files', async () => {
      mockValidateImageFile.mockReturnValue({
        isValid: false,
        error: 'Invalid file type',
      })

      const { result } = renderHook(() => useImageEditor())

      const file = new File(['data'], 'test.txt', { type: 'text/plain' })

      let success: boolean | undefined
      await act(async () => {
        success = await result.current.loadImage(file)
      })

      expect(success).toBe(false)
      expect(result.current.error).toBe('Invalid file type')
    })

    it('loads and processes a valid image', async () => {
      const { result } = renderHook(() => useImageEditor())

      const file = new File(['data'], 'test.jpg', { type: 'image/jpeg' })

      let success: boolean | undefined
      await act(async () => {
        success = await result.current.loadImage(file)
      })

      expect(success).toBe(true)
      expect(result.current.originalImage).toBe('data:image/jpeg;base64,test')
      expect(result.current.processedImage).toBe('data:image/jpeg;base64,test')
      expect(result.current.isLoading).toBe(false)
    })

    it('reports quality warnings from image check', async () => {
      mockCheckImageQuality.mockReturnValue({
        warnings: ['Low resolution'],
        recommendations: ['Use a higher resolution image'],
      })

      const { result } = renderHook(() => useImageEditor())

      const file = new File(['data'], 'test.jpg', { type: 'image/jpeg' })

      await act(async () => {
        await result.current.loadImage(file)
      })

      expect(result.current.qualityWarnings).toEqual(['Low resolution'])
      expect(result.current.qualityRecommendations).toEqual(['Use a higher resolution image'])
    })

    it('handles processing errors', async () => {
      mockProcessImage.mockRejectedValue(new Error('Processing failed'))

      const { result } = renderHook(() => useImageEditor())

      const file = new File(['data'], 'test.jpg', { type: 'image/jpeg' })

      let success: boolean | undefined
      await act(async () => {
        success = await result.current.loadImage(file)
      })

      expect(success).toBe(false)
      expect(result.current.error).toBe('Processing failed')
    })
  })

  describe('reset', () => {
    it('resets editor state to initial values', async () => {
      const { result } = renderHook(() => useImageEditor())

      const file = new File(['data'], 'test.jpg', { type: 'image/jpeg' })
      await act(async () => {
        await result.current.loadImage(file)
      })

      expect(result.current.originalImage).not.toBeNull()

      act(() => {
        result.current.reset()
      })

      expect(result.current.originalImage).toBeNull()
      expect(result.current.processedImage).toBeNull()
      expect(result.current.error).toBeNull()
    })
  })

  describe('clearError', () => {
    it('clears the current error', async () => {
      mockValidateImageFile.mockReturnValue({
        isValid: false,
        error: 'Bad file',
      })

      const { result } = renderHook(() => useImageEditor())

      const file = new File(['data'], 'test.txt', { type: 'text/plain' })
      await act(async () => {
        await result.current.loadImage(file)
      })

      expect(result.current.error).toBe('Bad file')

      act(() => {
        result.current.clearError()
      })

      expect(result.current.error).toBeNull()
    })
  })

  describe('getImageData', () => {
    it('returns null when no image is loaded', () => {
      const { result } = renderHook(() => useImageEditor())
      expect(result.current.getImageData()).toBeNull()
    })

    it('returns originalImage when no processed image', async () => {
      const { result } = renderHook(() => useImageEditor())

      const file = new File(['data'], 'test.jpg', { type: 'image/jpeg' })
      await act(async () => {
        await result.current.loadImage(file)
      })

      expect(result.current.getImageData()).toBe('data:image/jpeg;base64,test')
    })
  })

  describe('getFormattedFileSize', () => {
    it('formats bytes correctly', async () => {
      mockProcessImage.mockResolvedValue({
        dataUrl: 'data:image/jpeg;base64,test',
        dimensions: { width: 1800, height: 1200 },
        fileSize: 500,
      })

      const { result } = renderHook(() => useImageEditor())

      const file = new File(['data'], 'test.jpg', { type: 'image/jpeg' })
      await act(async () => {
        await result.current.loadImage(file)
      })

      expect(result.current.getFormattedFileSize()).toBe('500 B')
    })

    it('formats kilobytes correctly', async () => {
      mockProcessImage.mockResolvedValue({
        dataUrl: 'data:image/jpeg;base64,test',
        dimensions: { width: 1800, height: 1200 },
        fileSize: 2048,
      })

      const { result } = renderHook(() => useImageEditor())

      const file = new File(['data'], 'test.jpg', { type: 'image/jpeg' })
      await act(async () => {
        await result.current.loadImage(file)
      })

      expect(result.current.getFormattedFileSize()).toBe('2.0 KB')
    })

    it('formats megabytes correctly', async () => {
      mockProcessImage.mockResolvedValue({
        dataUrl: 'data:image/jpeg;base64,test',
        dimensions: { width: 1800, height: 1200 },
        fileSize: 2 * 1024 * 1024,
      })

      const { result } = renderHook(() => useImageEditor())

      const file = new File(['data'], 'test.jpg', { type: 'image/jpeg' })
      await act(async () => {
        await result.current.loadImage(file)
      })

      expect(result.current.getFormattedFileSize()).toBe('2.0 MB')
    })
  })

  describe('hasTransformations', () => {
    it('returns false with default transform', () => {
      const { result } = renderHook(() => useImageEditor())
      expect(result.current.hasTransformations()).toBe(false)
    })
  })
})
