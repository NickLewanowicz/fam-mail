import { describe, it, expect } from 'vitest'
import {
  POSTCARD_6X4_DIMENSIONS,
  calculateSafeZones,
  generateFrontHTML,
  generateBackHTML,
  generatePreviewHTML,
} from './postcardTemplate'

describe('postcardTemplate', () => {
  describe('POSTCARD_6X4_DIMENSIONS', () => {
    it('has correct dimensions', () => {
      expect(POSTCARD_6X4_DIMENSIONS.width).toBe(1800)
      expect(POSTCARD_6X4_DIMENSIONS.height).toBe(1200)
      expect(POSTCARD_6X4_DIMENSIONS.safeMargin).toBe(37.5)
      expect(POSTCARD_6X4_DIMENSIONS.bleedMargin).toBe(18.75)
    })
  })

  describe('calculateSafeZones', () => {
    it('calculates safe zone correctly', () => {
      const zones = calculateSafeZones(POSTCARD_6X4_DIMENSIONS)

      expect(zones.safe.x).toBe(37.5)
      expect(zones.safe.y).toBe(37.5)
      expect(zones.safe.width).toBe(1800 - 75) // width - 2 * safeMargin
      expect(zones.safe.height).toBe(1200 - 75) // height - 2 * safeMargin
    })

    it('calculates bleed zone correctly', () => {
      const zones = calculateSafeZones(POSTCARD_6X4_DIMENSIONS)

      expect(zones.bleed.x).toBe(18.75)
      expect(zones.bleed.y).toBe(18.75)
      expect(zones.bleed.width).toBe(1800 - 37.5) // width - 2 * bleedMargin
      expect(zones.bleed.height).toBe(1200 - 37.5)
    })

    it('does not include address block by default', () => {
      const zones = calculateSafeZones(POSTCARD_6X4_DIMENSIONS)
      expect(zones.addressBlock).toBeUndefined()
    })

    it('includes address block when requested', () => {
      const zones = calculateSafeZones(POSTCARD_6X4_DIMENSIONS, true)
      expect(zones.addressBlock).toBeDefined()
      expect(zones.addressBlock!.x).toBe(1800 / 2 + 50)
      expect(zones.addressBlock!.y).toBe(1200 / 2 + 100)
    })

    it('calculates safe zones with custom dimensions', () => {
      const customDims = { width: 1000, height: 600, safeMargin: 20, bleedMargin: 10 }
      const zones = calculateSafeZones(customDims)

      expect(zones.safe.x).toBe(20)
      expect(zones.safe.width).toBe(1000 - 40)
      expect(zones.bleed.x).toBe(10)
    })
  })

  describe('generateFrontHTML', () => {
    it('generates valid HTML', () => {
      const html = generateFrontHTML('data:image/jpeg;base64,test')
      expect(html).toContain('<!DOCTYPE html>')
      expect(html).toContain('<html>')
      expect(html).toContain('</html>')
    })

    it('includes image in HTML', () => {
      const imageData = 'data:image/jpeg;base64,abc123'
      const html = generateFrontHTML(imageData)
      expect(html).toContain(imageData)
      expect(html).toContain('alt="Postcard front"')
    })

    it('uses postcard dimensions', () => {
      const html = generateFrontHTML('data:image/jpeg;base64,test')
      expect(html).toContain('width: 1800px')
      expect(html).toContain('height: 1200px')
    })

    it('uses object-fit cover for image', () => {
      const html = generateFrontHTML('data:image/jpeg;base64,test')
      expect(html).toContain('object-fit: cover')
    })
  })

  describe('generateBackHTML', () => {
    it('generates valid HTML', () => {
      const html = generateBackHTML()
      expect(html).toContain('<!DOCTYPE html>')
      expect(html).toContain('<html>')
    })

    it('includes placeholder message when no message provided', () => {
      const html = generateBackHTML()
      expect(html).toContain('Your message will appear here')
    })

    it('includes provided message HTML', () => {
      const html = generateBackHTML('<p>Hello World</p>')
      expect(html).toContain('<p>Hello World</p>')
    })

    it('has message area', () => {
      const html = generateBackHTML()
      expect(html).toContain('message-area')
    })

    it('has address area', () => {
      const html = generateBackHTML()
      expect(html).toContain('address-area')
    })

    it('has divider', () => {
      const html = generateBackHTML()
      expect(html).toContain('divider')
    })

    it('uses postcard dimensions', () => {
      const html = generateBackHTML()
      expect(html).toContain('1800px')
      expect(html).toContain('1200px')
    })
  })

  describe('generatePreviewHTML', () => {
    it('generates front preview with safe zones', () => {
      const html = generatePreviewHTML('data:image/jpeg;base64,test', 'front', true)
      expect(html).toContain('<!DOCTYPE html>')
      expect(html).toContain('rgba(34, 197, 94, 0.8)') // safe zone green
    })

    it('generates front preview without safe zones', () => {
      const html = generatePreviewHTML('data:image/jpeg;base64,test', 'front', false)
      expect(html).not.toContain('rgba(34, 197, 94, 0.8)')
    })

    it('generates back preview with safe zones and address block', () => {
      const html = generatePreviewHTML('data:image/jpeg;base64,test', 'back', true)
      expect(html).toContain('rgba(239, 68, 68, 0.6)') // address block red
      expect(html).toContain('rgba(34, 197, 94, 0.8)') // safe zone green
    })

    it('generates back preview with message', () => {
      const html = generatePreviewHTML('data:image/jpeg;base64,test', 'back', true, '<p>Test message</p>')
      expect(html).toContain('<p>Test message</p>')
    })

    it('generates back preview without safe zones', () => {
      const html = generatePreviewHTML('data:image/jpeg;base64,test', 'back', false)
      expect(html).not.toContain('rgba(34, 197, 94, 0.8)')
    })
  })
})
