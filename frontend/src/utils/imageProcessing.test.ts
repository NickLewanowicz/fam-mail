import { describe, it, expect } from 'vitest'
import {
  validateImageFile,
  calculateFitDimensions,
  calculateCoverDimensions,
  POSTCARD_DIMENSIONS,
  MAX_FILE_SIZE,
  ALLOWED_TYPES,
  checkImageQuality,
} from './imageProcessing'

describe('imageProcessing', () => {
  describe('constants', () => {
    it('has correct postcard dimensions', () => {
      expect(POSTCARD_DIMENSIONS.width).toBe(1800)
      expect(POSTCARD_DIMENSIONS.height).toBe(1200)
      expect(POSTCARD_DIMENSIONS.aspectRatio).toBe(3 / 2)
    })

    it('has max file size of 10MB', () => {
      expect(MAX_FILE_SIZE).toBe(10 * 1024 * 1024)
    })

    it('allows correct image types', () => {
      expect(ALLOWED_TYPES).toContain('image/jpeg')
      expect(ALLOWED_TYPES).toContain('image/png')
      expect(ALLOWED_TYPES).toContain('image/gif')
      expect(ALLOWED_TYPES).toContain('image/webp')
    })
  })

  describe('validateImageFile', () => {
    it('accepts JPEG files', () => {
      const file = new File(['data'], 'test.jpg', { type: 'image/jpeg' })
      expect(validateImageFile(file).isValid).toBe(true)
    })

    it('accepts PNG files', () => {
      const file = new File(['data'], 'test.png', { type: 'image/png' })
      expect(validateImageFile(file).isValid).toBe(true)
    })

    it('accepts WebP files', () => {
      const file = new File(['data'], 'test.webp', { type: 'image/webp' })
      expect(validateImageFile(file).isValid).toBe(true)
    })

    it('accepts GIF files', () => {
      const file = new File(['data'], 'test.gif', { type: 'image/gif' })
      expect(validateImageFile(file).isValid).toBe(true)
    })

    it('rejects non-image files', () => {
      const file = new File(['data'], 'test.txt', { type: 'text/plain' })
      const result = validateImageFile(file)
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('Invalid file type')
    })

    it('rejects PDF files', () => {
      const file = new File(['data'], 'test.pdf', { type: 'application/pdf' })
      const result = validateImageFile(file)
      expect(result.isValid).toBe(false)
    })

    it('rejects files exceeding size limit', () => {
      const file = new File(['data'], 'large.jpg', { type: 'image/jpeg' })
      Object.defineProperty(file, 'size', { value: 15 * 1024 * 1024 })
      const result = validateImageFile(file)
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('File size must be less than')
    })

    it('accepts files at size limit', () => {
      const file = new File(['data'], 'exact.jpg', { type: 'image/jpeg' })
      Object.defineProperty(file, 'size', { value: MAX_FILE_SIZE })
      expect(validateImageFile(file).isValid).toBe(true)
    })

    it('accepts files under size limit', () => {
      const file = new File(['data'], 'small.jpg', { type: 'image/jpeg' })
      Object.defineProperty(file, 'size', { value: 1024 })
      expect(validateImageFile(file).isValid).toBe(true)
    })
  })

  describe('calculateFitDimensions', () => {
    it('fits landscape image within bounds', () => {
      const dims = calculateFitDimensions(2000, 1000, 1800, 1200)
      expect(dims.width).toBe(1800)
      expect(dims.height).toBe(900)
    })

    it('fits portrait image within bounds', () => {
      const dims = calculateFitDimensions(1000, 2000, 1800, 1200)
      expect(dims.width).toBe(600)
      expect(dims.height).toBe(1200)
    })

    it('handles image already at target size', () => {
      const dims = calculateFitDimensions(1800, 1200, 1800, 1200)
      expect(dims.width).toBe(1800)
      expect(dims.height).toBe(1200)
    })

    it('handles square image', () => {
      const dims = calculateFitDimensions(1000, 1000, 1800, 1200)
      expect(dims.width).toBe(1200)
      expect(dims.height).toBe(1200)
    })

    it('handles very small image', () => {
      const dims = calculateFitDimensions(100, 50, 1800, 1200)
      expect(dims.width).toBeLessThanOrEqual(1800)
      expect(dims.height).toBeLessThanOrEqual(1200)
    })

    it('returns integer dimensions', () => {
      const dims = calculateFitDimensions(1001, 501, 1800, 1200)
      expect(Number.isInteger(dims.width)).toBe(true)
      expect(Number.isInteger(dims.height)).toBe(true)
    })
  })

  describe('calculateCoverDimensions', () => {
    it('covers area with landscape image', () => {
      const dims = calculateCoverDimensions(2000, 1000, 1800, 1200)
      expect(dims.width).toBe(2400)
      expect(dims.height).toBe(1200)
    })

    it('covers area with portrait image', () => {
      const dims = calculateCoverDimensions(1000, 2000, 1800, 1200)
      expect(dims.width).toBe(1800)
      expect(dims.height).toBe(3600)
    })

    it('handles matching aspect ratios', () => {
      const dims = calculateCoverDimensions(1800, 1200, 1800, 1200)
      expect(dims.width).toBe(1800)
      expect(dims.height).toBe(1200)
    })

    it('returns integer dimensions', () => {
      const dims = calculateCoverDimensions(1001, 501, 1800, 1200)
      expect(Number.isInteger(dims.width)).toBe(true)
      expect(Number.isInteger(dims.height)).toBe(true)
    })
  })

  describe('checkImageQuality', () => {
    it('flags low resolution images', () => {
      const result = checkImageQuality(
        { width: 400, height: 300 },
        100000
      )
      expect(result.isGoodQuality).toBe(false)
      expect(result.warnings).toEqual(
        expect.arrayContaining([expect.stringContaining('resolution')])
      )
    })

    it('accepts high resolution images', () => {
      const result = checkImageQuality(
        { width: 1800, height: 1200 },
        500000
      )
      expect(result.isGoodQuality).toBe(true)
    })

    it('warns about wrong aspect ratio', () => {
      const result = checkImageQuality(
        { width: 1000, height: 1000 },
        500000
      )
      expect(result.warnings).toEqual(
        expect.arrayContaining([expect.stringContaining('aspect ratio')])
      )
    })

    it('warns about heavy compression', () => {
      // Very small file size for the resolution = heavy compression
      const result = checkImageQuality(
        { width: 1800, height: 1200 },
        100 // tiny file size = heavy compression
      )
      expect(result.warnings).toEqual(
        expect.arrayContaining([expect.stringContaining('compressed')])
      )
    })

    it('provides recommendations for low resolution', () => {
      const result = checkImageQuality(
        { width: 400, height: 300 },
        100000
      )
      expect(result.recommendations.length).toBeGreaterThan(0)
    })

    it('returns empty warnings for good quality image', () => {
      const result = checkImageQuality(
        { width: 1800, height: 1200 },
        2000000
      )
      expect(result.warnings).toEqual([])
      expect(result.recommendations).toEqual([])
    })
  })
})
